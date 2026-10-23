'use strict';

/**
 * Evidencias del expediente de repartidor: adjunto validado por slot y
 * streaming PRIVADO (nunca URL publica).
 *
 * Patron del modulo taxi (cars-evidence/services/evidence-upload.js):
 *  - El archivo se sube por /api/upload (override Auth0) y aqui se REGISTRA
 *    por file_id.
 *  - Se validan MIME y tamaño por clase de slot (img 15MB / video 150MB).
 *  - Se recalcula SHA-256 sobre los bytes reales del disco (hash canonico).
 *
 * Blindaje de propiedad (el plugin upload no registra quien subio cada
 * archivo — auditoria Fase A §1.5): un archivo solo puede quedar adjunto a
 * UN slot de UN expediente; si ya esta referenciado por otro expediente o
 * vehiculo se rechaza. Riesgo residual documentado (enumeracion de ids entre
 * subida y adjunto): ventana pequena, mitigada por la validacion de slot/tipo.
 *
 * Descarga: GET autenticado que verifica titularidad (o revisor de la misma
 * agencia) y streamea desde disco. Las API jamas devuelven file.url.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const {
  UIDS,
  SLOTS_VEHICULO,
  SLOTS_EXPEDIENTE,
  SLOTS_VIDEO,
  LIMITES_MEDIA,
} = require('../utils/constants');
const { ESTADOS_EDITABLES_SOLICITANTE } = require('../utils/state-machine');
const { ACCIONES } = require('../utils/eventos');
const { registrarEvento } = require('./bitacora');

const UPLOAD_FILE_UID = 'plugin::upload.file';

const badRequest = (mensaje) => {
  const error = new Error(mensaje);
  error.status = 400;
  error.expose = true;
  return error;
};

const notFound = (mensaje) => {
  const error = new Error(mensaje);
  error.status = 404;
  error.expose = true;
  return error;
};

function claseDeSlot(slot) {
  return SLOTS_VIDEO.includes(slot) ? 'video' : 'imagen';
}

async function sha256DeArchivo(file) {
  const strapi = global.strapi;
  const absolutePath = path.join(strapi.dirs.static.public, file.url);
  const buffer = await fs.promises.readFile(absolutePath);
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/** Carga y valida el archivo subido (existencia, MIME, tamaño por slot). */
async function validarArchivoSubido(fileId, slot) {
  const strapi = global.strapi;
  const file = await strapi.entityService.findOne(UPLOAD_FILE_UID, fileId);
  if (!file) throw badRequest('El archivo (file_id) no existe');

  const clase = claseDeSlot(slot);
  const limite = LIMITES_MEDIA[clase];
  const mime = file.mime || '';
  const sizeBytes = (Number(file.size) || 0) * 1024; // Strapi guarda size en KB

  if (!limite.mime.includes(mime)) {
    throw badRequest(`El archivo (${mime || 'desconocido'}) no es valido para el paso "${slot}"`);
  }
  if (sizeBytes > limite.maxSize) {
    throw badRequest(
      `El archivo pesa demasiado (${Math.round(sizeBytes / 1024 / 1024)}MB, maximo ${Math.round(
        limite.maxSize / 1024 / 1024
      )}MB)`
    );
  }

  return { file, sha256: await sha256DeArchivo(file) };
}

/** El archivo no debe estar ya adjunto a OTRO expediente/vehiculo. */
async function archivoYaEnUso(fileId, profileId) {
  const strapi = global.strapi;

  const orProfile = SLOTS_EXPEDIENTE.map((slot) => ({ [slot]: fileId }));
  const otroProfile = await strapi.db.query(UIDS.PROFILE).findOne({
    where: { $or: orProfile, id: { $ne: profileId } },
  });
  if (otroProfile) return true;

  const orVehicle = SLOTS_VEHICULO.map((slot) => ({ [slot]: fileId }));
  const otroVehicle = await strapi.db.query(UIDS.VEHICLE).findOne({
    where: { $or: orVehicle, delivery_profile: { $ne: profileId } },
  });
  return Boolean(otroVehicle);
}

/** Adjunta un archivo ya subido a un slot del expediente o del vehiculo. */
async function adjuntarEvidencia({ user, body }) {
  const strapi = global.strapi;

  const profile = await strapi.db.query(UIDS.PROFILE).findOne({ where: { user: user.id } });
  if (!profile) throw badRequest('No tienes expediente de repartidor; iniciarlo primero');
  if (!ESTADOS_EDITABLES_SOLICITANTE.includes(profile.status)) {
    throw badRequest(`El expediente esta en revision (${profile.status}) y no puede editarse`);
  }

  const { slot, file_id } = body;
  const fileId = Number(file_id);
  if (!Number.isInteger(fileId)) throw badRequest('file_id requerido');

  let vehicle = null;
  if (SLOTS_VEHICULO.includes(slot)) {
    const vehicleId = Number(body.vehicle_id);
    if (!Number.isInteger(vehicleId)) throw badRequest('vehicle_id requerido para evidencias del vehiculo');
    vehicle = await strapi.db.query(UIDS.VEHICLE).findOne({
      where: { id: vehicleId, delivery_profile: profile.id },
    });
    if (!vehicle) throw badRequest('El vehiculo no pertenece a tu expediente');
  } else if (!SLOTS_EXPEDIENTE.includes(slot)) {
    throw badRequest(`Slot de evidencia desconocido: ${slot}`);
  }

  const { file, sha256 } = await validarArchivoSubido(fileId, slot);

  if (await archivoYaEnUso(fileId, profile.id)) {
    throw badRequest('El archivo ya esta adjunto a otro expediente');
  }

  if (vehicle) {
    await strapi.db.query(UIDS.VEHICLE).update({ where: { id: vehicle.id }, data: { [slot]: fileId } });
  } else {
    await strapi.db.query(UIDS.PROFILE).update({ where: { id: profile.id }, data: { [slot]: fileId } });
    if (profile.status === 'draft') {
      await strapi.db.query(UIDS.PROFILE).update({
        where: { id: profile.id },
        data: { status: 'pending_documents' },
      });
    }
  }

  await registrarEvento({
    profile: profile.id,
    vehicle: vehicle?.id || null,
    agency: profile.agency,
    actor: user.id,
    action: ACCIONES.EVIDENCIA_ADJUNTADA,
    document_id: slot,
    evidence_file_id: fileId,
    evidence_sha256: sha256,
    metadata: { mime: file.mime, size_kb: file.size },
  });

  return { slot, file_id: fileId, sha256 };
}

/** Slots con archivos de este expediente (expediente + vehiculo). */
async function slotsDeExpediente(profile) {
  const strapi = global.strapi;
  const archivos = {};

  for (const slot of SLOTS_EXPEDIENTE) {
    archivos[slot] = profile[slot]?.id ?? profile[slot] ?? null;
  }

  const vehicles = await strapi.db.query(UIDS.VEHICLE).findMany({
    where: { delivery_profile: profile.id },
  });
  const vehicle = vehicles[0] || null;
  if (vehicle) {
    for (const slot of SLOTS_VEHICULO) {
      archivos[slot] = vehicle[slot]?.id ?? vehicle[slot] ?? null;
    }
  }

  return { archivos, vehicle };
}

/** Verifica que fileId pertenece al expediente y devuelve el registro de upload. */
async function archivoPropio(profile, fileId) {
  const strapi = global.strapi;
  const { archivos } = await slotsDeExpediente(profile);

  const pertenencia = Object.entries(archivos).find(([, id]) => Number(id) === Number(fileId));
  if (!pertenencia) return null;

  const file = await strapi.entityService.findOne(UPLOAD_FILE_UID, fileId);
  if (!file) return null;

  return { slot: pertenencia[0], file };
}

/** Path absoluto del archivo local del proveedor de uploads (patron taxi). */
function rutaAbsoluta(file) {
  const strapi = global.strapi;
  return path.join(strapi.dirs.static.public, file.url);
}

module.exports = {
  adjuntarEvidencia,
  slotsDeExpediente,
  archivoPropio,
  rutaAbsoluta,
  validarArchivoSubido,
  claseDeSlot,
};
