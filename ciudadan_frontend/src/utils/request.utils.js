const STRAPI_URL = process.env.REACT_APP_STRAPI_URL || 'http://localhost:33032';

const parseJson = async (res) => {
  try {
    return await res.json();
  } catch {
    return null;
  }
};

const fetchJson = async (
  url,
  options = {},
  fallbackMessage = 'No se pudo completar la solicitud'
) => {
  const res = await fetch(url, {
    credentials: 'include',
    ...options,
  });
  const data = await parseJson(res);

  if (!res.ok) {
    // Strapi responde 403 con el mensaje genérico "Forbidden" cuando una
    // policy (ej. is-admin-or-socio) rechaza: eso no le dice nada al usuario.
    // Si la policy mandó un motivo específico, ese sí se respeta tal cual.
    const mensaje = data?.error?.message || data?.message || fallbackMessage;
    throw new Error(
      res.status === 403 && mensaje === 'Forbidden'
        ? 'Sesión expirada o sin permisos para esta acción. Vuelve a iniciar sesión.'
        : mensaje
    );
  }

  return data;
};

export { fetchJson, STRAPI_URL };
