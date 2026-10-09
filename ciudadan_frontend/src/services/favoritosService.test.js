/**
 * Servicio de favoritos: habla con los endpoints autenticados
 * (/mine|/check|/toggle|/:id) con Bearer Auth0, y conserva las firmas legacy
 * (esFavorito/toggleFavorito/...) que usan DetalleProducto/ProductoCard.
 */
import {
  esFavorito,
  toggleFavorito,
  agregarFavorito,
  eliminarFavorito,
  fetchFavoritos,
  getFavoritosUsuario,
} from './favoritosService';

const TOKEN = 'token-auth0-falso';

const jsonOk = (payload) => ({ ok: true, json: async () => payload });

describe('favoritosService (endpoints autenticados)', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('fetchFavoritos llama a /mine con Bearer y query de tipo', async () => {
    global.fetch.mockResolvedValue(jsonOk({ data: [{ id: 1 }], meta: { count: 1 } }));

    const res = await fetchFavoritos(TOKEN, { tipo: 'producto', limit: 50 });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, opts] = global.fetch.mock.calls[0];
    expect(url).toContain('/api/favoritos/mine');
    expect(url).toContain('tipo=producto');
    expect(url).toContain('limit=50');
    expect(opts.headers.Authorization).toBe(`Bearer ${TOKEN}`);
    expect(res.data).toHaveLength(1);
  });

  test('esFavorito usa /check y normaliza {favorito, favoritoId}', async () => {
    global.fetch.mockResolvedValue(jsonOk({ data: { favorito: true, favoritoId: 9 } }));

    const res = await esFavorito(7, 'producto', 55, TOKEN);

    const [url, opts] = global.fetch.mock.calls[0];
    expect(url).toContain('/api/favoritos/check');
    expect(url).toContain('tipo=producto');
    expect(url).toContain('elementoId=55');
    expect(opts.headers.Authorization).toBe(`Bearer ${TOKEN}`);
    expect(res).toEqual({ favorito: true, favoritoId: 9 });
  });

  test('toggleFavorito hace POST /toggle con tipo+elementoId+url', async () => {
    global.fetch.mockResolvedValue(jsonOk({ data: { favorito: true, favoritoId: 12 } }));

    const res = await toggleFavorito({
      usuarioId: 7,
      usuarioEmail: 'socio@ciudadan.org',
      tipo: 'curso',
      elementoId: 20,
      url: '/cursos/x',
      token: TOKEN,
    });

    const [url, opts] = global.fetch.mock.calls[0];
    expect(url).toContain('/api/favoritos/toggle');
    expect(opts.method).toBe('POST');
    expect(opts.headers.Authorization).toBe(`Bearer ${TOKEN}`);
    expect(JSON.parse(opts.body)).toMatchObject({ tipo: 'curso', elementoId: 20, url: '/cursos/x' });
    expect(res).toEqual({ favorito: true, favoritoId: 12 });
  });

  test('agregarFavorito también va a /toggle (no a la ruta core sin auth)', async () => {
    global.fetch.mockResolvedValue(jsonOk({ data: { favorito: true, favoritoId: 13 } }));

    await agregarFavorito({ tipo: 'club', elementoId: 30, url: '/club', token: TOKEN });

    const [url] = global.fetch.mock.calls[0];
    expect(url).toContain('/api/favoritos/toggle');
    expect(url).not.toContain('filters[');
  });

  test('eliminarFavorito hace DELETE /:id con Bearer', async () => {
    global.fetch.mockResolvedValue(jsonOk({ data: { ok: true } }));

    const res = await eliminarFavorito(13, TOKEN);

    const [url, opts] = global.fetch.mock.calls[0];
    expect(url).toContain('/api/favoritos/13');
    expect(opts.method).toBe('DELETE');
    expect(opts.headers.Authorization).toBe(`Bearer ${TOKEN}`);
    expect(res).toBe(true);
  });

  test('getFavoritosUsuario usa /mine (no filters[usuario] sin auth)', async () => {
    global.fetch.mockResolvedValue(jsonOk({ data: [{ id: 1 }, { id: 2 }] }));

    const res = await getFavoritosUsuario(7, TOKEN);

    const [url] = global.fetch.mock.calls[0];
    expect(url).toContain('/api/favoritos/mine');
    expect(res).toHaveLength(2);
  });

  test('sin token no manda Authorization (el backend responde 401, no 500)', async () => {
    global.fetch.mockResolvedValue(jsonOk({ data: [] }));

    await fetchFavoritos(null);

    const [, opts] = global.fetch.mock.calls[0];
    expect(opts.headers.Authorization).toBeUndefined();
  });
});
