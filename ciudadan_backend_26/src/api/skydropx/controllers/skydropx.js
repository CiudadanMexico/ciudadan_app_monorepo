"use strict";

const skydropxService = require("../services/skydropx");
const logisticsBalanceService = require("../../logistics-balance/services/logistics-balance");

const STORE_UID = "api::store.store";
const PRODUCT_UID = "api::producto.producto";
const ADDRESS_UID = "api::direccion.direccion";
const PEDIDO_UID = "api::pedido.pedido";

/**
 * Normaliza los items del pedido.
 */
function normalizeItems(raw) {
  if (raw === null || raw === undefined) {
    return [];
  }

  if (Array.isArray(raw)) {
    return raw.map((item) => item?.attributes ? item.attributes : item);
  }

  if (Array.isArray(raw?.data)) {
    return raw.data.map((item) => item?.attributes ? item.attributes : item);
  }

  if (raw?.data?.attributes) {
    return [
      raw.data.attributes,
    ];
  }

  if (raw?.attributes) {
    return [
      raw.attributes,
    ];
  }

  if (typeof raw === "string") {
    try {
      return normalizeItems(JSON.parse(raw));
    } catch {
      return [];
    }
  }

  if (typeof raw === "object") {
    return [raw];
  }

  return [];
}

module.exports = {
  async testAuth(ctx) {
    try {
      const token = await skydropxService.getAccessToken();

      ctx.body = {
        success: true,
        message: "Autenticación con Skydropx correcta",
        tokenType: "Bearer",
        tokenLength: token?.length ?? 0,
      };
    } catch (error) {
      strapi.log.error("Error testAuth Skydropx:", error);

      ctx.status = error?.status ?? 500;

      ctx.body = {
        success: false,
        message: error?.message ?? "Error autenticando con Skydropx",
      };
    }
  },

  /**
   * Consulta catalogo de Cartas porte de Skydropx
   * GET /api/skydropx/consignment-notes
  */
  async getConsignmentNotes(ctx) {
    try {
      const {
        page,
        per_page,
        consignment_note,
        description
      } = ctx.query;

      const result = await skydropxService.getConsignmentNotes({
        page,
        per_page,
        consignment_note,
        description,
      });

      ctx.body = result;

    } catch (error) {
      strapi.log.error('Error obteniendo Cartas Porte de Skydropx: ', error);
      ctx.status = error?.status ?? 500;
      ctx.body = {
        success: false,
        message: error?.message ?? 'No fue posible obtener las Cartas Porte de Skydropx',
      };
    }
  },

  /**
   * Consulta catalogo de tipos de empaques de Skydropx
   * GET /api/skydropx/packagings
  */
  async getPackagings(ctx) {
    try {
      const {
        page,
        per_page,
        code,
        name,
      } = ctx.query;

      const result = await skydropxService.getPackagings({
        page,
        per_page,
        code,
        name,
      });

      ctx.body = result;
    } catch (error) {
      strapi.log.error('Error obteniendo tipos de empaque de Skydropx:', error);

      ctx.status = error?.status ?? 500;
      ctx.body = {
        success: false,
        message: error?.message ?? 'No fue posible obtener los tipos de empaque de Skydropx'
      };
    }
  },

  /**
   * Crea una cotización de envío con base a una tienda, una dirección destino y un conjunto de productos
   * POST /api/skydropx/quotation
   * Body:
   * {
   *   store_id: 1,
   *   direccion_destino_id: 20,
   *   items: [
   *     { producto_id: 15, cantidad: 2 }
   *   ]
   * }
   */
  async createQuotation(ctx) {
    try {
      const body = ctx.request?.body ?? {};

      if (!body)
        return ctx.badRequest("El cuerpo de la solicitud es requerido");

      const { store_id, direccion_destino_id, items } = body;

      // Validaciones básicas
      if (!store_id)
        return ctx.badRequest("store_id es requerido");

      if (!direccion_destino_id)
        return ctx.badRequest("direccion_destino_id es requerido");

      if (!Array.isArray(items) || items.length === 0)
        return ctx.badRequest("Debe proporcionar al menos un producto");

      // Evitamos cantidades absurdamente grandes.
      if (items.length > 50)
        return ctx.badRequest("No se pueden cotizar más de 50 productos diferentes");

      // Validar y normalizar items
      const normalizedItems = items.map((item, index) => {
        const productoId = Number(item.producto_id);
        const cantidad = Number(item.cantidad);

        if (!Number.isInteger(productoId) || productoId <= 0)
          throw new Error(`product_id invalido en item: ${index + 1}`);

        if (!Number.isFinite(cantidad) || cantidad <= 0)
          throw new Error(`cantidad inválida para producto ${productoId}`);

        if (cantidad > 100)
          throw new Error(`La cantidad máxima permitida para producto ${productoId} es 100`);

        return {
          producto_id: productoId,
          cantidad,
        };
      });

      // Consultar Store
      const store = await strapi.entityService.findOne(STORE_UID, Number(store_id), {
        populate: {
          direccion: true
        }
      });

      if (!store)
        return ctx.notFound("Tienda no encontrada");

      if (!store.direccion)
        return ctx.badRequest("La tienda no tiene una dirección confirmada");

      // Consultar dirección destino
      const direccionDestino = await strapi.entityService.findOne(ADDRESS_UID, Number(direccion_destino_id));

      if (!direccionDestino)
        return ctx.notFound("Dirección destino no encontrada.");

      const usuarioEmail = ctx.state.strapiUser?.email;
      strapi.log.info(`User request email: ${usuarioEmail}`);

      // Verificar que la dirección pertenezca al usuario del request
      // if(usuarioEmail && direccionDestino.usuario_email !== usuarioEmail)
      //   return ctx.forbidden("No tienes permiso para utilizar esta dirección");

      // Normalizar direcciones
      const addressFrom = skydropxService.normalizeAddress(store?.direccion);
      const addressTo = skydropxService.normalizeAddress(direccionDestino);

      // Consultar productos
      const productsIds = normalizedItems.map(item => item.producto_id);
      const productos = await strapi.entityService.findMany(PRODUCT_UID, {
        filters: {
          id: {
            $in: productsIds
          }
        },
        fields: [
          "id",
          "nombre",
          "precio",
          "largo",
          "ancho",
          "alto",
          "peso",
          "volumetrico",
          "activo",
          "stock",
          "usa_stock",
          "store_id",
        ],
        populate: {
          store: {
            fields: [
              "id",
              "name"
            ]
          }
        }
      });

      // Validar que todos los productos existan y que los productos pertenezcan a la tienda
      const productosMap = new Map(productos.map((producto) => [Number(producto?.id), producto]));

      for (const item of normalizedItems) {
        const producto = productosMap.get(item.producto_id);

        if (!producto)
          return ctx.notFound(`El producto ${item.producto_id} no existe`);

        const productoStoreId = producto?.store?.id ?? producto?.store_id;

        if (!productoStoreId || Number(productoStoreId) !== Number(store_id))
          return ctx.badRequest(`El producto "${producto?.nombre}" no pertenece a la tienda seleccionada`);

        if (!producto.activo)
          return ctx.badRequest(`El producto "${producto?.nombre}" no está disponible`);

        if (producto.usa_stock && producto.stock != null && Number(producto.stock) < item.cantidad)
          return ctx.badRequest(`No hay suficiente stock del producto "${producto.nombre}"`);
      }

      // Construir items para el servicio
      const itemsForParcel = normalizedItems.map((item) => ({
        cantidad: item.cantidad,
        producto: productosMap.get(item.producto_id)
      }));

      // Construir parcels
      const parcels = skydropxService.buildParcelsFromItems(itemsForParcel);

      /**
       * Validar Carriers(no implementado por el momento)
       * let carriers;
       * if (requested_carriers != undefined || requested_carriers !== null) {
       *  if (!Array.isArray(requested_carriers))
       *    return ctx.badRequest("requested_carriers debe ser un arreglo");
       * 
       *  if (requested_carriers.length > 20)
       *    return ctx.badRequest("No se puede solicitar más de 20 paqueterías");
       * }
       * carriers = requested_carriers.map((carrier) => String(carrier).trim().toLowerCase()).filter(Boolean);
       */


      // Construir payload final
      const quotationPayload = {
        address_from: addressFrom,
        address_to: addressTo,
        parcels
      };

      /**
       * Omitimos por el momento la implementación de carriers en esta fase
       * if (carriers && carriers.length > 0)
       *   quotationPayload.parcels = parcels.map((parcel) => ({ ...parcel, requested_carriers: carriers }));
      */

      // Log controlado
      strapi.log.info("Creando cotización Skydropx");
      strapi.log.debug(JSON.stringify({
        store_id,
        direccion_destino_id,
        direccion_origen_id: store?.direccion?.id,
        quotation: quotationPayload
      }, null, 2));

      // Llamar a Skydropx
      const quotation = await skydropxService.createQuotation(quotationPayload);

      // Respuesta
      ctx.status = 201;

      ctx.body = {
        success: true,
        quotation: {
          id: quotation?.id ?? null,
          is_completed: quotation?.is_completed ?? false,
          rates: quotation?.rates ?? [],
          quotation_scope: quotation?.quotation_scope ?? null,
          // raw: quotation,
        },
        context: {
          store_id: Number(store_id),
          direccion_destino_id: Number(direccion_destino_id),
          dirección_origen_id: store?.direccion?.id,
          items: normalizedItems,
          parcels,
        },
      };
    } catch (error) {
      strapi.log.error("Error creando cotización Skydropx:", error);

      ctx.status = error?.status ?? 500;

      ctx.body = {
        success: false,
        message: error?.message ?? "No fue posible crear la cotización",
        details: error?.details ?? null,
      };
    }
  },

  /**
   * Consulta cotización de envío mediante su ID
   * GET /api/skydropx/quotation/:id
   */
  async getQuotation(ctx) {
    try {
      const { id } = ctx.params;

      if (!id)
        return ctx.badRequest("El ID de cotización es requerido");

      const quotation = await skydropxService.getQuotation(id);

      ctx.body = {
        success: true,
        quotation,
      };
    } catch (error) {
      strapi.log.error("Error consultando cotización Skydropx:", error);

      ctx.status = error?.status ?? 500;
      ctx.body = {
        success: false,
        message: error?.message ?? "No fue posible consultar la cotización",
        details: error?.details ?? null,
      };
    }
  },

  /**
   * Crea el envío en Skydropx de un pedido
   * Recibe únicamente:
   * Body:
   * {
   *   pedido_id: 123
   * }
   *
   * El backend obtiene el resto.
   * (Aún en proceso)
   */
  async createShipment(ctx) {
    try {
      const body = ctx?.request?.body ?? {};

      const pedidoId = Number(body?.pedido_id);

      if (!Number.isInteger(pedidoId) || pedidoId <= 0) {
        return ctx.badRequest("pedido_id es requerido y debe ser válido");
      }

      // * 1. Obtener pedido
      const pedido = await strapi.entityService.findOne(PEDIDO_UID, pedidoId, {
        populate: {
          store: {
            populate: {
              direccion: true,
            },
          },
          direccion_origen: true,
          direccion_destino: true,
          usuario: true,
          pago_id: true,
          item: {
            populate: {
              producto: true
            }
          }
        },
      });

      if (!pedido) {
        return ctx.notFound("Pedido no encontrado.");
      }

      // * 2. Validar estado
      if (pedido.status !== "pendiente_envio") {
        return ctx.badRequest(`El pedido no está listo para generar el envío. Estado actual: ${pedido.status}`);
      }

      /**
       * -------------------------------------------------
       * 3. Evitar duplicados
       * -------------------------------------------------
       */
      if (pedido.skydropx_shipment_id) {
        return ctx.badRequest("El pedido ya tiene un envío de Skydropx creado");
      }

      /**
       * -------------------------------------------------
       * 4. Validar cotización
       * -------------------------------------------------
       */
      if (!pedido.skydropx_quotation_id) {
        return ctx.badRequest("El pedido no tiene una cotización de Skydropx");
      }

      if (!pedido.skydropx_rate_id) {
        return ctx.badRequest("El pedido no tiene una tarifa de Skydropx seleccionada");
      }

      /**
       * -------------------------------------------------
       * 5. Dirección origen
       * -------------------------------------------------
       */
      const store = pedido.store;

      if (!store) {
        return ctx.badRequest("El pedido no tiene tienda asociada");
      }

      const direccionOrigen = pedido?.direccion_origen ?? store?.direccion;

      if (!direccionOrigen) {
        return ctx.badRequest("Dirección de origen no encontrada");
      }

      /**
       * -------------------------------------------------
       * 6. Dirección destino
       * -------------------------------------------------
       */
      const direccionDestino = pedido.direccion_destino;

      if (!direccionDestino) {
        return ctx.badRequest("El pedido no tiene dirección de destino");
      }

      /**
       * -------------------------------------------------
       * 7. Usuario / cliente
       * -------------------------------------------------
       */
      const usuario = pedido.usuario;

      if (!usuario) {
        return ctx.badRequest("El pedido no tiene usuario asociado");
      }

      const delivery_contact_information = pedido?.delivery_contact_information;

      if (!delivery_contact_information) {
        return ctx.badRequest("Datos de contacto para entrega no asociados.")
      }

      const usuarioNombre = delivery_contact_information?.name ?? usuario?.username;
      const usuarioPhone = delivery_contact_information?.phone;
      const usuarioEmail = usuario?.email ?? direccionDestino.usuario_email ?? direccionDestino.user_email;

      /**
       * -------------------------------------------------
       * 8. Datos de origen
       * -------------------------------------------------
       *
       * IMPORTANTE:
       * Skydropx requiere teléfono
       * Si no existe, devolveremos un error explícito.
       */

      const pickup_contact_information = pedido?.pickup_contact_information;
      if (!pickup_contact_information)
        return ctx.badRequest("Datos de contacto de recepción no asociados.");

      const storeOwner = store.users_permissions_user;
      const storePhone = pickup_contact_information?.phone ?? store.phone ?? storeOwner?.phone;
      const storeEmail = store?.email ?? storeOwner?.email;

      if (!storeEmail) {
        return ctx.badRequest("La tienda no tiene correo electrónico configurado para el envío");
      }

      if (!storePhone) {
        return ctx.badRequest("La tienda no tiene teléfono configurado para el envío. Agrega un teléfono a la tienda o al usuario propietario.");
      }

      /**
       * -------------------------------------------------
       * 9. Normalizar direcciones
       * -------------------------------------------------
       */
      const addressFrom = skydropxService.normalizeShipmentAddress(
        direccionOrigen,
        {
          name: store.name ?? pickup_contact_information?.name,
          company: store.name,
          phone: storePhone,
          email: storeEmail,
          reference: direccionOrigen?.observaciones ?? store?.name,
          further_information: pickup_contact_information?.further_information,
        }
      );

      const addressTo = skydropxService.normalizeShipmentAddress(
        direccionDestino,
        {
          name: usuarioNombre,
          company: "Particular",
          phone: usuarioPhone,
          email: usuarioEmail,
          reference: direccionDestino?.observaciones ?? "Domicilio",
          further_information: delivery_contact_information?.further_information,
        }
      );

      /**
       * -------------------------------------------------
       * 10. Obtener items
       * -------------------------------------------------
       *
       * El componente item puede venir con distintas estructuras dependiendo del populate.
       */
      const items = normalizeItems(pedido.item);

      if (items.length === 0) {
        return ctx.badRequest("El pedido no tiene productos");
      }

      /**
       * -------------------------------------------------
       * 11. Construir packages
       * -------------------------------------------------
       * Nuestra cotización actual crea un parcel por item/producto.
       * Por eso el número de packages debe coincidir con el número de items cotizados.
       */
      const packages = skydropxService.buildShipmentPackages(items);

      // -------------------------------------------------
      // 12. Obtener el importe de rate seleccionado y validar
      const shippingAmount = Number(pedido.skydropx_rate.total);
      if (!shippingAmount || shippingAmount <= 0)
        return ctx.badRequest("No fue posible determinar el costo de la tarifa de Skydropx");

      //--------------------------------------------------
      // 13. Reservar saldo
      const reservation = await strapi.service("api::logistics-balance.logistics-balance").reserveShipmentBalance({
        storeId: store.id,
        orderId: pedidoId,
        amount: shippingAmount,
        userId: ctx.state.user?.id ?? null,
        idempotencyKey: `shipment:${pedidoId}`,
        metadata: {
          rate_id: pedido.skydropx_rate_id,
          provider_name:pedido.skydropx_rate.provider_name,
          provider_service_name:pedido.skydropx_rate.provider_service_name,
          currency_code:pedido.skydropx_rate.currency_code,
          rate_amount:pedido.skydropx_rate.amount,
          service_fee:pedido.skydropx_rate.service_fee,
          vat_fee:pedido.skydropx_rate.vat_fee,
          total:pedido.skydropx_rate.total,
        },
      });

      // * 14. Crear envío en Skydropx
      try {
        const shipment = await skydropxService.createShipment({
          rate_id: pedido.skydropx_rate_id,
          unique_shipment: true,
          auto_advance: true,
          printing_format: "standard",
          include_order_detail: false,
          address_from: addressFrom,
          address_to: addressTo,
          packages,
        });

        // * 15. Extraer respuesta inicial
        const shipmentData = shipment?.data ?? shipment;
        const shipmentAttributes = shipmentData?.attributes ?? {};
        const shipmentId = shipmentData?.id ?? shipmentAttributes?.id ?? null;

        // 16. Validar shipmentId
        if (!shipmentId) {
          strapi.log.error("Skydropx no devolvió shipment ID:", shipment);
          throw new Error("Skydropx aceptó la solicitud pero no devolvió el ID del envío");
        }

        // 17. Confirmar cargo
        await strapi.service("api::logistics-balance.logistics-balance").commitShipmentCharge({
          transactionId: reservation.transactionId,
          shipmentId,
        });

        const carrierName = shipmentAttributes?.carrier_name || pedido.skydropx_rate?.provider_display_name || pedido.skydropx_rate?.provider_name || null;
        const workflowStatus = shipmentAttributes?.workflow_status || "pending";

        /**
         * 18. Actualizar en pedido
         * IMPORTANTE:
         * Como Skydropx responde 202, todavía puede no existir tracking_number ni label_url.
         * Por eso guardamos inicialmente:
         * - shipment_id
         * - skydropx_status
         * - proveedor
         *
         * Posteriormente getShipment() actualizará:
         * - tracking
         * - label
         * - status
         */
        const metadataActual = pedido.metadata || {};

        const metadataNueva = {
          ...metadataActual,
          skydropx_shipment_created_at: new Date().toISOString(),
          skydropx_creation_response: shipment,
        };

        await strapi.entityService.update(PEDIDO_UID, pedidoId, {
          data: {
            skydropx_shipment_id: shipmentId,
            skydropx_status: workflowStatus,
            proveedor: carrierName,
            metadata: metadataNueva,
          },
        });

        // * 19. Respuesta al frontend
        ctx.status = 202;
        ctx.body = {
          success: true,
          message: "El envío fue aceptado por Skydropx y está siendo procesado",
          pedido_id: pedidoId,
          shipment: {
            id: shipmentId,
            status: workflowStatus,
            carrier_name: carrierName,
            tracking_number: shipmentAttributes?.master_tracking_number || null,
            label_url: shipmentAttributes?.label_url || null,
            raw: shipment,
          },
        };
      } catch (error) {
        // 20. Liberar reserva
        await strapi.service("api::logistics-balance.logistics-balance").releaseShipmentReservation({
          transactionId: reservation.transactionId,
          reason: error?.message,
        });

        throw error;
      }
    } catch (error) {
      strapi.log.error("Error creando envío Skydropx:", error);
      ctx.status = error.status || 500;
      ctx.body = {
        success: false,
        message: error.message || "No fue posible crear el envío",
        details: error.details || null,
      };
    }
  },

  /**
  * Consulta el estado real del envío en Skydropx.
  * También actualiza el pedido en Strapi.
  */
  async getShipment(ctx) {
    try {
      const {
        id,
      } = ctx.params;

      if (!id) {
        return ctx.badRequest("El ID del envío es requerido");
      }

      const shipment = await skydropxService.getShipment(id);

      const shipmentData = shipment?.data || shipment;

      const attrs = shipmentData?.attributes || {};

      /**
       * Obtener tracking.
       *
       * En la respuesta 202 el tracking puede estar dentro de included/packages.
       */
      let trackingNumber = attrs.master_tracking_number || null;

      let labelUrl = attrs.label_url || null;

      let trackingUrl = null;

      let packageTrackingStatus = null;

      const included = Array.isArray(shipment?.included) ? shipment.included : [];

      const packageData = included.find((item) => item?.type === "package");

      const packageAttributes = packageData?.attributes || null;

      if (packageAttributes) {
        trackingNumber = trackingNumber || packageAttributes.tracking_number || null;

        labelUrl = labelUrl || packageAttributes.label_url || null;

        trackingUrl = packageAttributes.tracking_url_provider || null;

        packageTrackingStatus = packageAttributes.tracking_status || null;
      }

      /**
       * Buscar pedido asociado por shipment_id.
       */
      const pedidos = await strapi.entityService.findMany(PEDIDO_UID, {
        filters: {
          skydropx_shipment_id: id,
        },
        limit: 1,
      });

      const pedido = pedidos?.[0];

      if (pedido) {
        const metadataActual = pedido.metadata || {};

        const metadataNueva = {
          ...metadataActual,
          skydropx_last_sync_at: new Date().toISOString(),
        };

        const updateData = {
          skydropx_status: attrs.workflow_status || packageTrackingStatus || null,
          metadata: metadataNueva,
        };

        if (trackingNumber) {
          updateData.skydropx_tracking_number = trackingNumber;

          /*
           * Conservamos también guia para que el código actual de PedidosPendientes pueda seguir funcionando.
           */
          updateData.guia = trackingNumber;
        }

        if (labelUrl) {
          updateData.skydropx_label_url = labelUrl;
        }

        if (attrs.carrier_name) {
          updateData.proveedor = attrs.carrier_name;
        }

        /**
         * Si Skydropx ya tiene tracking/guía, el pedido puede considerarse enviado.
         *
         * No cambiamos a enviado sólo por recibir el shipment_id.
         */
        if (trackingNumber || labelUrl) {
          updateData.status = "enviado";

          if (!pedido.fecha_envio) {
            updateData.fecha_envio = new Date().toISOString();
          }
        }

        await strapi.entityService.update(PEDIDO_UID, pedido.id, {
          data: updateData,
        });
      }

      ctx.body = {
        success: true,

        shipment: {
          id: shipmentData?.id || id,
          workflow_status: attrs.workflow_status || null,
          payment_status: attrs.payment_status || null,
          carrier_name: attrs.carrier_name || null,
          total: attrs.total || null,
          tracking_number: trackingNumber,
          label_url: labelUrl,
          tracking_url: trackingUrl,
          package_tracking_status: packageTrackingStatus,
          order_detail_url: attrs.order_detail_url || null,
          raw: shipment,
        },
      };
    } catch (error) {
      strapi.log.error("Error consultando envío Skydropx:", error);

      ctx.status = error.status || 500;

      ctx.body = {
        success: false,
        message: error.message || "No fue posible consultar el envío",
        details: error.details || null,
      };
    }
  },
};