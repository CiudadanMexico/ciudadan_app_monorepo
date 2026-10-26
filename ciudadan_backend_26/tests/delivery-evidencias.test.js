'use strict';

process.env.APP_KEYS = process.env.APP_KEYS || 'clave-solo-para-tests';

/**
 * Evidencias del expediente: MIME/tamano por slot, hash SHA-256 de los bytes
 * reales, unicidad de adjunto (un archivo, un expediente) y descarga solo
 * para el titular o revisor de la misma agencia.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

const { crearStrapiRepartidoresMock } = require('./helpers/strapi-mock-repartidores');
const { UIDS } = require('../src/api/delivery-registration/utils/constants');

const expedienteService = require('../src/api/delivery-registration/services/expediente-service');
const evidenciasService = require('../src/api/delivery-registration/services/evidencias-service');
const revisionService = require('../src/api/delivery-registration/services/revision-service');

const UPLOAD_UID = 'plugin::upload.file';

function montarConArchivos() {
  const mock = crearStrapiRepartidoresMock({
    tablas: {
      [UIDS.USER]: [
        { id: 7, email: 'a@x.org', roles: { extra: [] } },
        { id: 20, email: 'b@x.org', roles: { extra: [] } },
        { id: 8, email: 'socio@x.org', roles: { extra: ['socio'] }, agencia: 3, membresia_vigente: true },
      ],
      [UIDS.AGENCIA]: [{ id: 3, nombre: 'A', tipo: 'local', publishedAt: '2026-01-01' }],
      [UIDS.PROFILE]: [],
      [UIDS.VEHICLE]: [],
      [UIDS.EVENT]: [],
      [UIDS.TRAINING]: [],
      [UIDS.SIGNAL]: [],
      [UIDS.WAITLIST]: [],
      [UPLOAD_UID]: [],
    },
  });

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dsh-evidencia-'));
  fs.mkdirSync(path.join(dir, 'uploads'), { recursive: true });
  mock.strapi.dirs.static.public = dir;

  const contenido = Buffer.from('contenido-de-prueba-de-evidencia');
  fs.writeFileSync(path.join(dir, 'uploads', 'foto.jpg'), contenido);

  mock.tablas[UPLOAD_UID].push({
    id: 301,
    name: 'foto.jpg',
    mime: 'image/jpeg',
    size: 1, // KB (Strapi guarda en KB): muy por debajo del limite
    url: '/uploads/foto.jpg',
  });
  mock.tablas[UPLOAD_UID].push({
    id: 303,
    name: 'mal.pdf',
    mime: 'application/pdf',
    size: 1,
    url: '/uploads/foto.jpg',
  });
  mock.tablas[UPLOAD_UID].push({
    id: 304,
    name: 'gigante.jpg',
    mime: 'image/jpeg',
    size: 20 * 1024, // 20MB en KB: sobre el limite de 15MB
    url: '/uploads/foto.jpg',
  });

  return { mock, dir, contenido };
}

test('adjuntar valida MIME y tamaño por slot y fija el hash del archivo real', async () => {
  const { mock, contenido } = montarConArchivos();
  const user = mock.tablas[UIDS.USER][0];
  await expedienteService.iniciarExpediente({ user, agency_id: 3 });

  await assert.rejects(
    () => evidenciasService.adjuntarEvidencia({ user, body: { slot: 'id_front', file_id: 303 } }),
    (e) => e.status === 400 && /no es valido/.test(e.message),
    'un PDF no entra en un slot de imagen'
  );

  await assert.rejects(
    () => evidenciasService.adjuntarEvidencia({ user, body: { slot: 'id_front', file_id: 304 } }),
    (e) => e.status === 400 && /pesa demasiado/.test(e.message)
  );

  await assert.rejects(
    () => evidenciasService.adjuntarEvidencia({ user, body: { slot: 'no_existe', file_id: 301 } }),
    (e) => e.status === 400 && /Slot/.test(e.message)
  );

  const res = await evidenciasService.adjuntarEvidencia({ user, body: { slot: 'id_front', file_id: 301 } });
  const esperado = crypto.createHash('sha256').update(contenido).digest('hex');
  assert.equal(res.sha256, esperado, 'hash de los bytes reales del disco');

  const perfil = mock.tablas[UIDS.PROFILE][0];
  assert.equal(perfil.id_front, 301);

  const evento = mock.tablas[UIDS.EVENT].find((e) => e.action === 'evidence_attached');
  assert.equal(evento.evidence_file_id, 301);
  assert.equal(evento.evidence_sha256, esperado);
});

test('un archivo solo puede vivir en UN expediente (blindaje de propiedad)', async () => {
  const { mock } = montarConArchivos();
  const userA = mock.tablas[UIDS.USER][0];
  const userB = mock.tablas[UIDS.USER].find((u) => u.id === 20);

  await expedienteService.iniciarExpediente({ user: userA, agency_id: 3 });
  await evidenciasService.adjuntarEvidencia({ user: userA, body: { slot: 'id_front', file_id: 301 } });

  await expedienteService.iniciarExpediente({ user: userB, agency_id: 3 });
  await assert.rejects(
    () => evidenciasService.adjuntarEvidencia({ user: userB, body: { slot: 'id_front', file_id: 301 } }),
    (e) => e.status === 400 && /otro expediente/.test(e.message),
    'el mismo file_id no se adjunta a un segundo expediente'
  );

  // El mismo usuario puede REEMPLAZAR su propio slot con un archivo distinto
  // (aqui simulamos otro archivo apuntando al mismo contenido del disco).
  mock.tablas[UPLOAD_UID].push({ id: 305, name: 'foto2.jpg', mime: 'image/jpeg', size: 1, url: '/uploads/foto.jpg' });
  const reemplazo = await evidenciasService.adjuntarEvidencia({ user: userA, body: { slot: 'id_front', file_id: 305 } });
  assert.equal(reemplazo.slot, 'id_front');
});

test('solo el titular o un revisor de la misma agencia pueden abrir la evidencia', async () => {
  const { mock } = montarConArchivos();
  const userA = mock.tablas[UIDS.USER][0];
  const userB = mock.tablas[UIDS.USER].find((u) => u.id === 20);
  await expedienteService.iniciarExpediente({ user: userA, agency_id: 3 });
  await evidenciasService.adjuntarEvidencia({ user: userA, body: { slot: 'id_front', file_id: 301 } });

  const perfil = mock.tablas[UIDS.PROFILE][0];

  // Titular: encuentra su archivo.
  const propio = await evidenciasService.archivoPropio(perfil, 301);
  assert.equal(propio.slot, 'id_front');

  // Otro usuario no tiene expediente: no le pertenece nada.
  await expedienteService.iniciarExpediente({ user: userB, agency_id: 3 });
  const perfilB = mock.tablas[UIDS.PROFILE].find((p) => p.user === 20);
  assert.equal(await evidenciasService.archivoPropio(perfilB, 301), null);

  // Revisor de la MISMA agencia (no es el titular): acceso permitido.
  const socio = mock.tablas[UIDS.USER].find((u) => u.id === 8);
  perfil.status = 'pending_review'; // para pasar gates de cargarParaAccion
  const delRevisor = await revisionService.evidenciaParaRevisor(socio, perfil.id, 301);
  assert.equal(delRevisor.slot, 'id_front');
  assert.ok(delRevisor.file.url.startsWith('/uploads/'), 'ruta relativa del proveedor local');
});
