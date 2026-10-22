'use strict';

/**
 * Validacion de CLABE (MVP repartidores, spec §12B):
 *  - 18 digitos + dígito de control (checksum ponderado estandar).
 *  - Institucion segun el prefijo de 3 digitos (catalogo parcial, ampliable;
 *    NO presume titularidad bancaria verificada).
 *  - Enmascaramiento: del backend solo sale `last4`.
 *
 * La CLABE completa solo vive cifrada en delivery_profile.payout_clabe_encrypted
 * (AES-256-GCM, ver utils/clabe-crypto.js) y jamas se registra en logs.
 */

const PESOS_CONTROL = [3, 7, 1, 3, 7, 1, 3, 7, 1, 3, 7, 1, 3, 7, 1, 3, 7];

/**
 * Catalogo parcial de instituciones por prefijo (3 digitos, estandar ABM).
 * Informativo: un prefijo desconocido no invalida la CLABE por si solo,
 * pero se reporta como institucion desconocida para revision humana.
 */
const INSTITUCIONES = {
  '002': 'Banco Nacional de Mexico (Banamex)',
  '006': 'BBVA Bancomer (legado)',
  '012': 'BBVA Mexico',
  '014': 'Santander Mexico',
  '019': 'Banjercito',
  '021': 'HSBC Mexico',
  '036': 'Inbursa',
  '037': 'Banco Interacciones',
  '042': 'Banorte',
  '044': 'Scotiabank',
  '058': 'Banregio',
  '060': 'BanCoppel',
  '127': 'Banco Azteca',
  '128': 'Banco del Bienestar (Bansefi)',
};

/** ¿Es una CLABE estructuralmente valida (18 digitos + checksum)? */
function clabeValida(clabe) {
  if (typeof clabe !== 'string') return false;
  const limpia = clabe.replace(/\s|-/g, '');
  if (!/^\d{18}$/.test(limpia)) return false;

  const digitos = limpia.split('').map(Number);
  const control = digitos.pop();
  const suma = digitos.reduce((acc, digito, i) => acc + digito * PESOS_CONTROL[i], 0);
  const esperado = (10 - (suma % 10)) % 10;

  return control === esperado;
}

/** Normaliza espacios/guiones y devuelve la CLABE limpia o null. */
function normalizarClabe(clabe) {
  if (typeof clabe !== 'string') return null;
  const limpia = clabe.replace(/\s|-/g, '');
  return /^\d{18}$/.test(limpia) ? limpia : null;
}

/** Ultimos 4 digitos (lo unico que sale del backend). */
function clabeLast4(clabe) {
  const limpia = normalizarClabe(clabe);
  return limpia ? limpia.slice(-4) : null;
}

/** Version enmascarada para mostrar en UIs internas: ************1234 */
function enmascararClabe(clabe) {
  const last4 = clabeLast4(clabe);
  return last4 ? `${'*'.repeat(14)}${last4}` : null;
}

/** Institucion del prefijo o null si el prefijo no esta en el catalogo. */
function institucionDeClabe(clabe) {
  const limpia = normalizarClabe(clabe);
  if (!limpia) return null;
  return INSTITUCIONES[limpia.slice(0, 3)] || null;
}

/**
 * Validacion completa para el guardado.
 * Devuelve { ok, errores[], clabe, last4, institucion }.
 */
function validarClabe(clabe) {
  const errores = [];
  const limpia = normalizarClabe(clabe);

  if (!limpia) {
    errores.push('La CLABE debe tener exactamente 18 digitos');
    return { ok: false, errores, clabe: null, last4: null, institucion: null };
  }
  if (!clabeValida(limpia)) {
    errores.push('El dígito de control de la CLABE no corresponde (verifica la captura)');
  }

  const institucion = institucionDeClabe(limpia);
  if (!institucion) {
    // No es un rechazo: la CLABE puede ser valida con un prefijo no catalogado.
    // Se deja constancia para revision humana (spec 12B: catalogo confiable).
    errores.push('Prefijo de institucion no catalogado: requiere revision humana');
  }

  return {
    ok: clabeValida(limpia) === true,
    errores,
    clabe: limpia,
    last4: clabeLast4(limpia),
    institucion,
  };
}

module.exports = {
  clabeValida,
  normalizarClabe,
  clabeLast4,
  enmascararClabe,
  institucionDeClabe,
  validarClabe,
  INSTITUCIONES,
};
