'use strict';

/**
 * Orquestador del MVP de cotizaciones de envío para Food.
 *
 * Dos operaciones:
 *
 *  1. cotizar({ usuario, foodCartId | foodOrderId, direccionDestinoId |
 *     direccionDestino }): resuelve TODO del lado servidor (restaurante(s) del
 *     carrito/pedido, dirección origen, destino, propiedad), consulta ambos
 *     proveedores en paralelo (el fallo de uno nunca arrastra al otro),
 *     persiste cada cotización válida como food-shipping-quote (estado
 *     'activa' con vencimiento) y devuelve el tablero normalizado +
 *     `puedeContinuar`.
 *
 *  2. validarYConsumarCotizacionParaOrden(datos): la usa el lifecycle
 *     beforeCreate de food-order (punto de confirmación de compra existente).
 *     Revalida propiedad, vigencia, restaurante, destino, huella del carrito y
 *     disponibilidad (ciudadan), consume la cotización con update condicional
 *     (bloqueo optimista anti doble uso) y devuelve el importe autoritativo.
 *     Si el payload no trae metadata.cotizacion_envio.codigo devuelve null y el
 *     flujo legacy (metadata.uber_direct) sigue intacto: cero regresión.
 *
 * La consulta de cotización por sí sola NO autoriza la compra: solo la
 * revalidación + consumo en la confirmación lo hace.
 */

const crypto = require('crypto');

const {
  UIDS,
  PROVEEDORES,
  ESTADOS_COTIZACION,
  CODIGOS_CONFIRMACION,
  vigenciaCotizacionMin,
} = require('../utils/constants');
const { cotizarCiudadan } = require('./proveedor-ciudadan');
const { cotizarUber } = require('./proveedor-uber');
const { buscarRepartidoresElegibles } = require('./repartidores-service');

const TOLERANCIA_COORDS = 1e-4; // ~11 m: misma dirección guardada
const PREFIJO_CODIGO = 'fshq_';

// ---------------------------------------------------------------------------
// Helpers compartidos
// ---------------------------------------------------------------------------

function errorPlano(status, mensaje) {
  const error = new Error(mensaje);
  error.status = status;
  error.expose = true;
  return error;
}

function errorConfirmacion(codigo) {
  const definicion = CODIGOS_CONFIRMACION[codigo] || CODIGOS_CONFIRMACION.COTIZACION_INVALIDA;
  return errorPlano(definicion.status, definicion.mensaje);
}

const idDe = (relacion) => {
  if (relacion == null) return null;
  if (typeof relacion === 'object') return Number(relacion.id) || null;
  const numero = Number(relacion);
  return Number.isFinite(numero) ? numero : null;
};

const parseJsonTolerante = (valor) => {
  if (valor == null) return null;
  if (typeof valor === 'object') return valor;
  if (typeof valor === 'string') {
    try {
      return JSON.parse(valor);
    } catch {
      return null;
    }
  }
  return null;
};

/** Coordenadas de una fila de api::direccion (coords ?? direccion.lat/lng). */
function extraerCoordsDeDireccion(fila) {
  const coords = parseJsonTolerante(fila?.coords);
  const direccion = parseJsonTolerante(fila?.direccion);
  const lat = Number(coords?.lat ?? direccion?.lat);
  const lng = Number(coords?.lng ?? direccion?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

/**
 * Normaliza un destino inline. Acepta la forma fila de direccion
 * ({ direccion, coords }) — igual que /uber-direct/quote — o una plana
 * ({ lat, lng }). Devuelve coords + snapshot para persistir.
 */
function normalizarDestinoInline(destino) {
  if (!destino || typeof destino !== 'object') return null;
  const coords = parseJsonTolerante(destino.coords);
  const direccion = parseJsonTolerante(destino.direccion);
  const lat = Number(destino.lat ?? coords?.lat ?? direccion?.lat);
  const lng = Number(destino.lng ?? coords?.lng ?? direccion?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const snapshotDireccion =
    direccion ||
    (typeof destino.direccion === 'string' ? { formatted_address: destino.direccion } : {}) ||
    {};

  return {
    lat,
    lng,
    // Forma fila de direccion que entiende el service de Uber (compatibilidad
    // con el contrato existente de /uber-direct/quote).
    comoFilaDireccion: {
      id: null,
      direccion: { ...snapshotDireccion, lat, lng },
      coords: { lat, lng },
    },
  };
}

/**
 * Huella del carrito/orden por restaurante: SHA-256 sobre la lista ordenada
 * de "producto|variante|cantidad". Acepta items de food-cart (producto/
 * variante/cantidad) y de food-order (product/variant/cantidad).
 * Cualquier cambio de productos, variantes o cantidades invalida la
 * cotización al confirmar.
 */
function huellaDeItems(items) {
  const filas = (Array.isArray(items) ? items : [])
    .map((item) => ({
      producto: idDe(item?.producto ?? item?.product),
      variante: idDe(item?.variante ?? item?.variant),
      cantidad: Number(item?.cantidad) || 0,
    }))
    .filter((item) => item.producto != null)
    .map((item) => `${item.producto}|${item.variante ?? 'x'}|${item.cantidad}`)
    .sort();
  return crypto.createHash('sha256').update(filas.join(';')).digest('hex');
}

const generarCodigo = () =>
  PREFIJO_CODIGO + crypto.randomBytes(16).toString('hex');

const vencimientoDesdeAhora = () =>
  new Date(Date.now() + vigenciaCotizacionMin() * 60 * 1000).toISOString();

// ---------------------------------------------------------------------------
// Resolución de fuentes autorizadas (nada viene del frontend)
// ---------------------------------------------------------------------------

async function resolverDireccionDestino({ usuario, direccionDestinoId, direccionDestino }) {
  if (direccionDestinoId) {
    const fila = await strapi.db.query(UIDS.DIRECCION).findOne({
      where: { id: Number(direccionDestinoId) },
    });
    if (!fila) {
      throw errorPlano(404, 'La dirección de entrega no existe');
    }
    // Propiedad: la dirección debe pertenecer al usuario de la sesión.
    const correo = String(usuario.email || '').trim().toLowerCase();
    const propietario =
      String(fila.user_email || '').trim().toLowerCase() === correo ||
      String(fila.usuario_email || '').trim().toLowerCase() === correo;
    if (!propietario) {
      throw errorPlano(404, 'La dirección de entrega no existe');
    }
    const coords = extraerCoordsDeDireccion(fila);
    if (!coords) {
      throw errorPlano(400, 'La dirección de entrega no tiene coordenadas válidas');
    }
    return {
      direccionId: Number(direccionDestinoId),
      coords,
      inline: null,
    };
  }

  const inline = normalizarDestinoInline(direccionDestino);
  if (!inline) {
    throw errorPlano(400, 'Debes proporcionar direccionDestinoId o direccionDestino con coordenadas');
  }
  return {
    direccionId: null,
    coords: { lat: inline.lat, lng: inline.lng },
    inline: inline.comoFilaDireccion,
  };
}

async function resolverDireccionOrigen(restaurantId) {
  // Mismo criterio que el flujo existente: la dirección activa más reciente
  // del restaurante; sin activa, la más reciente.
  let fila = await strapi.db.query(UIDS.DIRECCION).findOne({
    where: { restaurant_id: restaurantId, activa: true },
    orderBy: { id: 'desc' },
  });
  if (!fila) {
    fila = await strapi.db.query(UIDS.DIRECCION).findOne({
      where: { restaurant_id: restaurantId },
      orderBy: { id: 'desc' },
    });
  }
  if (!fila) {
    throw errorPlano(404, 'El restaurante no tiene dirección de origen');
  }
  const coords = extraerCoordsDeDireccion(fila);
  if (!coords) {
    throw errorPlano(400, 'El restaurante no tiene coordenadas válidas');
  }
  return { direccionId: idDe(fila.id) ? Number(fila.id) : null, coords };
}

async function resolverCarrito({ usuario, foodCartId }) {
  const carrito = await strapi.db.query(UIDS.FOOD_CART).findOne({
    where: { id: Number(foodCartId) },
  });
  if (!carrito) {
    throw errorPlano(404, 'El carrito no existe');
  }
  if (idDe(carrito.usuario) !== Number(usuario.id)) {
    throw errorPlano(404, 'El carrito no existe');
  }

  let items = carrito.items;
  if (typeof items === 'string') {
    items = parseJsonTolerante(items) || [];
  }
  if (!Array.isArray(items) || !items.length) {
    throw errorPlano(400, 'El carrito no tiene productos');
  }

  // Agrupar items por restaurante con su huella.
  const porRestaurante = new Map();
  for (const item of items) {
    const restaurantId = idDe(item?.restaurante ?? item?.restaurant);
    if (restaurantId == null) {
      throw errorPlano(400, 'El carrito tiene un producto sin restaurante');
    }
    if (!porRestaurante.has(restaurantId)) {
      porRestaurante.set(restaurantId, []);
    }
    porRestaurante.get(restaurantId).push(item);
  }

  const restaurantes = [...porRestaurante.entries()].map(([restaurantId, itemsRest]) => ({
    restaurantId,
    items: itemsRest,
    huella: huellaDeItems(itemsRest),
  }));

  return { tipo: 'carrito', referenciaId: Number(foodCartId), restaurantes };
}

async function resolverPedido({ usuario, foodOrderId }) {
  const pedido = await strapi.db.query(UIDS.FOOD_ORDER).findOne({
    where: { id: Number(foodOrderId) },
    populate: { restaurant: true, items: true },
  });
  if (!pedido || idDe(pedido.user) !== Number(usuario.id)) {
    throw errorPlano(404, 'El pedido no existe');
  }
  if (pedido.status !== 'pendiente_pago') {
    throw errorPlano(400, 'Solo se puede cotizar un pedido en preparación (pendiente_pago)');
  }
  const restaurantId = idDe(pedido.restaurant);
  if (restaurantId == null) {
    throw errorPlano(400, 'El pedido no tiene restaurante');
  }
  let items = pedido.items;
  if (typeof items === 'string') {
    items = parseJsonTolerante(items) || [];
  }
  if (!Array.isArray(items) || !items.length) {
    throw errorPlano(400, 'El pedido no tiene productos');
  }
  return {
    tipo: 'pedido',
    referenciaId: Number(foodOrderId),
    restaurantes: [{ restaurantId, items, huella: huellaDeItems(items) }],
  };
}

async function nombresRestaurantes(ids) {
  if (!ids.length) return {};
  const filas = await strapi.db.query(UIDS.FOOD_RESTAURANT).findMany({
    where: { id: { $in: ids } },
  });
  const nombres = {};
  for (const fila of filas || []) {
    nombres[Number(fila.id)] = fila.nombre || null;
  }
  return nombres;
}

// ---------------------------------------------------------------------------
// Persistencia de cotizaciones
// ---------------------------------------------------------------------------

async function invalidarCotizacionesAnteriores({ usuarioId, tipo, referenciaId }) {
  const where = {
    user: usuarioId,
    estado: 'activa',
  };
  if (tipo === 'carrito') where.food_cart = referenciaId;
  else where.food_order = referenciaId;

  await strapi.db.query(UIDS.COTIZACION).updateMany({ where, data: { estado: 'invalidada' } });
}

async function persistirCotizacion({
  usuarioId,
  tipo,
  referenciaId,
  restaurantId,
  destino,
  origen,
  proveedorResultado,
  huella,
}) {
  // vence: el del proveedor (Uber trae su propio expires) o la vigencia del MVP.
  const vence = proveedorResultado.vence || vencimientoDesdeAhora();

  const datos = {
    user: usuarioId,
    food_cart: tipo === 'carrito' ? referenciaId : null,
    food_order: tipo === 'pedido' ? referenciaId : null,
    restaurant: restaurantId,
    direccion_origen: origen.direccionId,
    direccion_destino: destino.direccionId,
    origen_coords: origen.coords,
    destino_coords: destino.coords,
    destino_inline: destino.inline,
    provider: proveedorResultado.proveedor,
    codigo: generarCodigo(),
    importe: proveedorResultado.importe,
    moneda: proveedorResultado.moneda,
    distancia_metros: proveedorResultado.distanciaMetros,
    estado: 'activa',
    vencimiento: vence,
    referencia_proveedor: proveedorResultado.referencia,
    huella_carrito: huella,
    metadata: {
      simulado: Boolean(proveedorResultado.simulado),
      detalle: proveedorResultado.detalle || null,
    },
  };

  return strapi.db.query(UIDS.COTIZACION).create({ data: datos });
}

function respuestaProveedor(proveedorResultado, cotizacion) {
  if (!proveedorResultado.disponible) {
    return {
      proveedor: proveedorResultado.proveedor,
      disponible: false,
      cotizacionId: null,
      importe: null,
      moneda: null,
      distanciaMetros: null,
      vence: null,
      codigoIndisponibilidad: proveedorResultado.codigoIndisponibilidad,
      mensaje: proveedorResultado.mensaje,
      simulado: null,
    };
  }
  return {
    proveedor: proveedorResultado.proveedor,
    disponible: true,
    cotizacionId: cotizacion.codigo,
    importe: proveedorResultado.importe,
    moneda: proveedorResultado.moneda,
    distanciaMetros: proveedorResultado.distanciaMetros,
    vence: cotizacion.vencimiento,
    codigoIndisponibilidad: null,
    mensaje: null,
    simulado: Boolean(proveedorResultado.simulado),
  };
}

// ---------------------------------------------------------------------------
// Operación 1: cotizar
// ---------------------------------------------------------------------------

async function cotizar({ usuario, foodCartId, foodOrderId, direccionDestinoId, direccionDestino }) {
  if (Number(foodCartId) && Number(foodOrderId)) {
    throw errorPlano(400, 'Proporciona foodCartId o foodOrderId, no ambos');
  }
  if (!Number(foodCartId) && !Number(foodOrderId)) {
    throw errorPlano(400, 'Proporciona foodCartId o foodOrderId');
  }
  if (!direccionDestinoId && !direccionDestino) {
    throw errorPlano(400, 'Proporciona direccionDestinoId o direccionDestino');
  }

  const fuente = Number(foodCartId)
    ? await resolverCarrito({ usuario, foodCartId: Number(foodCartId) })
    : await resolverPedido({ usuario, foodOrderId: Number(foodOrderId) });

  const destino = await resolverDireccionDestino({ usuario, direccionDestinoId, direccionDestino });

  const nombres = await nombresRestaurantes(fuente.restaurantes.map((r) => r.restaurantId));

  // Re-cotizar invalida las cotizaciones activas previas del mismo
  // usuario+carrito/pedido (patrón superseded de shipping-quote).
  await invalidarCotizacionesAnteriores({
    usuarioId: Number(usuario.id),
    tipo: fuente.tipo,
    referenciaId: fuente.referenciaId,
  });

  const resultadosRestaurantes = [];
  let puedeContinuar = true;

  for (const restaurante of fuente.restaurantes) {
    let origen;
    try {
      origen = await resolverDireccionOrigen(restaurante.restaurantId);
    } catch (error) {
      if (error?.status === 404) throw error; // sin dirección de origen no hay checkout
      throw error;
    }

    // Ambos proveedores en paralelo; cada uno atrapa sus propios errores y
    // NUNCA propagan excepciones: el fallo de uno no arrastra al otro.
    const [ciudadan, uber] = await Promise.all([
      cotizarCiudadan({ origenCoords: origen.coords, destinoCoords: destino.coords }).catch(() => ({
        proveedor: PROVEEDORES.CIUDADAN,
        disponible: false,
        codigoIndisponibilidad: 'RUTA_NO_DISPONIBLE',
        mensaje: 'No fue posible calcular la ruta de entrega en este momento.',
      })),
      cotizarUber({
        restaurantId: restaurante.restaurantId,
        direccionDestinoId: destino.direccionId,
        direccionDestino: destino.inline,
      }),
    ]);

    const cotizaciones = {};
    for (const resultado of [ciudadan, uber]) {
      let cotizacion = null;
      if (resultado.disponible) {
        cotizacion = await persistirCotizacion({
          usuarioId: Number(usuario.id),
          tipo: fuente.tipo,
          referenciaId: fuente.referenciaId,
          restaurantId: restaurante.restaurantId,
          destino,
          origen,
          proveedorResultado: resultado,
          huella: restaurante.huella,
        });
      }
      cotizaciones[resultado.proveedor] = respuestaProveedor(resultado, cotizacion);
    }

    // Regla de checkout (spec §1.4): se puede continuar cuando AL MENOS UN
    // proveedor tiene cotización válida por restaurante.
    const alMenosUnProveedor = [ciudadan, uber].some((r) => r.disponible);
    if (!alMenosUnProveedor) {
      puedeContinuar = false;
    }

    resultadosRestaurantes.push({
      restaurantId: restaurante.restaurantId,
      nombre: nombres[restaurante.restaurantId] || null,
      cotizaciones,
    });
  }

  return {
    success: true,
    puedeContinuar,
    direccionDestinoId: destino.direccionId,
    restaurantes: resultadosRestaurantes,
  };
}

// ---------------------------------------------------------------------------
// Operación 2: revalidar y consumir (confirmación de compra)
// ---------------------------------------------------------------------------

async function validarYConsumarCotizacionParaOrden(datosOrden) {
  const referencia = datosOrden?.metadata?.cotizacion_envio;
  if (!referencia || !referencia.codigo) {
    return null; // flujo legacy (metadata.uber_direct): sin cambios
  }

  const cotizacion = await strapi.db.query(UIDS.COTIZACION).findOne({
    where: { codigo: String(referencia.codigo) },
  });
  if (!cotizacion) {
    throw errorConfirmacion('COTIZACION_INVALIDA');
  }
  if (cotizacion.estado === 'consumida') {
    throw errorConfirmacion('COTIZACION_YA_USADA');
  }
  if (cotizacion.estado === 'expirada' || cotizacion.estado === 'invalidada') {
    throw errorConfirmacion(cotizacion.estado === 'expirada' ? 'COTIZACION_EXPIRADA' : 'COTIZACION_INVALIDA');
  }

  if (new Date(cotizacion.vencimiento).getTime() <= Date.now()) {
    // Expiración perezosa: se marca para que no vuelva a evaluarse.
    await strapi.db
      .query(UIDS.COTIZACION)
      .update({ where: { id: cotizacion.id, estado: 'activa' }, data: { estado: 'expirada' } });
    throw errorConfirmacion('COTIZACION_EXPIRADA');
  }

  // Propiedad: la cotización debe pertenecer al usuario de la orden.
  if (idDe(cotizacion.user) !== idDe(datosOrden.user)) {
    throw errorConfirmacion('COTIZACION_DE_OTRO_USUARIO');
  }

  // El restaurante de la orden debe ser el de la cotización.
  if (idDe(cotizacion.restaurant) !== idDe(datosOrden.restaurant)) {
    throw errorConfirmacion('RESTAURANTE_NO_COINCIDE');
  }

  // Destino: misma dirección guardada, o coords equivalentes (tolerancia ~11 m).
  const destinoOrdenId = idDe(datosOrden.direccion_destino);
  const cotizacionDestinoId = idDe(cotizacion.direccion_destino);
  if (cotizacionDestinoId != null) {
    if (destinoOrdenId !== cotizacionDestinoId) {
      throw errorConfirmacion('DESTINO_MODIFICADO');
    }
  } else {
    if (destinoOrdenId == null) {
      throw errorConfirmacion('DESTINO_MODIFICADO');
    }
    const filaDestino = await strapi.db.query(UIDS.DIRECCION).findOne({
      where: { id: destinoOrdenId },
    });
    const coordsDestino = extraerCoordsDeDireccion(filaDestino);
    const coordsCotizacion = parseJsonTolerante(cotizacion.destino_coords) || {};
    if (
      !coordsDestino ||
      Math.abs(Number(coordsDestino.lat) - Number(coordsCotizacion.lat)) > TOLERANCIA_COORDS ||
      Math.abs(Number(coordsDestino.lng) - Number(coordsCotizacion.lng)) > TOLERANCIA_COORDS
    ) {
      throw errorConfirmacion('DESTINO_MODIFICADO');
    }
  }

  // Huella del carrito: cualquier cambio de productos/variantes/cantidades
  // invalida la cotización.
  let items = datosOrden.items;
  if (typeof items === 'string') {
    items = parseJsonTolerante(items) || [];
  }
  if (huellaDeItems(items) !== cotizacion.huella_carrito) {
    throw errorConfirmacion('CARRITO_MODIFICADO');
  }

  // Disponibilidad viva: para Ciudadan debe seguir habiendo repartidores
  // elegibles al confirmar (no se re-calcula la tarifa: la distancia y el
  // importe son de la cotización en curso).
  if (cotizacion.provider === PROVEEDORES.CIUDADAN) {
    const origenCoords = parseJsonTolerante(cotizacion.origen_coords);
    const { total } = await buscarRepartidoresElegibles(origenCoords || {});
    if (!total) {
      throw errorConfirmacion('SIN_REPARTIDORES');
    }
  }

  // Consumo atómico (bloqueo optimista): solo una confirmación gana.
  const consumida = await strapi.db.query(UIDS.COTIZACION).update({
    where: { id: cotizacion.id, estado: 'activa' },
    data: { estado: 'consumida' },
  });
  if (!consumida) {
    throw errorConfirmacion('COTIZACION_YA_USADA');
  }

  return cotizacion;
}

/** Enlaza la cotización consumida con la orden creada (afterCreate, best-effort). */
async function enlazarCotizacionConOrden({ codigo, foodOrderId }) {
  if (!codigo || !foodOrderId) return;
  try {
    const cotizacion = await strapi.db.query(UIDS.COTIZACION).findOne({
      where: { codigo: String(codigo) },
    });
    if (cotizacion && cotizacion.estado === 'consumida') {
      await strapi.db
        .query(UIDS.COTIZACION)
        .update({ where: { id: cotizacion.id }, data: { food_order: Number(foodOrderId) } });
    }
  } catch (error) {
    strapi.log.warn('[food-shipping] No se pudo enlazar la cotización con la orden');
  }
}

module.exports = {
  cotizar,
  validarYConsumarCotizacionParaOrden,
  enlazarCotizacionConOrden,
  huellaDeItems,
  extraerCoordsDeDireccion,
  normalizarDestinoInline,
  generarCodigo,
  ESTADOS_COTIZACION,
};
