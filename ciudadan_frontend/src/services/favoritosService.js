const STRAPI_URL = process.env.REACT_APP_STRAPI_URL;
const FAVORITOS_URL = `${STRAPI_URL}/api/favoritos`;
/**
 * Obtiene todos los favoritos de un usuario
 */
export async function getFavoritosUsuario(usuarioId) {
  const url = `${FAVORITOS_URL}?filters[usuario][id][$eq]=${usuarioId}&populate=*`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Error al obtener favoritos");
  }

  const data = await response.json();

  return data.data;
}

/**
 * Verifica si un elemento ya está marcado como favorito.
 *
 * Retorna:
 * {
 *    favorito: true|false,
 *    favoritoId: number|null
 * }
 */
export async function esFavorito(usuarioId, tipo, elementoId) {
  const filterUsuarioStr = `filters[usuario][id][$eq]=${usuarioId}`;
  const filterTipoStr = `filters[tipo][$eq]=${tipo}`;
  const filterProductoStr = `filters[${tipo}][id][$eq]=${elementoId}`;
  const response = await fetch(`${FAVORITOS_URL}?${filterUsuarioStr}&${filterTipoStr}&${filterProductoStr}`);

  if (!response.ok) {
    throw new Error("Error al consultar favorito");
  }

  const data = await response.json();

  if (data.data.length > 0) {
    return {
      favorito: true,
      favoritoId: data.data[0].id
    };
  }

  return {
    favorito: false,
    favoritoId: null
  };
}

/**
 * Agrega un favorito
 */
export async function agregarFavorito({
  usuarioId,
  usuarioEmail,
  tipo,
  elementoId,
  url = ""
}) {

  const body = {
    data: {
      usuario: usuarioId,
      usuario_email: usuarioEmail,
      tipo,
      url
    }
  };

  // Agrega dinámicamente el campo producto, curso, club o contenido
  body.data[tipo] = elementoId;

  const response = await fetch(`${FAVORITOS_URL}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error("No fue posible agregar el favorito");
  }

  const data = await response.json();

  return data.data;
}

/**
 * Elimina un favorito por id
 */
export async function eliminarFavorito(favoritoId) {

  const response = await fetch(`${FAVORITOS_URL}/${favoritoId}`, { method: "DELETE" });

  if (!response.ok) {
    throw new Error("No fue posible eliminar el favorito");
  }

  return true;
}

/**
 * Alterna el estado del favorito.
 *
 * Retorna:
 * {
 *    favorito,
 *    favoritoId
 * }
 */
export async function toggleFavorito({
  usuarioId,
  usuarioEmail,
  tipo,
  elementoId,
  url = ""
}) {

  const estado = await esFavorito(usuarioId, tipo, elementoId);

  if (estado.favorito) {
    await eliminarFavorito(estado.favoritoId);
    return {
      favorito: false,
      favoritoId: null
    };

  }

  const favorito = await agregarFavorito({
    usuarioId,
    usuarioEmail,
    tipo,
    elementoId,
    url
  });

  return {
    favorito: true,
    favoritoId: favorito.id
  };

}