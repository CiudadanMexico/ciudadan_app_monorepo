// Media Service abstraction: Feed -> Media Service -> Storage Provider -> Google Drive.
// Feed code must depend only on the exports below, never on a vendor-specific API.
// Adding NAS/WebDAV, S3, a Ciudadan node, etc. later only means registering a new
// adapter in PROVIDER_ADAPTERS; it should not require touching the Feed.

export const MEDIA_STORAGE_PROVIDERS = [
  { id: "google-drive", label: "Google Drive", status: "available" },
  { id: "nas-webdav", label: "NAS / servidor propio", status: "coming-soon" },
];

export const DRIVE_ERROR_CODES = {
  TOKEN_EXPIRED: "drive_token_expired",
  CONSENT_REQUIRED: "drive_consent_required",
  NETWORK: "drive_network_error",
  UNKNOWN: "drive_unknown_error",
};

export class DriveApiError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "DriveApiError";
    this.code = code;
  }
}

export const describeDriveError = (error) =>
  error instanceof DriveApiError
    ? error.message
    : "No se pudo completar la operación con Google Drive. Intenta nuevamente.";

const GOOGLE_DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";
const GOOGLE_DRIVE_FOLDER_NAMES = {
  ciudadan: "Ciudadan",
  social: "Social",
  media: "Media",
};

export const loadGoogleIdentityScript = () =>
  new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(
        new Error(
          "Google Identity Services no está disponible en este entorno.",
        ),
      );
      return;
    }

    if (window.google?.accounts?.oauth2) {
      resolve();
      return;
    }

    const existingScript = document.querySelector(
      'script[data-ciudadan-google-identity="true"]',
    );
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener(
        "error",
        () => reject(new Error("No se pudo cargar Google Identity Services.")),
        { once: true },
      );
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.dataset.ciudadanGoogleIdentity = "true";
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error("No se pudo cargar Google Identity Services."));
    document.head.appendChild(script);
  });

const requestGoogleDriveAccessToken = ({ clientId, prompt = "" }) =>
  new Promise((resolve, reject) => {
    if (!clientId) {
      reject(
        new Error(
          "Falta REACT_APP_GOOGLE_CLIENT_ID para conectar Google Drive.",
        ),
      );
      return;
    }

    const tokenClient = window.google?.accounts?.oauth2?.initTokenClient?.({
      client_id: clientId,
      scope: GOOGLE_DRIVE_SCOPE,
      callback: (response) => {
        if (response?.error) {
          const code =
            response.error === "access_denied" ||
            response.error === "popup_closed_by_user"
              ? DRIVE_ERROR_CODES.CONSENT_REQUIRED
              : DRIVE_ERROR_CODES.UNKNOWN;
          reject(
            new DriveApiError(
              code,
              "No se completó la autorización de Google Drive. Vuelve a intentarlo y acepta el permiso solicitado.",
            ),
          );
          return;
        }

        resolve(response);
      },
    });

    if (!tokenClient) {
      reject(new Error("Google Identity Services no está disponible."));
      return;
    }

    tokenClient.requestAccessToken({ prompt });
  });

// Centralizes Drive HTTP error classification (expired token, missing consent, network/CORS).
const driveFetch = async (input, init) => {
  let response;

  try {
    response = await fetch(input, init);
  } catch (error) {
    throw new DriveApiError(
      DRIVE_ERROR_CODES.NETWORK,
      "No se pudo contactar Google Drive. Revisa tu conexión o bloqueos de red/CORS.",
    );
  }

  if (!response.ok) {
    if (response.status === 401) {
      throw new DriveApiError(
        DRIVE_ERROR_CODES.TOKEN_EXPIRED,
        "La sesión de Google Drive expiró. Se renovará el acceso automáticamente.",
      );
    }
    if (response.status === 403) {
      throw new DriveApiError(
        DRIVE_ERROR_CODES.CONSENT_REQUIRED,
        "Google Drive rechazó el permiso solicitado. Vuelve a autorizar el acceso.",
      );
    }
    throw new DriveApiError(
      DRIVE_ERROR_CODES.UNKNOWN,
      `Google Drive respondió con un error (${response.status}).`,
    );
  }

  return response;
};

const buildDriveFolderQuery = (name, parentId) => {
  const safeName = String(name || "").replace(/'/g, "\\'");
  return [
    `mimeType='application/vnd.google-apps.folder'`,
    `trashed=false`,
    `name='${safeName}'`,
    `'${parentId}' in parents`,
  ].join(" and ");
};

const findDriveFolder = async ({ accessToken, name, parentId }) => {
  const query = encodeURIComponent(buildDriveFolderQuery(name, parentId));
  const response = await driveFetch(
    `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)&pageSize=1`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );
  const payload = await response.json();
  return payload?.files?.[0] || null;
};

const createDriveFolder = async ({ accessToken, name, parentId }) => {
  const response = await driveFetch(
    "https://www.googleapis.com/drive/v3/files?fields=id,name",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        mimeType: "application/vnd.google-apps.folder",
        parents: [parentId],
      }),
    },
  );
  return response.json();
};

const findOrCreateDriveFolder = async ({ accessToken, name, parentId }) => {
  const found = await findDriveFolder({ accessToken, name, parentId });
  if (found?.id) return found;
  return createDriveFolder({ accessToken, name, parentId });
};

const ensureGoogleDriveFolderStructure = async (accessToken) => {
  const ciudadan = await findOrCreateDriveFolder({
    accessToken,
    name: GOOGLE_DRIVE_FOLDER_NAMES.ciudadan,
    parentId: "root",
  });
  const social = await findOrCreateDriveFolder({
    accessToken,
    name: GOOGLE_DRIVE_FOLDER_NAMES.social,
    parentId: ciudadan.id,
  });
  const media = await findOrCreateDriveFolder({
    accessToken,
    name: GOOGLE_DRIVE_FOLDER_NAMES.media,
    parentId: social.id,
  });

  return { ciudadanId: ciudadan.id, socialId: social.id, mediaId: media.id };
};

const uploadFileToGoogleDrive = async ({ accessToken, folderId, file }) => {
  const metadata = { name: file.name, parents: [folderId] };
  const formData = new FormData();
  formData.append(
    "metadata",
    new Blob([JSON.stringify(metadata)], { type: "application/json" }),
  );
  formData.append("file", file);

  const response = await driveFetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,webViewLink,webContentLink",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: formData,
    },
  );

  return response.json();
};

const downloadFileFromGoogleDrive = async ({ accessToken, remoteId }) => {
  const response = await driveFetch(
    `https://www.googleapis.com/drive/v3/files/${remoteId}?alt=media`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );
  return response.blob();
};

// Provider adapters implement a common shape (connect/ensureFolderStructure/uploadFile/downloadFile)
// so the Media Service facade below never leaks a vendor-specific API to the Feed.
const PROVIDER_ADAPTERS = {
  "google-drive": {
    connect: async ({ clientId, prompt }) => {
      await loadGoogleIdentityScript();
      const response = await requestGoogleDriveAccessToken({
        clientId,
        prompt,
      });
      const expiresInMs = Number(response.expires_in || 0) * 1000;
      return {
        accessToken: response.access_token,
        expiresAt: Date.now() + Math.max(expiresInMs, 0),
      };
    },
    ensureFolderStructure: (accessToken) =>
      ensureGoogleDriveFolderStructure(accessToken),
    uploadFile: async ({ accessToken, folderId, file }) => {
      const driveFile = await uploadFileToGoogleDrive({
        accessToken,
        folderId,
        file,
      });
      return {
        provider: "google-drive",
        remoteId: driveFile.id,
        webViewLink: driveFile.webViewLink || null,
        webContentLink: driveFile.webContentLink || null,
      };
    },
    downloadFile: ({ accessToken, remoteId }) =>
      downloadFileFromGoogleDrive({ accessToken, remoteId }),
  },
};

const getProviderAdapter = (providerId) => {
  const adapter = PROVIDER_ADAPTERS[providerId];
  if (!adapter) {
    throw new Error(
      `El proveedor de almacenamiento "${providerId}" todavía no está implementado.`,
    );
  }
  return adapter;
};

// Public facade consumed by Feed/UI code.
// Evolution path (2.12): MVP ships Google Drive only; NAS/WebDAV, S3, a Ciudadan
// node, or federated storage can each be added later as one more entry in
// PROVIDER_ADAPTERS above, without touching this facade or the Feed.
export const MediaStorageService = {
  getProviders: () => MEDIA_STORAGE_PROVIDERS,
  isImplemented: (providerId) => Boolean(PROVIDER_ADAPTERS[providerId]),
  connect: (providerId, options) =>
    getProviderAdapter(providerId).connect(options),
  ensureFolderStructure: (providerId, accessToken) =>
    getProviderAdapter(providerId).ensureFolderStructure(accessToken),
  uploadFile: (providerId, options) =>
    getProviderAdapter(providerId).uploadFile(options),
  downloadFile: (providerId, options) =>
    getProviderAdapter(providerId).downloadFile(options),
};
