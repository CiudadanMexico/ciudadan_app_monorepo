const STRAPI_URL = process.env.REACT_APP_STRAPI_URL || 'http://localhost:1337';

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
    throw new Error(data?.error?.message || data?.message || fallbackMessage);
  }

  return data;
};

export { fetchJson, STRAPI_URL };
