'use strict';

// El cifrado de la CLABE deriva su clave de APP_KEYS: en pruebas se fija
// antes de cualquier require.
process.env.APP_KEYS = process.env.APP_KEYS || 'clave-solo-para-tests';

/**
 * Flujo integral del MVP de repartidores contra los servicios reales con
 * mock de Strapi: cobertura, alta idempotente, CLABE protegida, vehiculo,
 * examen, envio con prechecks, revisor por agencia (ambito/vigencia/no-auto),
 * cotejos, zoom, aprobacion con concesion de rol, senales altas, federal y
 * lista de espera. Es la suite de criterios de aceptacion de la spec (§10/§12E).
 */

const test = require('node:test');
const assert = require('node:assert/strict');

const { crearStrapiRepartidoresMock } = require('./helpers/strapi-mock-repartidores');
const { UIDS } = require('../src/api/delivery-registration/utils/constants');
const { PREGUNTAS, EXAMEN_MINIMO_APROBATORIO } = require('../src/api/delivery-registration/utils/questionnaire');

const expedienteService = require('../src/api/delivery-registration/services/expediente-service');
const revisionService = require('../src/api/delivery-registration/services/revision-service');
const federalService = require('../src/api/delivery-registration/services/federal-service');
const waitlistService = require('../src/api/delivery-registration/services/waitlist-service');
const evidenciasService = require('../src/api/delivery-registration/services/evidencias-service');

const CLABE_VALIDA = '002180000123456789';
const CURP_VALIDA = 'GARC900520HDFRRT09';

function respuestasCorrectas(n) {
  const respuestas = {};
  for (let i = 0; i < PREGUNTAS.length; i++) {
    respuestas[PREGUNTAS[i].id] = i < n ? PREGUNTAS[i].correcta : (PREGUNTAS[i].correcta + 1) % 4;
  }
  return respuestas;
}

function montar() {
  const notificaciones = [];
  const mock = crearStrapiRepartidoresMock({
    tablas: {
      [UIDS.USER]: [
        { id: 7, email: 'nuevo@ciudadan.org', roles: { extra: [] } },
        { id: 8, email: 'socio@ciudadan.org', roles: { extra: ['socio'] }, agencia: 3, membresia_vigente: true },
        { id: 9, email: 'otra@ciudadan.org', roles: { extra: ['socio'] }, agencia: 4, membresia_vigente: true },
        { id: 10, email: 'vencido@ciudadan.org', roles: { extra: ['socio'] }, agencia: 3, membresia_vigente: false, verificado: false },
        { id: 11, email: 'admin@ciudadan.org', roles: { extra: ['admin'] }, agencia: 3, membresia_vigente: false },
        { id: 20, email: 'segundo@ciudadan.org', roles: { extra: [] } },
      ],
      [UIDS.AGENCIA]: [
        { id: 3, nombre: 'Agencia CDMX Centro', tipo: 'local', publishedAt: '2026-01-01T00:00:00Z' },
        { id: 4, nombre: 'Agencia CDMX Norte', tipo: 'local', publishedAt: '2026-01-01T00:00:00Z' },
        { id: 5, nombre: 'Agencia Suspendida', tipo: 'local', publishedAt: null },
        { id: 6, nombre: 'Agencia Federal', tipo: 'federal', publishedAt: '2026-01-01T00:00:00Z' },
      ],
      [UIDS.PROFILE]: [],
      [UIDS.VEHICLE]: [],
      [UIDS.EVENT]: [],
      [UIDS.TRAINING]: [],
      [UIDS.SIGNAL]: [],
      [UIDS.WAITLIST]: [],
    },
    servicios: {
      'api::notificacion.notificacion': {
        createForUser: async (input) => {
          notificaciones.push(input);
          return { user_email: input.to };
        },
        emitRealtime: async () => ({ emitted: true }),
        toPublicNotification: (e) => e,
      },
    },
  });
  return { mock, notificaciones };
}

/** Crea y completa un expediente hasta dejarlo ENVIADO (pending_review). */
async function crearExpedienteCompleto(mock, { userId = 7, type = 'bicicleta' } = {}) {
  const user = mock.tablas[UIDS.USER].find((u) => u.id === userId);

  const { profile } = await expedienteService.iniciarExpediente({ user, agency_id: 3, territory: 'CDMX' });
  await expedienteService.actualizarExpediente({
    user,
    body: {
      phone: '5512345678',
      curp: CURP_VALIDA,
      birthdate: '1990-05-20',
      emergency_contact_name: 'Contacto',
      emergency_contact_phone: '5587654321',
      account_holder_name: 'Carlos Garcia',
      payout_clabe: CLABE_VALIDA,
      accept_terms: true,
    },
  });

  const vehiculoBody = { type, brand: 'Marca', model: 'Modelo', color: 'Rojo' };
  if (type === 'motocicleta') {
    Object.assign(vehiculoBody, {
      year: 2022,
      plate: 'ABC-123-D',
      license_number: 'LIC123',
      license_expiration: '2027-12-31',
      insurance_expiration: '2027-06-30',
    });
  }
  const vehicle = await expedienteService.registrarVehiculo({ user, body: vehiculoBody });

  // Evidencias: se fijan directamente (la ruta de adjunto se prueba aparte).
  const p = mock.tablas[UIDS.PROFILE].find((x) => x.id === profile.id);
  p.id_front = 101;
  p.id_back = 102;
  p.selfie = 103;

  const v = mock.tablas[UIDS.VEHICLE].find((x) => x.id === vehicle.id);
  const mediaBici = ['photo_front', 'photo_side', 'photo_delivery_bag', 'video_presentation'];
  const mediaMoto = [
    'photo_front', 'photo_side', 'photo_back', 'photo_helmet', 'photo_delivery_bag',
    'video_presentation', 'license_front_photo', 'license_back_photo',
    'circulation_card_photo', 'insurance_policy_photo',
  ];
  for (const slot of type === 'motocicleta' ? mediaMoto : mediaBici) v[slot] = 200 + mediaBici.indexOf(slot);

  await expedienteService.presentarExamen({ user, respuestas: respuestasCorrectas(EXAMEN_MINIMO_APROBATORIO) });

  const envio = await expedienteService.enviarExpediente({ user });
  return { profileId: profile.id, vehicleId: vehicle.id, envio };
}

/** Marca la matriz documental completa con cotejos verificados. */
async function cotejarTodo(mock, profileId, { check_type = 'visually_reviewed' } = {}) {
  const profile = mock.tablas[UIDS.PROFILE].find((p) => p.id === profileId);
  const vehicle = mock.tablas[UIDS.VEHICLE].find((v) => v.delivery_profile === profileId);
  const user = mock.tablas[UIDS.USER].find((u) => u.id === profile.user);

  const { documentosRequeridosParaCotejo } = require('../src/api/delivery-registration/utils/requirements');
  const requeridos = documentosRequeridosParaCotejo({ profile, user, vehicle });

  const reviewer = mock.tablas[UIDS.USER].find((u) => u.id === 8);
  for (const doc of requeridos) {
    await revisionService.registrarCotejo(reviewer, profileId, {
      document_id: doc.document_id,
      check_type,
      result: 'verified',
      source_name: check_type === 'officially_checked' ? 'Portal oficial' : null,
      official_source_url: check_type === 'officially_checked' ? 'https://fuente.gob.mx' : null,
      notes: 'Cotejo de prueba',
    });
  }
}

// ---------------------------------------------------------------------------
// Cobertura e inicio
// ---------------------------------------------------------------------------
test('coverage: solo agencias publicadas; ciudad no habilitada sugiere waitlist', async () => {
  const { mock } = montar();

  const ok = await expedienteService.agenciasElegibles('CDMX');
  assert.equal(ok.ok, true);
  assert.deepEqual(ok.data.map((a) => a.id).sort(), [3, 4, 6].sort(), 'la suspendida (5) no es elegible');
  assert.equal(ok.waitlist, false);

  const monterrey = await expedienteService.agenciasElegibles('MONTERREY');
  assert.equal(monterrey.ok, false);
  assert.equal(monterrey.waitlist, true);
});

test('iniciar: rechaza agencia no elegible y es idempotente', async () => {
  const { mock } = montar();
  const user = mock.tablas[UIDS.USER][0];

  await assert.rejects(
    () => expedienteService.iniciarExpediente({ user, agency_id: 5, territory: 'CDMX' }),
    (e) => e.status === 400 && /no esta activa/.test(e.message),
    'agencia despublicada no es elegible'
  );
  await assert.rejects(
    () => expedienteService.iniciarExpediente({ user, agency_id: 99, territory: 'CDMX' }),
    (e) => e.status === 400,
    'id arbitrario rechazado'
  );

  const primero = await expedienteService.iniciarExpediente({ user, agency_id: 3, territory: 'CDMX' });
  assert.equal(primero.creado, true);
  const segundo = await expedienteService.iniciarExpediente({ user, agency_id: 4, territory: 'CDMX' });
  assert.equal(segundo.creado, false, 'idempotente: no crea segundo expediente');
  assert.equal(segundo.profile.id, primero.profile.id);
});

// ---------------------------------------------------------------------------
// Datos, CLABE y CURP
// ---------------------------------------------------------------------------
test('actualizar: CLABE invalida rechazada; valida se guarda cifrada y solo last4', async () => {
  const { mock } = montar();
  const user = mock.tablas[UIDS.USER][0];
  await expedienteService.iniciarExpediente({ user, agency_id: 3 });

  await assert.rejects(
    () => expedienteService.actualizarExpediente({ user, body: { payout_clabe: '002180000123456780' } }),
    (e) => e.status === 400 && /dígito de control/.test(e.message)
  );

  await expedienteService.actualizarExpediente({ user, body: { payout_clabe: CLABE_VALIDA, account_holder_name: 'Carlos' } });

  const p = mock.tablas[UIDS.PROFILE][0];
  assert.equal(p.payment_validation_status, 'formato_valido');
  assert.equal(p.payout_clabe_last4, '6789');
  assert.ok(p.payout_clabe_encrypted.startsWith('v1:'));
  assert.ok(!JSON.stringify(p).includes(CLABE_VALIDA), 'la CLABE en claro jamas se persiste');
});

test('actualizar: CURP de menor de edad rechazada; CURP valida se guarda', async () => {
  const { mock } = montar();
  const user = mock.tablas[UIDS.USER][0];
  await expedienteService.iniciarExpediente({ user, agency_id: 3 });

  await assert.rejects(
    () => expedienteService.actualizarExpediente({
      user,
      body: { curp: 'GARC100520HDFRRT09', birthdate: '2010-05-20' },
    }),
    (e) => e.status === 400 && /18/.test(e.message)
  );

  await expedienteService.actualizarExpediente({ user, body: { curp: CURP_VALIDA, birthdate: '1990-05-20' } });
  assert.equal(mock.tablas[UIDS.PROFILE][0].curp, CURP_VALIDA);
});

// ---------------------------------------------------------------------------
// Vehiculo y examen
// ---------------------------------------------------------------------------
test('vehiculo: bici no exige placa; moto exige sus campos; anio invalido rechazado', async () => {
  const { mock } = montar();
  const user = mock.tablas[UIDS.USER][0];
  await expedienteService.iniciarExpediente({ user, agency_id: 3 });

  const bici = await expedienteService.registrarVehiculo({ user, body: { type: 'bicicleta', brand: 'B', model: 'M', color: 'C' } });
  assert.ok(!bici.plate, 'la bici jamas lleva placa');

  const motoIncompleta = await assert.rejects(
    () => expedienteService.registrarVehiculo({ user, body: { type: 'motocicleta', brand: 'B', model: 'M', color: 'C' } }),
    (e) => e.status === 400 && /plate/.test(e.message)
  );

  const moto = await expedienteService.registrarVehiculo({
    user,
    body: { type: 'motocicleta', brand: 'B', model: 'M', color: 'C', year: 2022, plate: 'ABC-123-D', license_number: 'L1', license_expiration: '2027-01-01', insurance_expiration: '2027-01-01' },
  });
  assert.equal(moto.plate, 'ABC-123-D');
  assert.equal(moto.type, 'motocicleta');

  await assert.rejects(
    () => expedienteService.registrarVehiculo({ user, body: { type: 'bicicleta', brand: 'B', model: 'M', color: 'C', year: 1800 } }),
    (e) => e.status === 400 && /Anio/.test(e.message)
  );
});

test('examen: 8 aprueba; 7 reprueba; los intentos se conservan', async () => {
  const { mock } = montar();
  const user = mock.tablas[UIDS.USER][0];
  await expedienteService.iniciarExpediente({ user, agency_id: 3 });

  const reprobado = await expedienteService.presentarExamen({ user, respuestas: respuestasCorrectas(7) });
  assert.equal(reprobado.passed, false);
  const aprobado = await expedienteService.presentarExamen({ user, respuestas: respuestasCorrectas(8) });
  assert.equal(aprobado.passed, true);
  assert.equal(mock.tablas[UIDS.TRAINING].length, 2, 'se conservan todos los intentos');
  assert.equal(mock.tablas[UIDS.PROFILE][0].training_status, 'aprobado');
});

// ---------------------------------------------------------------------------
// Envio a revision
// ---------------------------------------------------------------------------
test('enviar: incompleto rechaza con faltantes; completo pasa a pending_review y notifica', async () => {
  const { mock, notificaciones } = montar();
  const user = mock.tablas[UIDS.USER][0];
  await expedienteService.iniciarExpediente({ user, agency_id: 3 });

  await assert.rejects(
    () => expedienteService.enviarExpediente({ user }),
    (e) => e.status === 400 && /requisitos/.test(e.message)
  );

  // Completar por partes hasta pasar todos los prechecks.
  await expedienteService.actualizarExpediente({
    user,
    body: { phone: '5512345678', curp: CURP_VALIDA, birthdate: '1990-05-20', payout_clabe: CLABE_VALIDA, account_holder_name: 'X', accept_terms: true },
  });
  await expedienteService.registrarVehiculo({ user, body: { type: 'bicicleta', brand: 'B', model: 'M', color: 'C' } });
  const p = mock.tablas[UIDS.PROFILE][0];
  p.id_front = 101; p.id_back = 102; p.selfie = 103;
  const v = mock.tablas[UIDS.VEHICLE][0];
  v.photo_front = 1; v.photo_side = 2; v.photo_delivery_bag = 3; v.video_presentation = 4;
  await expedienteService.presentarExamen({ user, respuestas: respuestasCorrectas(9) });

  const envio = await expedienteService.enviarExpediente({ user });
  assert.equal(envio.status, 'pending_review');
  assert.equal(p.submitted_at !== null, true);
  assert.ok(notificaciones.some((n) => n.type === 'delivery.status.changed'));
});

test('enviar: duplicidad contra expediente aprobado => senal ALTA y bandeja federal', async () => {
  const { mock } = montar();
  const { profileId: primero, vehicleId: primerVehiculo } = await crearExpedienteCompleto(mock, {});
  // Aprueba el primero para dejar un serial "aprobado" en el aire.
  await cotejarTodo(mock, primero);
  await revisionService.marcarElegibleVideo(mock.tablas[UIDS.USER][1], primero);
  await revisionService.registrarValidacionZoom(mock.tablas[UIDS.USER][1], primero, {
    zoom_session_url: 'https://us02web.zoom.us/j/1',
    attendance_result: 'validado',
  });
  await revisionService.aprobar(mock.tablas[UIDS.USER][1], primero);

  const v1 = mock.tablas[UIDS.VEHICLE].find((x) => x.id === primerVehiculo);
  v1.serial_or_vin = 'SERIE-UNICA';

  // Segundo expediente de OTRO usuario con el mismo serial.
  const { profileId: segundo, vehicleId: segundoVehiculo, envio } = await crearExpedienteCompleto(mock, { userId: 20 });
  assert.equal(envio.status, 'pending_review');

  const v2 = mock.tablas[UIDS.VEHICLE].find((x) => x.id === segundoVehiculo);
  v2.serial_or_vin = 'SERIE-UNICA';

  const p2 = mock.tablas[UIDS.PROFILE].find((x) => x.id === segundo);
  p2.status = 'corrections_required';
  const user20 = mock.tablas[UIDS.USER].find((u) => u.id === 20);
  const reenvio = await expedienteService.enviarExpediente({ user: user20 });
  assert.equal(reenvio.status, 'pending_federal_audit', 'senal alta contra aprobado');
  assert.ok(
    reenvio.senales.some((s) => s.level === 'alta' && s.regla === 'duplicidad_vehiculo')
  );
  assert.equal(
    mock.tablas[UIDS.SIGNAL].some((s) => s.level === 'alta' && s.status === 'activa'),
    true
  );
});

// ---------------------------------------------------------------------------
// Ambito del revisor
// ---------------------------------------------------------------------------
test('ambito: otra agencia, socio sin vigencia y auto-revision son bloqueados', async () => {
  const { mock } = montar();
  const { profileId } = await crearExpedienteCompleto(mock, {});

  const socioOtraAgencia = mock.tablas[UIDS.USER].find((u) => u.id === 9);
  await assert.rejects(
    () => revisionService.detalle(socioOtraAgencia, profileId),
    (e) => e.status === 403 && /TU agencia/.test(e.message)
  );

  const socioVencido = mock.tablas[UIDS.USER].find((u) => u.id === 10);
  await assert.rejects(
    () => revisionService.detalle(socioVencido, profileId),
    (e) => e.status === 403 && /membresia/.test(e.message)
  );

  // El propio solicitante (aunque tenga rol socio de la misma agencia).
  const propio = mock.tablas[UIDS.USER][0];
  propio.roles = { extra: ['socio'] };
  propio.agencia = 3;
  propio.membresia_vigente = true;
  await assert.rejects(
    () => revisionService.detalle(propio, profileId),
    (e) => e.status === 403 && /propio/.test(e.message)
  );

  // Socio vigente de la misma agencia: acceso permitido.
  const socio = mock.tablas[UIDS.USER].find((u) => u.id === 8);
  const detalle = await revisionService.detalle(socio, profileId);
  assert.equal(detalle.profile.id, profileId);
});

test('cola: solo expedientes de la propia agencia; root ve todos', async () => {
  const { mock } = montar();
  await crearExpedienteCompleto(mock, {});
  // Un expediente de otra agencia (creado directo en el mock).
  mock.tablas[UIDS.PROFILE].push({ id: 999, user: 5, agency: 4, status: 'pending_review' });

  const socio = mock.tablas[UIDS.USER].find((u) => u.id === 8);
  const colaSocio = await revisionService.cola(socio, {});
  assert.ok(colaSocio.data.every((p) => p.agency_id === 3), 'solo su agencia');
  assert.equal(colaSocio.data.some((p) => p.id === 999), false);

  const root = { id: 77, roles: { extra: ['root'] } };
  const colaRoot = await revisionService.cola(root, {});
  assert.equal(colaRoot.data.some((p) => p.id === 999), true, 'root ve todas');
});

// ---------------------------------------------------------------------------
// Cotejos, elegibilidad, zoom y aprobacion
// ---------------------------------------------------------------------------
test('cotejo oficial sin URL rechazado; con URL se registra y la matriz se completa', async () => {
  const { mock } = montar();
  const { profileId } = await crearExpedienteCompleto(mock, {});
  const socio = mock.tablas[UIDS.USER].find((u) => u.id === 8);

  await assert.rejects(
    () => revisionService.registrarCotejo(socio, profileId, {
      document_id: 'id_front',
      check_type: 'officially_checked',
      result: 'verified',
    }),
    (e) => e.status === 400 && /official_source_url/.test(e.message),
    'cotejo "oficial" sin fuente es marcacion falsa'
  );

  await revisionService.registrarCotejo(socio, profileId, {
    document_id: 'no-existe',
    check_type: 'visually_reviewed',
    result: 'verified',
  }).catch(() => {});

  await assert.rejects(
    () => revisionService.marcarElegibleVideo(socio, profileId),
    (e) => e.status === 400 && /Faltan cotejos/.test(e.message),
    'matriz incompleta no habilita video'
  );

  await cotejarTodo(mock, profileId, { check_type: 'officially_checked' });
  const elegible = await revisionService.marcarElegibleVideo(socio, profileId);
  assert.equal(elegible.status, 'eligible_for_video_review');
});

test('cotejo contradictorio (mismatch) genera senal ALTA y bloqueo federal inmediato', async () => {
  const { mock } = montar();
  const { profileId } = await crearExpedienteCompleto(mock, {});
  const socio = mock.tablas[UIDS.USER].find((u) => u.id === 8);

  const { senal } = await revisionService.registrarCotejo(socio, profileId, {
    document_id: 'id_front',
    check_type: 'officially_checked',
    result: 'mismatch',
    source_name: 'INE',
    official_source_url: 'https://listanominal.ine.mx/',
  });

  assert.equal(senal.level, 'alta');
  const p = mock.tablas[UIDS.PROFILE].find((x) => x.id === profileId);
  assert.equal(p.status, 'pending_federal_audit', 'bloqueo inmediato');

  const casos = await federalService.casos(mock.tablas[UIDS.USER][2], {});
  assert.ok(casos.data.some((c) => c.id === profileId));
});

test('zoom: URL invalida rechazada; valida se registra; aprobar exige validado', async () => {
  const { mock } = montar();
  const { profileId } = await crearExpedienteCompleto(mock, {});
  const socio = mock.tablas[UIDS.USER].find((u) => u.id === 8);
  await cotejarTodo(mock, profileId);
  await revisionService.marcarElegibleVideo(socio, profileId);

  await assert.rejects(
    () => revisionService.registrarValidacionZoom(socio, profileId, {
      zoom_session_url: 'https://evil.com/j/1',
      attendance_result: 'validado',
    }),
    (e) => e.status === 400 && /dominio/.test(e.message)
  );
  await assert.rejects(
    () => revisionService.registrarValidacionZoom(socio, profileId, {
      zoom_session_url: 'https://us02web.zoom.us/j/1?pwd=secreto',
      attendance_result: 'validado',
    }),
    (e) => e.status === 400 && /contrasenas/.test(e.message),
    'sin contrasenas incrustadas'
  );

  // Aprobar sin validacion de zoom: gate falla.
  await assert.rejects(
    () => revisionService.aprobar(socio, profileId),
    (e) => e.status === 400 && /zoom/.test(e.message)
  );

  const ok = await revisionService.registrarValidacionZoom(socio, profileId, {
    zoom_session_url: 'https://us02web.zoom.us/j/987654',
    attendance_result: 'validado',
  });
  assert.equal(ok.zoom_attendance_result, 'validado');
});

test('aprobar: gates completos => approved + rol otorgado con merge; doble aprobacion => 409', async () => {
  const { mock } = montar();
  const { profileId } = await crearExpedienteCompleto(mock, {});
  const socio = mock.tablas[UIDS.USER].find((u) => u.id === 8);
  const solicitante = mock.tablas[UIDS.USER][0];
  solicitante.roles = { extra: ['socio'], area_details: { x: 1 } };

  await cotejarTodo(mock, profileId);
  await revisionService.marcarElegibleVideo(socio, profileId);
  await revisionService.registrarValidacionZoom(socio, profileId, {
    zoom_session_url: 'https://us02web.zoom.us/j/987654',
    attendance_result: 'validado',
  });

  const aprobacion = await revisionService.aprobar(socio, profileId);
  assert.equal(aprobacion.status, 'approved');
  assert.equal(aprobacion.rol_otorgado, true);
  assert.deepEqual(solicitante.roles.extra, ['socio', 'repartidor'], 'merge aditivo');

  const p = mock.tablas[UIDS.PROFILE].find((x) => x.id === profileId);
  assert.equal(p.approval_version, 1);
  assert.ok(p.approved_at);

  // Doble aprobacion: el estado ya no es elegible -> 409.
  await assert.rejects(
    () => revisionService.aprobar(socio, profileId),
    (e) => e.status === 409
  );
});

test('aprobar: agencia despublicada o senal alta activa bloquean', async () => {
  const { mock } = montar();
  const { profileId } = await crearExpedienteCompleto(mock, {});
  const socio = mock.tablas[UIDS.USER].find((u) => u.id === 8);
  await cotejarTodo(mock, profileId);
  await revisionService.marcarElegibleVideo(socio, profileId);
  await revisionService.registrarValidacionZoom(socio, profileId, {
    zoom_session_url: 'https://us02web.zoom.us/j/1',
    attendance_result: 'validado',
  });

  // Agencia suspendida en el intervalo: no se aprueba sin agencia activa.
  const agencia = mock.tablas[UIDS.AGENCIA].find((a) => a.id === 3);
  agencia.publishedAt = null;
  await assert.rejects(
    () => revisionService.aprobar(socio, profileId),
    (e) => e.status === 400 && /agencia_activa/.test(e.message)
  );
  agencia.publishedAt = '2026-01-01T00:00:00Z';

  // Senal alta activa: bloqueo hasta resolucion federal.
  mock.tablas[UIDS.SIGNAL].push({ id: 500, profile: profileId, rule: 'doc_check_conflictivo', level: 'alta', status: 'activa' });
  await assert.rejects(
    () => revisionService.aprobar(socio, profileId),
    (e) => e.status === 400 && /senales_altas/.test(e.message)
  );
});

// ---------------------------------------------------------------------------
// Correcciones, rechazo, suspension, revalidacion
// ---------------------------------------------------------------------------
test('correcciones -> reenvio; rechazo motivado -> reapertura', async () => {
  const { mock } = montar();
  const { profileId } = await crearExpedienteCompleto(mock, {});
  const socio = mock.tablas[UIDS.USER].find((u) => u.id === 8);

  const correcciones = await revisionService.pedirCorrecciones(socio, profileId, {
    corrections: [{ document_id: 'id_front', motivo: 'La foto esta borrosa' }],
  });
  assert.equal(correcciones.status, 'corrections_required');

  const p = mock.tablas[UIDS.PROFILE].find((x) => x.id === profileId);
  assert.deepEqual(p.correction_requests.items[0].document_id, 'id_front');

  // El solicitante corrige y reenvia.
  const reenvio = await expedienteService.enviarExpediente({ user: mock.tablas[UIDS.USER][0] });
  assert.equal(reenvio.status, 'pending_review');
  assert.equal(p.correction_requests, null, 'las correcciones se limpian al reenviar');

  // Rechazo sin motivo suficiente rechazado; con motivo, rechaza y notifica.
  await assert.rejects(
    () => revisionService.rechazar(socio, profileId, { motivo: 'corto' }),
    (e) => e.status === 400 && /20 caracteres/.test(e.message)
  );
  const rechazo = await revisionService.rechazar(socio, profileId, {
    motivo: 'La documentacion presentada no corresponde al solicitante.',
  });
  assert.equal(rechazo.status, 'rejected');

  const reapertura = await revisionService.reabrir(socio, profileId, { motivo: 'El solicitante apelo con nuevos documentos' });
  assert.equal(reapertura.status, 'pending_review');
});

test('suspension conserva historial y rol; revalidacion regresa a approved', async () => {
  const { mock } = montar();
  const { profileId } = await crearExpedienteCompleto(mock, {});
  const socio = mock.tabitas = mock.tablas[UIDS.USER].find((u) => u.id === 8);
  await cotejarTodo(mock, profileId);
  await revisionService.marcarElegibleVideo(socio, profileId);
  await revisionService.registrarValidacionZoom(socio, profileId, {
    zoom_session_url: 'https://us02web.zoom.us/j/1',
    attendance_result: 'validado',
  });
  await revisionService.aprobar(socio, profileId);

  const suspension = await revisionService.suspender(socio, profileId, {
    motivo: 'Denuncia por conducta irregular en via publica',
  });
  assert.equal(suspension.status, 'suspended');

  const solicitante = mock.tablas[UIDS.USER][0];
  assert.ok(solicitante.roles.extra.includes('repartidor'), 'el rol se conserva en suspension (spec §8)');

  const eventos = mock.tablas[UIDS.EVENT];
  assert.ok(eventos.some((e) => e.action === 'approved'));
  assert.ok(eventos.some((e) => e.action === 'suspended'), 'el historial no se borra');

  const revalidacion = await revisionService.revalidar(socio, profileId);
  assert.equal(revalidacion.status, 'approved');
  const p = mock.tablas[UIDS.PROFILE].find((x) => x.id === profileId);
  assert.equal(p.approval_version, 2);
});

// ---------------------------------------------------------------------------
// Federal
// ---------------------------------------------------------------------------
test('federal: resolver devolviendo reactiva la agencia; mantener bloqueo solo deja huella', async () => {
  const { mock } = montar();
  const { profileId } = await crearExpedienteCompleto(mock, {});
  const socio = mock.tablas[UIDS.USER].find((u) => u.id === 8);
  await revisionService.registrarCotejo(socio, profileId, {
    document_id: 'id_front',
    check_type: 'officially_checked',
    result: 'mismatch',
    source_name: 'INE',
    official_source_url: 'https://listanominal.ine.mx/',
  });
  const senalId = mock.tablas[UIDS.SIGNAL][0].id;

  const federal = mock.tablas[UIDS.USER].find((u) => u.id === 11);
  federal.agencia = 6;
  federal.roles = { extra: ['socio'] };

  const mantener = await federalService.resolver(federal, senalId, {
    decision: 'mantener_bloqueo',
    hallazgo: 'Se requiere mayor evidencia del cotejo',
  });
  assert.equal(mantener.senal_resuelta, false);
  assert.equal(mock.tablas[UIDS.SIGNAL][0].status, 'activa');

  const devolver = await federalService.resolver(federal, senalId, {
    decision: 'devolver_agencia',
    hallazgo: 'Falso positivo: el documento si corresponde',
  });
  assert.equal(devolver.senal_resuelta, true);
  assert.equal(devolver.status, 'pending_review');
  const p = mock.tablas[UIDS.PROFILE].find((x) => x.id === profileId);
  assert.equal(p.status, 'pending_review');
  assert.equal(mock.tablas[UIDS.SIGNAL][0].status, 'resuelta');

  await assert.rejects(
    () => federalService.resolver(federal, senalId, { decision: 'devolver_agencia', hallazgo: 'repetir' }),
    (e) => e.status === 400 && /ya fue resuelta/.test(e.message),
    'senal resuelta no se resuelve dos veces'
  );
});

// ---------------------------------------------------------------------------
// Lista de espera
// ---------------------------------------------------------------------------
test('waitlist: consentimiento, dedup, baja y re-alta', async () => {
  const { mock } = montar();

  await assert.rejects(
    () => waitlistService.suscribir({ email: 'ana@x.org', city: 'CDMX', consent: false, ip: '1.1.1.1' }),
    (e) => e.status === 400 && /consentimiento/.test(e.message)
  );

  const alta = await waitlistService.suscribir({ email: 'Ana@X.org', city: 'CDMX', consent: true, ip: '1.1.1.1' });
  assert.equal(alta.creado, true);
  assert.equal(mock.tablas[UIDS.WAITLIST][0].email, 'ana@x.org', 'email normalizado');

  await assert.rejects(
    () => waitlistService.suscribir({ email: 'ana@x.org', city: 'CDMX', consent: true, ip: '1.1.1.1' }),
    (e) => e.status === 409 && /ya esta/.test(e.message),
    'dedup por email unico'
  );

  const baja = await waitlistService.baja({ email: 'ana@x.org' });
  assert.equal(baja.estado, 'dada_de_baja');

  const reactivada = await waitlistService.suscribir({ email: 'ana@x.org', city: 'Guadalajara', consent: true, ip: '2.2.2.2' });
  assert.equal(reactivada.creado, false);
  assert.equal(reactivada.reactivado, true);
  assert.equal(mock.tablas[UIDS.WAITLIST].length, 1, 'no se duplica la fila');
});

test('waitlist: rate limit corta rafagas del mismo origen', async () => {
  const { mock } = montar();
  // La clave del limitador es ip+email: el mismo origen agotando la ventana
  // (el 409 de dedup tambien consume intento, igual que en driver-launch).
  const EMAIL = 'rafaga@x.org';
  const resultados = [];
  for (let i = 0; i < 6; i++) {
    try {
      await waitlistService.suscribir({ email: EMAIL, city: 'CDMX', consent: true, ip: '9.9.9.9' });
      resultados.push('ok');
    } catch (e) {
      resultados.push(e.status);
    }
  }
  assert.equal(resultados[0], 'ok');
  assert.deepEqual(resultados.slice(1, 5), [409, 409, 409, 409], 'dedup entre rafaga');
  assert.equal(resultados[5], 429, 'el sexto intento cae en rate limit');
});
