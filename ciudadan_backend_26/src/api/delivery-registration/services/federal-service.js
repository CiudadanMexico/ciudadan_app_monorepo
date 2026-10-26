'use strict';

/**
 * Bandeja FEDERAL de repartidores (spec §12C, §12G): visibilidad de casos con
 * senales de riesgo ALTA de toda la red (el alcance "federal" vigente del
 * repositorio es agencia.tipo === 'federal' — can-calificar-tarea.js:113-137).
 *
 * El federal NO aprueba en nombre de la agencia local: resuelve la senal
 * (devolver a la agencia, habilitar para aprobacion local o mantener el
 * bloqueo) y TODO acto deja huella en la bitacora del expediente.
 */

const { UIDS } = require('../utils/constants');
const { assertTransicion } = require('../utils/state-machine');
const { ACCIONES } = require('../utils/eventos');
const { registrarEvento } = require('./bitacora');
const { notificar } = require('./notificar');

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

const DECISIONES = ['devolver_agencia', 'habilitar_aprobacion', 'mantener_bloqueo'];

async function casos(caller, { limit = 50, start = 0 }) {
  const strapi = global.strapi;

  const senalesAltas = await strapi.db.query(UIDS.SIGNAL).findMany({
    where: { level: 'alta', status: 'activa' },
  });

  const idsPorPerfil = new Map();
  for (const senal of senalesAltas) {
    const list = idsPorPerfil.get(senal.profile) || [];
    list.push({ id: senal.id, rule: senal.rule, data: senal.data });
    idsPorPerfil.set(senal.profile, list);
  }

  const where = { $or: [{ status: 'pending_federal_audit' }] };
  for (const profileId of idsPorPerfil.keys()) {
    where.$or.push({ id: profileId });
  }

  const total = await strapi.db.query(UIDS.PROFILE).count({ where });
  const rows = await strapi.db.query(UIDS.PROFILE).findMany({
    where,
    limit: Math.min(Number(limit) || 50, 200),
    offset: Number(start) || 0,
  });

  return {
    total,
    data: rows.map((p) => ({
      id: p.id,
      status: p.status,
      agency_id: p.agency?.id ?? p.agency ?? null,
      user_id: p.user?.id ?? p.user ?? null,
      submitted_at: p.submitted_at,
      senales_altas: idsPorPerfil.get(p.id) || [],
    })),
  };
}

async function resolver(caller, signalId, body) {
  const strapi = global.strapi;

  const senalId = Number(signalId);
  if (!Number.isInteger(senalId)) throw badRequest('Id de senal invalido');

  const senal = await strapi.db.query(UIDS.SIGNAL).findOne({ where: { id: senalId } });
  if (!senal) throw notFound('Senal no encontrada');
  if (senal.status !== 'activa') throw badRequest('La senal ya fue resuelta');

  const hallazgo = String(body?.hallazgo || '').trim();
  if (hallazgo.length < 10) {
    throw badRequest('El hallazgo federal es obligatorio (minimo 10 caracteres)');
  }
  const decision = body?.decision;
  if (!DECISIONES.includes(decision)) {
    throw badRequest(`decision invalida. Usa: ${DECISIONES.join(', ')}`);
  }

  const profile = await strapi.db.query(UIDS.PROFILE).findOne({
    where: { id: senal.profile },
    populate: { agency: true, user: true },
  });
  if (!profile) throw notFound('Expediente de la senal no encontrado');

  if (decision === 'mantener_bloqueo') {
    // Sin cambio de estado: solo la huella del analisis. La senal sigue
    // activa hasta que el federal la resuelva con devolver/habilitar.
    await registrarEvento({
      profile: profile.id,
      agency: profile.agency?.id ?? profile.agency ?? null,
      actor: caller.id,
      action: ACCIONES.RESOLUCION_FEDERAL,
      metadata: { decision, hallazgo, signal_id: senal.id, senal_regla: senal.rule },
    });
    return { status: profile.status, senal_resuelta: false, decision };
  }

  // Resolver la senal con devolver/habilitar.
  await strapi.db.query(UIDS.SIGNAL).update({
    where: { id: senal.id },
    data: {
      status: 'resuelta',
      resolved_by: caller.id,
      resolved_at: new Date().toISOString(),
      resolution: hallazgo,
    },
  });

  const destino = decision === 'habilitar_aprobacion' ? 'eligible_for_video_review' : 'pending_review';
  let statusFinal = profile.status;

  if (profile.status === 'pending_federal_audit') {
    assertTransicion(profile.status, destino);
    await strapi.db.query(UIDS.PROFILE).update({
      where: { id: profile.id },
      data: { status: destino },
    });
    statusFinal = destino;

    await notificar({
      to: profile.user?.email,
      titulo: 'Resolucion federal de tu expediente',
      mensaje:
        decision === 'habilitar_aprobacion'
          ? 'La auditoria federal concluyo y habilito tu expediente para la aprobacion de tu agencia.'
          : 'La auditoria federal devolvio tu expediente a la agencia para su revision.',
      tipo: 'delivery.status.changed',
      link: '/repartidor/estado',
    });
  }

  await registrarEvento({
    profile: profile.id,
    agency: profile.agency?.id ?? profile.agency ?? null,
    actor: caller.id,
    action: ACCIONES.RESOLUCION_FEDERAL,
    metadata: { decision, hallazgo, signal_id: senal.id, senal_regla: senal.rule, status_final: statusFinal },
  });

  return { status: statusFinal, senal_resuelta: true, decision };
}

module.exports = { casos, resolver, DECISIONES };
