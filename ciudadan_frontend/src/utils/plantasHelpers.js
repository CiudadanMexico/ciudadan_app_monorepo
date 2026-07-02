/**
 * =====================================================
 * HELPERS PARA PLANTAS / SOLICITUDES
 * =====================================================
 */

const STRAPI_URL = process.env.REACT_APP_STRAPI_URL;

/**
 * Cuenta plantas existentes del usuario
 */
export async function fetchExistingPlantCount(email) {
  if (!email) return 0;

  try {
    const res = await fetch(
      `${STRAPI_URL}/api/plantas?filters[usuario_email][$eq]=${encodeURIComponent(email)}&pagination[pageSize]=1`,
      { credentials: "include" }
    );

    if (!res.ok) return 0;

    const json = await res.json();
    return Number(json?.meta?.pagination?.total || 0);
  } catch {
    return 0;
  }
}

/**
 * Verifica si el usuario ya tiene una solicitud abierta
 */
export async function fetchHasOpenSolicitud(email) {
  if (!email) return false;

  try {
    const res = await fetch(
      `${STRAPI_URL}/api/solicitudplantas?filters[usuario_email][$eq]=${encodeURIComponent(email)}&filters[status][$eq]=solicitada&pagination[pageSize]=1`,
      { credentials: "include" }
    );

    if (!res.ok) return false;

    const json = await res.json();
    return Number(json?.meta?.pagination?.total || 0) > 0;
  } catch {
    return false;
  }
}
