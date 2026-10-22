'use strict';

/**
 * Bitacora append-only del expediente de repartidor
 * (api::delivery-verification-event).
 *
 * Reglas (spec 12C/12E): toda alta, correccion, cotejo, decision y acto
 * federal deja evento identificando responsable y agencia; las correcciones
 * son eventos NUEVOS — nunca se edita ni borra el evento anterior.
 */

const { UIDS } = require('../utils/constants');
const { esAccionValida } = require('../utils/eventos');

const badRequest = (mensaje) => {
  const error = new Error(mensaje);
  error.status = 400;
  error.expose = true;
  return error;
};

/**
 * Registra un evento de bitacora. `review_version` es el ordinal del evento
 * dentro del expediente (monotonico, util para ordenar la historia).
 */
async function registrarEvento({
  profile: profileId,
  vehicle = null,
  agency: agencyId = null,
  actor: actorId = null,
  action,
  document_id = null,
  check_type = null,
  source_name = null,
  official_source_url = null,
  result = null,
  data_contrastada = null,
  evidence_file_id = null,
  evidence_sha256 = null,
  notes = null,
  metadata = null,
}) {
  if (!esAccionValida(action)) {
    throw badRequest(`Accion de bitacora desconocida: ${action}`);
  }

  const strapi = global.strapi;
  const previos = await strapi.db.query(UIDS.EVENT).count({ where: { profile: profileId } });

  return strapi.db.query(UIDS.EVENT).create({
    data: {
      profile: profileId,
      vehicle,
      agency: agencyId,
      actor: actorId,
      action,
      document_id,
      check_type,
      source_name,
      official_source_url,
      result,
      data_contrastada,
      evidence_file_id,
      evidence_sha256,
      notes,
      review_version: previos + 1,
      metadata,
    },
  });
}

/** Cotejos documentales registrados sobre un expediente (para la matriz 12B). */
async function cotejosDeExpediente(profileId) {
  const strapi = global.strapi;
  return strapi.db.query(UIDS.EVENT).findMany({
    where: { profile: profileId, action: 'document_check_registered' },
    orderBy: { review_version: 'asc' },
  });
}

module.exports = { registrarEvento, cotejosDeExpediente };
