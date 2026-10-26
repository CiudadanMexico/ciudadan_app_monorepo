'use strict';

/**
 * Matriz de requisitos por tipo de vehiculo + prechecks del expediente
 * (spec §4.1-4.4, §6, §12B, §12E).
 *
 * Invariantes de producto (decisiones cerradas):
 *  - Bicicleta NUNCA exige placa, licencia, tarjeta de circulacion ni poliza.
 *  - Motocicleta SIEMPRE exige licencia, tarjeta de circulacion (placa) y
 *    seguro VIGENTES; no se aprueba sin ellos.
 *  - Bicicleta electrica: si el revisor la clasifica como `motorizado`, se le
 *    exigen los documentos de motocicleta antes de aprobar (no pasa como bici).
 *  - La CLABE y el examen aprobado son requisitos para el envio y la aprobacion.
 */

const { EXAMEN_MINIMO_APROBATORIO, SLOTS_VEHICULO, SLOTS_EXPEDIENTE } = require('./constants');
const { validarIdentidad } = require('./curp');
const { validarClabe } = require('./clabe');

/** Requisitos de campos y evidencias por tipo de vehiculo. */
const REQUISITOS_POR_TIPO = {
  bicicleta: {
    campos: ['brand', 'model', 'color'],
    media: ['photo_front', 'photo_side', 'photo_delivery_bag', 'video_presentation'],
  },
  bicicleta_electrica: {
    campos: ['brand', 'model', 'color', 'motor_power', 'max_assisted_speed'],
    media: [
      'photo_front',
      'photo_side',
      'photo_delivery_bag',
      'video_presentation',
      'motor_label_photo',
    ],
  },
  motocicleta: {
    campos: [
      'brand',
      'model',
      'year',
      'color',
      'plate',
      'license_number',
      'license_expiration',
      'insurance_expiration',
    ],
    media: [
      'photo_front',
      'photo_side',
      'photo_back',
      'photo_helmet',
      'photo_delivery_bag',
      'video_presentation',
      'license_front_photo',
      'license_back_photo',
      'circulation_card_photo',
      'insurance_policy_photo',
    ],
  },
};

/** Tipo efectivo segun clasificacion juridica (spec 4.3). */
function tipoEfectivo(vehicle) {
  if (!vehicle) return null;
  if (vehicle.type === 'bicicleta_electrica' && vehicle.juridical_classification === 'motorizado') {
    return 'motocicleta';
  }
  return vehicle.type;
}

/** Requisitos vigentes del vehiculo (considerando clasificacion). */
function requisitosDeVehiculo(vehicle) {
  const tipo = tipoEfectivo(vehicle);
  return REQUISITOS_POR_TIPO[tipo] || null;
}

/**
 * Campos de texto/fecha del vehiculo (SIN evidencias): valida el REGISTRO
 * inicial del vehiculo. Las evidencias se adjuntan despues por slot y la
 * matriz completa (campos + media) se revisa al ENVIAR y al APROBAR.
 */
function validarCamposVehiculo(vehicle, hoy = new Date()) {
  const faltantes = [];
  if (!vehicle || !vehicle.type) {
    return { ok: false, faltantes: [{ campo: 'type', motivo: 'Tipo de vehiculo requerido' }] };
  }
  const requisitos = REQUISITOS_POR_TIPO[vehicle.type];
  if (!requisitos) {
    return { ok: false, faltantes: [{ campo: 'type', motivo: 'Tipo de vehiculo no permitido' }] };
  }

  for (const campo of requisitos.campos) {
    const valor = vehicle[campo];
    if (valor === undefined || valor === null || String(valor).trim() === '') {
      faltantes.push({ campo, motivo: `Campo requerido para ${vehicle.type}` });
    }
  }

  // Vigencias de motocicleta al capturar (spec 12E.16).
  if (vehicle.type === 'motocicleta') {
    for (const campoFecha of ['license_expiration', 'insurance_expiration']) {
      const valor = vehicle[campoFecha];
      if (valor) {
        const fecha = new Date(`${String(valor).slice(0, 10)}T00:00:00Z`);
        if (!Number.isNaN(fecha.getTime()) && fecha.getTime() < hoy.getTime()) {
          faltantes.push({ campo: campoFecha, motivo: 'El documento esta vencido' });
        }
      }
    }
  }

  return { ok: faltantes.length === 0, faltantes };
}

/**
 * Valida un vehiculo contra su matriz.
 * Devuelve { ok, faltantes: [{ campo|media, motivo }] }.
 */
function validarVehiculo(vehicle, hoy = new Date()) {
  const faltantes = [];
  if (!vehicle || !vehicle.type) {
    return { ok: false, faltantes: [{ campo: 'type', motivo: 'Tipo de vehiculo requerido' }] };
  }

  const requisitos = requisitosDeVehiculo(vehicle);
  if (!requisitos) {
    return { ok: false, faltantes: [{ campo: 'type', motivo: 'Tipo de vehiculo no permitido' }] };
  }

  for (const campo of requisitos.campos) {
    const valor = vehicle[campo];
    if (valor === undefined || valor === null || String(valor).trim() === '') {
      faltantes.push({ campo, motivo: `Campo requerido para ${vehicle.type}` });
    }
  }
  for (const slot of requisitos.media) {
    if (!vehicle[slot]) {
      faltantes.push({ media: slot, motivo: `Evidencia requerida para ${vehicle.type}` });
    }
  }

  // Vigencias de motocicleta: no se aceptan documentos ya vencidos al guardar
  // (spec 12E.16: licencia/seguro vigentes y revisados).
  const esMoto = tipoEfectivo(vehicle) === 'motocicleta';
  if (esMoto) {
    for (const campoFecha of ['license_expiration', 'insurance_expiration']) {
      const valor = vehicle[campoFecha];
      if (valor) {
        const fecha = new Date(`${String(valor).slice(0, 10)}T00:00:00Z`);
        if (!Number.isNaN(fecha.getTime()) && fecha.getTime() < hoy.getTime()) {
          faltantes.push({ campo: campoFecha, motivo: 'El documento esta vencido' });
        }
      }
    }
  }

  return { ok: faltantes.length === 0, faltantes };
}

/**
 * Identidad: frente/reverso satisfechos con documentos propios o reutilizando
 * el INE ya cargado del usuario (spec decision 3: reutilizar identidad sin
 * duplicar almacenamiento). La selfie es SIEMPRE requerida: el INE del
 * usuario no la sustituye (la selfie es el cotejo de vida del solicitante).
 * Devuelve { ok, faltantes, reutilizada }.
 */
function validarIdentidadDocs(profile, user) {
  const faltantes = [];
  const idPropios = Boolean(profile?.id_front && profile?.id_back);
  const reutilizada = !idPropios && Boolean(user?.ine_frente && user?.ine_tras);

  if (!idPropios && !reutilizada) {
    if (!profile?.id_front) faltantes.push({ media: 'id_front', motivo: 'Identificacion oficial (frente) o INE ya cargada en tu perfil' });
    if (!profile?.id_back) faltantes.push({ media: 'id_back', motivo: 'Identificacion oficial (reverso) o INE ya cargada en tu perfil' });
  }
  if (!profile?.selfie) {
    faltantes.push({ media: 'selfie', motivo: 'Selfie del solicitante' });
  }

  return { ok: faltantes.length === 0, faltantes, reutilizada };
}

/** Slots de evidencia del vehiculo validos (para el endpoint de evidencias). */
function slotValidoDeVehiculo(slot) {
  return SLOTS_VEHICULO.includes(slot);
}

/** Slots de evidencia del expediente validos. */
function slotValidoDeExpediente(slot) {
  return SLOTS_EXPEDIENTE.includes(slot);
}

/**
 * Prechecks de ENVIO a revision (spec §6.10): el backend valida la
 * completitud, nunca el frontend.
 * Devuelve { ok, faltantes[], identidadReutilizada }.
 */
function prechecksEnvio({ profile, vehicle, user, hoy = new Date() } = {}) {
  const faltantes = [];

  if (!profile) return { ok: false, faltantes: [{ campo: 'profile', motivo: 'Expediente inexistente' }] };

  // 1) Identidad: datos (CURP/edad) + documentos propios o reutilizados.
  const identidad = validarIdentidad({ curp: profile.curp, birthdate: profile.birthdate });
  if (!identidad.ok) {
    for (const e of identidad.errores) faltantes.push({ campo: 'identidad', motivo: e });
  }
  if (!profile.phone) faltantes.push({ campo: 'phone', motivo: 'Telefono de contacto requerido' });

  const docs = validarIdentidadDocs(profile, user);
  faltantes.push(...docs.faltantes);

  // 2) CLABE protegida antes de enviar a revision (spec decision 11).
  if (profile.payment_validation_status !== 'formato_valido' || !profile.payout_clabe_encrypted || !profile.account_holder_name) {
    faltantes.push({ campo: 'clabe', motivo: 'CLABE valida (con dígito de control) y titular declarado' });
  }

  // 3) Vehiculo permitido y completo segun su matriz.
  if (!vehicle) {
    faltantes.push({ campo: 'vehicle', motivo: 'Registra un vehiculo permitido (bicicleta, bicicleta electrica o motocicleta)' });
  } else {
    const val = validarVehiculo(vehicle, hoy);
    faltantes.push(...val.faltantes);
  }

  // 4) Capacitacion aprobada (>= 8/10).
  if (profile.training_status !== 'aprobado') {
    faltantes.push({ campo: 'training', motivo: `Examen de capacitacion aprobado (minimo ${EXAMEN_MINIMO_APROBATORIO}/10)` });
  }

  // 5) Terminos y privacidad aceptados en su version vigente.
  if (!profile.terms_accepted_at || !profile.privacy_accepted_at) {
    faltantes.push({ campo: 'terms', motivo: 'Acepta el convenio y el aviso de privacidad' });
  }

  // Nota: contacto de emergencia es OPCIONAL en el MVP (spec 4.1 lo deja
  // "propuesta operativa; confirmar" — decision de producto abierta, documentada).

  return { ok: faltantes.length === 0, faltantes, identidadReutilizada: docs.reutilizada };
}

/**
 * Documentos cuyo cotejo exige la matriz de verificacion oficial (spec 12B).
 * Incluye identidad (propios o reutilizados del usuario) + los del vehiculo.
 */
function documentosRequeridosParaCotejo({ profile, user, vehicle }) {
  const docs = [];
  const identidad = validarIdentidadDocs(profile, user);

  if (identidad.reutilizada) {
    docs.push({ document_id: 'ine_frente', label: 'INE del usuario (frente, reutilizada)' });
    docs.push({ document_id: 'ine_tras', label: 'INE del usuario (reverso, reutilizada)' });
  } else {
    docs.push({ document_id: 'id_front', label: 'Identificacion oficial (frente)' });
    docs.push({ document_id: 'id_back', label: 'Identificacion oficial (reverso)' });
  }
  docs.push({ document_id: 'selfie', label: 'Selfie del solicitante' });

  const requisitos = requisitosDeVehiculo(vehicle);
  if (requisitos) {
    for (const slot of requisitos.media) {
      if (slot === 'video_presentation') {
        docs.push({ document_id: slot, label: 'Video con repartidor y vehiculo' });
      } else {
        docs.push({ document_id: slot, label: `Evidencia: ${slot}` });
      }
    }
  }

  return docs;
}

/**
 * Completitud de la matriz documental: cada documento requerido tiene un
 * cotejo vigente con resultado 'verified' (sea oficial o visual; la
 * disponibilidad de fuente oficial varia por documento — spec 12B).
 * `cotejos`: lista de eventos de cotejo (document_id, check_type, result,
 * official_source_url) ordenada por fecha ASC; se toma el ULTIMO por documento.
 */
function matrizDocumentalCompleta({ profile, user, vehicle, cotejos }) {
  const requeridos = documentosRequeridosParaCotejo({ profile, user, vehicle }).map((d) => d.document_id);
  const ultimoPorDoc = new Map();

  for (const cotejo of cotejos || []) {
    ultimoPorDoc.set(cotejo.document_id, cotejo);
  }

  const pendientes = [];
  for (const docId of requeridos) {
    const cotejo = ultimoPorDoc.get(docId);
    if (!cotejo) {
      pendientes.push(docId);
      continue;
    }
    if (cotejo.result !== 'verified') {
      pendientes.push(docId);
      continue;
    }
    // Un cotejo declarado oficial sin URL/método de fuente es una marcacion
    // falsa: no cuenta como verificacion (spec 12B: "no habilitar aprobar si
    // se marcaron falsamente como oficiales").
    if (cotejo.check_type === 'officially_checked' && !cotejo.official_source_url) {
      pendientes.push(docId);
    }
  }

  return { ok: pendientes.length === 0, pendientes };
}

module.exports = {
  REQUISITOS_POR_TIPO,
  tipoEfectivo,
  requisitosDeVehiculo,
  validarCamposVehiculo,
  validarVehiculo,
  validarIdentidadDocs,
  slotValidoDeVehiculo,
  slotValidoDeExpediente,
  prechecksEnvio,
  documentosRequeridosParaCotejo,
  matrizDocumentalCompleta,
  validarClabe,
};
