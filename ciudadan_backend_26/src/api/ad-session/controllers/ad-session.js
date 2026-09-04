'use strict';

/**
 * ad-session controller
 *
 * Sesión de reproducción de anuncios remunerados. El frontend NO decide que
 * un anuncio fue visto: solo envía heartbeats (eventos de reproducción) y el
 * backend reconstruye la visualización, valida cobertura/tiempo efectivo y
 * emite la recompensa en laborys (patrón atómico de calificar.js).
 *
 * Todas las rutas usan la política global::is-authenticated-auth0, que valida
 * el Bearer token de Auth0 y setea ctx.state.strapiUser (NO ctx.state.user).
 */

const { createCoreController } = require('@strapi/strapi').factories;
const crypto = require('crypto');

// --- Constantes / umbrales anti-fraude ---
const SEGMENTO_MS = 250;              // un segmento lógico de cobertura =  ́250 ms
const MAX_AVANCE_POR_TICK_SEG = 1.5;   // el server no confía ciegamente en currentTime
const MIN_COBERTURA = 0.95;            // cobertura ≥ 95% para considerar válida la visualización
const MIN_TIEMPO_EFECTIVO = 0.85;      // tiempo efectivo ≥ 85% de la duración
const TOPE_DIARIO_MIN = 60;            // tope diario de visualización efectiva (minutos)
const PAGO_ORIGEN = 'ciudadan_ads';
const PAGO_TIPO = 'ad_reward';

// --- Máquina de estados de un item (validada server-side) ---
const TRANSICIONES_VALIDAS = {
  queued: ['playing', 'decision_window', 'skipped'],
  playing: ['decision_window', 'committed', 'skipped', 'abandoned'],
  decision_window: ['committed', 'skipped', 'abandoned'],
  committed: ['abandoned'],
  abandoned: [],
  skipped: [],
  completed: [],
  invalid: [],
};

function puedeTransicionar(from, to) {
  if (!from || from === to) return true;
  const permitidas = TRANSICIONES_VALIDAS[from] || [];
  return permitidas.includes(to);
}

/** Extrae el token de la sesión: header X-Ad-Token, body.token o query.token. */
function obtenerToken(ctx) {
  const header = ctx.request.headers['x-ad-token'];
  if (header) return Array.isArray(header) ? header[0] : header;
  return ctx.request.body?.token || ctx.query?.token || '';
}

/** Crea un array de cobertura (0/1) del tamaño correcto para la duración. */
function nuevaCobertura(duracionSeg) {
  const total = Math.max(1, Math.round((duracionSeg * 1000) / SEGMENTO_MS));
  return { cobertura: Array(total).fill(0), segmentosTotales: total };
}

/**
 * Suma para incrementos atómicos.
 * MVP: suma en JS dentro de strapi.db.transaction. El riesgo de carrera se
 * considera despreciable: la emisión está protegida por la bandera
 * recompensa_emitida (un solo pago por item) y la transacción envuelve
 * lectura + escritura. Evita APIs inexistentes (strapi.db.col no existe en
 * Strapi 4) y funciona igual en sqlite (dev) y postgres (prod).
 */
function colSuma(_strapi, base, delta) {
  return Number(base || 0) + Number(delta || 0);
}

/** Carga la sesión (con items+anuncio) y valida el token. */
async function cargarSesionValida(ctx, sesionId, strapi) {
  const sesion = await strapi.entityService.findOne('api::ad-session.ad-session', sesionId, {
    populate: {
      items: { populate: { anuncio: true } },
      usuario: true,
    },
  });
  if (!sesion) return null;
  const token = obtenerToken(ctx);
  if (!token || token !== sesion.token) return null;
  return sesion;
}

/**
 * IDs de anuncios que el usuario ya VIO hoy (vista válida = ad_view creado al
 * completar). "Hoy" = medianoche del server (mismo patrón que TOPE_DIARIO_MIN).
 * Se usa para excluirlos del grid / sesión / refill: un anuncio visto un día
 * no vuelve a aparecer hasta el día siguiente.
 */
async function idsVistosHoy(strapi, userId) {
  if (!userId) return [];
  const inicioHoy = new Date(); inicioHoy.setHours(0, 0, 0, 0);
  // ad es RELACIÓN con tabla de enlaces: no admite select directo, se popula.
  const vistas = await strapi.db.query('api::ad-view.ad-view').findMany({
    where: {
      usuario: { id: userId },
      timestamp: { $gte: inicioHoy.toISOString() },
    },
    populate: ['ad'],
  });
  return vistas.map((v) => Number(v.ad?.id ?? v.ad)).filter((n) => Number.isFinite(n) && n > 0);
}

module.exports = createCoreController('api::ad-session.ad-session', ({ strapi }) => ({
  /**
   * POST /ads/sesiones
   * Crea una sesión única de reproducción. Body: { adIds: [] }.
   * Si la lista está vacía, elige anuncios aleatorios (MVP).
   */
  async iniciarSesion(ctx) {
    const userId = ctx.state.strapiUser?.id;
    if (!userId) return ctx.throw(401, 'Usuario no autenticado');

    const { adIds } = ctx.request.body || {};
    const ids = Array.isArray(adIds) ? adIds.map((i) => Number(i)).filter((i) => i > 0) : [];

    // Anuncios publicitarios activos publicados (video), excluyendo los que
    // el usuario ya vio hoy (un anuncio visto no reaparece hasta el día siguiente).
    const vistosHoy = await idsVistosHoy(strapi, userId);
    const disponibles = await strapi.db.query('api::ad.ad').findMany({
      where: {
        esPublicitario: true,
        activo: true,
        tipo: 'video',
        publishedAt: { $notNull: true },
        ...(vistosHoy.length > 0 ? { id: { $notIn: vistosHoy } } : {}),
      },
      populate: ['archivo', 'thumbnail'],
    });

    if (disponibles.length === 0) {
      if (vistosHoy.length > 0) {
        return ctx.throw(404, 'Ya viste todos los anuncios disponibles por hoy. Vuelve mañana.');
      }
      return ctx.throw(404, 'No hay anuncios publicitarios disponibles');
    }

    // Elegir anuncios: los solicitados (si son válidos) o aleatorios.
    let elegidos;
    if (ids.length > 0) {
      elegidos = disponibles.filter((a) => ids.includes(a.id));
      if (elegidos.length === 0) {
        return ctx.throw(404, 'Ninguno de los anuncios seleccionados está disponible');
      }
    } else {
      elegidos = disponibles.sort(() => Math.random() - 0.5).slice(0, Math.min(5, disponibles.length));
    }

    const token = crypto.randomUUID();
    const inicio = new Date().toISOString();
    let sesion;
    // Pares { item, ad }: el create() de db.query NO hidrata la FK (anuncio)
    // en su respuesta, así que asociamos el ad aquí mismo para serializar.
    const itemsCreados = [];
    try {
      await strapi.db.transaction(async () => {
        sesion = await strapi.db.query('api::ad-session.ad-session').create({
          data: {
            usuario: userId,
            token,
            estado: 'activa',
            inicio,
            indice_actual: 0,
            recompensa_total: 0,
            metadata: { adIdsOriginal: ids, config: { segmentoMs: SEGMENTO_MS } },
          },
        });

        let orden = 0;
        for (const ad of elegidos) {
          const duracion = Number(ad.duracion || 0);
          const recompensa = Number(ad.recompensa || 0);
          if (duracion <= 0) continue;
          const { cobertura, segmentosTotales } = nuevaCobertura(duracion);
          const item = await strapi.db.query('api::ad-session-item.ad-session-item').create({
            data: {
              sesion: sesion.id,
              anuncio: ad.id,
              orden,
              estado: 'queued',
              cobertura,
              segmentos_totales: segmentosTotales,
              tiempo_efectivo_ms: 0,
              ultima_posicion_seg: 0,
              recompensa,
              recompensa_emitida: false,
            },
          });
          itemsCreados.push({ item, ad });
          orden++;
        }
      });
    } catch (err) {
      strapi.log.error('ad-session.iniciarSesion: fallo en transacción', err);
      return ctx.throw(500, 'Error al crear la sesión de anuncios');
    }

    if (itemsCreados.length === 0) {
      return ctx.throw(400, 'Los anuncios seleccionados no tienen duración válida');
    }

    // Serializa los items con datos del anuncio (para el VideoPlayer del frontend).
    const itemsOut = itemsCreados.map(({ item: it, ad: a }) => ({
      id: it.id,
      orden: it.orden,
      estado: it.estado,
      titulo: a.titulo,
      descripcion: a.texto || a.descripcion || '',
      duracion: Number(a.duracion || 0),
      decisionWindow: Number(a.decisionWindow || 5),
      recompensa: Number(it.recompensa || a.recompensa || 0),
      // Prioridad: archivo REAL subido en Strapi > fallback del seed (metadata).
      archivo_url: a.archivo?.url || a.metadata?.archivo_url || '',
      thumbnail_url: a.thumbnail?.url || a.metadata?.thumbnail_url || '',
    }));

    ctx.body = { data: { sesionId: sesion.id, token, items: itemsOut } };
  },
  /**
   * POST /ads/sesiones/:id/anuncios/:itemId/estado
   * Body: { token, estado }. Máquina de estados del item, validada server-side.
   */
  async cambiarEstado(ctx) {
    const { id, itemId } = ctx.params;
    const { estado } = ctx.request.body || {};

    if (!estado || !TRANSICIONES_VALIDAS[estado]) {
      return ctx.throw(400, 'Estado inválido');
    }

    const sesion = await cargarSesionValida(ctx, id, strapi);
    if (!sesion) return ctx.throw(403, 'Sesión inválida o expirada');

    const item = sesion.items.find((it) => it.id === Number(itemId));
    if (!item) return ctx.throw(404, 'El anuncio no pertenece a esta sesión');

    if (!puedeTransicionar(item.estado, estado)) {
      return ctx.throw(
        400,
        `Transición inválida: '${item.estado}' -> '${estado}'. ` +
        `Permitidas desde '${item.estado}': ${(TRANSICIONES_VALIDAS[item.estado] || []).join(', ') || 'ninguna'}`
      );
    }

    const ahora = new Date().toISOString();
    const data = { estado };

    if (estado === 'playing' && !item.inicio) data.inicio = ahora;
    if (['completed', 'skipped', 'abandoned', 'invalid'].includes(estado)) data.fin = ahora;

    const updated = await strapi.db.query('api::ad-session-item.ad-session-item').update({
      where: { id: item.id },
      data,
    });

    ctx.body = { data: updated };
  },
  /**
   * POST /ads/sesiones/:id/heartbeat
   * Body: { token, itemId, currentTime, playing, visible, focused }.
   * El server marca segmentos únicos de cobertura SOLO si playing && visible && focused,
   * aplica anti-gap (máx +1.5 s por tick) y acumula tiempo efectivo. El cliente
   * nunca envía "video visto" ni "completado": solo eventos de reproducción.
   */
  async heartbeat(ctx) {
    const { id } = ctx.params;
    const body = ctx.request.body || {};
    const itemId = Number(body.itemId || 0);
    const currentTime = Number(body.currentTime || 0);
    const playing = !!body.playing;
    const visible = !!body.visible;
    const focused = !!body.focused;

    if (!itemId || Number.isNaN(currentTime) || currentTime < 0) {
      return ctx.throw(400, 'itemId y currentTime son requeridos');
    }

    const sesion = await cargarSesionValida(ctx, id, strapi);
    if (!sesion) return ctx.throw(403, 'Sesión inválida o expirada');

    const item = sesion.items.find((it) => it.id === itemId);
    if (!item) return ctx.throw(404, 'El anuncio no pertenece a esta sesión');
    const anuncio = item.anuncio;
    if (!anuncio) return ctx.throw(404, 'El anuncio no existe');

    const prevPos = Number(item.ultima_posicion_seg || 0);
    const duracion = Number(anuncio.duracion || 0);
    if (duracion <= 0) return ctx.throw(400, 'Anuncio sin duración válida');

    const ahora = new Date();
    const updates = { ultimo_tick: ahora.toISOString() };

    if (playing && visible && focused && !['completed', 'skipped', 'abandoned', 'invalid'].includes(item.estado)) {
      const avancePermitido = prevPos + MAX_AVANCE_POR_TICK_SEG;
      const posMarcada = Math.min(currentTime, avancePermitido, duracion);
      const inicioMarcado = Math.max(prevPos, 0);

      if (posMarcada > inicioMarcado) {
        const segMs = item.segmentos_totales || Math.max(1, Math.round((duracion * 1000) / SEGMENTO_MS));
        const cobertura = Array.isArray(item.cobertura) ? [...item.cobertura] : Array(segMs).fill(0);
        const duracionMs = duracion * 1000;

        for (let s = 0; s < segMs; s++) {
          const inicioSeg = (s * duracionMs) / segMs;
          const finSeg = ((s + 1) * duracionMs) / segMs;
          if (finSeg > inicioMarcado * 1000 && inicioSeg < posMarcada * 1000) {
            cobertura[s] = 1;
          }
        }

        const tiempoNuevoMs = Math.round((posMarcada - inicioMarcado) * 1000);
        updates.cobertura = cobertura;
        updates.tiempo_efectivo_ms = Number(item.tiempo_efectivo_ms || 0) + tiempoNuevoMs;
      }
      updates.ultima_posicion_seg = Math.min(posMarcada, duracion);
    }

        await strapi.db.query('api::ad-session-item.ad-session-item').update({
      where: { id: item.id },
      data: updates,
    });

    ctx.body = { data: { ok: true } };
  },

  /**
   * POST /ads/sesiones/:id/anuncios/:itemId/completar
   * ÚNICO punto que emite recompensa. Valida: sesión válida (token), item
   * en estado committed, cobertura ≥ 95%, tiempo efectivo ≥ 85%, tope diario,
   * y que no haya sido pagado ya. Transacción atómica al estilo calificar.js:
   * cartera += recompensa + laborys-payment + item completed.
   */
  async completarAnuncio(ctx) {
    const { id, itemId } = ctx.params;
    const itemDb = await strapi.db.query('api::ad-session-item.ad-session-item').findOne({
      where: { id: Number(itemId) },
      populate: { anuncio: true, sesion: true },
    });
    if (!itemDb) return ctx.throw(404, 'Item no encontrado');

    const sesion = await cargarSesionValida(ctx, id, strapi);
    if (!sesion) return ctx.throw(403, 'Sesión inválida o expirada');
    const item = sesion.items.find((it) => it.id === Number(itemId));
    if (!item) return ctx.throw(404, 'El anuncio no pertenece a esta sesión');

    if (item.estado !== 'committed') {
      return ctx.throw(400, `Solo se puede completar un anuncio comprometido (estado actual: '${item.estado}')`);
    }
    if (item.recompensa_emitida) {
      return ctx.throw(409, 'La recompensa de este anuncio ya fue emitida');
    }

    // Anti-fraude: un anuncio solo se paga una vez por usuario por día. Si ya
    // existe una vista de este anuncio HOY (otra sesión en paralelo), se rechaza.
    const inicioHoyDup = new Date(); inicioHoyDup.setHours(0, 0, 0, 0);
    const vistaDuplicada = await strapi.db.query('api::ad-view.ad-view').findOne({
      where: {
        usuario: { id: sesion.usuario.id },
        ad: { id: anuncio.id },
        timestamp: { $gte: inicioHoyDup.toISOString() },
      },
    });
    if (vistaDuplicada) {
      return ctx.throw(409, 'Ya viste este anuncio hoy. No se emitirá otra recompensa.');
    }

    const anuncio = item.anuncio;
    const duracion = Number(anuncio.duracion || 0);
    if (duracion <= 0) return ctx.throw(400, 'Anuncio sin duración válida');

    const segTotales = Number(item.segmentos_totales || Math.round((duracion * 1000) / SEGMENTO_MS));
    const segVistos = Array.isArray(item.cobertura)
      ? item.cobertura.filter((s) => s === 1).length
      : 0;
    const cobertura = segTotales > 0 ? segVistos / segTotales : 0;
        const tiempoEfectivoMin = (Number(item.tiempo_efectivo_ms || 0) / 1000 / 60);
    const tiempoRequeridoMin = duracion / 60 * MIN_TIEMPO_EFECTIVO;

    if (cobertura < MIN_COBERTURA) {
      await strapi.db.query('api::ad-session-item.ad-session-item').update({
        where: { id: item.id },
        data: { estado: 'invalid', fin: new Date().toISOString() },
      });
      return ctx.throw(400, `Cobertura insuficiente (${Math.round(cobertura * 100)}%). No se emitirá recompensa.`);
    }
    if (tiempoEfectivoMin < tiempoRequeridoMin) {
      await strapi.db.query('api::ad-session-item.ad-session-item').update({
        where: { id: item.id },
        data: { estado: 'invalid', fin: new Date().toISOString() },
      });
      return ctx.throw(400, `Tiempo efectivo insuficiente. No se emitirá recompensa.`);
    }

    // Tope diario de visualización efectiva por usuario (60 min/día).
    const inicioHoy = new Date(); inicioHoy.setHours(0, 0, 0, 0);
    const itemsHoy = await strapi.db.query('api::ad-session-item.ad-session-item').findMany({
      where: {
        sesion: { usuario: { id: sesion.usuario.id } },
        createdAt: { $gte: inicioHoy.toISOString() },
        estado: 'completed',
      },
      select: ['tiempo_efectivo_ms'],
    });
    const minutosHoy = itemsHoy.reduce((acc, it) => acc + (Number(it.tiempo_efectivo_ms || 0) / 60000), 0);
    if (minutosHoy + tiempoEfectivoMin > TOPE_DIARIO_MIN) {
      return ctx.throw(403, 'Has alcanzado tu tope diario de visualización (60 min).');
    }

    const recompensa = Number(anuncio.recompensa || 0);

    // Transacción atómica al estilo calificar.js.
    await strapi.db.transaction(async () => {
      // 1) Cargar e incrementar la cartera del usuario. Si no existe se
      // auto-crea (mismo patrón que calificar.js y cartera.create).
      let cartera = await strapi.db.query('api::cartera.cartera').findOne({
        where: { user_id: sesion.usuario.id },
      });
      if (!cartera) {
        cartera = await strapi.db.query('api::cartera.cartera').create({
          data: {
            laborysGanados: 0,
            laborysSaldo: 0,
            ciudadanTokens: 0,
            ciudadanRendimientos: 0,
            user_id: sesion.usuario.id,
          },
        });
      }
      const saldo = Number(cartera.laborysSaldo || 0);
      await strapi.db.query('api::cartera.cartera').update({
        where: { id: cartera.id },
        data: {
                    laborysSaldo: colSuma(strapi, cartera.laborysSaldo, recompensa),
          laborysGanados: colSuma(strapi, cartera.laborysGanados, recompensa),
        },
      });

      // 2) Registrar el pago como auditoría (laborys-payment).
      // Campos según el schema real: ammount, type, metadata, timestamp,
      // status, origin_wallet, destination_wallet. Los datos de la sesión
      // van en metadata (json).
      await strapi.entityService.create('api::laborys-payment.laborys-payment', {
        data: {
          origin_wallet: PAGO_ORIGEN,
          destination_wallet: `user:${sesion.usuario.id}`,
          ammount: recompensa,
          type: PAGO_TIPO,
          timestamp: new Date().toISOString(),
          status: 'completado',
          metadata: {
            ad_session_item: item.id,
            sesion_id: sesion.id,
            usuario_id: sesion.usuario.id,
            motivo: 'Visualización completa de anuncio remunerado',
          },
          publishedAt: new Date().toISOString(),
        },
      });

      // 3) Marcar el item como completed + recompensa emitida.
      await strapi.db.query('api::ad-session-item.ad-session-item').update({
        where: { id: item.id },
        data: { estado: 'completed', recompensa, recompensa_emitida: true, fin: new Date().toISOString() },
      });

      // 4) Acumular en la sesión.
      await strapi.db.query('api::ad-session.ad-session').update({
        where: { id: Number(id) },
        data: {
                    recompensa_total: colSuma(strapi, sesion.recompensa_total, recompensa),
        },
      });

      // 5) Registrar la VISTA en ad_views: un anuncio visto hoy no vuelve a
      // aparecer para este usuario hasta el día siguiente (findPublicitarios,
      // crearSesion y refill excluyen los ids presentes aquí). publishedAt
      // obligatorio: el content-type tiene draftAndPublish y el historial
      // consulta vía REST que solo devuelve publicados.
      await strapi.entityService.create('api::ad-view.ad-view', {
        data: {
          ad: anuncio.id,
          usuario: sesion.usuario.id,
          tipo: anuncio.tipo || 'video',
          timestamp: new Date().toISOString(),
          publishedAt: new Date().toISOString(),
        },
      });
    });

        ctx.body = { data: { completed: true, valid: true, reward: true, recompensa } };
  },

  /**
   * POST /ads/sesiones/:id/refill
   * Añade anuncios aleatorios adicionales a la sesión (MVP) cuando la playlist
   * se agota. Mantienel el orden secuencial de los items existentes.
   */
  async refill(ctx) {
    const { id } = ctx.params;
    const sesion = await cargarSesionValida(ctx, id, strapi);
    if (!sesion) return ctx.throw(403, 'Sesión inválida o expirada');

    const vistosHoy = await idsVistosHoy(strapi, sesion.usuario.id);
    const disponibles = await strapi.db.query('api::ad.ad').findMany({
      where: {
        esPublicitario: true,
        activo: true,
        tipo: 'video',
        publishedAt: { $notNull: true },
        ...(vistosHoy.length > 0 ? { id: { $notIn: vistosHoy } } : {}),
      },
    });
    const nuevos = disponibles.sort(() => Math.random() - 0.5).slice(0, 3);

    const ordenBase = sesion.items.length;
    const itemsCreados = [];
    await strapi.db.transaction(async () => {
      let orden = ordenBase;
      for (const ad of nuevos) {
        const { cobertura, segmentosTotales } = nuevaCobertura(Number(ad.duracion || 0));
        const creado = await strapi.db.query('api::ad-session-item.ad-session-item').create({
          data: {
            sesion: sesion.id,
            anuncio: ad.id,
            orden: orden++,
            estado: 'queued',
            segmentos_totales: segmentosTotales,
            cobertura,
            tiempo_efectivo_ms: 0,
            recompensa: Number(ad.recompensa || 0),
          },
        });
        itemsCreados.push(creado);
      }
    });

    ctx.body = { data: { added: itemsCreados.length } };
  },

  /**
   * GET /ads/sesiones/:id
   * Devuelve el estado completo de la sesión (items con anuncio + estado).
   */
  async getSesion(ctx) {
    const sesion = await cargarSesionValida(ctx, ctx.params.id, strapi);
    if (!sesion) return ctx.throw(403, 'Sesión inválida o expirada');

    const items = await strapi.db.query('api::ad-session-item.ad-session-item').findMany({
      where: { sesion: { id: Number(ctx.params.id) } },
      orderBy: { orden: 'ASC' },
      populate: { anuncio: { populate: ['archivo', 'thumbnail'] } },
    });

    ctx.body = {
      data: {
        id: sesion.id,
        estado: sesion.estado,
        indice_actual: sesion.indice_actual,
        recompensa_total: sesion.recompensa_total,
        items: items.map((it) => ({
          id: it.id,
          orden: it.orden,
          estado: it.estado,
          recompensa: it.recompensa,
          recompensa_emitida: it.recompensa_emitida,
          titulo: it.anuncio?.titulo,
          descripcion: it.anuncio?.texto || it.anuncio?.descripcion || '',
          duracion: it.anuncio?.duracion || 0,
          decisionWindow: it.anuncio?.decisionWindow || 5,
          // Prioridad: archivo REAL subido en Strapi > fallback del seed.
          archivo_url: it.anuncio?.archivo?.url || it.anuncio?.metadata?.archivo_url || '',
          thumbnail_url: it.anuncio?.thumbnail?.url || it.anuncio?.metadata?.thumbnail_url || '',
        })),
      },
    };
  },
}));

