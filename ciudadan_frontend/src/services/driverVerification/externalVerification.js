import { parseJsonSafe } from '../../utils/preRegisterForSteps/helpers';

const STRAPI_URL = process.env.REACT_APP_STRAPI_URL || '';

/**
 * docs/TAXIS-VERIFICACION-CONDUCTORES-FASES.md, Fase 4: registra una consulta
 * oficial (INE / REPUVE / licencia estatal) ya realizada manualmente por el
 * verificador en el portal oficial correspondiente. El backend nunca recibe
 * el dato consultado en claro más allá de este request (lo hashea/enmascara
 * antes de guardarlo).
 */
export const registerExternalVerification = async (validationId, payload, token) => {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(
    `${STRAPI_URL}/api/cars-validations/${validationId}/external-verifications`,
    {
      method: 'POST',
      credentials: 'include',
      headers,
      body: JSON.stringify(payload),
    }
  );
  const data = await parseJsonSafe(res);
  if (!res.ok) {
    throw new Error(data?.error?.message || 'No se pudo registrar la consulta oficial.');
  }
  return data?.data;
};
