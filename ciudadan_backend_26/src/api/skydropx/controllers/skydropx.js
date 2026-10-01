"use strict";

const skydropxService = require("../services/skydropx");

const STORE_UID = "api::store.store";
const PRODUCT_UID = "api::producto.producto";
const ADDRESS_UID = "api::direccion.direccion";
const PEDIDO_UID = "api::pedido.pedido";
const BALANCE_UID = "api::logistics-balance.logistics-balance";
const SHIPMENT_UID = "api::shipment.shipment";
const PACKAGE_UID = "api::shipment-package.shipment-package";

/**
 * MAPA DE ESTADOS SKYDROPX -> SHIPMENT (modelo logístico Fase 1+).
 * El workflow_status del envío y/o el tracking_status del paquete
 * se normalizan al enum de api::shipment.shipment.
 */
const SKYDROPX_SHIPMENT_STATUS_MAP = {
  pending: "pending",
  created: "processing",
  processing: "processing",
  ready: "ready",
  picked_up: "picked_up",
  in_transit: "in_transit",
  out_for_delivery: "out_for_delivery",
  delivered: "delivered",
  cancelled: "cancelled",
  canceled: "cancelled",
  returned: "returned",
  failed: "failed",
};

function resolveShipmentStatus({ workflowStatus, trackingStatus, hasTracking }) {
  const candidates = [trackingStatus, workflowStatus]
    .map((s) => String(s ?? "").toLowerCase())
    .filter(Boolean);

  for (const candidate of candidates) {
    if (SKYDROPX_SHIPMENT_STATUS_MAP[candidate]) {
      return SKYDROPX_SHIPMENT_STATUS_MAP[candidate];
    }
  }

  // Ya hay tracking/etiqueta pero no conocemos el estado: el envío está listo.
  if (hasTracking) {
    return "ready";
  }

  return null;
}

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
    return raw?.data?.map((item) => item?.attributes ? item.attributes : item);
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

/**
 * MAPA DE ESTADOS SKYDROPX -> PEDIDO
 * Skydropx reporta el estado en workflow_status y/o en el tracking_status del paquete.
 */
const SKYDROPX_STATUS_MAP = {
  // En tránsito
  picked_up: "encamino",
  in_transit: "encamino",
  out_for_delivery: "encamino",
  // Entregado
  delivered: "recibido",
  // Cancelado / devuelto
  cancelled: "cancelado",
  canceled: "cancelado",
  returned: "devuelto",
};

/**
 * Resuelve el status del pedido a partir de los estados reportados por Skydropx.
 * Regresa null si no hay cambio de estado que aplicar.
 */
function resolvePedidoStatus({ workflowStatus, trackingStatus, hasTracking }) {
  const candidates = [trackingStatus, workflowStatus]
    .map((s) => String(s ?? "").toLowerCase())
    .filter(Boolean);

  for (const candidate of candidates) {

    if (SKYDROPX_STATUS_MAP[candidate]) {

      return SKYDROPX_STATUS_MAP[candidate];
    }
  }

  // Si ya hay tracking/guía pero no hay estado conocido,
  // consideramos el pedido como enviado.
  if (hasTracking) {
    return "enviado";
  }

  return null;
}

/**
 * SINCRONIZAR ENVÍO DESDE SKYDROPX
 * Función compartida por getShipment() y por el webhook.
 * 1. Consulta el envío en Skydropx.
 * 2. Busca el pedido asociado por skydropx_shipment_id.
 * 3. Actualiza tracking, label, proveedor y status.
 * 4. Aplica efectos secundarios:
 *    - recibido  -> fecha_entrega
 *    - cancelado/devuelto -> reembolso del cargo logístico
 */
async function syncShipmentFromSkydropx(shipmentId) {
  const shipment = await skydropxService.getShipment(shipmentId);

  const shipmentData = shipment?.data ?? shipment;
  const attrs = shipmentData?.attributes ?? {};

  let trackingNumber = attrs?.master_tracking_number ?? null;
  let labelUrl = attrs?.label_url ?? null;
  let trackingUrl = null;
  let packageTrackingStatus = null;

  const included = Array.isArray(shipment?.included) ? shipment?.included : [];
  // TODOS los paquetes incluidos (un shipment puede tener N paquetes)
  const includedPackages = included.filter((item) => item?.type === "package");
  const packageData = includedPackages[0] ?? null;
  const packageAttributes = packageData?.attributes ?? null;

  if (packageAttributes) {
    trackingNumber = trackingNumber ?? packageAttributes?.tracking_number ?? null;
    labelUrl = labelUrl ?? packageAttributes?.label_url ?? null;
    trackingUrl = packageAttributes?.tracking_url_provider ?? null;
    packageTrackingStatus = packageAttributes?.tracking_status ?? null;
  }

  const workflowStatus = attrs?.workflow_status ?? null;

  // Buscar pedido asociado
  const pedidos = await strapi.entityService.findMany(PEDIDO_UID, {
    filters: {
      skydropx_shipment_id: shipmentId,
    },
    limit: 1,
  });

  const pedido = pedidos?.[0] ?? null;

  if (pedido) {
    const metadataActual = pedido.metadata || {};

    const metadataNueva = {
      ...metadataActual,
      skydropx_last_sync_at: new Date().toISOString(),
    };

    const updateData = {
      skydropx_status: workflowStatus || packageTrackingStatus || null,
      metadata: metadataNueva,
    };

    if (trackingNumber) {
      updateData.skydropx_tracking_number = trackingNumber;
      // Conservamos guia para compatibilidad con el código existente.
      updateData.guia = trackingNumber;
    }

    if (labelUrl) {
      updateData.skydropx_label_url = labelUrl;
    }

    if (attrs.carrier_name) {
      updateData.proveedor = attrs.carrier_name;
    }

    // Resolver nuevo estado del pedido
    const nuevoStatus = resolvePedidoStatus({
      workflowStatus,
      trackingStatus: packageTrackingStatus,
      hasTracking: Boolean(trackingNumber || labelUrl),
    });

    if (nuevoStatus && nuevoStatus !== pedido.status) {
      updateData.status = nuevoStatus;

      // Efecto secundario: entrega
      if (nuevoStatus === "recibido" && !pedido.fecha_entrega) {
        updateData.fecha_entrega = new Date().toISOString();
      }

      if (nuevoStatus === "enviado" && !pedido.fecha_envio) {
        updateData.fecha_envio = new Date().toISOString();
      }
    }

    await strapi.entityService.update(PEDIDO_UID, pedido.id, {
      data: updateData,
    });

    // Efecto secundario: reembolso del cargo logístico
    if ((nuevoStatus === "cancelado" || nuevoStatus === "devuelto") && pedido.status !== "cancelado" && pedido.status !== "devuelto") {
      try {
        await strapi.service(BALANCE_UID)?.refundShipmentCharge({
          shipmentId: String(shipmentId),
          reason: `Envío ${nuevoStatus} reportado por Skydropx`,
          metadata: {
            pedido_id: pedido.id,
            workflow_status: workflowStatus,
            tracking_status: packageTrackingStatus,
          },
        });
      } catch (refundError) {
        // No rompemos la sincronización por un error de reembolso.
        strapi.log.error(`Error reembolsando cargo del envío ${shipmentId}:`, refundError);
      }
    }
  }

  /**
   * -------------------------------------------------
   * Sincronizar el nuevo modelo logístico (Fase 3):
   * Shipment + ShipmentPackages. El pedido conserva sus
   * campos legacy por compatibilidad, pero la fuente de
   * verdad logística pasa a ser el Shipment.
   * -------------------------------------------------
   */
  let shipmentEntity = null;
  try {
    const shipments = await strapi.entityService.findMany(SHIPMENT_UID, {
      filters: { provider_shipment_id: String(shipmentId) },
      populate: { packages: true },
      limit: 1,
    });

    shipmentEntity = shipments?.[0] ?? null;

    if (shipmentEntity) {
      const shipmentUpdate = {
        raw_response: shipment,
      };

      const masterTracking = attrs?.master_tracking_number ?? trackingNumber ?? null;
      if (masterTracking) {
        shipmentUpdate.master_tracking_number = masterTracking;
      }

      if (attrs.carrier_name) {
        shipmentUpdate.carrier_name = attrs.carrier_name;
      }

      const nuevoShipmentStatus = resolveShipmentStatus({
        workflowStatus,
        trackingStatus: packageTrackingStatus,
        hasTracking: Boolean(masterTracking || trackingNumber || labelUrl),
      });

      if (nuevoShipmentStatus && nuevoShipmentStatus !== shipmentEntity.status) {
        shipmentUpdate.status = nuevoShipmentStatus;
      }

      await strapi.entityService.update(SHIPMENT_UID, shipmentEntity.id, {
        data: shipmentUpdate,
      });

      // Actualizar cada paquete físico con su tracking/label/estado.
      // Se relaciona por provider_package_id si existe; si no, por orden.
      const localPackages = Array.isArray(shipmentEntity.packages) ? shipmentEntity.packages : [];

      for (const [index, includedPkg] of includedPackages.entries()) {
        const pkgAttrs = includedPkg?.attributes ?? {};
        const providerPackageId = includedPkg?.id ?? pkgAttrs?.id ?? null;

        let localPkg = providerPackageId
          ? localPackages.find((p) => String(p.provider_package_id) === String(providerPackageId))
          : null;

        // Fallback: emparejar por package_number (índice + 1)
        if (!localPkg) {
          localPkg = localPackages.find((p) => String(p.package_number) === String(index + 1)) ?? localPackages[index] ?? null;
        }

        if (!localPkg) continue;

        const pkgUpdate = {};

        if (providerPackageId && !localPkg.provider_package_id) {
          pkgUpdate.provider_package_id = String(providerPackageId);
        }
        if (pkgAttrs?.tracking_number) {
          pkgUpdate.tracking_number = pkgAttrs.tracking_number;
        }
        if (pkgAttrs?.tracking_url_provider) {
          pkgUpdate.tracking_url = pkgAttrs.tracking_url_provider;
        }
        if (pkgAttrs?.label_url) {
          pkgUpdate.label_url = pkgAttrs.label_url;
        }

        const pkgStatus = SKYDROPX_SHIPMENT_STATUS_MAP[String(pkgAttrs?.tracking_status ?? "").toLowerCase()];
        if (pkgStatus && pkgStatus !== localPkg.status) {
          pkgUpdate.status = pkgStatus;
        } else if (pkgAttrs?.label_url && localPkg.status === "pending") {
          pkgUpdate.status = "labeled";
        }

        if (Object.keys(pkgUpdate).length > 0) {
          await strapi.entityService.update(PACKAGE_UID, localPkg.id, { data: pkgUpdate });
        }
      }
    }
  } catch (shipmentSyncError) {
    // No rompemos la sincronización del pedido por un error en el nuevo modelo.
    strapi.log.error(`Error sincronizando Shipment/Packages del envío ${shipmentId}:`, shipmentSyncError);
  }

  return {
    shipment: {
      id: shipmentData?.id ?? shipmentId,
      workflow_status: workflowStatus,
      payment_status: attrs?.payment_status ?? null,
      carrier_name: attrs?.carrier_name ?? null,
      total: attrs?.total ?? null,
      tracking_number: trackingNumber,
      label_url: labelUrl,
      tracking_url: trackingUrl,
      package_tracking_status: packageTrackingStatus,
      order_detail_url: attrs?.order_detail_url ?? null,
      packages: includedPackages.map((p) => ({
        id: p?.id ?? null,
        tracking_number: p?.attributes?.tracking_number ?? null,
        tracking_url: p?.attributes?.tracking_url_provider ?? null,
        label_url: p?.attributes?.label_url ?? null,
        tracking_status: p?.attributes?.tracking_status ?? null,
      })),
      raw: shipment,
    },
    pedido: pedido ? { id: pedido?.id, status: pedido?.status } : null,
    shipment_entity_id: shipmentEntity?.id ?? null,
  };
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
   * Consulta los puntos de oficina que un cliente puede usar
   * GET /api/skydropx/office-points
   */
  async getOfficePoints(ctx) {
    try {
      const { rate_id, direction = 'delivery' } = ctx.query;
      const result = await skydropxService.getOfficePoints(rate_id, direction);
      ctx.body = result?.data ?? [];
    } catch (error) {
      strapi.log.error("Error obteniendo puntos de oficina en una tarifa");
      ctx.status = error?.status ?? 500;
      ctx.body = {
        success: false,
        message: error?.message ?? "No fue posible obtener los puntos de oficina de una tarifa desde Skydropx",
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
   * POST /api/skydropx/shipment
   */
  async createShipment(ctx) {
    try {
      const body = ctx?.request?.body ?? {};

      const pedidoId = Number(body?.pedido_id);

      if (!Number.isInteger(pedidoId) || pedidoId <= 0) {
        return ctx.badRequest("pedido_id es requerido y debe ser válido");
      }

      // Nuevos parámetros del envío
      const officePickup = Boolean(body?.office_pickup);
      const officeDelivery = Boolean(body?.office_delivery);
      const officePickupPointId = body?.office_pickup_point_id ?? null;
      const officeDeliveryPointId = body?.office_delivery_point_id ?? null;
      const requestPackages = Array.isArray(body?.packages) ? body.packages : [];

      // Nota: la validación de office points se realiza después de cargar el
      // pedido, porque si existe un Shipment preparado los puntos pueden
      // venir guardados ahí (capturados durante la preparación del envío).

      // * 1. Obtener pedido (incluye el Shipment preparado con sus paquetes, si existe)
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
          },
          shipment: {
            populate: {
              packages: {
                populate: {
                  items: {
                    populate: {
                      producto: true,
                    },
                  },
                },
              },
            },
          },
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
       * 3. Evitar duplicados (idempotencia)
       * -------------------------------------------------
       */
      if (pedido.skydropx_shipment_id) {
        return ctx.badRequest("El pedido ya tiene un envío de Skydropx creado");
      }

      const preparedShipment = pedido.shipment ?? null;

      if (preparedShipment?.provider_shipment_id) {
        return ctx.badRequest("El envío preparado ya fue creado en Skydropx");
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
       * FUENTE DE VERDAD (Fase 3):
       * Si el vendedor preparó el envío, los packages se construyen
       * desde los ShipmentPackages físicos confirmados.
       * Si no existe preparación, se mantiene el flujo legacy
       * (un package por item del pedido) por compatibilidad.
       */
      const preparedPackages = Array.isArray(preparedShipment?.packages) ? preparedShipment.packages : [];

      let packages;
      if (preparedShipment && preparedPackages.length > 0) {
        packages = skydropxService.buildParcelsFromShipmentPackages(preparedPackages);
      } else {
        packages = skydropxService.buildShipmentPackages(items, requestPackages);
      }

      /**
       * -------------------------------------------------
       * 11b. Pickup / delivery en sucursal
       * -------------------------------------------------
       * Se prefieren los valores confirmados durante la preparación
       * del envío; el body solo se usa como fallback (flujo legacy).
       * Nunca se envían point ids si la modalidad no aplica.
       */
      const finalOfficePickup = preparedShipment ? Boolean(preparedShipment.office_pickup) : officePickup;
      const finalOfficeDelivery = preparedShipment ? Boolean(preparedShipment.office_delivery) : officeDelivery;
      const finalOfficePickupPointId = finalOfficePickup
        ? (preparedShipment?.office_pickup_point_id ?? officePickupPointId)
        : null;
      const finalOfficeDeliveryPointId = finalOfficeDelivery
        ? (preparedShipment?.office_delivery_point_id ?? officeDeliveryPointId)
        : null;

      if (finalOfficePickup && !finalOfficePickupPointId) {
        return ctx.badRequest("office_pickup_point_id es requerido cuando la recolección es en sucursal");
      }

      if (finalOfficeDelivery && !finalOfficeDeliveryPointId) {
        return ctx.badRequest("office_delivery_point_id es requerido cuando la entrega es en sucursal");
      }

      // -------------------------------------------------
      // 12. Obtener el importe de rate seleccionado y validar
      const shippingAmount = Number(pedido.skydropx_rate.total);
      if (!shippingAmount || shippingAmount <= 0)
        return ctx.badRequest("No fue posible determinar el costo de la tarifa de Skydropx");

      //--------------------------------------------------
      // 13. Reservar saldo
      const reservation = await strapi.service(BALANCE_UID).reserveShipmentBalance({
        storeId: store.id,
        orderId: pedidoId,
        amount: shippingAmount,
        userId: ctx.state.user?.id ?? null,
        idempotencyKey: `shipment:${pedidoId}`,
        metadata: {
          rate_id: pedido.skydropx_rate_id,
          provider_name: pedido.skydropx_rate.provider_name,
          provider_service_name: pedido.skydropx_rate.provider_service_name,
          currency_code: pedido.skydropx_rate.currency_code,
          rate_amount: pedido.skydropx_rate.amount,
          service_fee: pedido.skydropx_rate.service_fee,
          vat_fee: pedido.skydropx_rate.vat_fee,
          total: pedido.skydropx_rate.total,
        },
      });

      // * 14. Crear envío en Skydropx
      try {
        // Estado consistente: el Shipment preparado pasa a "processing"
        // antes de llamar al proveedor (nunca se marca como creado antes de tiempo).
        if (preparedShipment) {
          await strapi.entityService.update(SHIPMENT_UID, preparedShipment.id, {
            data: { status: "processing" },
          });
        }

        const shipment = await skydropxService.createShipment({
          rate_id: pedido.skydropx_rate_id,
          unique_shipment: true,
          auto_advance: true,
          printing_format: "standard",
          include_order_detail: false,
          address_from: addressFrom,
          address_to: addressTo,
          packages,
          office_pickup: finalOfficePickup,
          office_delivery: finalOfficeDelivery,
          office_pickup_point_id: finalOfficePickupPointId,
          office_delivery_point_id: finalOfficeDeliveryPointId,
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
        await strapi.service(BALANCE_UID).commitShipmentCharge({
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

        /**
         * 18b. Persistir en el nuevo modelo logístico (Shipment + Packages).
         * Skydropx responde 202: tracking/labels pueden llegar después
         * vía getShipment()/webhook (syncShipmentFromSkydropx).
         */
        if (preparedShipment) {
          const included = Array.isArray(shipment?.included) ? shipment.included : [];
          const includedPackages = included.filter((item) => item?.type === "package");

          await strapi.entityService.update(SHIPMENT_UID, preparedShipment.id, {
            data: {
              provider: "skydropx",
              provider_shipment_id: String(shipmentId),
              master_tracking_number: shipmentAttributes?.master_tracking_number ?? null,
              carrier_name: carrierName,
              status: resolveShipmentStatus({
                workflowStatus,
                trackingStatus: null,
                hasTracking: Boolean(shipmentAttributes?.master_tracking_number),
              }) ?? "processing",
              raw_response: shipment,
            },
          });

          // Asociar provider_package_id y datos iniciales a cada paquete
          for (const [index, includedPkg] of includedPackages.entries()) {
            const pkgAttrs = includedPkg?.attributes ?? {};
            const providerPackageId = includedPkg?.id ?? null;

            const localPkg =
              preparedPackages.find((p) => String(p.package_number) === String(index + 1)) ??
              preparedPackages[index] ??
              null;

            if (!localPkg) continue;

            const pkgUpdate = {};
            if (providerPackageId) pkgUpdate.provider_package_id = String(providerPackageId);
            if (pkgAttrs?.tracking_number) pkgUpdate.tracking_number = pkgAttrs.tracking_number;
            if (pkgAttrs?.tracking_url_provider) pkgUpdate.tracking_url = pkgAttrs.tracking_url_provider;
            if (pkgAttrs?.label_url) {
              pkgUpdate.label_url = pkgAttrs.label_url;
              pkgUpdate.status = "labeled";
            }

            if (Object.keys(pkgUpdate).length > 0) {
              await strapi.entityService.update(PACKAGE_UID, localPkg.id, { data: pkgUpdate });
            }
          }
        }

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
        await strapi.service(BALANCE_UID).releaseShipmentReservation({
          transactionId: reservation.transactionId,
          reason: error?.message,
        });

        // Marcar el Shipment preparado como fallido (nunca queda como creado).
        if (preparedShipment) {
          try {
            await strapi.entityService.update(SHIPMENT_UID, preparedShipment.id, {
              data: {
                status: "failed",
                metadata: {
                  ...(preparedShipment.metadata || {}),
                  creation_error: error?.message ?? "Error desconocido",
                  creation_failed_at: new Date().toISOString(),
                },
              },
            });
          } catch (updateError) {
            strapi.log.error("Error marcando shipment como fallido:", updateError);
          }
        }

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
  * GET /api/skydropx/shipment
  */
  async getShipment(ctx) {
    try {
      const {
        id,
      } = ctx.params;

      if (!id) {
        return ctx.badRequest("El ID del envío es requerido");
      }

      const { shipment } = await syncShipmentFromSkydropx(id);

      ctx.body = {
        success: true,
        shipment,
      };
    } catch (error) {
      strapi.log.error("Error consultando envío Skydropx: ");
      ctx.status = error.status || 500;

      ctx.body = {
        success: false,
        message: error.message || "No fue posible consultar el envío",
        details: error.details || null,
      };
    }
  },

  /**
   * WEBHOOK DE SKYDROPX
   * POST /api/skydropx/shipment/webhook
   * Skydropx notifica cambios de estado del envío.
   * La petición se autentica con un secreto compartido configurado en SKYDROPX_WEBHOOK_SECRET,
   * enviado en el header "x-skydropx-token" o como Bearer token.
   *
   * Responde 200 rápidamente para evitar reintentos.
   */
  async shipmentWebhook(ctx) {
    try {
      const secret = process.env.SKYDROPX_WEBHOOK_SECRET;
      if (secret) {
        const headerToken = ctx?.request?.headers["x-skydropx-token"] ?? String(ctx?.request?.headers?.authorization ?? "").replace(/^Bearer\s+/i, "");

        if (headerToken !== secret) {
          strapi.log.error("Webhook Skydropx rechazado: token inválido");
          ctx.status = 401;
          ctx.body = { success: false, message: "Token inválido" };
          return;
        }
      }

      const body = ctx.request?.body ?? {};

      // Tolerante a distintas formas de payload
      const shipmentId = body?.data?.attributes?.shipment_id ?? body?.data?.id ?? body?.shipment_id ?? body?.id ?? null;

      if (!shipmentId) {
        strapi.log.warn("Webhook Skydropx sin shipment_id: " + JSON.stringify(body).slice(0, 500));
        ctx.status = 200;
        ctx.body = { success: true, message: "Evento ignorado: sin shipment_id" };
        return;
      }

      strapi.log.info(`Webhook Skydropx recibido para envío ${shipmentId}`);

      const { pedido } = await syncShipmentFromSkydropx(shipmentId);

      ctx.status = 200;
      ctx.body = {
        success: true,
        shipment_id: shipmentId,
        pedido_id: pedido?.id ?? null,
      };
    } catch (error) {
      // Respondemos 200 igualmente para evitar reintentos infinitos
      // de un evento que no podemos procesar.
      strapi.log.error("Error procesando webhook Skydropx: " + JSON.stringify(error, null, 2));
      ctx.status = 200;
      ctx.body = {
        success: false,
        message: error?.message ?? "Error procesando el evento",
      };
    }
  },
};