// src/Contexts/MediaSocketContext.jsx
/**
 * Bloque 5C: contexto Socket.IO del feature media (una conexión por
 * sesión, patrón NotificationsContext). Reutiliza socket.io-client ya
 * presente y el MISMO concepto de identidad del app (Auth0; fallback a
 * JWT local users-permissions para pruebas/usuarios de servicio).
 *
 * Las páginas se suscriben vía subscribe(event, fn) — NUNCA abren sockets
 * propios ni por job. Los listeners se limpian al desmontar (off) para no
 * acumular.
 *
 * Socket URL: REACT_APP_MEDIA_SOCKET_URL (opcional) || REACT_APP_STRAPI_URL
 * (mismo origen del backend — el servidor Socket.IO vive en el backend
 * Strapi). NO usa REACT_APP_SOCKET_URL (es del microservicio de Taxis).
 *
 * REST = fuente autoritativa. El socket solo acelera la actualización: al
 * (re)conectar, las páginas hacen refresh REST de GET /api/media/jobs.
 */
import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import { io } from "socket.io-client";

const MediaSocketContext = createContext();
export const useMediaSocket = () => useContext(MediaSocketContext);

export const MEDIA_EVENTS = [
  "media:job:created",
  "media:job:updated",
  "media:job:succeeded",
  "media:job:failed",
  "media:job:cancelled",
  "media:job:interrupted",
];

export const MediaSocketProvider = ({ getToken, children }) => {
  const socketRef = useRef(null);
  const listenersRef = useRef(new Map()); // event -> Set<fn>
  const [connected, setConnected] = useState(false);

  /** Suscribe un listener (limpia al desmontar via la función retornada). */
  const subscribe = useCallback((event, fn) => {
    if (!listenersRef.current.has(event)) {
      listenersRef.current.set(event, new Set());
    }
    listenersRef.current.get(event).add(fn);
    const s = socketRef.current;
    if (s && s.connected !== undefined) s.on(event, fn);
    return () => {
      const set = listenersRef.current.get(event);
      if (set) set.delete(fn);
      const sock = socketRef.current;
      if (sock) sock.off(event, fn);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let token = null;
      try {
        token = typeof getToken === "function" ? await getToken() : null;
      } catch (e) {
        token = null;
      }
      if (cancelled || !token) return;
      const SOCKET_URL =
        process.env.REACT_APP_MEDIA_SOCKET_URL ||
        (process.env.REACT_APP_STRAPI_URL || "").replace(/\/$/, "");
      if (!SOCKET_URL) return;
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      const s = io(SOCKET_URL, {
        auth: { token },
        path: process.env.REACT_APP_MEDIA_SOCKET_PATH || "/media-socket.io/",
      });
      socketRef.current = s;
      // re-suscribir los listeners ya registrados (reconnect)
      for (const [ev, fns] of listenersRef.current.entries()) {
        for (const fn of fns) s.on(ev, fn);
      }
      s.on("connect", () => {
        if (!cancelled) setConnected(true);
      });
      s.on("disconnect", () => {
        if (!cancelled) setConnected(false);
      });
      s.on("connect_error", () => {
        if (!cancelled) setConnected(false);
      });
    })();
    return () => {
      cancelled = true;
      const s = socketRef.current;
      if (s) {
        for (const [ev, fns] of listenersRef.current.entries()) {
          for (const fn of fns) s.off(ev, fn);
        }
        s.disconnect();
      }
      socketRef.current = null;
      setConnected(false);
    };
  }, [getToken]);

  return (
    <MediaSocketContext.Provider value={{ subscribe, connected }}>
      {children}
    </MediaSocketContext.Provider>
  );
};
