'use strict';

/**
 * Motor de senales de riesgo del MVP (spec §12G).
 *
 * Reglas explicables, NO puntajes invisibles:
 *  - ALTA: cotejo documental contradictorio (mismatch/reported) o duplicidad
 *    de serie/placa contra un expediente APROBADO. Congela la concesion del
 *    rol (estado pending_federal_audit) hasta resolucion federal.
 *  - MEDIA: duplicidad de serie/placa contra un expediente NO aprobado.
 *  - BAJA: electrica sin clasificacion normativa al enviar (recordatorio de
 *    revision; el clasificarla como motorizado endurece la matriz).
 *
 * El motor produce senales; la sancion/escalacion la decide el flujo, nunca
 * un rechazo automatico por IA (spec 12G).
 */

const REGLAS = Object.freeze({
  COTEJO_CONTRICTORIO: 'doc_check_conflictivo',
  DUPLICIDAD_VEHICULO: 'duplicidad_vehiculo',
  CLASIFICACION_PENDIENTE: 'clasificacion_pendiente_electrica',
});

const NIVELES = ['baja', 'media', 'alta'];

/**
 * Evalua el resultado de un cotejo documental registrado por el revisor.
 * @returns {{ regla, level, data } | null}
 */
function evaluarCotejo({ document_id, result }) {
  if (result === 'mismatch' || result === 'reported') {
    return {
      regla: REGLAS.COTEJO_CONTRICTORIO,
      level: 'alta',
      data: {
        document_id,
        result,
        motivo:
          result === 'mismatch'
            ? 'Los datos del documento no coinciden con la fuente consultada'
            : 'El documento fue reportado por la fuente consultada',
      },
    };
  }
  return null;
}

/**
 * Evalua duplicidad de serie/placa contra otro vehiculo existente.
 * @param {{ serial_or_vin?: string, plate?: string, otro: { profile_status: string } }} entrada
 */
function evaluarDuplicidad({ serial_or_vin, plate, otro }) {
  const colision = [];
  if (serial_or_vin && serial_or_vin === otro?.serial_or_vin) colision.push('numero de serie');
  if (plate && plate === otro?.plate) colision.push('placa');
  if (colision.length === 0) return null;

  const nivel = otro?.profile_status === 'approved' ? 'alta' : 'media';
  return {
    regla: REGLAS.DUPLICIDAD_VEHICULO,
    level: nivel,
    data: {
      colision: colision.join(' y '),
      estado_del_otro_expediente: otro?.profile_status || 'desconocido',
      motivo:
        nivel === 'alta'
          ? 'Serie/placa duplicada frente a un expediente aprobado'
          : 'Serie/placa duplicada frente a otro expediente en curso',
    },
  };
}

/**
 * Evalua una bicicleta electrica al momento de enviar a revision.
 */
function evaluarVehiculoAlEnviar(vehicle) {
  if (vehicle?.type === 'bicicleta_electrica' && vehicle.juridical_classification === 'pendiente') {
    return {
      regla: REGLAS.CLASIFICACION_PENDIENTE,
      level: 'baja',
      data: {
        motivo:
          'La clasificacion normativa de la electrica esta pendiente: el revisor debe determinarla antes de aprobar',
      },
    };
  }
  return null;
}

function esNivelValido(nivel) {
  return NIVELES.includes(nivel);
}

module.exports = {
  REGLAS,
  NIVELES,
  evaluarCotejo,
  evaluarDuplicidad,
  evaluarVehiculoAlEnviar,
  esNivelValido,
};
