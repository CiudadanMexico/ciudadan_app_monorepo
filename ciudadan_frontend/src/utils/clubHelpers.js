/**
 * =====================================================
 * HELPERS RELACIONADOS A CLUBS
 * =====================================================
 */

const STRAPI_URL = process.env.REACT_APP_STRAPI_URL;

/**
 * Obtiene un club por ID con populate profundo
 */
export async function fetchClubById(id) {
  if (!id) return null;

  const res = await fetch(
    `${STRAPI_URL}/api/clubs/${id}?populate=deep`,
    { credentials: "include" }
  );

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Club fetch error ${res.status}: ${txt}`);
  }

  const json = await res.json();
  const entry = json?.data || json;

  if (!entry) return null;

  // Normaliza forma Strapi
  return entry.attributes
    ? { id: entry.id, ...entry.attributes }
    : entry;
}

/**
 * Normaliza las distintas formas
 * en que RolesContext puede traer el club
 */
export async function normalizeClub(rawClub) {
  if (!rawClub) return null;

  if (Array.isArray(rawClub)) {
    const first = rawClub[0];
    return first?.attributes
      ? { id: first.id, ...first.attributes }
      : first;
  }

  if (rawClub?.data) {
    if (rawClub.data.attributes) {
      return { id: rawClub.data.id, ...rawClub.data.attributes };
    }
    if (rawClub.data.id) {
      return await fetchClubById(rawClub.data.id);
    }
  }

  if (rawClub?.attributes) {
    return { id: rawClub.id, ...rawClub.attributes };
  }

  if (typeof rawClub === "string" || typeof rawClub === "number") {
    return await fetchClubById(rawClub);
  }

  return rawClub;
}
