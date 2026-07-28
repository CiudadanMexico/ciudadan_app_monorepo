// src/lib/socketClient.js
import { io } from "socket.io-client";

let socket = null;

const getSocketUrl = () => {
  // fallback a http://localhost:3033 si no tienes env
  return process.env.REACT_APP_SOCKET_URL || "http://localhost:3033";
};

export function getSocket() {
  if (typeof window === "undefined") return null; // SSR-safe
  if (socket && socket.connected) return socket;

  if (!socket) {
    const url = getSocketUrl();
    socket = io(url, { transports: ["websocket"] });

    socket.on("connect", () => {
      // eslint-disable-next-line no-console
      console.log("[socketClient] conectado:", socket.id, "->", url);
    });

    socket.on("connect_error", (err) => {
      // eslint-disable-next-line no-console
      console.warn("[socketClient] connect_error:", err && (err.message || err));
    });

    socket.on("disconnect", (reason) => {
      // eslint-disable-next-line no-console
      console.log("[socketClient] disconnected:", reason);
    });
  }

  return socket;
}

export function emitEvent(eventName, payload, ack) {
  const s = getSocket();
  if (!s) {
    if (typeof ack === "function") ack({ ok: false, error: "no-socket" });
    return;
  }
  try {
    s.emit(eventName, payload, (response) => {
      if (typeof ack === "function") ack(response);
    });
  } catch (e) {
    if (typeof ack === "function") ack({ ok: false, error: String(e) });
  }
}

export function onEvent(eventName, handler) {
  const s = getSocket();
  if (!s) return;
  s.on(eventName, handler);
}

export function offEvent(eventName, handler) {
  const s = getSocket();
  if (!s) return;
  if (handler) s.off(eventName, handler);
  else s.off(eventName);
}
