// On-device persistence for media attached to Feed publications.
// Keeps the user's original file available immediately, independent of any external provider.
const DB_NAME = "ciudadan_social_media_store";
const DB_VERSION = 1;
const STORE_NAME = "local_media_copies";

const openDatabase = () =>
  new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(
        new Error(
          "El almacenamiento local no está disponible en este entorno.",
        ),
      );
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(
        request.error || new Error("No se pudo abrir el almacenamiento local."),
      );
  });

const runTransaction = async (mode, executor) => {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode);
    const store = tx.objectStore(STORE_NAME);
    let result;

    executor(store, (value) => {
      result = value;
    });

    tx.oncomplete = () => resolve(result);
    tx.onerror = () =>
      reject(tx.error || new Error("Operación local de medios fallida."));
    tx.onabort = () =>
      reject(tx.error || new Error("Operación local de medios cancelada."));
  });
};

// Stable key shared between the attach step and the publish step for the same file.
export const buildLocalMediaKey = (file) =>
  `${file.name}::${file.lastModified}::${file.size}`;

export const saveLocalMediaCopy = async (key, file) =>
  runTransaction("readwrite", (store, setResult) => {
    store.put(
      {
        blob: file,
        name: file.name,
        type: file.type,
        size: file.size,
        savedAt: Date.now(),
      },
      key,
    );
    setResult(true);
  });

export const getLocalMediaCopy = async (key) =>
  runTransaction("readonly", (store, setResult) => {
    const request = store.get(key);
    request.onsuccess = () => setResult(request.result || null);
  });

export const hasLocalMediaCopy = async (key) =>
  Boolean(await getLocalMediaCopy(key));

export const deleteLocalMediaCopy = async (key) =>
  runTransaction("readwrite", (store, setResult) => {
    store.delete(key);
    setResult(true);
  });

export const getLocalMediaObjectUrl = async (key) => {
  const record = await getLocalMediaCopy(key);
  return record?.blob ? URL.createObjectURL(record.blob) : null;
};
