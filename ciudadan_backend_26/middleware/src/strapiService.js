import axios from 'axios';

let cachedToken = null;
let cachedAt = 0;
const TTL_MS = 50 * 60 * 1000; // 50 min aprox

export async function getStrapiServiceToken() {
  if (cachedToken && Date.now() - cachedAt < TTL_MS) {
    return cachedToken;
  }

  const res = await axios.post(`${process.env.STRAPI_URL}/api/auth/local`, {
    identifier: process.env.STRAPI_SERVICE_EMAIL,
    password: process.env.STRAPI_SERVICE_PASSWORD,
  });

  cachedToken = res.data.jwt;
  cachedAt = Date.now();

  return cachedToken;
}

export async function strapiRequest(config) {
  const token = await getStrapiServiceToken();

  return axios.request({
    baseURL: process.env.STRAPI_URL,
    ...config,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(config.headers || {}),
    },
  });
}