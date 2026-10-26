'use strict';

/**
 * Constantes del MVP de cotizaciones de envío para Food.
 * Nombres copiados de los schemas reales (no inventados): ver
 * docs/FOOD-COTIZACIONES-ENVIO-MVP-PLAN.md §1.
 */

const UIDS = {
  USER: 'plugin::users-permissions.user',
  FOOD_CART: 'api::food-cart.food-cart',
  FOOD_ORDER: 'api::food-order.food-order',
  FOOD_RESTAURANT: 'api::food-restaurant.food-restaurant',
  FOOD_DELIVERY: 'api::food-delivery.food-delivery',
  DIRECCION: 'api::direccion.direccion',
  DELIVERY_PROFILE: 'api::delivery-profile.delivery-profile',
  DELIVERY_VEHICLE: 'api::delivery-vehicle.delivery-vehicle',
  DRIVER_LOCATION: 'api::driver-location.driver-location',
  COTIZACION: 'api::food-shipping.food-shipping-quote',
  UBER_SERVICE: 'api::uber-direct.uber-direct',
};

const PROVEEDORES = {
  CIUDADAN: 'ciudadan',
  UBER: 'uber_direct',
};

const ROL_REPARTIDOR = 'repartidor';

/** Estados de food-delivery que indican un repartidor ocupado (entrega en curso). */
const FOOD_DELIVERY_ESTADOS_OCUPADOS = ['pending', 'processing', 'pickup', 'in_transit'];

const ESTADOS_COTIZACION = ['activa', 'consumida', 'expirada', 'invalidada'];

/** Vigencia de la cotización en minutos (reserva con vencimiento). */
function vigenciaCotizacionMin() {
  const valor = Number(process.env.COTIZACION_VIGENCIA_MIN);
  return Number.isFinite(valor) && valor > 0 ? valor : 15;
}

/** Frescura máxima aceptable de la ubicación de un repartidor, en minutos. */
function ubicacionRepartidorMaxMin() {
  const valor = Number(process.env.REPARTIDOR_UBICACION_MAX_MIN);
  return Number.isFinite(valor) && valor > 0 ? valor : 15;
}

/** Radio de búsqueda de repartidores alrededor del restaurante (km). Regla fija del MVP. */
const RADIO_REPARTIDOR_KM = 10;

/**
 * Códigos de indisponibilidad SEGUROS para el frontend: no filtran detalles
 * internos, URLs ni datos del proveedor.
 */
const CODIGOS_INDISPONIBILIDAD = {
  ORIGEN_SIN_COORDENADAS: 'El restaurante no tiene coordenadas válidas.',
  DESTINO_SIN_COORDENADAS: 'La dirección de entrega no tiene coordenadas válidas.',
  RUTA_NO_DISPONIBLE: 'No fue posible calcular la ruta de entrega en este momento.',
  FUERA_DE_COBERTURA: 'La entrega excede el límite de 10 km de cobertura de Ciudadan.',
  SIN_REPARTIDORES: 'No hay repartidores disponibles cerca del restaurante en este momento.',
  PROVEEDOR_NO_CONFIGURADO: 'El proveedor Uber Direct no está configurado.',
  PROVEEDOR_TIMEOUT: 'El proveedor Uber Direct tardó demasiado en responder.',
  PROVEEDOR_ERROR: 'El proveedor Uber Direct no está disponible en este momento.',
  PROVEEDOR_RECHAZO: 'Uber Direct no ofrece servicio para esta entrega.',
};

/**
 * Códigos de rechazo al CONFIRMAR (lifecycle de food-order) con el status HTTP
 * con el que se exponen. Patrón del repo: Error plano con status + expose.
 */
const CODIGOS_CONFIRMACION = {
  COTIZACION_INVALIDA: { status: 400, mensaje: 'La cotización de envío no es válida. Vuelve a cotizar.' },
  COTIZACION_EXPIRADA: { status: 409, mensaje: 'La cotización de envío expiró. Vuelve a cotizar.' },
  COTIZACION_YA_USADA: { status: 409, mensaje: 'La cotización de envío ya fue utilizada en otro pedido.' },
  COTIZACION_DE_OTRO_USUARIO: { status: 403, mensaje: 'La cotización de envío pertenece a otro usuario.' },
  RESTAURANTE_NO_COINCIDE: { status: 400, mensaje: 'La cotización no corresponde al restaurante del pedido.' },
  DESTINO_MODIFICADO: { status: 409, mensaje: 'La dirección de entrega cambió desde la cotización. Vuelve a cotizar.' },
  CARRITO_MODIFICADO: { status: 409, mensaje: 'El carrito cambió desde la cotización. Vuelve a cotizar.' },
  SIN_REPARTIDORES: { status: 409, mensaje: 'No hay repartidores disponibles en este momento. Vuelve a cotizar.' },
};

module.exports = {
  UIDS,
  PROVEEDORES,
  ROL_REPARTIDOR,
  FOOD_DELIVERY_ESTADOS_OCUPADOS,
  ESTADOS_COTIZACION,
  RADIO_REPARTIDOR_KM,
  vigenciaCotizacionMin,
  ubicacionRepartidorMaxMin,
  CODIGOS_INDISPONIBILIDAD,
  CODIGOS_CONFIRMACION,
};
