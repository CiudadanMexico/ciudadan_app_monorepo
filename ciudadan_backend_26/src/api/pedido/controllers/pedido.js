'use strict';

/**
 * pedido controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

const PEDIDO_UID = 'api::pedido.pedido';
const QUOTE_UID = 'api::shipping-quote.shipping-quote';
const SHIPMENT_UID = 'api::shipment.shipment';
const PACKAGE_UID = 'api::shipment-package.shipment-package';
const PACKAGE_ITEM_UID = 'api::shipment-package-item.shipment-package-item';

/**
 * Normaliza los items del pedido (componente repeatable carritos.producto-en-carrito)
 * tolerando las distintas formas que puede devolver Strapi.
 */
function normalizeItems(raw) {
  if (raw === null || raw === undefined) return [];
  if (Array.isArray(raw)) return raw.map((i) => (i?.attributes ? i.attributes : i));
  if (Array.isArray(raw?.data)) return raw.data.map((i) => (i?.attributes ? i.attributes : i));
  if (raw?.data?.attributes) return [raw.data.attributes];
  if (raw?.attributes) return [raw.attributes];
  if (typeof raw === 'string') {
    try {
      return normalizeItems(JSON.parse(raw));
    } catch {
      return [];
    }
  }
  if (typeof raw === 'object') return [raw];
  return [];
}

/**
 * Verifica que el usuario identificado (si lo hay) sea dueño de la tienda del pedido.
 * El marketplace actual opera con rutas públicas; cuando hay usuario Auth0
 * disponible sí aplicamos la validación de ownership.
 */
function assertStoreOwnership(ctx, pedido) {
  const user = ctx.state.strapiUser;
  if (!user) return true; // flujo actual sin token: no bloquear (patrón existente)

  const store = pedido?.store;
  const ownerId = store?.users_permissions_user?.id ?? store?.users_permissions_user;
  const storeEmail = store?.email ?? pedido?.store_email;

  if (ownerId && Number(ownerId) === Number(user.id)) return true;
  if (storeEmail && user.email && String(storeEmail).toLowerCase() === String(user.email).toLowerCase()) return true;

  return false;
}

module.exports = createCoreController(PEDIDO_UID, ({ strapi }) => ({
  /**
   * POST /api/pedidos/:id/shipping-quote
   *
   * Congela el snapshot de la tarifa seleccionada por el comprador durante
   * el checkout. A partir de aquí NO se vuelve a consultar Skydropx para
   * saber qué tarifa eligió el comprador ni se recalcula el precio.
   *
   * Body: {
   *   quotation_id, rate (objeto tarifa de Skydropx), estimated_parcels?,
   *   office_pickup_point_id?, office_delivery_point_id?, raw_response?
   * }
   */
  async saveShippingQuote(ctx) {
    try {
      const pedidoId = Number(ctx.params.id);
      if (!Number.isInteger(pedidoId) || pedidoId <= 0) {
        return ctx.badRequest('id de pedido inválido');
      }

      const body = ctx.request.body?.data ?? ctx.request.body ?? {};
      const rate = body.rate ?? null;
      const quotationId = body.quotation_id ?? rate?.quotation_id ?? null;

      if (!quotationId) return ctx.badRequest('quotation_id es requerido');
      if (!rate || typeof rate !== 'object') return ctx.badRequest('rate (snapshot de la tarifa) es requerido');

      const rateId = rate.id ?? rate.rate_id ?? null;
      if (!rateId) return ctx.badRequest('La tarifa no tiene id');

      const pedido = await strapi.entityService.findOne(PEDIDO_UID, pedidoId, {
        populate: { store: true, shipping_quote: true },
      });

      if (!pedido) return ctx.notFound('Pedido no encontrado');

      // Idempotencia: si ya existe una quote para este pedido con la misma
      // tarifa, devolverla en lugar de duplicar.
      const existing = pedido.shipping_quote;
      if (existing) {
        if (String(existing.rate_id) === String(rateId)) {
          return ctx.send({ data: existing, duplicated: true });
        }
        // Tarifa distinta: la anterior queda superseded (nunca se borra).
        await strapi.entityService.update(QUOTE_UID, existing.id, {
          data: { status: 'superseded' },
        });
      }

      const quote = await strapi.entityService.create(QUOTE_UID, {
        data: {
          pedido: pedidoId,
          provider: 'skydropx',
          quotation_id: String(quotationId),
          rate_id: String(rateId),
          carrier_name: rate.provider_display_name ?? rate.provider_name ?? rate.carrier ?? null,
          provider_service_name: rate.provider_service_name ?? rate.service_name ?? null,
          provider_service_code: rate.provider_service_code ?? rate.service_code ?? null,
          amount: Number(rate.amount) || null,
          service_fee: Number(rate.service_fee) || null,
          vat_fee: Number(rate.vat_fee) || null,
          total: Number(rate.total) || null,
          currency_code: rate.currency_code ?? 'MXN',
          delivery_days: Number.isFinite(Number(rate.days)) ? Number(rate.days) : null,
          office_pickup_required: rate.office_pickup === true && rate.pickup_ocurre === false,
          office_delivery_required: rate.office_delivery_only === true,
          office_pickup_point_id: body.office_pickup_point_id ?? null,
          office_delivery_point_id: body.office_delivery_point_id ?? null,
          estimated_parcels: Array.isArray(body.estimated_parcels) ? body.estimated_parcels : null,
          rate_snapshot: rate,
          raw_response: body.raw_response ?? null,
          status: 'selected',
          selected_at: new Date().toISOString(),
        },
      });

      // Compatibilidad: mantener los campos legacy del pedido sincronizados
      // (consumidos hoy por GenerarGuia.jsx y el flujo actual de Skydropx).
      await strapi.entityService.update(PEDIDO_UID, pedidoId, {
        data: {
          skydropx_quotation_id: String(quotationId),
          skydropx_rate_id: String(rateId),
          skydropx_rate: rate,
        },
      });

      return ctx.send({ data: quote });
    } catch (error) {
      strapi.log.error('Error guardando shipping quote:', error);
      ctx.status = error?.status ?? 500;
      return ctx.send({
        success: false,
        message: error?.message ?? 'No fue posible guardar la tarifa seleccionada',
      }, ctx.status);
    }
  },

  /**
   * POST /api/pedidos/:id/preparar-envio
   *
   * El vendedor define los paquetes físicos REALES del envío. Crea:
   *   Shipment (status: pending, sin provider_shipment_id todavía)
   *   └── ShipmentPackage[] (dimensiones/peso reales, declared_value, protección)
   *       └── ShipmentPackageItem[] (qué productos y cuántos van en cada paquete)
   *
   * NO crea todavía el envío en Skydropx (eso es Fase 3).
   *
   * Body: {
   *   packages: [{
   *     length, width, height, weight,
   *     declared_value?, package_protected?, consignment_note?, package_type?,
   *     items: [{ producto_id, quantity, order_item_id? }]
   *   }],
   *   office_pickup?, office_delivery?,
   *   office_pickup_point_id?, office_delivery_point_id?
   * }
   */
  async prepararEnvio(ctx) {
    try {
      const pedidoId = Number(ctx.params.id);
      if (!Number.isInteger(pedidoId) || pedidoId <= 0) {
        return ctx.badRequest('id de pedido inválido');
      }

      const body = ctx.request.body?.data ?? ctx.request.body ?? {};
      const packages = Array.isArray(body.packages) ? body.packages : [];

      const pedido = await strapi.entityService.findOne(PEDIDO_UID, pedidoId, {
        populate: {
          store: { populate: { users_permissions_user: true } },
          shipping_quote: true,
          shipment: true,
          item: { populate: { producto: true } },
        },
      });

      if (!pedido) return ctx.notFound('Pedido no encontrado');

      if (!assertStoreOwnership(ctx, pedido)) {
        return ctx.forbidden('No tienes permiso para preparar el envío de este pedido');
      }

      // El pago debe estar confirmado antes de preparar el envío.
      if (pedido.status !== 'pendiente_envio') {
        return ctx.badRequest(`El pedido no está listo para preparar envío. Estado actual: ${pedido.status}`);
      }

      // Un pedido = un shipment (el shipment puede tener N paquetes).
      if (pedido.shipment) {
        return ctx.badRequest('El pedido ya tiene un envío preparado');
      }
      if (pedido.skydropx_shipment_id) {
        return ctx.badRequest('El pedido ya tiene un envío de Skydropx creado');
      }

      // Validar estructura de paquetes
      if (packages.length === 0) {
        return ctx.badRequest('Debe proporcionar al menos un paquete');
      }
      if (packages.length > 20) {
        return ctx.badRequest('No se permiten más de 20 paquetes por envío');
      }

      for (const [index, pkg] of packages.entries()) {
        for (const dim of ['length', 'width', 'height', 'weight']) {
          const value = Number(pkg?.[dim]);
          if (!Number.isFinite(value) || value <= 0) {
            return ctx.badRequest(`El paquete ${index + 1} requiere ${dim} mayor a cero`);
          }
        }
        if (pkg.package_protected !== undefined && typeof pkg.package_protected !== 'boolean') {
          return ctx.badRequest(`package_protected del paquete ${index + 1} debe ser booleano`);
        }
      }

      // Validación autoritativa: las cantidades empacadas deben coincidir
      // exactamente con las cantidades del pedido.
      const orderItems = normalizeItems(pedido.item);

      try {
        await strapi
          .service(SHIPMENT_UID)
          .validatePackingAgainstOrder(orderItems, packages);
      } catch (validationError) {
        return ctx.badRequest(validationError.message);
      }

      // Validar order_item_id (si se proporciona) contra los componentes del pedido
      const validOrderItemIds = new Set(
        orderItems.map((item) => Number(item?.id)).filter((id) => Number.isInteger(id))
      );
      for (const [pkgIndex, pkg] of packages.entries()) {
        for (const item of pkg.items) {
          if (item.order_item_id !== undefined && item.order_item_id !== null) {
            const oid = Number(item.order_item_id);
            if (validOrderItemIds.size > 0 && !validOrderItemIds.has(oid)) {
              return ctx.badRequest(
                `order_item_id ${oid} del paquete ${pkgIndex + 1} no pertenece al pedido`
              );
            }
          }
        }
      }

      // Condiciones de recolección/entrega: se heredan de la tarifa congelada.
      // Nunca se envían point ids si la tarifa no los requiere.
      const quote = pedido.shipping_quote ?? null;
      const rateSnapshot = quote?.rate_snapshot ?? pedido.skydropx_rate ?? {};

      const officePickup = Boolean(body.office_pickup ?? rateSnapshot?.office_pickup);
      const officeDelivery = Boolean(body.office_delivery ?? (rateSnapshot?.office_delivery || rateSnapshot?.office_delivery_only));

      const pickupRequired = quote?.office_pickup_required ?? (rateSnapshot?.office_pickup === true && rateSnapshot?.pickup_ocurre === false);
      const deliveryRequired = quote?.office_delivery_required ?? (rateSnapshot?.office_delivery_only === true);

      const officePickupPointId = pickupRequired ? (body.office_pickup_point_id ?? quote?.office_pickup_point_id ?? null) : null;
      const officeDeliveryPointId = deliveryRequired ? (body.office_delivery_point_id ?? quote?.office_delivery_point_id ?? null) : null;

      if (pickupRequired && !officePickupPointId) {
        return ctx.badRequest('office_pickup_point_id es requerido: la tarifa exige recolección en sucursal');
      }
      if (deliveryRequired && !officeDeliveryPointId) {
        return ctx.badRequest('office_delivery_point_id es requerido: la tarifa exige entrega en sucursal');
      }

      // Crear Shipment
      const shipment = await strapi.entityService.create(SHIPMENT_UID, {
        data: {
          pedido: pedidoId,
          shipping_quote: quote?.id ?? null,
          provider: 'skydropx',
          carrier_name: quote?.carrier_name ?? rateSnapshot?.provider_display_name ?? rateSnapshot?.provider_name ?? null,
          status: 'pending',
          total: quote?.total ?? (Number(rateSnapshot?.total) || null),
          currency_code: quote?.currency_code ?? rateSnapshot?.currency_code ?? 'MXN',
          office_pickup: officePickup,
          office_delivery: officeDelivery,
          office_pickup_point_id: officePickupPointId,
          office_delivery_point_id: officeDeliveryPointId,
        },
      });

      // Crear paquetes y su contenido
      const createdPackages = [];
      for (const [index, pkg] of packages.entries()) {
        const createdPackage = await strapi.entityService.create(PACKAGE_UID, {
          data: {
            shipment: shipment.id,
            package_number: String(index + 1),
            length: Number(pkg.length),
            width: Number(pkg.width),
            height: Number(pkg.height),
            weight: Number(pkg.weight),
            declared_value: pkg.declared_value !== undefined ? Number(pkg.declared_value) : null,
            package_protected: Boolean(pkg.package_protected),
            consignment_note: pkg.consignment_note ?? null,
            package_type: pkg.package_type ?? null,
            status: 'pending',
          },
        });

        for (const item of pkg.items) {
          const orderItem = orderItems.find(
            (oi) => Number(oi?.producto?.id ?? oi?.producto ?? oi?.producto_id) === Number(item.producto_id)
          );

          await strapi.entityService.create(PACKAGE_ITEM_UID, {
            data: {
              shipment_package: createdPackage.id,
              producto: Number(item.producto_id),
              order_item_id: item.order_item_id !== undefined ? Number(item.order_item_id) : (orderItem?.id ?? null),
              quantity: Number(item.quantity),
              nombre: orderItem?.nombre ?? null,
              precio_unitario: orderItem?.precio_unitario ?? null,
            },
          });
        }

        createdPackages.push(createdPackage);
      }

      const fullShipment = await strapi.entityService.findOne(SHIPMENT_UID, shipment.id, {
        populate: { packages: { populate: { items: true } }, shipping_quote: true },
      });

      ctx.status = 201;
      return ctx.send({
        success: true,
        message: 'Envío preparado. Los paquetes quedaron registrados.',
        data: fullShipment,
      });
    } catch (error) {
      strapi.log.error('Error preparando envío:', error);
      ctx.status = error?.status ?? 500;
      return ctx.send({
        success: false,
        message: error?.message ?? 'No fue posible preparar el envío',
      }, ctx.status);
    }
  },
}));
