import {
  getTabId,
  pruneSelfSent,
  rememberSelfSent,
  SELF_ORIGIN_KEY,
  SELF_SENT_TTL_MS,
  shouldAnnounce,
  upsertNotification,
  withSelfOrigin,
} from './notifications.helpers';

const TAB = 'tab-AAAA';
const NOW = 1_700_000_000_000;

const n = (id, extra = {}) => ({ id, title: `titulo ${id}`, message: `cuerpo ${id}`, read: false, ...extra });

describe('shouldAnnounce — una notificación es UN solo toast', () => {
  it('anuncia una notificación que llegó de otro usuario', () => {
    expect(shouldAnnounce({ notification: n(7), tabId: TAB, list: [] })).toBe(true);
  });

  it('NO anuncia el eco de un send() propio (marcado en meta)', () => {
    const echo = n(7, { meta: { [SELF_ORIGIN_KEY]: TAB } });
    expect(shouldAnnounce({ notification: echo, tabId: TAB, list: [] })).toBe(false);
  });

  it('SÍ anuncia en la OTRA pestaña del mismo usuario (el id de pestaña difiere)', () => {
    const echo = n(7, { meta: { [SELF_ORIGIN_KEY]: 'tab-BBBB' } });
    expect(shouldAnnounce({ notification: echo, tabId: TAB, list: [] })).toBe(true);
  });

  it('NO anuncia un eco que llega con un send() todavía en vuelo', () => {
    expect(shouldAnnounce({ notification: n(7), tabId: TAB, pendingSend: 1 })).toBe(false);
  });

  it('NO anuncia un eco que llega después de la respuesta (id ya anotado)', () => {
    const selfSent = rememberSelfSent(new Map(), 7, NOW);
    expect(shouldAnnounce({ notification: n(7), tabId: TAB, selfSent, now: NOW + 1000 })).toBe(false);
  });

  it('vuelve a anunciar cuando el id propio caducó y no estaba en la lista', () => {
    const selfSent = rememberSelfSent(new Map(), 7, NOW);
    const late = shouldAnnounce({
      notification: n(7),
      tabId: TAB,
      selfSent,
      now: NOW + SELF_SENT_TTL_MS + 1,
    });
    expect(late).toBe(true);
  });

  it('NO anuncia la reentrega de algo que ya estaba en la lista', () => {
    expect(shouldAnnounce({ notification: n(7), tabId: TAB, list: [n(7)] })).toBe(false);
  });

  it('ignora una notificación sin id (no habría forma de deduplicarla)', () => {
    expect(shouldAnnounce({ notification: { title: 'sin id' }, tabId: TAB })).toBe(false);
  });

  it('compara ids sin importar el tipo (el socket manda string, send manda number)', () => {
    expect(shouldAnnounce({ notification: n('7'), tabId: TAB, list: [n(7)] })).toBe(false);
  });

  it('secuencia real: send() -> upsert -> eco por socket = 0 anuncios', () => {
    const selfSent = new Map();
    let list = [];
    let announced = 0;

    // 1) send(): el backend responde con la notificación creada.
    const created = n(42, { meta: { [SELF_ORIGIN_KEY]: TAB } });
    rememberSelfSent(selfSent, created.id, NOW);
    list = upsertNotification(list, created);

    // 2) eco del socket (misma forma, misma meta).
    if (shouldAnnounce({ notification: created, tabId: TAB, list, selfSent, now: NOW })) announced += 1;
    list = upsertNotification(list, created);

    // 3) reconnect: el servidor la vuelve a mandar.
    if (shouldAnnounce({ notification: created, tabId: TAB, list, selfSent, now: NOW + 5000 })) announced += 1;

    expect(announced).toBe(0);
    expect(list).toHaveLength(1);
  });

  it('secuencia real: llegada de otra pestaña SÍ se anuncia una sola vez', () => {
    const incoming = n(43, { meta: { [SELF_ORIGIN_KEY]: 'tab-BBBB' } });
    let list = [];
    let announced = 0;

    if (shouldAnnounce({ notification: incoming, tabId: TAB, list, selfSent: new Map(), now: NOW })) {
      announced += 1;
    }
    list = upsertNotification(list, incoming);
    if (shouldAnnounce({ notification: incoming, tabId: TAB, list, selfSent: new Map(), now: NOW })) {
      announced += 1;
    }

    expect(announced).toBe(1);
    expect(list).toHaveLength(1);
  });
});

describe('withSelfOrigin / registry de ids propios', () => {
  it('añade el origen sin pisar las otras claves de meta', () => {
    const payload = withSelfOrigin({ to: 'a@b.c', meta: { todoId: 3 } }, TAB);
    expect(payload.meta).toEqual({ todoId: 3, [SELF_ORIGIN_KEY]: TAB });
    expect(payload.to).toBe('a@b.c');
  });

  it('crea meta cuando no venía o no era un objeto', () => {
    expect(withSelfOrigin({ to: 'a@b.c' }, TAB).meta[SELF_ORIGIN_KEY]).toBe(TAB);
    expect(withSelfOrigin({ to: 'a@b.c', meta: 'nope' }, TAB).meta[SELF_ORIGIN_KEY]).toBe(TAB);
    expect(withSelfOrigin({ to: 'a@b.c', meta: null }, TAB).meta[SELF_ORIGIN_KEY]).toBe(TAB);
  });

  it('no inventa meta si no hay tabId', () => {
    expect(withSelfOrigin({ to: 'a@b.c' }, null)).toEqual({ to: 'a@b.c' });
  });

  it('rememberSelfSent normaliza el id a string', () => {
    const reg = rememberSelfSent(new Map(), 7, NOW);
    expect(reg.get('7')).toBe(NOW);
  });

  it('pruneSelfSent tira los caducados y deja los frescos', () => {
    const reg = new Map([
      ['1', NOW],
      ['2', NOW - SELF_SENT_TTL_MS - 1],
    ]);
    pruneSelfSent(reg, NOW);
    expect(reg.has('1')).toBe(true);
    expect(reg.has('2')).toBe(false);
  });

  it('es tolerante con registries inválidos', () => {
    expect(() => rememberSelfSent(null, 1)).not.toThrow();
    expect(() => pruneSelfSent(undefined, NOW)).not.toThrow();
  });

  it('getTabId devuelve siempre el mismo id para esta pestaña', () => {
    expect(typeof getTabId()).toBe('string');
    expect(getTabId()).toBe(getTabId());
  });
});
