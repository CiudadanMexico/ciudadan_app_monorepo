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
  withSelfOrigin,
  getTabId,
  rememberSelfSent,
  pruneSelfSent,
  shouldAnnounce,
} from '../utils/notifications.helpers';
import { NOTIF_VARIANTS } from '../components/common/NotifToast.jsx';
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

// Id de ESTA pestaña. Se guarda en `meta` de las notificaciones que crea un
// send() nuestro: como el backend persiste `meta` y emite por socket exactamente
// la misma forma que devuelve en el POST, el eco se reconoce de forma
// determinista y no se anuncia dos veces (§15).
const TAB_ID = getTabId();

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

  // Eco de nuestros propios send(): `pendingSendRef` cuenta los envíos en vuelo
  // y `selfSentRef` recuerda los ids ya creados (Map id -> timestamp).
  const pendingSendRef = useRef(0);
  const selfSentRef = useRef(new Map());

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
      success: emit(NOTIF_VARIANTS.success),
      error: emit(NOTIF_VARIANTS.error),
      warning: emit(NOTIF_VARIANTS.warning),
      info: emit(NOTIF_VARIANTS.info),
      default: emit(NOTIF_VARIANTS.default),
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
      // Marcamos el origen (meta.clientOrigin) para reconocer el eco del socket.
      const clean = withSelfOrigin(validateSendPayload(payload), TAB_ID);

      // El backend emite por socket ANTES de responder al POST, así que el eco
      // puede llegar antes o después de esta promesa: cubrimos las dos ventanas.
      pendingSendRef.current += 1;
      try {
        const token = await getToken();
        const res = await sendNotification(clean, token);

        const created = normalizeNotification(res?.data);
        if (created) {
          rememberSelfSent(selfSentRef.current, created.id);
          pruneSelfSent(selfSentRef.current);
          // Ya viene del backend: la insertamos en el estado (sin refresh extra).
          setNotifications((prev) => upsertNotification(prev, created));
        }

        return created;
      } finally {
        pendingSendRef.current = Math.max(0, pendingSendRef.current - 1);
      }
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

      // 1) normaliza  2) decide si toca toast (ANTES del upsert: "ya la tenía"
      // se evalúa sobre la lista previa)  3) upsert por id (sin duplicar)
      // 4) el contador se recalcula solo desde la lista.
      const announce = shouldAnnounce({
        notification,
        tabId: TAB_ID,
        list: notificationsRef.current,
        pendingSend: pendingSendRef.current,
        selfSent: selfSentRef.current,
      });

      setNotifications((prev) => upsertNotification(prev, notification));

      // UNA notificación = UN toast: si esta pestaña la creó con send() o ya la
      // teníamos, el eco del socket actualiza la campana pero NO vuelve a sonar.
      if (announce) {
        enqueueRef.current(
          notification.title || notification.message || 'Nueva notificación',
          { variant: NOTIF_VARIANTS.info }
        );
      }
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
