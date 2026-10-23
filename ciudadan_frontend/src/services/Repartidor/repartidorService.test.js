/**
 * Fase E (QA) — contrato del cliente de API del módulo Repartidor:
 * Bearer Auth0 en cada llamada, cuerpos correctos, subida en DOS pasos
 * (/api/upload + registro por slot), sin Content-Type manual en FormData
 * y evidencias SIEMPRE por streaming autenticado (nunca /uploads público).
 */
import { repartidorService } from './repartidorService';

const TOKEN = 'token-auth0-falso';

const jsonOk = (payload) => ({ ok: true, json: async () => payload });

describe('repartidorService (contrato /api/delivery-registration)', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('obtenerCobertura hace GET con Bearer y territorio codificado', async () => {
    global.fetch.mockResolvedValue(jsonOk({ ok: true, data: [{ id: 3, nombre: 'A' }] }));

    const res = await repartidorService.obtenerCobertura(TOKEN, 'CDMX');

    const [url, opts] = global.fetch.mock.calls[0];
    expect(url).toContain('/api/delivery-registration/coverage');
    expect(url).toContain('territory=CDMX');
    expect(opts.headers.Authorization).toBe(`Bearer ${TOKEN}`);
    expect(opts.method).toBeUndefined(); // GET por defecto
    expect(res.ok).toBe(true);
  });

  test('iniciarExpediente hace POST con agency_id + territorio (nunca status/roles)', async () => {
    global.fetch.mockResolvedValue(jsonOk({ ok: true, creado: true }));

    await repartidorService.iniciarExpediente(TOKEN, { agency_id: 3, territory: 'CDMX' });

    const [url, opts] = global.fetch.mock.calls[0];
    expect(url).toMatch(/\/api\/delivery-registration\/?$/);
    expect(opts.method).toBe('POST');
    expect(opts.headers.Authorization).toBe(`Bearer ${TOKEN}`);
    expect(JSON.parse(opts.body)).toEqual({ agency_id: 3, territory: 'CDMX' });
  });

  test('subirEvidencia es DOS pasos: /api/upload con FormData y luego registro por slot', async () => {
    const archivoSubido = { id: 301, url: '/uploads/nunca-usar.jpg' };
    global.fetch
      .mockResolvedValueOnce(jsonOk([archivoSubido]))
      .mockResolvedValueOnce(jsonOk({ ok: true, slot: 'selfie', file_id: 301 }));

    const archivo = new File(['x'], 'selfie.jpg', { type: 'image/jpeg' });
    const res = await repartidorService.subirEvidencia(TOKEN, { slot: 'selfie', file: archivo });

    // Paso 1: subida con FormData SIN Content-Type manual (el navegador fija el boundary).
    const [urlSubida, optsSubida] = global.fetch.mock.calls[0];
    expect(urlSubida).toContain('/api/upload');
    expect(optsSubida.body).toBeInstanceOf(FormData);
    expect(optsSubida.headers['Content-Type']).toBeUndefined();
    expect(optsSubida.headers.Authorization).toBe(`Bearer ${TOKEN}`);
    expect(optsSubida.credentials).toBe('include');

    // Paso 2: registro por slot con el file_id devuelto por el backend.
    const [urlRegistro, optsRegistro] = global.fetch.mock.calls[1];
    expect(urlRegistro).toContain('/api/delivery-registration/me/evidence');
    expect(optsRegistro.method).toBe('POST');
    expect(JSON.parse(optsRegistro.body)).toEqual({ slot: 'selfie', file_id: 301, vehicle_id: undefined });
    expect(res.slot).toBe('selfie');
  });

  test('subirEvidencia propaga el mensaje del servidor si la subida falla', async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      json: async () => ({ error: { message: 'Archivo demasiado grande' } }),
    });

    const archivo = new File(['x'], 'foto.jpg', { type: 'image/jpeg' });
    await expect(
      repartidorService.subirEvidencia(TOKEN, { slot: 'selfie', file: archivo })
    ).rejects.toThrow('Archivo demasiado grande');
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  test('subirEvidencia rechaza una subida sin id de archivo (respuesta corrupta)', async () => {
    global.fetch.mockResolvedValue(jsonOk([{ name: 'x.jpg' }])); // sin id

    const archivo = new File(['x'], 'x.jpg', { type: 'image/jpeg' });
    await expect(
      repartidorService.subirEvidencia(TOKEN, { slot: 'selfie', file: archivo })
    ).rejects.toThrow('archivo valido');
  });

  test('presentarExamen manda SOLO respuestas; la calificacion nunca viaja del cliente', async () => {
    global.fetch.mockResolvedValue(jsonOk({ ok: true, score: 9, total: 10, passed: true }));

    const respuestas = { p1: 0, p2: 2 };
    await repartidorService.presentarExamen(TOKEN, respuestas);

    const [url, opts] = global.fetch.mock.calls[0];
    expect(url).toContain('/api/delivery-registration/me/training');
    expect(opts.method).toBe('POST');
    expect(JSON.parse(opts.body)).toEqual({ respuestas });
    expect(JSON.parse(opts.body).score).toBeUndefined();
    expect(JSON.parse(opts.body).passed).toBeUndefined();
  });

  test('urlEvidenciaPropia apunta al streaming autenticado, jamas a /uploads publico', () => {
    const url = repartidorService.urlEvidenciaPropia(301);
    expect(url).toContain('/api/delivery-registration/me/evidence/301');
    expect(url).not.toContain('/uploads');
  });
});
