/**
 * Utilidades de formato de moneda para Ciudadan
 */

export const fmtMxn = (n, decimales = 0) =>
  `$${new Intl.NumberFormat('es-MX', {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  }).format(n)}`;

export const fmtUsd = (n, decimales = 2) =>
  `$${new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  }).format(n)}`;

export const parseMxn = (str) => {
  if (typeof str !== 'string') return 0;
  return Number(str.replace(/[^\d.-]/g, '')) || 0;
};

export default { fmtMxn, fmtUsd, parseMxn };