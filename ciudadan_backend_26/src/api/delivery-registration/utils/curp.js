'use strict';

/**
 * Validacion de CURP y mayoria de edad (MVP repartidores, spec §4.1/§12G).
 *  - Estructura de 18 posiciones (regex oficial) + fecha real extraida.
 *  - Edad >= 18 calculada desde la fecha corroborada (CURP/fecha declarada).
 *
 * La CURP completa JAMAS se publica: viaja enmascarada o, a lo sumo,
 * validada como booleana. No se declara "cotejo oficial con RENAPO" si no
 * hubo consulta real (spec 12B).
 */

const RE_CURP = /^[A-Z]{4}\d{6}[HM][A-Z]{2}[B-DF-HJ-NP-TV-Z]{3}[A-Z0-9]\d$/;

/** Codigos de entidad federativa validos en la CURP (incluye NE = nacido en el extranjero). */
const ENTIDADES = [
  'AS', 'BC', 'BS', 'CC', 'CL', 'CM', 'CS', 'CH', 'DF', 'DG', 'GT', 'GR',
  'HG', 'JC', 'MC', 'MN', 'MS', 'NT', 'NL', 'OC', 'PL', 'QT', 'QR', 'SP',
  'SL', 'SR', 'TC', 'TS', 'TL', 'VZ', 'YN', 'ZS', 'NE',
];

/** CURP en mayusculas sin espacios, o null si no es texto razonable. */
function normalizarCurp(curp) {
  if (typeof curp !== 'string') return null;
  const limpia = curp.trim().toUpperCase().replace(/\s|-/g, '');
  return limpia.length === 18 ? limpia : null;
}

/** Extrae la fecha de nacimiento (Date) desde los digitos 7-12 de la CURP. */
function fechaNacimientoDeCurp(curp) {
  const limpia = normalizarCurp(curp);
  if (!limpia) return null;

  const anio = Number.parseInt(limpia.slice(4, 6), 10);
  const mes = Number.parseInt(limpia.slice(6, 8), 10);
  const dia = Number.parseInt(limpia.slice(8, 10), 10);

  if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return null;

  // Ventana razonable para el MVP: nacidos entre 1900 y el anio actual.
  const anioActual = new Date().getFullYear();
  const anioCompleto = anio <= Number(String(anioActual).slice(-2)) ? 2000 + anio : 1900 + anio;

  const fecha = new Date(Date.UTC(anioCompleto, mes - 1, dia));
  if (fecha.getUTCMonth() !== mes - 1 || fecha.getUTCDate() !== dia) return null;
  if (fecha.getUTCFullYear() > anioActual) return null;

  return fecha;
}

/** Edad en anios cumplidos a la fecha dada (default: hoy). */
function edadEnFecha(fechaNacimiento, al = new Date()) {
  if (!(fechaNacimiento instanceof Date) || Number.isNaN(fechaNacimiento.getTime())) return null;

  let edad = al.getUTCFullYear() - fechaNacimiento.getUTCFullYear();
  const antesDeCumple =
    al.getUTCMonth() < fechaNacimiento.getUTCMonth() ||
    (al.getUTCMonth() === fechaNacimiento.getUTCMonth() &&
      al.getUTCDate() < fechaNacimiento.getUTCDate());
  if (antesDeCumple) edad -= 1;

  return edad;
}

/** Estructura CURP valida (regex + entidad + fecha real). */
function curpValida(curp) {
  const limpia = normalizarCurp(curp);
  if (!limpia) return false;
  if (!RE_CURP.test(limpia)) return false;
  if (!ENTIDADES.includes(limpia.slice(11, 13))) return false;
  return fechaNacimientoDeCurp(limpia) !== null;
}

/**
 * Validacion completa del bloque de identidad (spec §4.1):
 * edad >= 18 y consistencia CURP vs fecha declarada si ambas existen.
 * Devuelve { ok, errores[], curp, fechaNacimiento, edad }.
 */
function validarIdentidad({ curp, birthdate }) {
  const errores = [];
  const limpia = normalizarCurp(curp);
  let fechaNacimiento = null;

  if (!limpia) {
    errores.push('CURP requerida (18 posiciones)');
  } else if (!curpValida(limpia)) {
    errores.push('La CURP no tiene una estructura valida (revisa la captura)');
  } else {
    fechaNacimiento = fechaNacimientoDeCurp(limpia);
  }

  let fechaDeclarada = null;
  if (typeof birthdate === 'string' && birthdate) {
    fechaDeclarada = new Date(`${birthdate}T00:00:00Z`);
    if (Number.isNaN(fechaDeclarada.getTime())) {
      errores.push('Fecha de nacimiento invalida');
      fechaDeclarada = null;
    }
  } else if (birthdate instanceof Date) {
    fechaDeclarada = birthdate;
  }

  if (fechaNacimiento && fechaDeclarada) {
    const anioCurp = fechaNacimiento.getUTCFullYear();
    const mesCurp = fechaNacimiento.getUTCMonth();
    const diaCurp = fechaNacimiento.getUTCDate();
    const anioDecl = fechaDeclarada.getUTCFullYear();
    const mesDecl = fechaDeclarada.getUTCMonth();
    const diaDecl = fechaDeclarada.getUTCDate();
    if (anioCurp !== anioDecl || mesCurp !== mesDecl || diaCurp !== diaDecl) {
      errores.push('La fecha de nacimiento declarada no coincide con la CURP');
    }
  }

  const referencia = fechaNacimiento || fechaDeclarada;
  const edad = referencia ? edadEnFecha(referencia) : null;
  if (referencia && edad !== null && edad < 18) {
    errores.push('El repartidor debe tener al menos 18 anios');
  }

  return {
    ok: errores.length === 0,
    errores,
    curp: limpia,
    fechaNacimiento: referencia,
    edad,
  };
}

module.exports = {
  RE_CURP,
  ENTIDADES,
  normalizarCurp,
  curpValida,
  fechaNacimientoDeCurp,
  edadEnFecha,
  validarIdentidad,
};
