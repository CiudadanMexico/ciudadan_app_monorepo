'use strict';

process.env.APP_KEYS = process.env.APP_KEYS || 'clave-solo-para-tests';

/**
 * Fase E (QA, spec §11.E) — criterios de aceptacion que no tenian prueba
 * directa en las suites A-D, ejecutados contra los servicios REALES con el
 * mock de Strapi (mismo harness que delivery-flujo):
 *
 *  - §10.15 / §12E.8: NINGUN gate de aprobacion (clabe, capacitacion,
 *    zoom, matriz documental, vehiculo) puede saltarse aunque el expediente
 *    ya este en eligible_for_video_review.
 *  - §11.E expiracion documental: vigencias re-evaluadas ENTRE etapas y
 *    semantica de frontera (comparacion a medianoche UTC, conservadora).
 *  - §10.14: el alta NO escribe ninguna tabla operativa (ordenes,
 *    cotizaciones, cobros, viajes, billeteras) — solo entidades delivery.
 *  - §12E.13: la historia es inmutable tras correcciones: los eventos
 *    previos ni se editan ni se borran, review_version 1..N sin huecos.
 *  - §10.20: revocar el permiso/membresia del socio le corta el paso de
 *    inmediato; el admin conserva el bypass de vigencia (matriz vigente).
 *  - §12E.14: primitiva de bloqueo optimista (update condicional) que
 *    sustenta el 409 de doble aprobacion concurrente.
 */

const test = require('node:test');
const assert = require('node:assert/strict');

const { crearStrapiRepartidoresMock } = require('./helpers/strapi-mock-repartidores');
const { UIDS } = require('../src/api/delivery-registration/utils/constants');
const {
  PREGUNTAS,
  EXAMEN_MINIMO_APROBATORIO,
} = require('../src/api/delivery-registration/utils/questionnaire');
const { validarVehiculo } = require('../src/api/delivery-registration/utils/requirements');

const expedienteService = require('../src/api/delivery-registration/services/expediente-service');
const revisionService = require('../src/api/delivery-registration/services/revision-service');

const CLABE_VALIDA = '002180000123456789';
const CURP_VALIDA = 'GARC900520HDFRRT09';

const ZOOM_OK = { zoom_session_url: 'https://us02web.zoom.us/j/987654', attendance_result: 'validado' };

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
        { id: 11, email: 'admin@ciudadan.org', roles: { extra: ['admin'] }, agencia: 3, membresia_vigente: false },
        { id: 20, email: 'segundo@ciudadan.org', roles: { extra: [] } },
      ],
      [UIDS.AGENCIA]: [
        { id: 3, nombre: 'Agencia CDMX Centro', tipo: 'local', publishedAt: '2026-01-01T00:00:00Z' },
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

/** Fecha UTC a N dias de hoy, en formato YYYY-MM-DD (como la captura de UI). */
function fechaUTC(dias) {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return new Date(d.getTime() + dias * 86400000).toISOString().slice(0, 10);
}

/** Crea y completa un expediente hasta dejarlo ENVIADO (pending_review). */
async function crearExpedienteCompleto(mock, { userId = 7, type = 'motocicleta' } = {}) {
  const user = mock.tablas[UIDS.USER].find((u) => u.id === userId);

  const { profile } = await expedienteService.iniciarExpediente({ user, agency_id: 3, territory: 'CDMX' });
  await expedienteService.actualizarExpediente({
    user,
    body: {
      phone: '5512345678',
      curp: CURP_VALIDA,
      birthdate: '1990-05-20',
      account_holder_name: 'Carlos Garcia',
      payout_clabe: CLABE_VALIDA,
      accept_terms: true,
    },
  });

  const vehiculoBody = { type, brand: 'Marca', model: 'Modelo', color: 'Rojo' };
  if (type === 'bicicleta_electrica') {
    Object.assign(vehiculoBody, { motor_power: '250W', max_assisted_speed: 25 });
  }
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
  const mediaEbike = [...mediaBici, 'motor_label_photo'];
  const slotsMedia = type === 'motocicleta' ? mediaMoto : type === 'bicicleta_electrica' ? mediaEbike : mediaBici;
  for (const slot of slotsMedia) v[slot] = 200 + slotsMedia.indexOf(slot);

  await expedienteService.presentarExamen({ user, respuestas: respuestasCorrectas(EXAMEN_MINIMO_APROBATORIO) });
  await expedienteService.enviarExpediente({ user });
  return { profileId: profile.id, vehicleId: vehicle.id };
}

/** Matriz documental completa con cotejos verificados. */
async function cotejarTodo(mock, profileId) {
  const profile = mock.tablas[UIDS.PROFILE].find((p) => p.id === profileId);
  const vehicle = mock.tablas[UIDS.VEHICLE].find((v) => v.delivery_profile === profileId);
  const user = mock.tablas[UIDS.USER].find((u) => u.id === profile.user);

  const { documentosRequeridosParaCotejo } = require('../src/api/delivery-registration/utils/requirements');
  const requeridos = documentosRequeridosParaCotejo({ profile, user, vehicle });

  const reviewer = mock.tablas[UIDS.USER].find((u) => u.id === 8);
  for (const doc of requeridos) {
    await revisionService.registrarCotejo(reviewer, profileId, {
      document_id: doc.document_id,
      check_type: 'visually_reviewed',
      result: 'verified',
      notes: 'Cotejo de prueba',
    });
  }
}

/** Deja el expediente listo para aprobar: cotejado + video + zoom validado. */
async function dejarElegibleConZoom(mock, profileId) {
  const socio = mock.tablas[UIDS.USER].find((u) => u.id === 8);
  await cotejarTodo(mock, profileId);
  await revisionService.marcarElegibleVideo(socio, profileId);
  await revisionService.registrarValidacionZoom(socio, profileId, ZOOM_OK);
  return socio;
}

// ---------------------------------------------------------------------------
// §10.15 / §12E.8 — cada gate de aprobacion, individualmente
// ---------------------------------------------------------------------------
test('approve: sin CLABE valida no aprueba (gate clabe) aunque ya este en video-review', async () => {
  const { mock } = montar();
  const { profileId } = await crearExpedienteCompleto(mock, {});
  const socio = await dejarElegibleConZoom(mock, profileId);

  const p = mock.tablas[UIDS.PROFILE].find((x) => x.id === profileId);
  const original = p.payment_validation_status;
  p.payment_validation_status = null;

  await assert.rejects(
    () => revisionService.aprobar(socio, profileId),
    (e) => e.status === 400 && /clabe/.test(e.message),
    'sin CLABE validada el gate clabe debe bloquear'
  );
  assert.equal(p.status, 'eligible_for_video_review', 'el estado no cambia en el intento fallido');
  p.payment_validation_status = original;
});

test('approve: sin examen aprobado no aprueba (gate capacitacion)', async () => {
  const { mock } = montar();
  const { profileId } = await crearExpedienteCompleto(mock, {});
  const socio = await dejarElegibleConZoom(mock, profileId);

  const p = mock.tablas[UIDS.PROFILE].find((x) => x.id === profileId);
  const original = p.training_status;
  p.training_status = 'reprobado';

  await assert.rejects(
    () => revisionService.aprobar(socio, profileId),
    (e) => e.status === 400 && /capacitacion/.test(e.message),
    'con examen reprobado el gate capacitacion debe bloquear'
  );
  p.training_status = original;
});

test('approve: zoom no_validado no aprueba (gate zoom)', async () => {
  const { mock } = montar();
  const { profileId } = await crearExpedienteCompleto(mock, {});
  const socio = await dejarElegibleConZoom(mock, profileId);

  const p = mock.tablas[UIDS.PROFILE].find((x) => x.id === profileId);
  const original = p.zoom_attendance_result;
  p.zoom_attendance_result = 'no_validado';

  await assert.rejects(
    () => revisionService.aprobar(socio, profileId),
    (e) => e.status === 400 && /zoom/.test(e.message),
    'asistencia no validada debe bloquear la aprobacion'
  );
  p.zoom_attendance_result = original;
});

test('approve: un cotejo contradictorio POSTERIOR rompe la matriz y no aprueba (gate matriz_documental)', async () => {
  const { mock } = montar();
  const { profileId } = await crearExpedienteCompleto(mock, {});
  const socio = await dejarElegibleConZoom(mock, profileId);

  // El ULTIMO cotejo por documento es el que cuenta: un 'not_found' tardio
  // sobre la selfie reabre el pendiente de la matriz (defensa en profundidad).
  await revisionService.registrarCotejo(socio, profileId, {
    document_id: 'selfie',
    check_type: 'visually_reviewed',
    result: 'not_found',
    notes: 'Al reabrir el expediente la selfie no coincide con la identificacion',
  });

  await assert.rejects(
    () => revisionService.aprobar(socio, profileId),
    (e) => e.status === 400 && /matriz_documental/.test(e.message),
    'la matriz incompleta debe bloquear la aprobacion'
  );

  // Restaurar la matriz con un cotejo verificado la vuelve a completar.
  await revisionService.registrarCotejo(socio, profileId, {
    document_id: 'selfie',
    check_type: 'visually_reviewed',
    result: 'verified',
    notes: 'Cotejo repetido tras nueva revision, si coincide',
  });
  const ok = await revisionService.aprobar(socio, profileId);
  assert.equal(ok.status, 'approved');
});

test('approve: moto con seguro vencido ENTRE etapas no aprueba (gate vehiculo, expiracion documental)', async () => {
  const { mock } = montar();
  const { profileId, vehicleId } = await crearExpedienteCompleto(mock, {});
  const socio = await dejarElegibleConZoom(mock, profileId);

  // El seguro vence despues del envio pero antes de la aprobacion.
  const v = mock.tablas[UIDS.VEHICLE].find((x) => x.id === vehicleId);
  const original = v.insurance_expiration;
  v.insurance_expiration = fechaUTC(-1); // ayer

  await assert.rejects(
    () => revisionService.aprobar(socio, profileId),
    (e) => e.status === 400 && /vehiculo/.test(e.message),
    'la vigencia del seguro se re-evalua al aprobar'
  );

  // Con el seguro repuesto a una fecha futura, la misma aprobacion pasa.
  v.insurance_expiration = original;
  const ok = await revisionService.aprobar(socio, profileId);
  assert.equal(ok.status, 'approved');
  assert.equal(ok.rol_otorgado, true);
});

// ---------------------------------------------------------------------------
// §11.E — expiracion documental: revalidacion entre etapas y frontera UTC
// ---------------------------------------------------------------------------
test('expiracion documental: marcar-video-eligible re-evalua vigencias y rechaza moto vencida', async () => {
  const { mock } = montar();
  const { profileId, vehicleId } = await crearExpedienteCompleto(mock, {});
  const socio = mock.tablas[UIDS.USER].find((u) => u.id === 8);

  const v = mock.tablas[UIDS.VEHICLE].find((x) => x.id === vehicleId);
  v.insurance_expiration = fechaUTC(-1);

  await cotejarTodo(mock, profileId);
  await assert.rejects(
    () => revisionService.marcarElegibleVideo(socio, profileId),
    (e) => e.status === 400 && /vencido/.test(e.message),
    'la vigencia se revalida al pasar a la etapa de video'
  );
  assert.equal(
    mock.tablas[UIDS.PROFILE].find((x) => x.id === profileId).status,
    'pending_review',
    'el expediente permanece en revision documental'
  );
});

test('expiracion documental: frontera a medianoche UTC (conservadora, documenta la semantica)', () => {
  const motoValida = {
    type: 'motocicleta',
    brand: 'M', model: 'N', color: 'R', year: 2022, plate: 'ABC-123-D',
    license_number: 'LIC', license_expiration: '2027-01-01',
    insurance_expiration: '2026-10-23',
    photo_front: 1, photo_side: 1, photo_back: 1, photo_helmet: 1,
    photo_delivery_bag: 1, video_presentation: 1, license_front_photo: 1,
    license_back_photo: 1, circulation_card_photo: 1, insurance_policy_photo: 1,
  };

  // Semantica vigente (requirements.js): la fecha se evalua a T00:00:00Z, de
  // modo que un documento fechado "hoy (UTC)" ya cuenta como vencido en
  // cuanto corre el reloj. Falla hacia lo seguro: nunca se aprueba vencido.
  const hoy = new Date('2026-10-22T15:00:00Z');

  const venceManana = validarVehiculo(
    { ...motoValida, insurance_expiration: '2026-10-23' },
    hoy
  );
  assert.equal(venceManana.ok, true, 'vence manana (UTC): vigente');

  const venceHoy = validarVehiculo(
    { ...motoValida, insurance_expiration: '2026-10-22' },
    hoy
  );
  assert.equal(venceHoy.ok, false, 'vence hoy (UTC 00:00): ya vencido — semantica conservadora');
  assert.ok(venceHoy.faltantes.some((f) => f.campo === 'insurance_expiration'));

  const vencidoAyer = validarVehiculo(
    { ...motoValida, license_expiration: '2026-10-21' },
    hoy
  );
  assert.equal(vencidoAyer.ok, false);
  assert.ok(vencidoAyer.faltantes.some((f) => f.campo === 'license_expiration'));
});

// ---------------------------------------------------------------------------
// §10.14 — el alta no crea ordenes, cotizaciones, cobros ni entregas
// ---------------------------------------------------------------------------
test('flujo completo de alta SOLO escribe entidades delivery (+roles del usuario)', async () => {
  const { mock, notificaciones } = montar();
  const { profileId } = await crearExpedienteCompleto(mock, {});
  const socio = await dejarElegibleConZoom(mock, profileId);
  const aprobacion = await revisionService.aprobar(socio, profileId);
  assert.equal(aprobacion.status, 'approved');

  const uidsEscritos = new Set(mock.escrituras.map((e) => e.uid));
  const permitidos = new Set([
    UIDS.PROFILE,
    UIDS.VEHICLE,
    UIDS.EVENT,
    UIDS.TRAINING,
    UIDS.SIGNAL,
    UIDS.USER, // merge aditivo del rol repartidor en roles.extra
  ]);
  for (const uid of uidsEscritos) {
    assert.ok(permitidos.has(uid), `el alta NO debe escribir fuera del modulo (escribio: ${uid})`);
  }
  const prohibidos = /order|trip|viaje|cotiza|wallet|cartera|pago|payment|stripe|shipment|food|delivery-tarifa/i;
  for (const uid of uidsEscritos) {
    assert.ok(!prohibidos.test(uid), `tabla operativa sospechosa escrita: ${uid}`);
  }

  // Notificaciones por el canal existente (createForUser recibe `type`).
  assert.ok(notificaciones.length >= 3, 'notifica enviado, video-eligible y aprobado');
  assert.ok(notificaciones.every((n) => n.type === 'delivery.status.changed'));
  assert.ok(notificaciones.every((n) => n.link === '/repartidor/estado'), 'link al estado del expediente');
});

// ---------------------------------------------------------------------------
// §12E.13 — historia inmutable tras correcciones
// ---------------------------------------------------------------------------
test('correcciones y reenvio NO editan ni borran eventos; review_version monotono 1..N', async () => {
  const { mock } = montar();
  const { profileId } = await crearExpedienteCompleto(mock, {});
  const socio = mock.tablas[UIDS.USER].find((u) => u.id === 8);
  const user = mock.tablas[UIDS.USER].find((u) => u.id === 7);

  await cotejarTodo(mock, profileId);
  const eventosAntes = mock.tablas[UIDS.EVENT]
    .filter((e) => e.profile === profileId)
    .map((e) => ({ id: e.id, review_version: e.review_version, action: e.action, result: e.result }));
  assert.ok(eventosAntes.length > 0, 'hay eventos previos (alta, envio, cotejos)');

  await revisionService.pedirCorrecciones(socio, profileId, {
    corrections: [{ document_id: 'selfie', motivo: 'La selfie esta borrosa, subela de nuevo' }],
  });

  // El solicitante corrige y reenvia (unico camino por prechecks).
  await expedienteService.actualizarExpediente({ user, body: { phone: '5512300011' } });
  await expedienteService.enviarExpediente({ user });

  const eventosAhora = mock.tablas[UIDS.EVENT].filter((e) => e.profile === profileId);

  // Los eventos previos siguen INTACTOS (mismo id, version y contenido).
  for (const antes of eventosAntes) {
    const actual = eventosAhora.find((e) => e.id === antes.id);
    assert.ok(actual, `el evento ${antes.id} (${antes.action}) sigue presente tras el reenvio`);
    assert.equal(actual.review_version, antes.review_version, 'review_version no se reasigna');
    assert.equal(actual.action, antes.action, 'action no se reescribe');
    assert.equal(actual.result, antes.result, 'result no se reescribe');
  }

  // review_version 1..N sin huecos ni duplicados (ordinal del evento).
  const versiones = eventosAhora.map((e) => e.review_version).sort((a, b) => a - b);
  assert.deepEqual(versiones, versiones.map((_, i) => i + 1), 'review_version 1..N monotono');

  // La correccion fue un evento NUEVO (append-only), no una edicion.
  assert.ok(eventosAhora.some((e) => e.action === 'corrections_requested'));
  assert.ok(eventosAhora.some((e) => e.action === 'submitted' && e.review_version > Math.max(...eventosAntes.map((x) => x.review_version))));

  // correction_requests se limpia al reenviar; los cotejos siguen completos.
  const p = mock.tablas[UIDS.PROFILE].find((x) => x.id === profileId);
  assert.equal(p.correction_requests, null);
  assert.equal(p.status, 'pending_review');

  const cotejos = eventosAhora.filter((e) => e.action === 'document_check_registered' && e.result === 'verified');
  const { documentosRequeridosParaCotejo } = require('../src/api/delivery-registration/utils/requirements');
  const requeridos = documentosRequeridosParaCotejo({
    profile: p,
    user,
    vehicle: mock.tablas[UIDS.VEHICLE].find((v) => v.delivery_profile === profileId),
  }).map((d) => d.document_id);
  for (const docId of requeridos) {
    assert.ok(cotejos.some((c) => c.document_id === docId), `el cotejo de ${docId} sobrevive al reenvio`);
  }
});

// ---------------------------------------------------------------------------
// §10.20 — revocar el permiso al socio le corta el paso de inmediato
// ---------------------------------------------------------------------------
test('revocar membresia o rol al socio bloquea nuevas revisiones al instante; admin conserva bypass', async () => {
  const { mock } = montar();
  const a = await crearExpedienteCompleto(mock, { userId: 7 });
  const b = await crearExpedienteCompleto(mock, { userId: 20 });
  const socio = mock.tablas[UIDS.USER].find((u) => u.id === 8);
  const admin = mock.tablas[UIDS.USER].find((u) => u.id === 11);

  // Con permiso vigente: puede revisar.
  await revisionService.registrarCotejo(socio, a.profileId, {
    document_id: 'selfie', check_type: 'visually_reviewed', result: 'verified',
  });

  // Membresia revocada => 403 inmediato en la siguiente accion.
  socio.membresia_vigente = false;
  socio.verificado = false;
  await assert.rejects(
    () => revisionService.registrarCotejo(socio, b.profileId, {
      document_id: 'selfie', check_type: 'visually_reviewed', result: 'verified',
    }),
    (e) => e.status === 403 && /membresia/.test(e.message),
    'membresia revocada bloquea al instante'
  );

  // Rol quitado de roles.extra => 403 (la policy no lo deja pasar).
  socio.membresia_vigente = true;
  socio.roles = { extra: [] };
  await assert.rejects(
    () => revisionService.registrarCotejo(socio, b.profileId, {
      document_id: 'selfie', check_type: 'visually_reviewed', result: 'verified',
    }),
    (e) => e.status === 403 && /rol de revision/.test(e.message),
    'sin rol socio/admin/root no revisa'
  );

  // El admin con membresia vencida conserva el bypass (matriz can-calificar-tarea).
  await revisionService.registrarCotejo(admin, b.profileId, {
    document_id: 'selfie', check_type: 'visually_reviewed', result: 'verified',
  });
  assert.ok(
    mock.tablas[UIDS.EVENT].some((e) => e.profile === b.profileId && e.actor === admin.id),
    'el admin dejo huella pese a membresia vencida (bypass)'
  );
});

// ---------------------------------------------------------------------------
// §12E.14 — primitiva de bloqueo optimista del 409 de doble aprobacion
// ---------------------------------------------------------------------------
test('el update condicional (id + status) devuelve null cuando el estado ya cambio', async () => {
  const { mock } = montar();
  const { profileId } = await crearExpedienteCompleto(mock, {});
  const socio = await dejarElegibleConZoom(mock, profileId);

  const primera = await mock.strapi.db.query(UIDS.PROFILE).update({
    where: { id: profileId, status: 'eligible_for_video_review' },
    data: { status: 'approved' },
  });
  assert.ok(primera, 'la primera aprobacion encuentra la fila');

  // Un segundo revisor con datos obsoletos: su update condicional no toca nada.
  const segunda = await mock.strapi.db.query(UIDS.PROFILE).update({
    where: { id: profileId, status: 'eligible_for_video_review' },
    data: { status: 'approved' },
  });
  assert.equal(segunda, null, 'el bloqueo optimista es la base del 409 concurrente');

  // Y el estado final sigue siendo approved (idempotente, no corrupto).
  assert.equal(mock.tablas[UIDS.PROFILE].find((x) => x.id === profileId).status, 'approved');
});
