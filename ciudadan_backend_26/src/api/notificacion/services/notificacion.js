'use strict';

/**
 * notificacion service
 *
 * Lógica de negocio de notificaciones persistentes.
 *
 * Modelo reutilizado: `api::notificacion.notificacion` (NO se creó otro).
 * Flujo de `createForUser` (persistencia + tiempo real coordinados):
 *
 *   create -> construir datos -> persistir -> devolver entidad
 *          -> (el controller sanitiza y llama a emitRealtime)
 *          -> socket-service emite SOLO al room del destinatario
 *
 * El socket-service es un proceso aparte (socket-service/server.js) expuesto en
 * SOCKET_HOST:SOCKET_PORT. Strapi le pide emitir vía POST /notifica.
 */

const http = require('http');
const { createCoreService } = require('@strapi/strapi').factories;

// ---------------------------------------------------------------------------
// Config del puente Strapi -> socket-service
// ---------------------------------------------------------------------------
// SOCKET_INTERNAL_URL permite apuntar a otro host; por defecto se reutilizan las
// variables que ya existían en el .env (SOCKET_HOST + SOCKET_PORT).
const socketHost = (process.env.SOCKET_HOST || 'http://localhost').replace(/\/+$/, '');
const socketPort = String(process.env.SOCKET_PORT || '33035');
const SOCKET_NOTIFY_URL =
  process.env.SOCKET_INTERNAL_URL || `${socketHost}:${socketPort}/notifica`;

const STATUS_ENTREGADA = 'entregada';
const STATUS_LEIDA = 'leida';
const DEFAULT_TYPE = 'system.info';

/**
 * El campo `cuerpo` del modelo es de tipo `blocks` (rich text de Strapi). La API
 * pública habla de `message` (texto plano), así que convertimos a bloques aquí
 * en vez de inventar otro campo: la UI ya sabe renderizar `cuerpo`.
 */
const textToBlocks = (text) => {
  const value = typeof text === 'string' ? text.trim() : '';
  if (!value) return null;

  return value
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => ({
      type: 'paragraph',
      children: paragraph
        .split('\n')
        .reduce((children, line, index) => {
          if (index > 0) children.push({ type: 'text', text: '\n' });
          children.push({ type: 'text', text: line });
          return children;
        }, []),
    }));
};

const normalizeEmail = (value) => String(value || '').trim();

/** Filtro único para "las notificaciones de este usuario": relación o email. */
const userScopedFilters = (user) => ({
  $or: [{ usuario: { id: user.id } }, { user_email: { $eq: user.email } }],
});

/**
 * POST JSON con el módulo `http` nativo (no fetch ni axios): en esta plataforma
 * (arm64 + Node 20) el fetch global falla contra localhost — ver
 * docs/deploy-instancia3.md ("Bug conocido").
 */
const postJson = (url, body, timeoutMs = 5000) =>
  new Promise((resolve, reject) => {
    let parsed;
    try {
      parsed = new URL(url);
    } catch (err) {
      reject(new Error(`URL inválida para socket-service: ${url}`));
      return;
    }

    const payload = Buffer.from(JSON.stringify(body));

    const req = http.request(
      {
        protocol: parsed.protocol,
        hostname: parsed.hostname,
        port: parsed.port,
        path: `${parsed.pathname}${parsed.search}`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': payload.length,
        },
        timeout: timeoutMs,
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => {
          raw += chunk;
        });
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(raw);
          } else {
            reject(new Error(`socket-service respondió ${res.statusCode}: ${raw.slice(0, 200)}`));
          }
        });
      }
    );

    req.on('timeout', () => req.destroy(new Error(`timeout tras ${timeoutMs}ms`)));
    req.on('error', reject);
    req.write(payload);
    req.end();
  });

module.exports = createCoreService('api::notificacion.notificacion', ({ strapi }) => ({
  /** Expuesto para logs/tests. */
  socketNotifyUrl: SOCKET_NOTIFY_URL,

  textToBlocks,

  /** Busca el destinatario en Strapi por email. Devuelve null si no existe. */
  async resolveUserByEmail(email) {
    const normalized = normalizeEmail(email);
    if (!normalized) return null;

    const user = await strapi.db.query('plugin::users-permissions.user').findOne({
      where: { email: normalized },
    });

    return user || null;
  },

  /**
   * Pide al socket-service que emita la notificación.
   * NUNCA emite en global: o va al room del destinatario, o (explícitamente) a
   * todos si el llamador pide `broadcast: true`.
   *
   * Es best-effort a propósito: si el socket-service está caído la notificación
   * ya quedó persistida y el usuario la verá al refrescar.
   */
  async emitRealtime({ email, notification = null, broadcast = false }) {
    const recipient = normalizeEmail(email);

    if (!recipient && !broadcast) {
      strapi.log.warn(
        'notificacion.emitRealtime: sin destinatario y sin broadcast explícito -> no se emite'
      );
      return { emitted: false, reason: 'sin destinatario' };
    }

    const body = {
      email: recipient || null,
      notification: notification ?? null,
      broadcast: Boolean(broadcast),
    };

    try {
      await postJson(SOCKET_NOTIFY_URL, body);
      return {
        emitted: true,
        sentTo: broadcast ? ['broadcast', recipient].filter(Boolean) : [recipient],
      };
    } catch (err) {
      strapi.log.warn(
        `notificacion.emitRealtime: no se pudo emitir por socket (${SOCKET_NOTIFY_URL}): ${err.message}`
      );
      return { emitted: false, reason: err.message };
    }
  },

  /**
   * Crea la notificación persistente del destinatario.
   * `input`: { to, title, message, type, link, icon, image, meta }
   */
  async createForUser(input = {}) {
    const recipient = await this.resolveUserByEmail(input.to);

    if (!recipient) {
      const err = new Error(`El destinatario ${input.to} no existe en Strapi`);
      err.status = 404;
      throw err;
    }

    const now = new Date().toISOString();

    // `image` puede llegar como URL externa. El modelo guarda imágenes como
    // media (subida a Strapi), que no se puede crear desde una URL sin pasar
    // por el pipeline de uploads; para que la imagen sobreviva a un refresh se
    // guarda en `meta.image`. El normalizador del frontend lee primero la media
    // real y, si no hay, `meta.image`.
    let metaValue =
      input.meta && typeof input.meta === 'object' && !Array.isArray(input.meta)
        ? { ...input.meta }
        : null;

    if (typeof input.image === 'string' && input.image.trim() && !metaValue?.image) {
      metaValue = metaValue ? { ...metaValue, image: input.image.trim() } : { image: input.image.trim() };
    }

    const data = {
      titulo: String(input.title || '').trim() || 'Notificación',
      cuerpo: textToBlocks(input.message),
      user_email: recipient.email,
      usuario: recipient.id,
      tipo: String(input.type || DEFAULT_TYPE).trim() || DEFAULT_TYPE,
      link: input.link ? String(input.link).trim() : null,
      icono: input.icon ? String(input.icon).trim() : null,
      leida: false,
      status: STATUS_ENTREGADA,
      timestamp: now,
      meta: metaValue,
      // draftAndPublish está activo en este content-type: sin publishedAt la
      // notificación quedaría como borrador y no llegaría al usuario.
      publishedAt: now,
    };

    return strapi.entityService.create('api::notificacion.notificacion', {
      data,
      populate: ['imagen'],
    });
  },
  /** Notificaciones del usuario autenticado (más recientes primero). */
  async listForUser(user, { limit = 100 } = {}) {
    return strapi.db.query('api::notificacion.notificacion').findMany({
      where: userScopedFilters(user),
      orderBy: { createdAt: 'desc' },
      limit,
      populate: ['imagen'],
    });
  },

  /** Una notificación del usuario autenticado (o null si no es suya / no existe). */
  async findForUser(user, id) {
    const numericId = Number.parseInt(id, 10);
    if (!Number.isFinite(numericId)) return null;

    return strapi.db.query('api::notificacion.notificacion').findOne({
      where: { ...userScopedFilters(user), id: numericId },
      populate: ['imagen'],
    });
  },

  /**
   * Marca leída / no leída. Idempotente: si ya está en el estado pedido no
   * escribe en BD (así marcar dos veces no rompe nada).
   */
  async setReadForUser(user, id, read = true) {
    const entity = await this.findForUser(user, id);
    if (!entity) return null;

    const desired = Boolean(read);
    const status = desired ? STATUS_LEIDA : STATUS_ENTREGADA;

    if (Boolean(entity.leida) === desired && entity.status === status) {
      return entity;
    }

    return strapi.db.query('api::notificacion.notificacion').update({
      where: { id: entity.id },
      data: { leida: desired, status },
      populate: ['imagen'],
    });
  },

  /**
   * Marca como leídas TODAS las no leídas del usuario autenticado.
   * Devuelve cuántas se actualizaron y cuántas quedan sin leer.
   */
  async markAllReadForUser(user) {
    const updated = await strapi.db.query('api::notificacion.notificacion').updateMany({
      where: { ...userScopedFilters(user), leida: { $ne: true } },
      data: { leida: true, status: STATUS_LEIDA },
    });

    const unreadLeft = await strapi.db.query('api::notificacion.notificacion').count({
      where: { ...userScopedFilters(user), leida: { $ne: true } },
    });

    return { updated: updated?.count ?? 0, unreadLeft };
  },
}));
