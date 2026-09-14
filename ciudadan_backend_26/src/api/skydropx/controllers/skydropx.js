"use strict";

const skydropxService = require("../services/skydropx");

const STORE_UID = "api::store.store";
const PRODUCT_UID = "api::producto.producto";
const ADDRESS_UID = "api::direccion.direccion";

module.exports = {
  /**
   * GET /api/skydropx/test-auth
   */
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
   * POST /api/skydropx/quotation
   *
   * Body:
   * {
   *   store_id: 1,
   *   direccion_destino_id: 20,
   *   items: [
   *     {
   *       producto_id: 15,
   *       cantidad: 2
   *     }
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

      const usuarioEmail = ctx.state.user?.email;
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

        if (producto.activo === false)
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
};