/**
 * Integración del fix "una notificación = un toast" (§15 de
 * docs/NOTIFICACIONES.md): se ejercita NotificationsContext de verdad, con el
 * listener del socket capturado y notistack mockeado para ver QUÉ se encola.
 */
import React from 'react';
import { render, waitFor, act } from '@testing-library/react';

import { getTabId } from '../utils/notifications.helpers';

const mockEnqueue = jest.fn();
const mockSocketHandlers = {};
const mockSendNotification = jest.fn();
const mockFetchNotifications = jest.fn();
const mockAuth0 = {
  user: { email: 'ana@example.com' },
  isAuthenticated: true,
  getAccessTokenSilently: jest.fn(async () => 'token-falso'),
};

jest.mock('notistack', () => ({
  useSnackbar: () => ({
    enqueueSnackbar: (...args) => mockEnqueue(...args),
    closeSnackbar: jest.fn(),
  }),
}));

jest.mock('@auth0/auth0-react', () => ({ useAuth0: () => mockAuth0 }));

jest.mock('socket.io-client', () => ({
  io: () => ({
    on: (event, cb) => {
      mockSocketHandlers[event] = cb;
    },
    off: jest.fn(),
    disconnect: jest.fn(),
    emit: jest.fn(),
  }),
}));

jest.mock('../services/notifications', () => ({
  fetchNotifications: (...args) => mockFetchNotifications(...args),
  sendNotification: (...args) => mockSendNotification(...args),
  fetchNotificationById: jest.fn(),
  markNotificationAsRead: jest.fn(),
  markAllNotificationsAsRead: jest.fn(),
}));

// El contexto lee REACT_APP_SOCKET_URL al cargarse: se importa tarde, con el
// env ya puesto.
let NotificationsProvider;
let useNotifications;

beforeAll(() => {
  process.env.REACT_APP_SOCKET_URL = 'http://localhost:33032';
  const mod = require('../Contexts/NotificationsContext');
  NotificationsProvider = mod.NotificationsProvider;
  useNotifications = mod.useNotifications;
});

const apiRef = { current: null };

function Child() {
  apiRef.current = useNotifications();
  return null;
}

/** Forma que devuelve toPublicNotification() (la misma por socket y por POST). */
const backendNotif = (id, extra = {}) => ({
  id,
  titulo: `Noti ${id}`,
  cuerpo: `cuerpo ${id}`,
  leida: false,
  timestamp: '2026-09-29T10:00:00.000Z',
  ...extra,
});

const renderProvider = async () => {
  render(
    <NotificationsProvider>
      <Child />
    </NotificationsProvider>
  );
  await waitFor(() => expect(mockFetchNotifications).toHaveBeenCalled());
  mockEnqueue.mockClear();
};

const emitSocket = async (payload) => {
  await act(async () => {
    await mockSocketHandlers.notification(payload);
  });
};

beforeEach(() => {
  jest.clearAllMocks();
  mockFetchNotifications.mockResolvedValue({ data: [] });
});

describe('NotificationsContext — un toast por notificación', () => {
  it('toast.* encola con las variantes de marca (notif-*)', async () => {
    await renderProvider();

    apiRef.current.toast.success('Guardado');
    apiRef.current.toast.error('No se pudo');
    apiRef.current.toast.warning('Falta algo');
    apiRef.current.toast.info('Buscando...');
    apiRef.current.toast.default('Aviso');

    expect(mockEnqueue.mock.calls.map(([, options]) => options.variant)).toEqual([
      'notif-success',
      'notif-error',
      'notif-warning',
      'notif-info',
      'notif-default',
    ]);
  });

  it('send() marca meta.clientOrigin, inserta la creada y NO anuncia su eco', async () => {
    const tab = getTabId();
    mockSendNotification.mockResolvedValue({
      data: backendNotif(99, { meta: { clientOrigin: tab } }),
    });

    await renderProvider();

    let created;
    await act(async () => {
      created = await apiRef.current.send({ to: 'ana@example.com', title: 'Hola', message: 'Mundo' });
    });

    // 1) el payload que sale hacia el backend lleva el marcador de pestaña
    expect(mockSendNotification.mock.calls[0][0].meta).toEqual({ clientOrigin: tab });
    // 2) la notificación quedó en el estado (sin refresh extra)
    expect(created.id).toBe(99);
    expect(apiRef.current.notifications.map((n) => n.id)).toEqual([99]);
    // 3) send() no encola toast por su cuenta
    expect(mockEnqueue).not.toHaveBeenCalled();

    // 4) llega el eco por socket -> sube a la campana pero NO vuelve a sonar
    await emitSocket(backendNotif(99, { meta: { clientOrigin: tab } }));
    expect(mockEnqueue).not.toHaveBeenCalled();
    expect(apiRef.current.notifications).toHaveLength(1);
  });

  it('lo de otra pestaña/usuario SÍ se anuncia (notif-info) y sólo una vez', async () => {
    await renderProvider();

    await emitSocket(backendNotif(55, { meta: { clientOrigin: 'otra-pena' } }));
    expect(mockEnqueue).toHaveBeenCalledTimes(1);
    expect(mockEnqueue).toHaveBeenCalledWith('Noti 55', { variant: 'notif-info' });

    // reentrega (reconnect): actualiza, no vuelve a sonar
    await emitSocket(backendNotif(55, { meta: { clientOrigin: 'otra-pena' } }));
    expect(mockEnqueue).toHaveBeenCalledTimes(1);
    expect(apiRef.current.notifications).toHaveLength(1);
  });

  it('aunque el backend no devuelva meta, el eco no suena (señales de envío)', async () => {
    await renderProvider();

    let resolveSend;
    mockSendNotification.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSend = resolve;
        })
    );

    // send() en vuelo: el socket puede adelantar a la respuesta HTTP
    let pending;
    await act(async () => {
      pending = apiRef.current.send({ to: 'ana@example.com', title: 'Sin meta', message: 'x' });
    });
    await emitSocket(backendNotif(77));
    expect(mockEnqueue).not.toHaveBeenCalled();

    await act(async () => {
      resolveSend({ data: backendNotif(77) });
      await pending;
    });

    // ya respondió: el id quedó anotado, el eco posterior tampoco suena
    await emitSocket(backendNotif(77));
    expect(mockEnqueue).not.toHaveBeenCalled();
    expect(apiRef.current.notifications).toHaveLength(1);
  });

  it('la carga inicial no anuncia nada', async () => {
    mockFetchNotifications.mockResolvedValue({ data: [backendNotif(1), backendNotif(2)] });

    await renderProvider();

    expect(apiRef.current.notifications).toHaveLength(2);
    expect(mockEnqueue).not.toHaveBeenCalled();
  });
});
