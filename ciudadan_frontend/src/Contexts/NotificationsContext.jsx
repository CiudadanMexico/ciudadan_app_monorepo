// src/Contexts/NotificationsContext.jsx
//
// FACHADA ÚNICA de notificaciones para toda la app de Ciudadan.
//
// API pública:
//   const {
//     notifications, unreadCount, loading, error,
//     toast, send,
//     refresh, fetchById, markAsRead, markAllAsRead,
//   } = useNotifications();
//
// - toast.*(msg) -> aviso efímero local para el usuario actual (notistack por
//                   dentro; los componentes NO deben importar useSnackbar para esto)
// - send({...})  -> notificación PERSISTENTE: la guarda el backend y la emite
//                   por socket SÓLO al destinatario
//
// Un único socket.io de notificaciones vive en este archivo: no abras otro
// (el hook duplicado src/hooks/useNotificationsSocket.jsx se eliminó porque
// ningún componente lo usaba — §6).
//
// Los componentes no necesitan saber Strapi, Socket.IO ni notistack.

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useSnackbar } from 'notistack';
import { io } from 'socket.io-client';

import { normalizeNotification, normalizeNotifications } from '../utils/normalizeNotification';
import {
  countUnread,
  markNotificationReadInList,
  upsertNotification,
  validateSendPayload,
} from '../utils/notifications.helpers';
import {
  fetchNotifications,
  fetchNotificationById,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  sendNotification,
} from '../services/notifications';

const NotificationsContext = createContext(null);

export const useNotifications = () => useContext(NotificationsContext);

const SOCKET_URL = (process.env.REACT_APP_SOCKET_URL || '').replace(/\/$/, '');
const AUTH0_AUDIENCE = process.env.REACT_APP_AUTH0_AUDIENCE;

export const NotificationsProvider = ({ children }) => {
  const { user, isAuthenticated, getAccessTokenSilently } = useAuth0();
  const { enqueueSnackbar } = useSnackbar();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Refs para poder leer estado/fn dentro de callbacks sin rearmar el socket.
  const notificationsRef = useRef(notifications);
  notificationsRef.current = notifications;
  const enqueueRef = useRef(enqueueSnackbar);
  enqueueRef.current = enqueueSnackbar;
  const socketRef = useRef(null);

  // --- token de Auth0 ------------------------------------------------------
  const getToken = useCallback(async () => {
    if (!isAuthenticated) return null;
    try {
      const token = await getAccessTokenSilently({
        authorizationParams: { audience: AUTH0_AUDIENCE },
      });
      return token || null;
    } catch (err) {
      console.debug('NotificationsContext: sin token Auth0', err?.message || err);
      return null;
    }
  }, [getAccessTokenSilently, isAuthenticated]);

  // --- toast API (§5) ------------------------------------------------------
  const toast = useMemo(() => {
    const emit = (variant) => (message, options = {}) =>
      enqueueSnackbar(message, { variant, ...options });

    return {
      success: emit('success'),
      error: emit('error'),
      warning: emit('warning'),
      info: emit('info'),
      default: emit('default'),
    };
  }, [enqueueSnackbar]);

  // --- refresh (GET /api/notificaciones/mine) ------------------------------
  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const res = await fetchNotifications(token);
      // El servidor es la verdad: reemplazamos la lista completa.
      const items = normalizeNotifications(res?.data ?? []);
      setNotifications(items);
      return items;
    } catch (err) {
      console.error('NotificationsContext.refresh error', err);
      // En error NO borramos lo que ya tenemos en memoria.
      setError(err?.message || String(err));
      return null;
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  // --- fetchById (§16): local primero, luego backend ------------------------
  const fetchById = useCallback(
    async (id) => {
      if (id === null || id === undefined || id === '') return null;

      const local = notificationsRef.current.find((n) => String(n?.id) === String(id));
      if (local) return local;

      try {
        const token = await getToken();
        const res = await fetchNotificationById(id, token);
        const notification = normalizeNotification(res?.data);

        if (notification) {
          setNotifications((prev) => upsertNotification(prev, notification));
        }
        return notification || null;
      } catch (err) {
        console.error('NotificationsContext.fetchById error', err);
        return null;
      }
    },
    [getToken]
  );

  // --- send (§10/§21): persiste en backend y emite por socket ---------------
  const send = useCallback(
    async (payload = {}) => {
      const clean = validateSendPayload(payload);

      const token = await getToken();
      const res = await sendNotification(clean, token);

      const created = normalizeNotification(res?.data);
      if (created) {
        // Ya viene del backend: la insertamos en el estado (sin refresh extra).
        setNotifications((prev) => upsertNotification(prev, created));
      }

      return created;
    },
    [getToken]
  );

  // --- markAsRead (§19): optimista -> request -> resincroniza si falla ------
  const markAsRead = useCallback(
    async (idOrIds, read = true) => {
      const ids = (Array.isArray(idOrIds) ? idOrIds : [idOrIds]).filter(
        (id) => id !== null && id !== undefined && id !== ''
      );
      if (ids.length === 0) return;

      // 1) cambio visual inmediato (optimista)
      setNotifications((prev) =>
        ids.reduce((acc, id) => markNotificationReadInList(acc, id, read), prev)
      );

      try {
        const token = await getToken();
        await Promise.all(ids.map((id) => markNotificationAsRead(id, token, read)));
      } catch (err) {
        console.error('NotificationsContext.markAsRead error', err);
        // El backend no confirmó -> volvemos a la verdad del servidor.
        await refresh();
      }
    },
    [getToken, refresh]
  );

  const markAsUnread = useCallback((id) => markAsRead(id, false), [markAsRead]);

  // --- markAllAsRead (§20): endpoint masivo del backend --------------------
  const markAllAsRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));

    try {
      const token = await getToken();
      await markAllNotificationsAsRead(token);
    } catch (err) {
      console.error('NotificationsContext.markAllAsRead error', err);
      await refresh();
    }
  }, [getToken, refresh]);

  // --- socket ÚNICO (§6, §7, §15) ------------------------------------------
  useEffect(() => {
    if (!SOCKET_URL) {
      console.debug('NotificationsContext: sin SOCKET_URL, no se conecta el socket');
      return undefined;
    }
    if (!isAuthenticated) return undefined;

    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 5000,
      timeout: 4000,
      // Token fresco en cada (re)conexión: el backend lo valida contra Auth0 y
      // decide el room con eso (el cliente no manda "en confianza" quién es).
      auth: (cb) => {
        getToken().then((token) => cb({ token }));
      },
    });
    socketRef.current = socket;

    const handleConnect = async () => {
      const token = await getToken();
      // Nos registramos en "nuestro" room en CADA conexión (incluye reconexiones).
      socket.emit('register', { token, email: user?.email || null });
    };

    const handleNotification = (raw) => {
      const notification = normalizeNotification(raw);
      if (!notification) return;

      // 1) normaliza  2) upsert por id (sin duplicar)  3) el contador se
      // recalcula solo desde la lista  4) toast.
      setNotifications((prev) => upsertNotification(prev, notification));

      enqueueRef.current(
        notification.title || notification.message || 'Nueva notificación',
        { variant: 'info' }
      );
      // Sin refresh(): ya llegó completa y además evita requests innecesarios (§15).
    };

    socket.on('connect', handleConnect);
    socket.on('notification', handleNotification);

    return () => {
      // Cleanup explícito: sin listeners ni sockets duplicados (§6, Caso 7).
      socket.off('connect', handleConnect);
      socket.off('notification', handleNotification);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [SOCKET_URL, isAuthenticated, getToken, user?.email]);

  // --- carga inicial --------------------------------------------------------
  useEffect(() => {
    if (!isAuthenticated) {
      setNotifications([]);
      setLoading(false);
      return;
    }
    refresh();
  }, [isAuthenticated, refresh]);

  // La fuente de verdad de "no leídas" es la propia lista (§13): sin
  // baselineUnread / optimisticRef / unreadFromList.
  const unreadCount = useMemo(() => countUnread(notifications), [notifications]);

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      loading,
      error,

      toast,
      send,

      refresh,
      fetchById,
      markAsRead,
      markAsUnread,
      markAllAsRead,

      // legacy alias - migrate gradually (§23)
      notificaciones: notifications,
      refreshNotificaciones: refresh,
      fetchNotificationById: fetchById,
    }),
    [
      notifications,
      unreadCount,
      loading,
      error,
      toast,
      send,
      refresh,
      fetchById,
      markAsRead,
      markAsUnread,
      markAllAsRead,
    ]
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
};
