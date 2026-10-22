'use strict';

/**
 * Revision de la AGENCIA sobre expedientes de repartidor (spec §8, §12B,
 * §12C, §12D, §12F) y concesion segura del rol `repartidor`.
 *
 * Gobernanza (verificada en CADA request, nunca por filtros del frontend):
 *   sesion/Auth0 -> usuario -> rol socio|admin|root (policy
 *   is-delivery-reviewer) -> afiliacion ACTIVA en la MISMA agencia del
 *   expediente -> agencia habilitada (publicada) -> accion permitida.
 *
 * Vigencia (patron vigente del repo, media-service.js:88-90): el socio exige
 * membresia_vigente o verificado; admin/root tienen bypass (misma matriz que
 * can-calificar-tarea.js:77-83).
 *
 * Rol `repartidor`: SOLO se otorga aqui, tras aprobacion autorizada, con
 * MERGE aditivo de roles.extra (preserva el resto del JSON y los demas roles
 * — a diferencia de agregar-socio que reemplaza el objeto completo) e
 * idempotencia (no duplica rol ni notificacion).
 */

const {
  UIDS,
  ROL_REPARTIDOR,
  ROLES_REVISOR,
} = require('../utils/constants');
const { ESTADOS_EN_REVISION, assertTransicion } = require('../utils/state-machine');
const {
  matrizDocumentalCompleta,
  validarVehiculo,
  documentosRequeridosParaCotejo,
} = require('../utils/requirements');
const { validarUrlZoom } = require('../utils/zoom-url');
const { evaluarCotejo } = require('../utils/senales');
const { ACCIONES } = require('../utils/eventos');
const { registrarEvento, cotejosDeExpediente } = require('./bitacora');
const { notificar } = require('./notificar');
const { archivoPropio, rutaAbsoluta } = require('./evidencias-service');

const badRequest = (mensaje) => {
  const error = new Error(mensaje);
  error.status = 400;
  error.expose = true;
  return error;
};

const forbidden = (mensaje) => {
  const error = new Error(mensaje);
  error.status = 403;
  error.expose = true;
  return error;
};

const notFound = (mensaje) => {
  const error = new Error(mensaje);
  error.status = 404;
  error.expose = true;
  return error;
};

const conflict = (mensaje) => {
  const error = new Error(mensaje);
  error.status = 409;
  error.expose = true;
  return error;
};

const ahoraISO = () => new Date().toISOString();

function rolesExtraDe(user) {
  return Array.isArray(user?.roles?.extra) ? user.roles.extra : [];
}

function esRoot(user) {
  return rolesExtraDe(user).includes('root');
}

// ---------------------------------------------------------------------------
// Ambito y vigencia
// ---------------------------------------------------------------------------
function verificarAmbito(caller, profile) {
  if (esRoot(caller)) return;

  const callerAgency = caller.agencia?.id ?? caller.agencia ?? null;
  const profileAgency = profile.agency?.id ?? profile.agency ?? null;

  if (!callerAgency || Number(callerAgency) !== Number(profileAgency)) {
    throw forbidden('Solo puedes gestionar expedientes de TU agencia');
  }

  const roles = rolesExtraDe(caller);
  const esSocio = roles.includes('socio');
  const esAdmin = roles.includes('admin');
  if (!esSocio && !esAdmin) {
    throw forbidden('Tu cuenta no tiene rol de revision (socio/admin/root)');
  }

  // Vigencia del socio (matriz vigente del repo; admin con bypass).
  if (esSocio && !esAdmin) {
    const vigente = caller.membresia_vigente === true || caller.verificado === true;
    if (!vigente) {
      throw forbidden('Tu membresia no esta vigente: no puedes revisar expedientes');
    }
  }
}

function verificarNoEsPropio(caller, profile) {
  const profileUser = profile.user?.id ?? profile.user ?? null;
  if (Number(profileUser) === Number(caller.id)) {
    throw forbidden('Nadie revisa ni aprueba su propio expediente (spec 12F)');
  }
}

// ---------------------------------------------------------------------------
// Carga de expedientes
// ---------------------------------------------------------------------------
async function cargarExpediente(id) {
  const strapi = global.strapi;
  const profileId = Number(id);
  if (!Number.isInteger(profileId)) throw badRequest('Id de expediente invalido');

  const profile = await strapi.db.query(UIDS.PROFILE).findOne({
    where: { id: profileId },
    populate: { agency: true, user: true, vehicles: true },
  });
  if (!profile) throw notFound('Expediente no encontrado');

  return profile;
}

async function cargarParaAccion(caller, id, { propio = true } = {}) {
  const profile = await cargarExpediente(id);
  verificarAmbito(caller, profile);
  if (propio) verificarNoEsPropio(caller, profile);
  return profile;
}

// ---------------------------------------------------------------------------
// Cola y detalle
// ---------------------------------------------------------------------------
async function cola(caller, { status, limit = 50, start = 0 }) {
  const strapi = global.strapi;

  const where = {};
  if (!esRoot(caller)) {
    where.agency = caller.agencia?.id ?? -1;
  }
  if (status) where.status = status;

  const total = await strapi.db.query(UIDS.PROFILE).count({ where });
  const rows = await strapi.db.query(UIDS.PROFILE).findMany({
    where,
    limit: Math.min(Number(limit) || 50, 200),
    offset: Number(start) || 0,
  });

  return {
    total,
    data: rows.map(proyeccionResumen),
  };
}

function proyeccionResumen(p) {
  return {
    id: p.id,
    status: p.status,
    territory_ref: p.territory_ref,
    agency_id: p.agency?.id ?? p.agency ?? null,
    user_id: p.user?.id ?? p.user ?? null,
    submitted_at: p.submitted_at,
    reviewed_at: p.reviewed_at,
    approved_at: p.approved_at,
    rejected_at: p.rejected_at,
    suspended_at: p.suspended_at,
    training_status: p.training_status,
    zoom: p.zoom_attendance_result,
  };
}

async function detalle(caller, id) {
  const strapi = global.strapi;
  const profile = await cargarParaAccion(caller, id);

  const vehicles = await strapi.db.query(UIDS.VEHICLE).findMany({
    where: { delivery_profile: profile.id },
  });
  const vehicle = vehicles[0] || null;

  const user = await strapi.db.query(UIDS.USER).findOne({ where: { id: profile.user?.id ?? profile.user } });

  const eventos = await strapi.db.query(UIDS.EVENT).findMany({
    where: { profile: profile.id },
    orderBy: { review_version: 'asc' },
  });

  const senales = await strapi.db.query(UIDS.SIGNAL).findMany({
    where: { profile: profile.id },
  });

  // Proyeccion del revisor: CLABE enmascarada (spec 12B), nunca el sobre.
  return {
    profile: {
      id: profile.id,
      status: profile.status,
      territory_ref: profile.territory_ref,
      agency: profile.agency,
      user: user ? { id: user.id, email: user.email, username: user.username } : null,
      identity: {
        phone: profile.phone,
        birthdate: profile.birthdate,
        curp_masked: profile.curp ? `${profile.curp.slice(0, 4)}•••••••••${profile.curp.slice(-2)}` : null,
        identity_verification_status: profile.identity_verification_status,
        slots: {
          id_front: profile.id_front?.id ?? profile.id_front ?? null,
          id_back: profile.id_back?.id ?? profile.id_back ?? null,
          selfie: profile.selfie?.id ?? profile.selfie ?? null,
        },
        ine_reutilizada: Boolean(user?.ine_frente && user?.ine_tras),
      },
      payout: {
        clabe_masked: profile.payout_clabe_last4
          ? `${'*'.repeat(14)}${profile.payout_clabe_last4}`
          : null,
        account_holder_name: profile.account_holder_name,
        payment_validation_status: profile.payment_validation_status,
      },
      training: {
        status: profile.training_status,
        score: profile.training_score,
        completed_at: profile.training_completed_at,
      },
      zoom: {
        session_url: profile.zoom_session_url,
        validated_at: profile.zoom_validated_at,
        attendance_result: profile.zoom_attendance_result,
      },
      correction_requests: profile.correction_requests || null,
      timestamps: {
        submitted_at: profile.submitted_at,
        reviewed_at: profile.reviewed_at,
        approved_at: profile.approved_at,
        rejected_at: profile.rejected_at,
        suspended_at: profile.suspended_at,
        last_revalidated_at: profile.last_revalidated_at,
      },
    },
    vehicle: vehicle
      ? {
          id: vehicle.id,
          type: vehicle.type,
          brand: vehicle.brand,
          model: vehicle.model,
          color: vehicle.color,
          year: vehicle.year,
          serial_or_vin: vehicle.serial_or_vin,
          plate: vehicle.plate,
          motor_power: vehicle.motor_power,
          max_assisted_speed: vehicle.max_assisted_speed,
          juridical_classification: vehicle.juridical_classification,
          license_number: vehicle.license_number,
          license_expiration: vehicle.license_expiration,
          insurance_expiration: vehicle.insurance_expiration,
          validation_status: vehicle.validation_status,
          slots: Object.fromEntries(
            Object.keys(vehicle)
              .filter((k) => k.startsWith('photo_') || k.endsWith('_photo') || k === 'video_presentation')
              .map((k) => [k, vehicle[k]?.id ?? vehicle[k] ?? null])
          ),
        }
      : null,
    documentos_requeridos: documentosRequeridosParaCotejo({ profile, user, vehicle }),
    eventos,
    senales,
  };
}

// ---------------------------------------------------------------------------
// Cotejo documental (spec 12B)
// ---------------------------------------------------------------------------
const CHECK_TYPES = ['officially_checked', 'visually_reviewed', 'unavailable', 'not_applicable'];
const RESULTADOS_COTEJO = ['verified', 'not_found', 'mismatch', 'reported', 'unavailable', 'error'];

async function registrarCotejo(caller, id, body) {
  const strapi = global.strapi;
  const profile = await cargarParaAccion(caller, id);

  if (!ESTADOS_EN_REVISION.includes(profile.status)) {
    throw badRequest(`El expediente no esta en revision (${profile.status})`);
  }

  const { document_id, check_type, result } = body;
  if (!document_id || typeof document_id !== 'string') throw badRequest('document_id requerido');
  if (!CHECK_TYPES.includes(check_type)) {
    throw badRequest(`check_type invalido. Usa: ${CHECK_TYPES.join(', ')}`);
  }
  if (!RESULTADOS_COTEJO.includes(result)) {
    throw badRequest(`result invalido. Usa: ${RESULTADOS_COTEJO.join(', ')}`);
  }

  // Un cotejo "oficial" exige fuente y URL/metodo concreto: nunca declarar
  // oficial lo que no se consulto (spec 12B).
  let source_name = body.source_name ? String(body.source_name).trim().slice(0, 200) : null;
  let official_source_url = body.official_source_url
    ? String(body.official_source_url).trim().slice(0, 500)
    : null;
  if (check_type === 'officially_checked' && (!source_name || !official_source_url)) {
    throw badRequest('Un cotejo oficial exige source_name y official_source_url');
  }
  if (check_type === 'unavailable' && !body.notes && !source_name) {
    throw badRequest('Registra el motivo de indisponibilidad (notes o source_name)');
  }

  // El documento debe ser uno de los requeridos por la matriz del expediente.
  const vehicles = await strapi.db.query(UIDS.VEHICLE).findMany({
    where: { delivery_profile: profile.id },
  });
  const vehicle = vehicles[0] || null;
  const user = await strapi.db.query(UIDS.USER).findOne({
    where: { id: profile.user?.id ?? profile.user },
  });
  const requeridos = documentosRequeridosParaCotejo({ profile, user, vehicle }).map((d) => d.document_id);
  if (!requeridos.includes(document_id)) {
    throw badRequest(`El documento ${document_id} no pertenece a la matriz de este expediente`);
  }

  // Evidencia opcional: debe ser un archivo adjunto al expediente y se
  // recalcula su hash (integridad).
  let evidence_file_id = null;
  let evidence_sha256 = null;
  if (body.evidence_file_id !== undefined && body.evidence_file_id !== null) {
    const propio = await archivoPropio(profile, Number(body.evidence_file_id));
    if (!propio) throw badRequest('evidence_file_id no pertenece al expediente');
    const crypto = require('crypto');
    const fs = require('fs');
    const buffer = await fs.promises.readFile(rutaAbsoluta(propio.file));
    evidence_file_id = propio.file.id;
    evidence_sha256 = crypto.createHash('sha256').update(buffer).digest('hex');
  }

  const data_contrastada =
    body.data_contrastada && typeof body.data_contrastada === 'object'
      ? JSON.parse(JSON.stringify(body.data_contrastada))
      : null;

  const evento = await registrarEvento({
    profile: profile.id,
    vehicle: vehicle?.id || null,
    agency: profile.agency?.id ?? profile.agency ?? null,
    actor: caller.id,
    action: ACCIONES.COTEJO_REGISTRADO,
    document_id,
    check_type,
    source_name,
    official_source_url,
    result,
    data_contrastada,
    evidence_file_id,
    evidence_sha256,
    notes: body.notes ? String(body.notes).slice(0, 4000) : null,
  });

  // Motor de senales: cotejo contradictorio => senal ALTA + bloqueo federal.
  const senal = evaluarCotejo({ document_id, result });
  if (senal) {
    await strapi.db.query(UIDS.SIGNAL).create({
      data: { profile: profile.id, rule: senal.regla, level: senal.level, data: senal.data, status: 'activa' },
    });
    await registrarEvento({
      profile: profile.id,
      agency: profile.agency?.id ?? profile.agency ?? null,
      actor: caller.id,
      action: ACCIONES.SENAL_REGISTRADA,
      metadata: senal,
    });

    if (senal.level === 'alta' && profile.status !== 'pending_federal_audit') {
      assertTransicion(profile.status, 'pending_federal_audit');
      await strapi.db.query(UIDS.PROFILE).update({
        where: { id: profile.id },
        data: { status: 'pending_federal_audit' },
      });
      await registrarEvento({
        profile: profile.id,
        agency: profile.agency?.id ?? profile.agency ?? null,
        actor: caller.id,
        action: ACCIONES.BLOQUEO_FEDERAL,
        metadata: { regla: senal.regla, motivo: senal.data.motivo },
      });
    }
  }

  return { evento, senal: senal || null };
}

// ---------------------------------------------------------------------------
// Correcciones
// ---------------------------------------------------------------------------
async function pedirCorrecciones(caller, id, body) {
  const strapi = global.strapi;
  const profile = await cargarParaAccion(caller, id);

  if (!['pending_review', 'eligible_for_video_review'].includes(profile.status)) {
    throw badRequest(`No se pueden pedir correcciones en estado ${profile.status}`);
  }

  const correcciones = Array.isArray(body.corrections) ? body.corrections : [];
  if (correcciones.length === 0 || correcciones.length > 20) {
    throw badRequest('corrections debe ser una lista de 1 a 20 elementos');
  }
  const normalizadas = correcciones.map((c) => ({
    document_id: c.document_id ? String(c.document_id).slice(0, 100) : null,
    campo: c.campo ? String(c.campo).slice(0, 100) : null,
    motivo: String(c.motivo || '').trim().slice(0, 500),
  }));
  if (normalizadas.some((c) => !c.motivo)) {
    throw badRequest('Cada correccion necesita un motivo');
  }

  assertTransicion(profile.status, 'corrections_required');

  await strapi.db.query(UIDS.PROFILE).update({
    where: { id: profile.id },
    data: {
      status: 'corrections_required',
      correction_requests: {
        items: normalizadas,
        requested_at: ahoraISO(),
        requester_id: caller.id,
      },
    },
  });

  await registrarEvento({
    profile: profile.id,
    agency: profile.agency?.id ?? profile.agency ?? null,
    actor: caller.id,
    action: ACCIONES.CORRECCIONES_SOLICITADAS,
    metadata: { correcciones: normalizadas },
  });

  const user = await strapi.db.query(UIDS.USER).findOne({
    where: { id: profile.user?.id ?? profile.user },
  });
  await notificar({
    to: user?.email,
    titulo: 'Tu expediente de repartidor requiere correcciones',
    mensaje: `Tu agencia solicito ${normalizadas.length} correccion(es): ${normalizadas
      .map((c) => c.document_id || c.campo)
      .join(', ')}.`,
    tipo: 'delivery.status.changed',
    link: '/repartidor/estado',
  });

  return { status: 'corrections_required', correcciones: normalizadas };
}

// ---------------------------------------------------------------------------
// Elegible para validacion por video (matriz documental completa)
// ---------------------------------------------------------------------------
async function marcarElegibleVideo(caller, id) {
  const strapi = global.strapi;
  const profile = await cargarParaAccion(caller, id);

  if (profile.status !== 'pending_review') {
    throw badRequest(`El expediente no esta en revision documental (${profile.status})`);
  }

  const vehicles = await strapi.db.query(UIDS.VEHICLE).findMany({
    where: { delivery_profile: profile.id },
  });
  const vehicle = vehicles[0] || null;
  const user = await strapi.db.query(UIDS.USER).findOne({
    where: { id: profile.user?.id ?? profile.user },
  });

  // La electrica debe estar clasificada antes de continuar (spec 4.3/12B).
  if (vehicle?.type === 'bicicleta_electrica' && vehicle.juridical_classification === 'pendiente') {
    throw badRequest(
      'Clasifica primero la bicicleta electrica (bicicleta_asistida o motorizado). Si no puedes clasificarla con seguridad, pide correcciones'
    );
  }

  // Matriz de cotejos completa (12B: sin verificaciones faltantes).
  const cotejos = await cotejosDeExpediente(profile.id);
  const matriz = matrizDocumentalCompleta({ profile, user, vehicle, cotejos });
  if (!matriz.ok) {
    throw badRequest(`Faltan cotejos verificados de: ${matriz.pendientes.join(', ')}`);
  }

  // Revalidacion de vigencias al pasar a la siguiente etapa (12E.16).
  const valVehiculo = validarVehiculo(vehicle, new Date());
  if (!valVehiculo.ok) {
    throw badRequest(
      `El vehiculo ya no cumple (documentos vencidos o faltantes): ${valVehiculo.faltantes
        .map((f) => f.campo || f.media)
        .join(', ')}`
    );
  }

  assertTransicion(profile.status, 'eligible_for_video_review');

  await strapi.db.query(UIDS.PROFILE).update({
    where: { id: profile.id },
    data: { status: 'eligible_for_video_review', reviewed_at: ahoraISO(), reviewer: caller.id },
  });

  await registrarEvento({
    profile: profile.id,
    agency: profile.agency?.id ?? profile.agencia ?? null,
    actor: caller.id,
    action: ACCIONES.MARCADO_ELEGIBLE_VIDEO,
    metadata: { cotejos_verificados: cotejos.length },
  });

  await notificar({
    to: user?.email,
    titulo: 'Documentacion verificada: te espera la sesion de validacion',
    mensaje:
      'Tu documentacion fue verificada por tu agencia. El siguiente paso es la sesion grupal de validacion por videollamada (Zoom).',
    tipo: 'delivery.status.changed',
    link: '/repartidor/estado',
  });

  return { status: 'eligible_for_video_review' };
}

// ---------------------------------------------------------------------------
// Validacion por video (Zoom EXTERNO, spec 12F)
// ---------------------------------------------------------------------------
async function registrarValidacionZoom(caller, id, body) {
  const strapi = global.strapi;
  const profile = await cargarParaAccion(caller, id);

  if (profile.status !== 'eligible_for_video_review') {
    throw badRequest(
      `La validacion por video se registra tras la revision documental (${profile.status})`
    );
  }

  const url = validarUrlZoom(body.zoom_session_url);
  if (!url.ok) throw badRequest(url.errores.join('; '));

  const attendance = body.attendance_result;
  if (!['validado', 'no_validado'].includes(attendance)) {
    throw badRequest('attendance_result debe ser validado | no_validado');
  }

  const validatedAt = body.validated_at ? new Date(body.validated_at) : new Date();
  if (Number.isNaN(validatedAt.getTime())) throw badRequest('validated_at invalida');

  await strapi.db.query(UIDS.PROFILE).update({
    where: { id: profile.id },
    data: {
      zoom_session_url: url.url,
      zoom_validated_at: validatedAt.toISOString(),
      zoom_validator: caller.id,
      zoom_attendance_result: attendance,
    },
  });

  await registrarEvento({
    profile: profile.id,
    agency: profile.agency?.id ?? profile.agencia ?? null,
    actor: caller.id,
    action: ACCIONES.VALIDACION_ZOOM_REGISTRADA,
    metadata: {
      zoom_session_url: url.url,
      attendance_result: attendance,
      notas: body.notas ? String(body.notas).slice(0, 2000) : null,
    },
  });

  return { zoom_attendance_result: attendance };
}

// ---------------------------------------------------------------------------
// Decisiones finales
// ---------------------------------------------------------------------------
async function recolectarGates(profile) {
  const strapi = global.strapi;

  const vehicles = await strapi.db.query(UIDS.VEHICLE).findMany({
    where: { delivery_profile: profile.id },
  });
  const vehicle = vehicles[0] || null;
  const user = await strapi.db.query(UIDS.USER).findOne({
    where: { id: profile.user?.id ?? profile.user },
  });
  const cotejos = await cotejosDeExpediente(profile.id);
  const senalesAltas = await strapi.db.query(UIDS.SIGNAL).count({
    where: { profile: profile.id, level: 'alta', status: 'activa' },
  });
  const agencia = await strapi.db.query(UIDS.AGENCIA).findOne({
    where: { id: profile.agency?.id ?? profile.agency },
  });

  const matriz = matrizDocumentalCompleta({ profile, user, vehicle, cotejos });
  const valVehiculo = validarVehiculo(vehicle, new Date());

  const gates = {
    clabe: Boolean(
      profile.payment_validation_status === 'formato_valido' &&
        profile.payout_clabe_encrypted &&
        profile.account_holder_name
    ),
    capacitacion: profile.training_status === 'aprobado',
    zoom: Boolean(
      profile.zoom_attendance_result === 'validado' &&
        profile.zoom_session_url &&
        profile.zoom_validated_at
    ),
    matriz_documental: matriz.ok,
    matriz_pendientes: matriz.pendientes,
    vehiculo: valVehiculo.ok,
    vehiculo_faltantes: valVehiculo.faltantes,
    senales_altas: senalesAltas === 0,
    agencia_activa: Boolean(agencia && agencia.publishedAt != null),
  };
  gates.ok = Object.entries(gates)
    .filter(([k]) => ['clabe', 'capacitacion', 'zoom', 'matriz_documental', 'vehiculo', 'senales_altas', 'agencia_activa'].includes(k))
    .every(([, v]) => v === true);

  return { gates, vehicle, user };
}

async function aprobar(caller, id) {
  const strapi = global.strapi;
  const profile = await cargarParaAccion(caller, id);

  if (profile.status !== 'eligible_for_video_review') {
    throw conflict(`Solo se aprueba desde eligible_for_video_review (estado actual: ${profile.status})`);
  }

  const { gates, user } = await recolectarGates(profile);
  if (!gates.ok) {
    const fallas = Object.entries(gates)
      .filter(([k, v]) => v === false && typeof v === 'boolean')
      .map(([k]) => k);
    throw badRequest(`No se puede aprobar: ${fallas.join(', ')}`);
  }

  // Bloqueo optimista: dos aprobaciones concurrentes no duplican el acto.
  const aprobado = await strapi.db.query(UIDS.PROFILE).update({
    where: { id: profile.id, status: 'eligible_for_video_review' },
    data: {
      status: 'approved',
      approved_at: ahoraISO(),
      reviewer: caller.id,
      approval_version: (profile.approval_version || 0) + 1,
    },
  });
  if (!aprobado) {
    throw conflict('El expediente fue actualizado por otro revisor; recarga e intentalo de nuevo');
  }

  // Concesion del rol: merge aditivo preservando todo lo demas.
  const otorgamiento = await otorgarRolRepartidor({
    userId: profile.user?.id ?? profile.user,
    actorId: caller.id,
    profileId: profile.id,
    agencyId: profile.agency?.id ?? profile.agency ?? null,
  });

  await registrarEvento({
    profile: profile.id,
    agency: profile.agency?.id ?? profile.agency ?? null,
    actor: caller.id,
    action: ACCIONES.APROBADO,
    metadata: { gates },
  });

  await notificar({
    to: user?.email,
    titulo: otorgamiento.nuevo ? '¡Felicidades! Ya eres repartidor verificado' : 'Tu expediente fue aprobado',
    mensaje: otorgamiento.nuevo
      ? 'Tu agencia aprobo tu expediente y Ciudadan te otorgo el rol de repartidor. Refresca para verlo activo.'
      : 'Tu agencia aprobo tu expediente. El rol de repartidor ya estaba activo en tu cuenta.',
    tipo: 'delivery.status.changed',
    link: '/repartidor/estado',
  });

  return { status: 'approved', rol_otorgado: otorgamiento.nuevo };
}

/**
 * Otorga `repartidor` en roles.extra con merge aditivo e idempotencia.
 * SOLO este modulo lo llama (nunca el frontend, nunca PUT /api/users).
 */
async function otorgarRolRepartidor({ userId, actorId, profileId, agencyId }) {
  const strapi = global.strapi;

  const fresco = await strapi.db.query(UIDS.USER).findOne({ where: { id: userId } });
  if (!fresco) throw notFound('El usuario del expediente no existe');

  const roles = fresco.roles && typeof fresco.roles === 'object' ? fresco.roles : {};
  const extra = Array.isArray(roles.extra) ? roles.extra : [];

  if (extra.includes(ROL_REPARTIDOR)) {
    await registrarEvento({
      profile: profileId,
      agency: agencyId,
      actor: actorId,
      action: ACCIONES.ROL_OTORGADO_IDEMPOTENTE,
      metadata: { motivo: 'ya tenia el rol' },
    });
    return { nuevo: false };
  }

  const fusionado = {
    ...roles, // preserva cualquier otra clave del JSON de roles
    extra: [...new Set([...extra, ROL_REPARTIDOR])], // y todos los roles previos
  };

  try {
    await strapi.db.query(UIDS.USER).update({
      where: { id: userId },
      data: { roles: fusionado },
    });
  } catch (err) {
    await registrarEvento({
      profile: profileId,
      agency: agencyId,
      actor: actorId,
      action: ACCIONES.ROL_OTORGAMIENTO_FALLIDO,
      metadata: { error: String(err.message || err).slice(0, 500) },
    });
    throw conflict('El expediente quedo aprobado pero el otorgamiento del rol fallo; soporte debe intervenir');
  }

  await registrarEvento({
    profile: profileId,
    agency: agencyId,
    actor: actorId,
    action: ACCIONES.ROL_OTORGADO,
    metadata: { rol: ROL_REPARTIDOR, roles_previos: extra },
  });
  return { nuevo: true };
}

async function rechazar(caller, id, body) {
  const strapi = global.strapi;
  const profile = await cargarParaAccion(caller, id);

  if (!['pending_review', 'eligible_for_video_review'].includes(profile.status)) {
    throw conflict(`No se puede rechazar en estado ${profile.status}`);
  }

  const motivo = String(body?.motivo || '').trim();
  if (motivo.length < 20) {
    throw badRequest('El rechazo exige un motivo de al menos 20 caracteres (rechazo motivado, spec)');
  }

  assertTransicion(profile.status, 'rejected');

  await strapi.db.query(UIDS.PROFILE).update({
    where: { id: profile.id },
    data: { status: 'rejected', rejected_at: ahoraISO(), reviewer: caller.id },
  });

  await registrarEvento({
    profile: profile.id,
    agency: profile.agency?.id ?? profile.agency ?? null,
    actor: caller.id,
    action: ACCIONES.RECHAZADO,
    metadata: { motivo },
  });

  const user = await strapi.db.query(UIDS.USER).findOne({
    where: { id: profile.user?.id ?? profile.user },
  });
  await notificar({
    to: user?.email,
    titulo: 'Tu expediente de repartidor fue rechazado',
    mensaje: `Motivo: ${motivo}. Puedes apelar respondiendo a este mensaje o acudiendo a tu agencia.`,
    tipo: 'delivery.status.changed',
    link: '/repartidor/estado',
  });

  return { status: 'rejected', motivo };
}

async function suspender(caller, id, body) {
  const strapi = global.strapi;
  const profile = await cargarParaAccion(caller, id);

  if (profile.status !== 'approved') {
    throw conflict(`Solo se suspenden expedientes aprobados (estado: ${profile.status})`);
  }

  const motivo = String(body?.motivo || '').trim();
  if (motivo.length < 10) {
    throw badRequest('La suspension exige un motivo documentado');
  }

  assertTransicion(profile.status, 'suspended');

  await strapi.db.query(UIDS.PROFILE).update({
    where: { id: profile.id },
    data: { status: 'suspended', suspended_at: ahoraISO() },
  });

  await registrarEvento({
    profile: profile.id,
    agency: profile.agency?.id ?? profile.agency ?? null,
    actor: caller.id,
    action: ACCIONES.SUSPENDIDO,
    metadata: { motivo },
  });

  const user = await strapi.db.query(UIDS.USER).findOne({
    where: { id: profile.user?.id ?? profile.user },
  });
  await notificar({
    to: user?.email,
    titulo: 'Tu perfil de repartidor esta suspendido',
    mensaje: `Motivo: ${motivo}. Tu expediente e historial se conservan.`,
    tipo: 'delivery.status.changed',
    link: '/repartidor/estado',
  });

  return { status: 'suspended', motivo };
}

async function revalidar(caller, id) {
  const strapi = global.strapi;
  const profile = await cargarParaAccion(caller, id);

  if (profile.status !== 'suspended') {
    throw conflict(`Solo se revalidan expedientes suspendidos (estado: ${profile.status})`);
  }

  assertTransicion(profile.status, 'approved');

  await strapi.db.query(UIDS.PROFILE).update({
    where: { id: profile.id },
    data: {
      status: 'approved',
      last_revalidated_at: ahoraISO(),
      approval_version: (profile.approval_version || 0) + 1,
    },
  });

  await registrarEvento({
    profile: profile.id,
    agency: profile.agency?.id ?? profile.agency ?? null,
    actor: caller.id,
    action: ACCIONES.REVALIDADO,
  });

  const user = await strapi.db.query(UIDS.USER).findOne({
    where: { id: profile.user?.id ?? profile.user },
  });
  await notificar({
    to: user?.email,
    titulo: 'Tu perfil de repartidor fue revalidado',
    mensaje: 'Tu agencia reactivo tu perfil de repartidor.',
    tipo: 'delivery.status.changed',
    link: '/repartidor/estado',
  });

  return { status: 'approved' };
}

async function reabrir(caller, id, body) {
  const strapi = global.strapi;
  const profile = await cargarParaAccion(caller, id);

  if (profile.status !== 'rejected') {
    throw conflict(`Solo se reabren expedientes rechazados (estado: ${profile.status})`);
  }

  const motivo = String(body?.motivo || '').trim();
  if (motivo.length < 10) throw badRequest('La reapertura exige un motivo');

  assertTransicion(profile.status, 'pending_review');

  await strapi.db.query(UIDS.PROFILE).update({
    where: { id: profile.id },
    data: { status: 'pending_review', reviewed_at: ahoraISO() },
  });

  await registrarEvento({
    profile: profile.id,
    agency: profile.agency?.id ?? profile.agencia ?? null,
    actor: caller.id,
    action: ACCIONES.REABIERTO,
    metadata: { motivo },
  });

  return { status: 'pending_review' };
}

// ---------------------------------------------------------------------------
// Streaming de evidencias para el revisor (misma agencia)
// ---------------------------------------------------------------------------
async function evidenciaParaRevisor(caller, id, fileId) {
  const profile = await cargarParaAccion(caller, id);
  const propio = await archivoPropio(profile, Number(fileId));
  if (!propio) throw notFound('La evidencia no pertenece a este expediente');
  return propio;
}

module.exports = {
  cola,
  detalle,
  registrarCotejo,
  pedirCorrecciones,
  marcarElegibleVideo,
  registrarValidacionZoom,
  aprobar,
  rechazar,
  suspender,
  revalidar,
  reabrir,
  evidenciaParaRevisor,
  otorgarRolRepartidor,
  verificarAmbito,
  verificarNoEsPropio,
  ROLES_REVISOR,
};
