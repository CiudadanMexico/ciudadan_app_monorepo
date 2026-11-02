// Tests del contrato HTTP del servicio de postulación a socio.
//
// Lo que se verifica aquí es el CONTRATO con el backend:
//  - el payload viaja en multipart con el JSON en `data` y el CV en `files.cv`
//    (convención de Strapi que espera `ctx.request.files`),
//  - no se fija `Content-Type` a mano (el navegador debe poner el boundary),
//  - el servicio NO manda estado/fechas/metadata: los pone el servidor.

import {
  crearPostulacionSocio,
  getMisPostulaciones,
  resolverPostulacion,
} from './candidatosService';

const originalFetch = global.fetch;

/** Captura la llamada a fetch y devuelve una respuesta 201 simulada. */
function mockFetch(ok = true, body = { data: { id: 1, estado: 'pendiente' } }) {
  const fetchMock = jest.fn().mockResolvedValue({
    ok,
    status: ok ? 201 : 400,
    json: () => Promise.resolve(body),
  });
  global.fetch = fetchMock;
  return fetchMock;
}

const argumentosDeFetch = (fetchMock, indice = 0) => fetchMock.mock.calls[indice];

beforeEach(() => {
  jest.clearAllMocks();
});

afterAll(() => {
  global.fetch = originalFetch;
});

describe('crearPostulacionSocio — contrato multipart', () => {
  it('envía el formulario como multipart con `data` en JSON y el CV en `files.cv`', async () => {
    const fetchMock = mockFetch();
    const cv = new File(['contenido'], 'cv.pdf', { type: 'application/pdf' });

    await crearPostulacionSocio({
      nombre_completo: 'Ana Candidate',
      email: 'ana@example.com',
      telefono: '5512345678',
      codigo_pais: '+52',
      area: 2,
      agencia: 7,
      descripcion: 'Quiero participar',
      consentimiento: true,
      cv,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = argumentosDeFetch(fetchMock);

    expect(url).toMatch(/\/api\/postulacion-socios$/);
    expect(options.method).toBe('POST');
    expect(options.body).toBeInstanceOf(FormData);

    // El CV va con el prefijo `files.` (convención de Strapi).
    const cvEnviado = options.body.get('files.cv');
    expect(cvEnviado).toBeTruthy();
    expect(cvEnviado.name).toBe('cv.pdf');

    // El resto del formulario viaja como JSON en el campo `data`.
    const data = JSON.parse(options.body.get('data'));
    expect(data.nombre_completo).toBe('Ana Candidate');
    expect(data.email).toBe('ana@example.com');
    expect(data.descripcion).toBe('Quiero participar');
    expect(data.consentimiento).toBe(true);
  });

  it('NO fija Content-Type: el navegador debe poner el boundary del multipart', async () => {
    const fetchMock = mockFetch();

    await crearPostulacionSocio({
      nombre_completo: 'Ana',
      email: 'ana@example.com',
      telefono: '5512345678',
      descripcion: 'Descripción',
      consentimiento: true,
    });

    const [, options] = argumentosDeFetch(fetchMock);
    const headers = options.headers || {};

    expect(headers['Content-Type']).toBeUndefined();
  });

  it('convierte área y agencia a número y manda null cuando no hay selección', async () => {
    const fetchMock = mockFetch();

    await crearPostulacionSocio({
      nombre_completo: 'Ana',
      email: 'ana@example.com',
      telefono: '5512345678',
      area: '3',
      agencia: '',
      descripcion: 'Descripción',
      consentimiento: true,
    });

    const data = JSON.parse(argumentosDeFetch(fetchMock)[1].body.get('data'));

    expect(data.area).toBe(3);
    expect(data.agencia).toBeNull();
  });

  it('no manda estado, fechas ni metadata: los decide el servidor', async () => {
    const fetchMock = mockFetch();

    await crearPostulacionSocio({
      nombre_completo: 'Ana',
      email: 'ana@example.com',
      telefono: '5512345678',
      descripcion: 'Descripción',
      consentimiento: true,
      estado: 'aceptada',
      revisado_por: 99,
      fecha_solicitud: '1999-01-01',
    });

    const data = JSON.parse(argumentosDeFetch(fetchMock)[1].body.get('data'));

    expect(data.estado).toBeUndefined();
    expect(data.revisado_por).toBeUndefined();
    expect(data.fecha_solicitud).toBeUndefined();
    expect(data.metadata).toBeUndefined();
  });

  it('propaga el consentimiento real (false si el visitante no lo marcó)', async () => {
    const fetchMock = mockFetch();

    await crearPostulacionSocio({
      nombre_completo: 'Ana',
      email: 'ana@example.com',
      telefono: '5512345678',
      descripcion: 'Descripción',
      consentimiento: false,
    });

    const data = JSON.parse(argumentosDeFetch(fetchMock)[1].body.get('data'));
    expect(data.consentimiento).toBe(false);
  });

  it('sin CV no manda el campo files.cv', async () => {
    const fetchMock = mockFetch();

    await crearPostulacionSocio({
      nombre_completo: 'Ana',
      email: 'ana@example.com',
      telefono: '5512345678',
      descripcion: 'Descripción',
      consentimiento: true,
    });

    const [, options] = argumentosDeFetch(fetchMock);
    expect(options.body.get('files.cv')).toBeNull();
  });

  it('propaga el mensaje de error del backend', async () => {
    mockFetch(false, { error: { message: 'El área seleccionada ya no está disponible.' } });

    await expect(
      crearPostulacionSocio({
        nombre_completo: 'Ana',
        email: 'ana@example.com',
        telefono: '5512345678',
        descripcion: 'Descripción',
        consentimiento: true,
      })
    ).rejects.toThrow('El área seleccionada ya no está disponible.');
  });
});

describe('getMisPostulaciones / resolverPostulacion — gestión con token', () => {
  it('getMisPostulaciones pega a /mi-agencia con el Bearer', async () => {
    const fetchMock = mockFetch(true, { ok: true, data: [] });

    await getMisPostulaciones('token-abc');

    const [url, options] = argumentosDeFetch(fetchMock);
    expect(url).toMatch(/\/api\/postulacion-socios\/mi-agencia$/);
    expect(options.headers.Authorization).toBe('Bearer token-abc');
  });

  it('resolverPostulacion hace PATCH con estado y notas en JSON', async () => {
    const fetchMock = mockFetch(true, { ok: true, data: {} });

    await resolverPostulacion(42, { estado: 'aceptada', notas: 'Listo' }, 'token-abc');

    const [url, options] = argumentosDeFetch(fetchMock);
    expect(url).toMatch(/\/api\/postulacion-socios\/42\/estado$/);
    expect(options.method).toBe('PATCH');
    expect(options.headers.Authorization).toBe('Bearer token-abc');
    expect(JSON.parse(options.body)).toEqual({ estado: 'aceptada', notas: 'Listo' });
  });
});
