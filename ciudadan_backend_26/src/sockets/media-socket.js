"use strict";

/**
 * media-socket (Bloque 5C): Socket.IO sobre el httpServer de Strapi.
 *
 * REUTILIZA:
 *  - la dependencia socket.io ^4.8.1 ya presente en package.json (sin
 *    instalar nada nuevo).
 *  - el MISMO concepto de identidad del backend real: token Auth0
 *    (getAuth0Email, cache 30s) o JWT local users-permissions (HS256
 *    JWT_SECRET). No inventa otro login.
 *
 * Seguridad:
 *  - Un socket sin credencial valida NO se une a ningun room de media
 *    (los eventos media:* nunca le llegan).
 *  - El room se asigna SERVER-SIDE (media:user:<ID>) a partir del usuario
 *    verificado; el cliente NO puede elegir room/userId.
 *  - Payload seguro: solo id local, type, status, resourceClass, progress,
 *    warnings, updatedAt, artifactsReady. Nunca mediaJobId remoto, paths,
 *    tokens ni PIDs.
 *
 * Los eventos se emiten desde: (a) el poller (cambio de estado) y (b) las
 * acciones REST (created/cancelled/retry). Socket.IO NO escribe estado
 * arbitrario en MediaJob: solo el bridge (poller) y las acciones REST
 * actualizan el modelo.
 */

const { Server } = require("socket.io");
const { getAuth0Email } = require("../utils/auth0-verify");
const jwt = require("jsonwebtoken");

const MEDIA_USER_ROOM_PREFIX = "media:user:";

function mediaRoom(userId) {
  return MEDIA_USER_ROOM_PREFIX + String(userId);
}

async function resolveUserFromToken(token, strapi) {
  if (!token || typeof token !== "string") return null;
  // 1) Auth0 (mismo flujo que is-authenticated-auth0)
  try {
    const email = await getAuth0Email(token, { strapi });
    if (email) {
      const user = await strapi.db
        .query("plugin::users-permissions.user")
        .findOne({ where: { email } });
      if (user) return user;
    }
  } catch (e) {
    // no es token Auth0 valido: probar JWT local
  }
  // 2) JWT local users-permissions (POST /api/auth/local, payload {id})
  const secret = process.env.JWT_SECRET;
  if (!secret) return null;
  try {
    const payload = jwt.verify(token, secret);
    if (!payload || !payload.id) return null;
    const user = await strapi.db
      .query("plugin::users-permissions.user")
      .findOne({ where: { id: payload.id } });
    return user || null;
  } catch (e) {
    return null;
  }
}

function initMediaSocket(strapi) {
  if (strapi.io) return strapi.io; // idempotente (hot reload / dev)

  const origins = (process.env.CORS_ORIGINS ||
    "http://localhost:3001,http://localhost:3000,http://localhost:33422,http://localhost:33033")
    .split(",").map((s) => s.trim()).filter(Boolean);

  // Path propio: en produccion nginx enruta /socket.io/ al socket-service
  // legacy (:33331) y el resto a Strapi (:33332). Con un path distinto el
  // socket media llega a Strapi sin tocar nginx ni el servicio legacy.
  const MEDIA_SOCKET_PATH = process.env.MEDIA_SOCKET_PATH || "/media-socket.io/";
  const io = new Server(strapi.server.httpServer, {
    path: MEDIA_SOCKET_PATH,
    cors: { origin: origins, methods: ["GET", "POST"], credentials: false },
  });

  io.use(async (socket, next) => {
    try {
      const token =
        (socket.handshake.auth && socket.handshake.auth.token) ||
        (socket.handshake.headers.authorization || "").replace(/^Bearer\s+/i, "");
      const user = await resolveUserFromToken(token, strapi);
      if (!user) {
        strapi.log.warn("[media-socket] handshake sin credencial valida; sin room media");
        return next(); // conecta, pero SIN room media (no recibe eventos)
      }
      socket.data.mediaUser = { id: user.id, email: user.email };
      socket.join(mediaRoom(user.id));
      strapi.log.info(`[media-socket] usuario ${user.id} unido a ${mediaRoom(user.id)}`);
      return next();
    } catch (e) {
      strapi.log.warn("[media-socket] error en handshake:", e.message || e);
      return next(); // sin room media
    }
  });

  // El cliente NO elige rooms: cualquier join desde el cliente se ignora.
  io.on("connection", (socket) => {
    socket.onAny((event) => {
      if (
        String(event).startsWith("media:") ||
        String(event) === "join" ||
        String(event) === "subscribe"
      ) {
        strapi.log.warn(`[media-socket] evento cliente ignorado (rooms server-side): ${event}`);
      }
    });
  });

  strapi.io = io;
  return io;
}

module.exports = { initMediaSocket, mediaRoom, MEDIA_USER_ROOM_PREFIX };
