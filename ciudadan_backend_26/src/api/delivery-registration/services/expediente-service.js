'use strict';

/**
 * Servicio central del expediente de repartidor (solicitante):
 * cobertura de agencias, inicio idempotente, consulta propia, edicion,
 * vehiculo, capacitacion y envio a revision. La autorizacion SIEMPRE se
 * resuelve desde ctx.state.strapiUser (policy Auth0); el frontend nunca
 * manda user_id, status, reviewer, agency_id arbitrario ni roles.
 */

const {
  UIDS,
  CIUDADES_HABILITADAS,
  COVERAGE_VERSION,
  TIPOS_VEHICULO,
  SLOTS_VEHICULO,
  SLOTS_EXPEDIENTE,
  TERMS_VERSION,
  PRIVACY_VERSION,
  CUESTIONARIO_VERSION,
} = require('../utils/constants');
const { ESTADOS_EDITABLES_SOLICITANTE, assertTransicion, puedeTransicionar } = require('../utils/state-machine');
const { prechecksEnvio, validarCamposVehiculo, validarVehiculo } = require('../utils/requirements');
const { validarIdentidad } = require('../utils/curp');
const { validarClabe } = require('../utils/clabe');
const { cifrarSecreto, cifradoDisponible } = require('../utils/clabe-crypto');
const { calificarExamen, preguntasPublicas, EXAMEN_MINIMO_APROBATORIO } = require('../utils/questionnaire');
const { evaluarVehiculoAlEnviar, evaluarDuplicidad } = require('../utils/senales');
const { ACCIONES } = require('../utils/eventos');
const { registrarEvento } = require('./bitacora');
const { notificar } = require('./notificar');

const badRequest = (mensaje) => {
  const error = new Error(mensaje);
  error.status = 400;
  error.expose = true;
  return error;
};

const ahoraISO = () => new Date().toISOString();

// ---------------------------------------------------------------------------
// Cobertura: agencias ACTIVAS (publicadas) elegibles. No existe modelo
// territorial en el repo (auditoria Fase A): el "activo" vigente es
// publishedAt (draftAndPublish) y el filtro por localidad es suave.
// ---------------------------------------------------------------------------
async function agenciasElegibles(territory) {
  const strapi = global.strapi;

  if (!CIUDADES_HABILITADAS.includes(String(territory || '').toUpperCase())) {
    return {
      ok: false,
      error: `Ciudad no habilitada en el MVP. Habilitadas: ${CIUDADES_HABILITADAS.join(', ')}`,
      waitlist: true,
    };
  }

  const agencias = await strapi.db.query(UIDS.AGENCIA).findMany({
    where: { publishedAt: { $ne: null } },
  });

  const conLocalidad = agencias.filter((a) => a.localidad && typeof a.localidad === 'object');
  const enTerritorio = conLocalidad.filter(
    (a) => String(a.localidad.ciudad || '').toUpperCase() === String(territory).toUpperCase()
  );

  // Filtro suave: si hay agencias con localidad declarada para el territorio,
  // esas son las elegibles; las sin localidad SIEMPRE son candidatas validas
  // (el campo existe en el schema pero hoy no se usa — auditoria §1.2).
  const elegibles = (enTerritorio.length > 0 ? enTerritorio : []).concat(
    agencias.filter((a) => !a.localidad || typeof a.localidad !== 'object')
  );

  return {
    ok: true,
    territory: String(territory).toUpperCase(),
    coverage_version: COVERAGE_VERSION,
    data: elegibles.map((a) => ({ id: a.id, nombre: a.nombre })),
    waitlist: elegibles.length === 0,
  };
}

// ---------------------------------------------------------------------------
// Inicio idempotente del expediente
// ---------------------------------------------------------------------------
async function iniciarExpediente({ user, agency_id, territory = 'CDMX' }) {
  const strapi = global.strapi;

  const territorio = String(territory || '').toUpperCase();
  if (!CIUDADES_HABILITADAS.includes(territorio)) {
    throw badRequest(`Ciudad no habilitada en el MVP: ${territorio}. Habilitadas: ${CIUDADES_HABILITADAS.join(', ')}`);
  }

  const agencyIdNum = Number(agency_id);
  if (!Number.isInteger(agencyIdNum)) {
    throw badRequest('agency_id requerido (elige una agencia de la lista de cobertura)');
  }

  // La agencia se valida CONTRRA LA LISTA del backend: nunca un id arbitrario.
  const cobertura = await agenciasElegibles(territorio);
  if (!cobertura.ok) throw badRequest(cobertura.error);
  if (!cobertura.data.some((a) => a.id === agencyIdNum)) {
    throw badRequest('La agencia no esta activa/eligible para esta ciudad');
  }

  // Idempotencia: un usuario tiene UN expediente de repartidor.
  const existente = await strapi.db.query(UIDS.PROFILE).findOne({ where: { user: user.id } });
  if (existente) {
    return { creado: false, profile: existente };
  }

  const profile = await strapi.db.query(UIDS.PROFILE).create({
    data: {
      user: user.id,
      agency: agencyIdNum,
      territory_ref: territorio,
      agency_assigned_at: ahoraISO(),
      coverage_version: COVERAGE_VERSION,
      status: 'draft',
      current_step: 'identidad',
    },
  });

  await registrarEvento({
    profile: profile.id,
    agency: agencyIdNum,
    actor: user.id,
    action: ACCIONES.APLICACION_INICIADA,
    metadata: { territory: territorio },
  });

  return { creado: true, profile };
}

// ---------------------------------------------------------------------------
// Consulta del propio expediente (proyeccion segura)
// ---------------------------------------------------------------------------
async function miExpediente(user) {
  const strapi = global.strapi;

  const profile = await strapi.db.query(UIDS.PROFILE).findOne({ where: { user: user.id } });
  if (!profile) return { exists: false, data: null };

  const vehicles = await strapi.db.query(UIDS.VEHICLE).findMany({ where: { delivery_profile: profile.id } });
  const vehicle = vehicles[0] || null;

  const faltantes = prechecksEnvio({ profile, vehicle, user }).faltantes;

  // Proyeccion: NUNCA se exponen payout_clabe_encrypted, review_notes,
  // reviewer, curp completa, zoom_validator ni eventos al solicitante.
  return {
    exists: true,
    data: {
      id: profile.id,
      status: profile.status,
      current_step: profile.current_step,
      territory_ref: profile.territory_ref,
      agency_id: profile.agency,
      agency_assigned_at: profile.agency_assigned_at,
      coverage_version: profile.coverage_version,
      identity: {
        phone: profile.phone,
        birthdate: profile.birthdate,
        curp_masked: profile.curp ? `${profile.curp.slice(0, 4)}•••••••••${profile.curp.slice(-2)}` : null,
        emergency_contact_name: profile.emergency_contact_name,
        emergency_contact_phone: profile.emergency_contact_phone,
        identity_verification_status: profile.identity_verification_status,
        slots: {
          id_front: profile.id_front?.id ?? profile.id_front ?? null,
          id_back: profile.id_back?.id ?? profile.id_back ?? null,
          selfie: profile.selfie?.id ?? profile.selfie ?? null,
        },
      },
      payout: {
        clabe_last4: profile.payout_clabe_last4,
        account_holder_name: profile.account_holder_name,
        payment_validation_status: profile.payment_validation_status,
      },
      terms: {
        terms_version: profile.terms_version,
        terms_accepted_at: profile.terms_accepted_at,
        privacy_version: profile.privacy_version,
        privacy_accepted_at: profile.privacy_accepted_at,
      },
      training: {
        status: profile.training_status,
        score: profile.training_score,
        completed_at: profile.training_completed_at,
      },
      zoom: {
        validated: profile.zoom_attendance_result === 'validado',
        validated_at: profile.zoom_validated_at,
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
            validation_status: vehicle.validation_status,
            slots: Object.fromEntries(
              SLOTS_VEHICULO.map((slot) => [slot, vehicle[slot]?.id ?? vehicle[slot] ?? null])
            ),
          }
        : null,
      correction_requests: profile.correction_requests || null,
      timestamps: {
        submitted_at: profile.submitted_at,
        reviewed_at: profile.reviewed_at,
        approved_at: profile.approved_at,
        rejected_at: profile.rejected_at,
        suspended_at: profile.suspended_at,
        last_revalidated_at: profile.last_revalidated_at,
      },
      faltantes,
    },
  };
}

// ---------------------------------------------------------------------------
// Edicion de campos permitidos (solo en estados editables)
// ---------------------------------------------------------------------------
const CAMPOS_EDITABLES = [
  'phone',
  'emergency_contact_name',
  'emergency_contact_phone',
  'account_holder_name',
];

async function actualizarExpediente({ user, body }) {
  const strapi = global.strapi;

  const profile = await strapi.db.query(UIDS.PROFILE).findOne({ where: { user: user.id } });
  if (!profile) throw badRequest('No tienes expediente de repartidor; iniciarlo primero');

  if (!ESTADOS_EDITABLES_SOLICITANTE.includes(profile.status)) {
    throw badRequest(`El expediente esta en revision (${profile.status}) y no puede editarse`);
  }

  const data = {};

  for (const campo of CAMPOS_EDITABLES) {
    if (body[campo] !== undefined) {
      const valor = body[campo];
      if (valor !== null && typeof valor !== 'string') throw badRequest(`${campo} debe ser texto`);
      data[campo] = valor === null ? null : String(valor).trim().slice(0, 200);
    }
  }

  // CURP + fecha de nacimiento (validados en conjunto).
  if (body.curp !== undefined || body.birthdate !== undefined) {
    const identidad = validarIdentidad({
      curp: body.curp !== undefined ? body.curp : profile.curp,
      birthdate: body.birthdate !== undefined ? body.birthdate : profile.birthdate,
    });
    if (!identidad.ok) throw badRequest(identidad.errores.join('; '));
    if (body.curp !== undefined) data.curp = identidad.curp;
    if (body.birthdate !== undefined) {
      data.birthdate = String(body.birthdate).slice(0, 10);
    }
  }

  // CLABE: se valida con checksum, se cifra y SOLO se persisten el sobre
  // cifrado y los ultimos 4 digitos.
  if (body.payout_clabe !== undefined) {
    const validacion = validarClabe(body.payout_clabe);
    if (!validacion.ok) {
      throw badRequest(`CLABE invalida: ${validacion.errores.join('; ')}`);
    }
    if (!cifradoDisponible()) {
      throw badRequest('El servidor no puede guardar la CLABE de forma segura (falta APP_KEYS)');
    }
    const sobre = cifrarSecreto(validacion.clabe);
    if (!sobre) throw badRequest('No fue posible proteger la CLABE; intenta de nuevo');
    data.payout_clabe_encrypted = sobre;
    data.payout_clabe_last4 = validacion.last4;
    data.payment_validation_status = 'formato_valido';
  }

  if (body.account_holder_name !== undefined && !body.account_holder_name) {
    data.account_holder_name = null;
  }

  // Aceptacion de terminos/privacidad (version sellada por el backend).
  if (body.accept_terms === true) {
    data.terms_version = TERMS_VERSION;
    data.terms_accepted_at = ahoraISO();
    data.privacy_version = PRIVACY_VERSION;
    data.privacy_accepted_at = ahoraISO();
  }

  if (Object.keys(data).length === 0) {
    throw badRequest('Nada que actualizar');
  }

  // Primer avance de datos: draft -> pending_documents.
  if (profile.status === 'draft') {
    assertTransicion('draft', 'pending_documents');
    data.status = 'pending_documents';
  }

  const actualizado = await strapi.db.query(UIDS.PROFILE).update({
    where: { id: profile.id },
    data,
  });

  await registrarEvento({
    profile: profile.id,
    agency: profile.agency,
    actor: user.id,
    action: ACCIONES.EXPEDIENTE_ACTUALIZADO,
    metadata: { campos: Object.keys(data).filter((c) => c !== 'status') },
  });

  return actualizado;
}

// ---------------------------------------------------------------------------
// Vehiculo (MVP: uno por expediente, esquema escalable)
// ---------------------------------------------------------------------------
async function registrarVehiculo({ user, body }) {
  const strapi = global.strapi;

  const profile = await strapi.db.query(UIDS.PROFILE).findOne({ where: { user: user.id } });
  if (!profile) throw badRequest('No tienes expediente de repartidor; iniciarlo primero');
  if (!ESTADOS_EDITABLES_SOLICITANTE.includes(profile.status)) {
    throw badRequest(`El expediente esta en revision (${profile.status}) y no puede editarse`);
  }

  const { type } = body;
  if (!TIPOS_VEHICULO.includes(type)) {
    throw badRequest(`Tipo de vehiculo no permitido. Usa: ${TIPOS_VEHICULO.join(', ')}`);
  }

  const datos = { type };
  const CAMPOS_VEHICULO = [
    'brand', 'model', 'color', 'year', 'serial_or_vin', 'plate',
    'motor_power', 'max_assisted_speed',
    'license_number', 'license_expiration', 'insurance_expiration',
  ];
  for (const campo of CAMPOS_VEHICULO) {
    if (body[campo] !== undefined) {
      datos[campo] = body[campo] === null ? null : String(body[campo]).trim().slice(0, 100);
    }
  }
  if (datos.year !== undefined && datos.year !== null) {
    const anio = Number(datos.year);
    if (!Number.isInteger(anio) || anio < 1960 || anio > new Date().getFullYear() + 1) {
      throw badRequest('Anio del vehiculo invalido');
    }
    datos.year = anio;
  }
  if (datos.max_assisted_speed !== undefined && datos.max_assisted_speed !== null) {
    const vel = Number(datos.max_assisted_speed);
    if (!Number.isFinite(vel) || vel < 0 || vel > 100) throw badRequest('Velocidad maxima invalida');
    datos.max_assisted_speed = vel;
  }

  // Bicicleta JAMAS acepta datos de motocicleta (spec: sin placa/licencia).
  if (type === 'bicicleta') {
    delete datos.plate;
    delete datos.license_number;
    delete datos.license_expiration;
    delete datos.insurance_expiration;
    delete datos.motor_power;
    delete datos.max_assisted_speed;
  }

  const validacionCampos = validarCamposVehiculo(datos);
  if (!validacionCampos.ok) {
    throw badRequest(
      `Faltan datos del vehiculo: ${validacionCampos.faltantes.map((f) => f.campo).join(', ')}`
    );
  }

  const existentes = await strapi.db.query(UIDS.VEHICLE).findMany({
    where: { delivery_profile: profile.id },
  });

  let vehicle;
  let actualizado = false;
  if (existentes.length > 0) {
    // MVP: un vehiculo; re-registrar actualiza los campos del existente.
    vehicle = await strapi.db.query(UIDS.VEHICLE).update({
      where: { id: existentes[0].id },
      data: datos,
    });
    actualizado = true;
  } else {
    vehicle = await strapi.db.query(UIDS.VEHICLE).create({
      data: { ...datos, delivery_profile: profile.id },
    });
  }

  await registrarEvento({
    profile: profile.id,
    vehicle: vehicle.id,
    agency: profile.agency,
    actor: user.id,
    action: ACCIONES.VEHICULO_REGISTRADO,
    metadata: { type, actualizado },
  });

  if (profile.status === 'draft') {
    await strapi.db.query(UIDS.PROFILE).update({
      where: { id: profile.id },
      data: { status: 'pending_documents' },
    });
  }

  return vehicle;
}

// ---------------------------------------------------------------------------
// Capacitacion
// ---------------------------------------------------------------------------
async function cuestionario(user) {
  const strapi = global.strapi;
  const profile = await strapi.db.query(UIDS.PROFILE).findOne({ where: { user: user.id } });
  if (!profile) throw badRequest('No tienes expediente de repartidor; iniciarlo primero');

  const intentos = await strapi.db.query(UIDS.TRAINING).findMany({
    where: { profile: profile.id },
    orderBy: { attempted_at: 'desc' },
  });

  return {
    version: CUESTIONARIO_VERSION,
    aprobado_con: EXAMEN_MINIMO_APROBATORIO,
    preguntas: preguntasPublicas(),
    intentos: intentos.map((i) => ({
      attempted_at: i.attempted_at,
      score: i.score,
      passed: i.passed,
    })),
    estado: profile.training_status,
  };
}

async function presentarExamen({ user, respuestas }) {
  const strapi = global.strapi;

  const profile = await strapi.db.query(UIDS.PROFILE).findOne({ where: { user: user.id } });
  if (!profile) throw badRequest('No tienes expediente de repartidor; iniciarlo primero');
  if (!ESTADOS_EDITABLES_SOLICITANTE.includes(profile.status)) {
    throw badRequest(`El expediente esta en revision (${profile.status}); no puedes presentar el examen`);
  }

  const resultado = calificarExamen(respuestas);

  await strapi.db.query(UIDS.TRAINING).create({
    data: {
      profile: profile.id,
      version: CUESTIONARIO_VERSION,
      attempted_at: ahoraISO(),
      score: resultado.score,
      passed: resultado.passed,
    },
  });

  const data = {
    training_status: resultado.passed ? 'aprobado' : 'reprobado',
    training_score: resultado.score,
  };
  if (resultado.passed && !profile.training_completed_at) {
    data.training_completed_at = ahoraISO();
  }

  await strapi.db.query(UIDS.PROFILE).update({ where: { id: profile.id }, data });
  await registrarEvento({
    profile: profile.id,
    agency: profile.agency,
    actor: user.id,
    action: ACCIONES.EXPEDIENTE_ACTUALIZADO,
    metadata: { examen: { score: resultado.score, passed: resultado.passed } },
  });

  // La respuesta nunca incluye las respuestas correctas.
  return { score: resultado.score, total: resultado.total, passed: resultado.passed };
}

// ---------------------------------------------------------------------------
// Envio a revision (prechecks server-side)
// ---------------------------------------------------------------------------
async function enviarExpediente({ user }) {
  const strapi = global.strapi;

  const profile = await strapi.db.query(UIDS.PROFILE).findOne({ where: { user: user.id } });
  if (!profile) throw badRequest('No tienes expediente de repartidor; iniciarlo primero');

  if (!['draft', 'pending_documents', 'corrections_required'].includes(profile.status)) {
    throw badRequest(`El expediente ya fue enviado (estado: ${profile.status})`);
  }

  const vehicles = await strapi.db.query(UIDS.VEHICLE).findMany({ where: { delivery_profile: profile.id } });
  const vehicle = vehicles[0] || null;

  const prechecks = prechecksEnvio({ profile, vehicle, user });
  if (!prechecks.ok) {
    throw badRequest(
      `Falta completar requisitos: ${prechecks.faltantes
        .map((f) => f.campo || f.media || 'documento')
        .join(', ')}`
    );
  }

  assertTransicion(profile.status, 'pending_review');

  // Senales del motor de prevalidacion (spec 12G).
  const senales = [];
  const senalClasificacion = evaluarVehiculoAlEnviar(vehicle);
  if (senalClasificacion) senales.push(senalClasificacion);

  if (vehicle) {
    const condiciones = [];
    if (vehicle.serial_or_vin) condiciones.push({ serial_or_vin: vehicle.serial_or_vin });
    if (vehicle.plate) condiciones.push({ plate: vehicle.plate });
    for (const where of condiciones) {
      const otros = await strapi.db.query(UIDS.VEHICLE).findMany({
        where: { ...where, delivery_profile: { $ne: profile.id } },
      });
      if (otros.length > 0) {
        const otroProfile = await strapi.db.query(UIDS.PROFILE).findOne({
          where: { id: otros[0].delivery_profile },
        });
        const senal = evaluarDuplicidad({
          serial_or_vin: vehicle.serial_or_vin,
          plate: vehicle.plate,
          otro: {
            serial_or_vin: otros[0].serial_or_vin,
            plate: otros[0].plate,
            profile_status: otroProfile?.status || 'desconocido',
          },
        });
        if (senal) senales.push(senal);
      }
    }
  }

  const alta = senales.find((s) => s.level === 'alta');
  const destino = alta ? 'pending_federal_audit' : 'pending_review';

  const actualizado = await strapi.db.query(UIDS.PROFILE).update({
    where: { id: profile.id },
    data: { status: destino, submitted_at: ahoraISO(), correction_requests: null },
  });

  if (prechecks.identidadReutilizada) {
    await registrarEvento({
      profile: profile.id,
      agency: profile.agency,
      actor: user.id,
      action: ACCIONES.IDENTIDAD_REUTILIZADA,
      metadata: { fuente: 'INE ya cargada del usuario (up_users.ine_frente/ine_tras)' },
    });
  }

  await registrarEvento({
    profile: profile.id,
    vehicle: vehicle?.id || null,
    agency: profile.agency,
    actor: user.id,
    action: ACCIONES.ENVIADO_A_REVISION,
    metadata: { destino, senales: senales.map((s) => ({ regla: s.regla, level: s.level })) },
  });

  for (const senal of senales) {
    await strapi.db.query(UIDS.SIGNAL).create({
      data: { profile: profile.id, rule: senal.regla, level: senal.level, data: senal.data, status: 'activa' },
    });
    await registrarEvento({
      profile: profile.id,
      agency: profile.agencia,
      actor: user.id,
      action: ACCIONES.SENAL_REGISTRADA,
      metadata: senal,
    });
  }

  if (alta) {
    await registrarEvento({
      profile: profile.id,
      agency: profile.agency,
      actor: user.id,
      action: ACCIONES.BLOQUEO_FEDERAL,
      metadata: { regla: alta.regla, motivo: alta.data.motivo },
    });
    await notificar({
      to: user.email,
      titulo: 'Expediente de repartidor: sujeto a revision federal',
      mensaje:
        'Tu expediente fue enviado, pero se activo una senal de riesgo alta. Un auditor federal revisara el caso antes de que tu agencia pueda aprobarlo.',
      tipo: 'delivery.status.changed',
      link: '/repartidor/estado',
    });
  } else {
    await notificar({
      to: user.email,
      titulo: 'Expediente de repartidor enviado a revision',
      mensaje:
        'Tu agencia revisara tu documentacion. Te avisaremos por aqui cada cambio de estado.',
      tipo: 'delivery.status.changed',
      link: '/repartidor/estado',
    });
  }

  return { status: destino, senales: senales.map((s) => ({ regla: s.regla, level: s.level })) };
}

module.exports = {
  agenciasElegibles,
  iniciarExpediente,
  miExpediente,
  actualizarExpediente,
  registrarVehiculo,
  cuestionario,
  presentarExamen,
  enviarExpediente,
};
