// src/utils/areaSlug.js
// Slugs estables para navegar a áreas de Tareas Especializadas.
//
// El content-type `area` de Strapi NO tiene campo `slug` (solo `name`), así que
// el slug se deriva del nombre en el cliente. Reglas:
//   - lowercase
//   - sin acentos/diacríticos (NFD + strip)
//   - espacios -> guiones
//   - caracteres especiales eliminados
//   - guiones colapsados / sin guiones al inicio ni al final
//
// Ejemplos:
//   "Creación multimedia"  -> "creacion-multimedia"
//   "Comercial-difusión"   -> "comercial-difusion"
//   "Técnico"              -> "tecnico"

const DIACRITICS = /[\u0300-\u036f]/g;

export const slugifyAreaName = (name) => {
  if (!name) return '';
  return String(name)
    .normalize('NFD')
    .replace(DIACRITICS, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');
};

// Alias cortos -> slug canónico del nombre real del área.
// Las 5 áreas raíz oficiales (backend src/api/area/content-types/area/lifecycles.js)
// son: Administrativo · Técnico · Comercial-difusión · Software · Creación multimedia.
// "multimedia" se usa en la landing de /gana ("Creación de Contenido") y no puede
// colisionar con ninguna otra raíz.
export const AREA_SLUG_ALIASES = {
  multimedia: 'creacion-multimedia',
  contenidos: 'creacion-multimedia',
  administrativo: 'administrativo',
  tecnico: 'tecnico',
  comercial: 'comercial-difusion',
  'comercial-difusion': 'comercial-difusion',
  software: 'software',
};

// Devuelve el índice del área dentro de la lista recibida (p. ej. `hierarchy`),
// o -1 si no existe. Se resuelve en cascada:
//   1) slug exacto del nombre
//   2) alias declarado
//   3) coincidencia por tokens (p. ej. "multimedia" ⊂ "creacion-multimedia")
export const findAreaIndexBySlug = (areas = [], slug = '') => {
  const target = slugifyAreaName(slug);
  if (!target) return -1;
  if (!Array.isArray(areas) || areas.length === 0) return -1;

  const withSlug = areas.map((area, index) => ({
    index,
    name: area?.name || '',
    areaSlug: slugifyAreaName(area?.name),
  }));

  // 1) exacto
  const exact = withSlug.find((item) => item.areaSlug === target);
  if (exact) return exact.index;

  // 2) alias
  const aliased = AREA_SLUG_ALIASES[target];
  if (aliased) {
    const byAlias = withSlug.find((item) => item.areaSlug === aliased);
    if (byAlias) return byAlias.index;
  }

  // 3) por tokens (el token pedido forma parte del slug del área)
  const byTokens = withSlug.find(
    (item) => item.areaSlug && item.areaSlug.split('-').includes(target)
  );
  if (byTokens) return byTokens.index;

  return -1;
};
