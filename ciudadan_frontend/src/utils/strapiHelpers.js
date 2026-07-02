/**
 * =====================================================
 * HELPERS PARA STRAPI
 * =====================================================
 */

export const STRAPI_URL = process.env.REACT_APP_STRAPI_URL;

/**
 * Extrae el ID real de un archivo de Strapi
 * (soporta varias formas de respuesta)
 */
export const getStrapiFileId = (fileObj) => {
  if (!fileObj) return null;
  return fileObj.id || fileObj?.data?.id || null;
};

/**
 * Sube múltiples archivos a Strapi
 * @returns array de archivos subidos
 */
export async function uploadFilesToStrapi(files = []) {
  if (!files.length) return [];

  const fd = new FormData();
  files.forEach((f) => fd.append("files", f));

  const res = await fetch(`${STRAPI_URL}/api/upload`, {
    method: "POST",
    credentials: "include",
    body: fd,
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Upload falló: ${res.status} ${txt}`);
  }

  return await res.json();
}

/**
 * Obtiene el ID del usuario de Strapi
 * usando email si no viene ya en userData
 */
export async function ensureUsuarioId({ user, userData }) {
  let usuarioId = userData?.id || null;
  const email = user?.email || userData?.email;

  if (!usuarioId && email) {
    try {
      const res = await fetch(
        `${STRAPI_URL}/api/users?filters[email][$eq]=${encodeURIComponent(email)}`,
        { credentials: "include" }
      );
      if (res.ok) {
        const json = await res.json();
        usuarioId = json?.[0]?.id || usuarioId;
      }
    } catch (err) {
      console.warn("ensureUsuarioId error", err);
    }
  }

  return usuarioId;
}
