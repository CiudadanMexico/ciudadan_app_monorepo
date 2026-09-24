'use strict';

const { createCoreService } = require('@strapi/strapi').factories;

const uberDirect = require('../../../services/uber-direct');

module.exports = createCoreService(
  'api::food-order.food-order',
  ({ strapi }) => ({

    /**
     * Verifica el pago y crea el delivery.
     */
    async verifyPaymentAndCreateDelivery(
      orderId,
      user = null,
      pickupData = {}
    ) {
      /**
       * Obtener datos de pickupData
      */
      const {
        pickupName,
        pickupPhone,
        pickupNotes = null,
      } = pickupData;

      if (!pickupName) {
        const error = new Error(
          'Falta el nombre de contacto para la recogida.'
        );
        error.status = 400;
        throw error;
      }

      if (!pickupPhone) {
        const error = new Error(
          'Falta el teléfono de contacto para la recogida.'
        );
        error.status = 400;
        throw error;
      }
      /*
       * --------------------------------------------------
       * 1. Obtener pedido
       * --------------------------------------------------
       */

      const order = await strapi.entityService.findOne(
        'api::food-order.food-order',
        orderId,
        {
          populate: {
            restaurant: true,
            user: true,
            direccion_destino: true,
            pago: {
              populate: {
                comprobante: true,
              },
            },
            items: true
          },
        }
      );

      if (!order) {
        const error = new Error('El pedido no existe.');
        error.status = 404;
        throw error;
      }

      /*
       * --------------------------------------------------
       * 2. Validar estado
       * --------------------------------------------------
       */

      if (order.status !== 'pendiente_verificacion') {

        /*
         * Si ya existe delivery, consideramos que
         * el proceso ya fue ejecutado.
         */
        const existingDelivery = await strapi.entityService.findMany(
          'api::food-delivery.food-delivery',
          {
            filters: {
              food_order: orderId,
            },
            limit: 1,
          }
        );

        if (existingDelivery?.[0]) {
          return {
            order,
            delivery: existingDelivery[0],
            alreadyProcessed: true,
          };
        }

        const error = new Error(`El pedido no está pendiente de verificación. Estado actual: ${order.status}`);
        error.status = 400;
        throw error;
      }

      /*
       * --------------------------------------------------
       * 3. Validar pago
       * --------------------------------------------------
       */

      if (!order.pago) {
        const error = new Error('El pedido no tiene un pago asociado.');
        error.status = 400;
        throw error;
      }

      /*
       * --------------------------------------------------
       * 4. Validar comprobante
       * --------------------------------------------------
       */

      const pago = order.pago;

      const comprobante = pago?.comprobante;

      if (!comprobante) {
        const error = new Error('El pago no tiene comprobante adjunto.');
        error.status = 400;
        throw error;
      }

      /*
       * --------------------------------------------------
       * 5. Obtener metadata Uber
       * --------------------------------------------------
       */

      const metadata = order.metadata || {};

      const uberMetadata = metadata.uber_direct || {};

      const quoteId = uberMetadata.quote_id;

      if (!quoteId) {
        const error = new Error('El pedido no contiene un quote_id de Uber Direct.');
        error.status = 400;
        throw error;
      }

      /*
       * --------------------------------------------------
       * 6. Idempotencia
       * --------------------------------------------------
       */

      const existingDelivery = await strapi.entityService.findMany(
        'api::food-delivery.food-delivery',
        {
          filters: {
            food_order: orderId,
          },
          limit: 1,
        }
      );

      if (existingDelivery?.[0]) {

        /*
         * El delivery ya existe.
         *
         * Solo aseguramos que el pedido esté en pendiente_envio.
         */

        const updatedOrder = await strapi.entityService.update(
          'api::food-order.food-order',
          orderId,
          {
            data: {
              status: 'pendiente_envio',
              fecha_verificado: order.fecha_verificado || new Date(),
              metadata: {
                ...metadata,
                payment_confirmed: true,
                payment_confirmed_at: metadata.payment_confirmed_at || new Date().toISOString(),
              },
            },
          }
        );

        return {
          order: updatedOrder,
          delivery: existingDelivery[0],
          alreadyProcessed: true,
        };
      }

      /*
       * --------------------------------------------------
       * 7. Pickup
       * --------------------------------------------------
       */

      const restaurantId = order.restaurant?.id;

      if (!restaurantId) {
        const error = new Error('El pedido no tiene restaurante asociado.');
        error.status = 400;
        throw error;
      }

      const pickupAddress = await getRestaurantAddress(
        strapi,
        restaurantId
      );

      if (!pickupAddress) {
        const error = new Error('El restaurante no tiene una dirección válida para el envío.');
        error.status = 400;
        throw error;
      }

      /*
       * --------------------------------------------------
       * 8. Dropoff
       * --------------------------------------------------
       */

      const dropoffAddress = order.direccion_destino;

      if (!dropoffAddress) {
        const error = new Error('El pedido no tiene dirección de entrega.');
        error.status = 400;
        throw error;
      }

      const dropoff = normalizeDireccion(dropoffAddress);

      const dropoffName = order?.delivery_contact_name ?? order?.user?.user_name ?? '';
      const dropoffPhone = order?.delivery_contact_phone ?? '';
      const dropoffNotes = order?.delivery_notes ?? '';

      const manifestItems = order.items.map((item, index) => ({
        name: item?.nombre ?? `producto-${index}`,
        price: item?.precio_unitario ?? 0,
        quantity: item?.cantidad ?? 1,
      }));
      /*
       * --------------------------------------------------
       * 9. Crear delivery en Uber
       * --------------------------------------------------
       */

      let delivery;

      try {

        delivery = await uberDirect.createDelivery({
          quoteId,
          pickup: pickupAddress || uberMetadata.pickup,
          dropoff,
          fee: uberMetadata.fee ?? order.monto_envio ?? 0,
          currency: uberMetadata.currency || order.moneda || 'MXN',
          pickupName,
          pickupPhone,
          pickupNotes,
          dropoffName,
          dropoffPhone,
          dropoffNotes,
          manifestItems
        });

      } catch (uberError) {
        strapi.log.error('[food-order] Error creando delivery Uber Direct', uberError);

        /*
         * El pago NO se revierte.
         *
         * Guardamos el error para poder reintentar posteriormente.
         */

        await strapi.entityService.update(
          'api::food-order.food-order',
          orderId,
          {
            data: {
              metadata: {
                ...metadata,
                payment_confirmed: true,
                payment_confirmed_at: metadata.payment_confirmed_at || new Date().toISOString(),
                delivery_error: {
                  message: uberError.message,
                  status: uberError.status || null,
                  details: uberError.details || null,
                  at: new Date().toISOString(),
                },
              },
            },
          }
        );

        throw uberError;
      }

      /*
       * --------------------------------------------------
       * 10. Crear food_delivery
       * --------------------------------------------------
       */

      const foodDelivery = await strapi.service('api::food-delivery.food-delivery').createFromUber({
        foodOrderId: orderId,
        restaurantId,
        userId: order.user?.id,
        delivery,
        quoteId,
        pickup: {
          ...pickupAddress,
          name: pickupName,
          phone: pickupPhone,
          notes: pickupNotes || null,
        },
        dropoff: {
          ...dropoff,
          name: order.delivery_contact_name,
          phone: order.delivery_contact_phone,
          notes: order.delivery_notes || null,
        },
        manifestItems,
      });

      /*
       * --------------------------------------------------
       * 11. Actualizar pedido
       * --------------------------------------------------
       */
      const now = new Date().toISOString();

      const updatedOrder = await strapi.entityService.update(
        'api::food-order.food-order',
        orderId,
        {
          data: {
            status: 'pendiente_envio',
            fecha_verificado: now,
            metadata: {
              ...metadata,
              payment_confirmed: true,
              payment_confirmed_at: now,
              delivery_created: true,
              delivery_created_at: now,
              food_delivery_id: foodDelivery.id,
              delivery_provider: 'uber_direct',
              delivery_mock: Boolean(delivery?.mock),
            },
            pickup_contact_name: pickupName,
            pickup_contact_phone: pickupPhone,
            pickup_notes: pickupNotes,
          },
        }
      );

      return {
        order: updatedOrder,
        delivery: foodDelivery,
        alreadyProcessed: false,
      };
    },

  })
);


/**
 * Obtiene la dirección del restaurante.
 */
async function getRestaurantAddress(
  strapi,
  restaurantId
) {

  const addresses = await strapi.entityService.findMany(
    'api::direccion.direccion',
    {
      filters: {
        restaurant_id: restaurantId,
        activa: true,
      },
      sort: {
        id: 'desc',
      },
      limit: 1,
    }
  );

  if (!addresses?.length) {
    return null;
  }

  return normalizeDireccion(
    addresses[0]
  );
}


/**
 * Normaliza una dirección de Strapi
 * a la estructura utilizada por Uber.
 */
function normalizeDireccion(direccion) {

  if (!direccion) {
    return null;
  }

  let direccionData = direccion.direccion;

  let coords = direccion.coords;

  /*
   * En algunas direcciones actualmente
   * guardas JSON como string.
   */
  if (typeof direccionData === 'string') {
    try {
      direccionData = JSON.parse(direccionData);
    } catch (error) {
      direccionData = {
        address: direccionData,
      };
    }
  }

  if (typeof coords === 'string') {
    try {
      coords = JSON.parse(coords);
    } catch (error) {
      coords = {};
    }
  }

  const lat = coords?.lat ?? direccionData?.lat ?? null;
  const lng = coords?.lng ?? direccionData?.lng ?? null;

  return {
    address: direccionData || {
      address: direccion.formatted_address || direccion.address || '',
    },
    lat: lat != null ? Number(lat) : null,
    lng: lng != null ? Number(lng) : null,
  };
}