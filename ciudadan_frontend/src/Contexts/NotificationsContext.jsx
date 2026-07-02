// src/Contexts/NotificationsContext.jsx
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { useAuth0 } from "@auth0/auth0-react";
import axios from "axios";
import { io } from "socket.io-client";
//import { USE_AUTH } from "../config/apiConfig";

const NotificationsContext = createContext();
export const useNotifications = () => useContext(NotificationsContext);

export const NotificationsProvider = ({ children }) => {
  const { user, isAuthenticated, getAccessTokenSilently } = useAuth0();

  const [notificaciones, setNotificaciones] = useState([]); // lista real (items)
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Baseline: número mínimo garantizado (no decrece por fetch)
  const [baselineUnread, setBaselineUnread] = useState(0);
  // Incrementos optimistas (solo aumentan hasta que fetch confirme)
  const optimisticRef = useRef(0);

  const pendingRefreshRef = useRef(false);
  const socketRef = useRef(null);
  
  const USE_AUTH = false;
  const STRAPI = (process.env.REACT_APP_STRAPI_URL || "").replace(/\/$/, "");
  const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || STRAPI || "";

  // helper: calcular unread dentro de una lista
  const computeUnreadFromItems = (items) => {
    if (!Array.isArray(items)) return 0;
    return items.filter((n) => {
      const attrs = n?.attributes ?? {};
      return !(attrs.leida === true || attrs.read === true || attrs.leida === "true");
    }).length;
  };

  // Construir headers teniendo en cuenta USE_AUTH
  const buildHeaders = useCallback(async () => {
    const headers = { "Content-Type": "application/json" };
    if (!USE_AUTH) return headers;
    try {
      if (typeof getAccessTokenSilently === "function") {
        const token = await getAccessTokenSilently();
        if (token) headers.Authorization = `Bearer ${token}`;
      }
    } catch (err) {
      console.debug("NotificationsContext: no se obtuvo token (buildHeaders)", err);
    }
    return headers;
  }, [getAccessTokenSilently]);

  // Fetch de notificaciones (robusto: no reduce baseline)
  const fetchNotificaciones = useCallback(async () => {
    // Si USE_AUTH exige autenticación y no está autenticado -> limpiar y salir
    if (USE_AUTH && !isAuthenticated) {
      setNotificaciones((prev) => prev || []);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const headers = await buildHeaders();
      // solicitamos por email (igual que tenías)
      const url = `${STRAPI}/api/notificaciones?populate=usuario&filters[usuario][email][$eq]=${encodeURIComponent(
        user?.email ?? ""
      )}&pagination[limit]=100`;
      const res = await axios.get(url, { headers });

      const items = res.data?.data ?? [];

      // Si server responde items > 0 -> reemplazamos la lista para mantener datos completos
      // Si responde vacío -> NO sobrescribimos la lista local (para evitar "desaparición")
      if (Array.isArray(items) && items.length > 0) {
        setNotificaciones(items);
      } else {
        // no reemplazamos con vacío; mantenemos lo que teníamos
        setNotificaciones((prev) => (Array.isArray(prev) ? prev : []));
      }

      // calculamos unread desde server items (si items vacíos -> 0)
      const serverUnread = computeUnreadFromItems(items);
      // baseline solo sube, nunca baja por fetch
      setBaselineUnread((prev) => Math.max(prev || 0, serverUnread || 0));
    } catch (err) {
      console.error("NotificationsContext.fetchNotificaciones error:", err);
      setError(err?.message || String(err));
      // No limpiamos notificaciones en caso de error: mantenemos estado local
    } finally {
      setLoading(false);
    }
  }, [STRAPI, user, isAuthenticated, buildHeaders]);

  // pushNotification: inserta optimista y dispara refresh agrupado
  const pushNotification = useCallback(
    (payload) => {
      const normalized = {
        id: payload?.id ?? `notif_${Date.now()}`,
        attributes: {
          titulo: payload?.title ?? payload?.titulo ?? "Notificación",
          mensaje:
            payload?.message ?? payload?.body ?? JSON.stringify(payload).slice(0, 500),
          leida: false,
          createdAt: payload?.createdAt ?? new Date().toISOString(),
        },
        payload,
      };

      // inserción optimista (no removemos prev)
      setNotificaciones((prev) => {
        // Evitamos duplicados por id
        const exists = Array.isArray(prev) && prev.some((p) => p.id === normalized.id);
        if (exists) return prev;
        return [normalized, ...(Array.isArray(prev) ? prev : [])];
      });

      // incrementa optimista
      optimisticRef.current = optimisticRef.current + 1;

      // actualiza baseline visible mínimamente (para que el UI suba inmediatamente)
      setBaselineUnread((prev) => (prev || 0) + 1);

      // Debounced refresh: agrupa múltiples notifs en 800ms
      if (!pendingRefreshRef.current) {
        pendingRefreshRef.current = true;
        setTimeout(async () => {
          pendingRefreshRef.current = false;
          try {
            await fetchNotificaciones();
            // una vez fetch termine, reseteamos optimista porque server confirma
            optimisticRef.current = 0;
          } catch (e) {
            // si falló el fetch, mantenemos optimista (no lo reducimos)
            console.warn("NotificationsContext: fetch after push failed:", e);
          }
        }, 800);
      }
    },
    [fetchNotificaciones]
  );

  // markAsRead: llamado desde UI para marcar notifs como leídas
  // ids: array o single id
  const markAsRead = useCallback(
    async (ids) => {
      const idArray = Array.isArray(ids) ? ids : [ids];
      if (idArray.length === 0) return;

      try {
        const headers = await buildHeaders();
        // Intentamos actualizar en backend (uno a uno o en batch según tu API)
        // Aquí hacemos peticiones individuales por compatibilidad
        await Promise.all(
          idArray.map((id) =>
            axios.put(
              `${STRAPI}/api/notificaciones/${id}`,
              { data: { leida: true } },
              { headers }
            )
          )
        );

        // Actualizamos localmente: marcamos como leida y reducimos baseline
        setNotificaciones((prev) =>
          (prev || []).map((n) =>
            idArray.includes(n.id) ? { ...n, attributes: { ...n.attributes, leida: true } } : n
          )
        );

        // Reducimos baseline en la cantidad marcada (no permitir negative)
        setBaselineUnread((prev) => Math.max(0, (prev || 0) - idArray.length));
      } catch (err) {
        console.error("NotificationsContext.markAsRead error:", err);
        // no forzamos cambios locales si falla; podrías marcar local y revertir si falla
      }
    },
    [STRAPI, buildHeaders]
  );

  // socket centralizado (si hay URL)
  useEffect(() => {
    if (!SOCKET_URL) {
      console.debug("NotificationsContext: no SOCKET_URL configurado, no se inicializa socket.");
      return;
    }

    // Si USE_AUTH requiere auth y no estamos autenticados, no conectamos
    if (USE_AUTH && !isAuthenticated) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    let mounted = true;

    (async () => {
      try {
        const token =
          USE_AUTH && typeof getAccessTokenSilently === "function"
            ? await (async () => {
                try {
                  return await getAccessTokenSilently();
                } catch {
                  return null;
                }
              })()
            : null;

        const opts = { transports: ["websocket"] };
        if (token) opts.auth = { token };

        // desconectar previo
        if (socketRef.current) {
          socketRef.current.disconnect();
          socketRef.current = null;
        }

        const socket = io(SOCKET_URL, opts);
        socketRef.current = socket;

        socket.on("connect", () =>
          console.debug("NotificationsContext socket conectado", socket.id)
        );
        socket.on("connect_error", (err) =>
          console.warn("NotificationsContext socket connect_error", err)
        );

        socket.on("notification", (data) => {
          if (!mounted) return;
          console.debug("NotificationsContext socket notification:", data);
          pushNotification(data);
        });
      } catch (err) {
        console.error("NotificationsContext socket init error:", err);
      }
    })();

    return () => {
      mounted = false;
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [SOCKET_URL, isAuthenticated, getAccessTokenSilently, pushNotification]);

  // fetch inicial cuando cambia auth/user
  useEffect(() => {
    // Si USE_AUTH y no authenticated -> limpia
    if (USE_AUTH && !isAuthenticated) {
      setNotificaciones([]);
      setBaselineUnread(0);
      setLoading(false);
      return;
    }
    fetchNotificaciones();
  }, [isAuthenticated, user, fetchNotificaciones]);

  // displayed unread: max(baseline, unreadFromList) + optimistic
  const unreadFromList = useMemo(() => computeUnreadFromItems(notificaciones), [notificaciones]);
  const displayedUnread =
    Math.max(baselineUnread || 0, unreadFromList || 0) + (optimisticRef.current || 0);

  const value = {
    notificaciones,
    loading,
    error,
    // números
    baselineUnread,
    unreadFromList,
    unreadCount: displayedUnread, // valor listo para UI
    // acciones
    refreshNotificaciones: fetchNotificaciones,
    markAsRead,
    pushNotification,
  };

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
};
