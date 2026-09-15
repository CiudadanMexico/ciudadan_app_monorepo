// src/pages/FinalizarCompra.jsx
import React, { useEffect, useState, useCallback } from "react";
import { useCart } from "../../Contexts/CartContext";
import { useAuth0 } from "@auth0/auth0-react";
import { useNavigate } from "react-router-dom";
import DireccionSelector from "../../components/MarketPlace/DireccionSelector";
import PagoPorTienda from "../../components/MarketPlace/PagoPorTienda";
import {
  Box,
  Button,
  Stepper,
  Step,
  StepLabel,
  Typography,
  Paper,
  CircularProgress,
} from "@mui/material";
import { motion, AnimatePresence } from "framer-motion";
import { crearCotizacionEnvio, esperarCotizacionCompleta } from "../../services/skydropxService";
import { useRoles } from "../../Contexts/RolesContext";
import EnvioPorTienda from "../../components/MarketPlace/EnvioPorTienda";
import { Stack } from "@mui/system";
import { CheckCircleRounded, LocalShippingRounded, UploadFileRounded, VerifiedRounded } from "@mui/icons-material";
import { useSnackbar } from "notistack";
import FormDatosEntrega from "../../components/MarketPlace/Checkout/FormDatosEntrega";

const STRAPI = process.env.REACT_APP_STRAPI_URL;

const steps = [
  "Datos de entrega",
  "Dirección",
  "Envío",
  "Pagos",
  "Confirmación"
];

/**
 * Extrae y normaliza un objeto 'store' que puede venir:
 * - plano: { id, name }
 * - strapi expandido: { data: { id, attributes: { name } } }
 * - strapi sin data: { id, attributes: { name } }
 * Devuelve { id, name } garantizado (name tiene fallback).
 */
const extractStore = (rawStore) => {
  if (!rawStore) {
    return { id: null, name: "Tienda sin nombre" };
  }

  const maybeData = rawStore?.data || rawStore;

  const id =
    maybeData?.id ||
    rawStore?.id ||
    maybeData?.attributes?.id ||
    null;

  const name =
    maybeData?.attributes?.name ||
    maybeData?.attributes?.nombre ||
    rawStore?.name ||
    rawStore?.attributes?.name ||
    "Tienda sin nombre";

  const banco = maybeData?.attributes?.banco ?? rawStore?.banco ?? rawStore?.attributes?.banco ?? "";
  const clabe_bancaria = maybeData?.attributes?.clabe_bancaria ?? rawStore?.clabe_bancaria ?? rawStore?.attributes?.clabe_bancaria ?? "";
  const nombre_bancario = maybeData?.attributes?.nombre_bancario ?? rawStore?.nombre_bancario ?? rawStore?.attributes?.nombre_bancario ?? "";

  return { id: id || null, name, banco, clabe_bancaria, nombre_bancario };
};

/**
 * Agrupa items por tienda. Normaliza store UNA VEZ aquí.
 */
const groupByStore = (items) => items.reduce((acc, item) => {
  const rawStore = item.store;
  const store = extractStore(rawStore);

  const storeKey = store.id || "sin_tienda";

  if (!acc[storeKey]) {
    acc[storeKey] = {
      store,
      items: [],
    };
  }

  acc[storeKey].items.push(item);

  return acc;
}, {});

export default function FinalizarCompra() {
  // Contexto carrito y auth
  const { total, updateQuantity, clearCart, items: itemsContext } = useCart();
  const { isAuthenticated, loginWithRedirect, user } = useAuth0();
  const { userData } = useRoles();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  // Estado local
  const [items, setItems] = useState([]);
  const [localItems, setLocalItems] = useState([]);
  const [localTotal, setLocalTotal] = useState([]);
  const [porTienda, setPorTienda] = useState({});
  const [carritoId, setCarritoId] = useState(null);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [activeStep, setActiveStep] = useState(0);
  const [pedidosCreados, setPedidosCreados] = useState([]); // NORMALIZADOS
  const [creatingPedidos, setCreatingPedidos] = useState(false);
  const [finalizing, setFinalizing] = useState(false);

  // Para implementación de envíos
  const [datosEntrega, setDatosEntrega] = useState({ nombre: '', telefono: '', notas: '' });
  const [cotizacionesEnvio, setCotizacionesEnvio] = useState({});
  const [tarifasSeleccionadas, setTarifasSeleccionadas] = useState({});
  const [cargandoCotizaciones, setCargandoCotizaciones] = useState(false);
  const [errorCotizacion, setErrorCotizacion] = useState(null);

  useEffect(() => {
    if (Array.isArray(itemsContext) && itemsContext.length > 0) {
      setItems(itemsContext);
      const grouped = groupByStore(itemsContext);
      setPorTienda(grouped);
      console.log("UseEffect itemsContext > agrupado por tienda (normalizado):", grouped);
    } else {
      setItems([]);
      setPorTienda({});
      console.log("UseEffect itemsContext > carrito vacío o inválido");
    }
  }, [itemsContext]);

  // ------------------ handlePagoSubido (callback para hijos y listener global) ------------------
  // Actualiza pedidosCreados cuando un PagoPorTienda informa que subió comprobante/pago.
  const handlePagoSubido = useCallback((pedidoId, pagoId, fileId, pagoUpdateSuccess, fileUrl = null) => {
    console.log("-".repeat(20));
    console.log("handlePagoSubido > ", { pedidoId, pagoId, fileId, pagoUpdateSuccess, fileUrl });

    if (!pedidoId) {
      console.warn("handlePagoSubido > pedidoId inválido, abortando");
      return;
    }

    // Coerce IDs to strings to avoid type mismatch issues
    const pedidoIdStr = String(pedidoId);

    setPedidosCreados((prev) => {
      const next = prev.map((p) => {
        if (!p || String(p.id) !== pedidoIdStr) return p;

        // Prepara nuevo attributes incorporando pago y comprobante
        const attributes = { ...(p.attributes || {}) };

        // Establecer pago de forma consistente en attributes y campo root 'pago'
        if (pagoId) {
          attributes.pago_id = pagoId;
          attributes.pago = pagoId;
        }

        // Establecer comprobante si fileId viene
        if (fileId) {
          attributes.comprobante = {
            data: { id: fileId, attributes: { url: fileUrl || null } },
          };
        }

        // Opcional: ajustar status si no estaba ya (marca como 'enviar' o 'pago_en_revision')
        attributes.status = attributes.status || "pendiente_verificacion";

        const updated = {
          ...p,
          attributes,
          // también pondremos campo raíz para que comprobaciones rápidas funcionen
          pago: pagoId || p.pago || attributes.pago,
        };

        return updated;
      });

      return next;
    });
  }, []);

  // Listener para sincronizar pagos subidos desde PagoPorTienda (evento global)
  useEffect(() => {
    const handler = (e) => {
      try {
        const detail = e?.detail;
        if (!detail) return;
        console.log("evento cart:paymentUploaded recibido:", detail);
        const { pedidoId, pagoId, fileId, pagoUpdateSuccess, fileUrl } = detail;
        handlePagoSubido(pedidoId, pagoId, fileId, pagoUpdateSuccess, fileUrl);
      } catch (err) {
        console.warn("evento cart:paymentUploaded error:", err);
      }
    };

    window.addEventListener("cart:paymentUploaded", handler);
    return () => window.removeEventListener("cart:paymentUploaded", handler);
  }, [handlePagoSubido]);

  // Mapeo de items para carrito y para pedido
  const mapItemToComponent = (it) => {
    const storeId = it?.store?.id || it?.store?.data?.id || (typeof it?.store === "number" ? it.store : null) || null;

    const mapped = {
      producto: it.producto?.id ?? it.producto ?? null,
      nombre: it?.producto?.nombre ?? it?.producto?.attributes?.nombre ?? it?.nombre ?? "Sin nombre",
      precio_unitario: it?.precio_unitario ?? it?.precio ?? 0,
      cantidad: it?.cantidad ?? 1,
      subtotal: typeof it?.subtotal === "number" ? it?.subtotal : (it?.precio_unitario ?? 0) * (it?.cantidad ?? 1),
      envio: it?.envio ?? 0,
      subtotal_volumetrico: it?.subtotal_volumetrico ?? 0,
      esquema_impuestos: it?.esquema_impuestos ?? "sin_iva",
      cp: it?.cp ?? null,
      total: typeof it.total === "number" ? it.total : (typeof it.subtotal === "number" ? it.subtotal : 0) + (it.envio || 0),
      store: storeId,
      calificado: false,
      status: "pendiente",
    };
    console.log("mapItemToComponent ->", mapped);
    return mapped;
  };

  // Normalización de atributos incluyendo store con valor preventivo
  const normalizeAttributesStore = (attributes, fallbackStore) => {
    if (!attributes || typeof attributes !== "object") {
      return { ...attributes, store: fallbackStore || { id: null, name: "Tienda sin nombre" } };
    }

    const rawStore = attributes?.store ?? null;
    if (rawStore) {
      const flat = extractStore(rawStore);
      return { ...attributes, store: flat };
    }

    return { ...attributes, store: fallbackStore || { id: null, name: "Tienda sin nombre" } };
  };

  // función para cambiar datos de entrega
  const handleChangeDatosEntrega = (campo, valor) => {
    setDatosEntrega((prev) => ({
      ...prev,
      [campo]: valor ?? ''
    }));
  }

  // función para validar datos de entrega
  const validarDatosEntrega = () => {
    const nombre = datosEntrega.nombre.trim();
    const telefono = datosEntrega.telefono.trim();
    const notas = datosEntrega.notas;

    if (!nombre) {
      enqueueSnackbar('Ingresa el nombre de quien recibirá el pedido.', { variant: 'warning' });
      return false;
    }

    if (!telefono) {
      enqueueSnackbar('Ingresa un número de teléfono para la entrega.', { variant: 'warning', });
      return false;
    }

    if (notas && notas.length > 70){
      enqueueSnackbar('La información adicional no debe superar los 70 caracteres', { variant: 'warning' });
      return false;
    }

    return true;
  };

  const handleContinuarDatosEntrega = () => {
    if (validarDatosEntrega())
      setActiveStep(1);
  };

  // función para seleccionar una dirección
  const handleConfirmAddress = useCallback((dir) => {
    console.log("handleConfirmAddress > dirección seleccionada:", dir);
    setSelectedAddress(dir);
  }, []);

  // función para crear cotizaciones de envíos con dirección seleccionada
  const cotizarEnvios = async () => {
    if (!selectedAddress) {
      return;
    }

    setCargandoCotizaciones(true);
    setErrorCotizacion(null);


    try {
      const entries = Object.entries(porTienda);

      const resultados = await Promise.all(
        entries.map(async ([storeId, storeData]) => {
          const response = await crearCotizacionEnvio({
            storeId: Number(storeId),
            direccionDestinoId: selectedAddress?.id,
            items: storeData.items,
          });

          const quotationId = response?.quotation?.id;

          if (!quotationId)
            throw new Error(`No se recibió el ID de la cotización para la tienda: ${storeId}`);

          let quotation = response?.quotation;

          if (!quotation?.is_completed) {
            quotation = await esperarCotizacionCompleta(quotationId);
          }

          return [
            storeId,
            {
              quotationId: quotationId ?? null,
              isCompleted: quotation?.is_completed ?? false,
              rates: quotation?.rates ?? [],
              raw: quotation?.raw ?? quotation ?? {},
            },
          ];
        })
      );

      setCotizacionesEnvio(Object.fromEntries(resultados));
      setActiveStep(2);
    } catch (error) {
      console.error("Error cotizando envíos:", error);
      setErrorCotizacion(error?.response?.data?.message || error?.message || "No fue posible obtener las tarifas de envío.");
    } finally {
      setCargandoCotizaciones(false);
    }
  };

  // Función para seleccionar tarifa de alguna de las opciones de paquetería
  const handleSeleccionarTarifa = (storeId, rate) => {
    setTarifasSeleccionadas((prev) => ({
      ...prev,
      [storeId]: {
        rateId: rate?.id || rate?.rate_id,
        carrier: rate?.provider_name || rate?.carrier || null,
        service: rate?.provider_service_code || rate?.service || null,
        amount: Number(rate?.total || rate?.amount || rate?.price || 0),
        rate,
      },
    }));
  };

  const obtenerEnvioTienda = (storeId) => Number(tarifasSeleccionadas[storeId]?.amount ?? 0);

  const handleUpdateCreateCart = async (payload) => {
    try {
      // Buscar carrito activo del usuario
      const carritoRes = await fetch(`${STRAPI}/api/carritos?filters[usuario_email][$eq]=${encodeURIComponent(user?.email || "")}&filters[estado][$eq]=activo`);

      if (!carritoRes.ok) {
        const t = await carritoRes.text();
        console.error("handleUpdateCreateCart - error buscando carrito:", t);
        throw new Error("Error buscando carrito");
      }

      const carritoJson = await carritoRes.json();
      console.log("handleUpdateCreateCart - carrito encontrado (raw):", carritoJson);

      let carritoCreatedId = null;

      if (carritoJson?.data?.length > 0) {
        carritoCreatedId = carritoJson.data[0].id;
        console.log("handleUpdateCreateCart - actualizando carrito id:", carritoCreatedId);

        const upd = await fetch(`${STRAPI}/api/carritos/${carritoCreatedId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!upd.ok) {
          console.error("handleUpdateCreateCart - error actualizando carrito:", await upd.text());
          throw new Error("Error actualizando carrito");
        }
      } else {
        console.log("handleUpdateCreateCart - creando nuevo carrito");
        const newCarrito = await fetch(`${STRAPI}/api/carritos`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!newCarrito.ok) {
          console.error("handleUpdateCreateCart - error creando carrito:", await newCarrito.text());
          throw new Error("Error creando carrito");
        }

        const newJson = await newCarrito.json();
        carritoCreatedId = newJson?.data?.id;
        console.log("handleUpdateCreateCart- carrito creado id:", carritoCreatedId, newJson);
      }
      return carritoCreatedId;
    } catch (error) {
      throw error;
    }
  };

  const handleClearCart = async () => {
    try {
      const resFetch = await fetch(`${process.env.REACT_APP_STRAPI_URL}/api/carritos?filters[usuario_email][$eq]=${encodeURIComponent(user.email)}&filters[estado][$eq]=activo`, { credentials: "include", });
      const json = await resFetch.json();
      const carritoEntry = json?.data?.[0];

      if (!carritoEntry) {
        clearCart();
        return;
      }

      const carritoIdStrapi = carritoEntry.id;

      const payload = {
        data: {
          productos: [],
          total: 0,
          total_envios: 0,
          estado: "activo",
          ultima_actualizacion: new Date().toISOString(),
        },
      };

      const resPut = await fetch(`${process.env.REACT_APP_STRAPI_URL}/api/carritos/${carritoIdStrapi}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!resPut.ok) {
        const errText = await resPut.text();
        console.error("handleClearCart - Error de Strapi:", errText);
        return;
      }

      clearCart();
    } catch (err) {
      console.error("handleClearCart - Error en handleVaciarCarrito:", err);
    }
  };

  //  Función principal para crear pedidos agrupados por tienda.
  const handleCrearPedidos = async () => {
    console.log("-".repeat(20));
    console.log("handleCrearPedidos iniciado");
    if (!isAuthenticated) {
      console.log("usuario NO autenticado, redirigiendo a login");
      enqueueSnackbar({
        message: 'Inicie sesión para continuar con el proceso.',
        variant: 'error',
        onClose: async () => {
          await loginWithRedirect({ appState: { returnTo: "/carrito/finalizar" } });
        }
      });
      return;
    }

    if (!selectedAddress) {
      enqueueSnackbar({
        message: "Selecciona una dirección válida.",
        variant: 'error'
      })
      return;
    }

    if (!todasLasTiendasTienenEnvio) {
      enqueueSnackbar({
        message: "Selecciona una opción de envío para cada tienda.",
        variant: 'warning'
      })
      return;
    }

    const tiendaEntries = Object.entries(porTienda);

    if (tiendaEntries.length === 0) {
      enqueueSnackbar({
        message: "No hay productos disponibles en el carrito.",
        variant: "warning"
      })
      return;
    }

    setCreatingPedidos(true);

    // CREAR / ACTUALIZAR CARRITO
    const carritoPayload = {
      data: {
        productos: items.map(mapItemToComponent),
        total: items.reduce((acc, i) => acc + (i.subtotal || 0), 0),
        total_envios: items.reduce((acc, i) => acc + (i.envio || 0), 0),
        estado: "activo",
        ultima_actualizacion: new Date().toISOString(),
        usuario_email: user?.email || "unknown",
      },
    };

    console.log("-".repeat(10));
    console.log("handleCrearPedidos - payload carrito:", carritoPayload);
    console.log("-".repeat(10));

    // Buscar carrito activo del usuario y actualizar o crear de ser necesario
    const carritoCreatedId = await handleUpdateCreateCart(carritoPayload);

    setCarritoId(carritoCreatedId);

    try {
      // CREAR PEDIDOS POR TIENDA
      const pedidos = [];

      for (const [storeKey, storeGroup] of tiendaEntries) {
        try {
          const storeItems = storeGroup?.items ?? [];
          const subtotal = storeItems.reduce((acc, i) => acc + (i.subtotal || 0), 0);
          const envio = obtenerEnvioTienda(storeKey);
          const storeName = storeGroup.store?.name ?? storeKey;

          console.log("handleCrearPedidos - creando pedido para tienda:", storeName, { subtotal, envio, cantidadItems: storeGroup.items.length, storeGroupStore: storeGroup.store });

          const payloadPedido = {
            data: {
              item: storeGroup.items.map(mapItemToComponent),
              tipo: "tienda",
              timestamp_creacion: new Date().toISOString(),
              monto_envio: envio,
              monto_total: subtotal + envio,
              status: "pendiente_pago",
              carrito_id: carritoCreatedId,
              direccion_destino: selectedAddress.id,
              store: Number(storeKey),
              skydropx_quotation_id: cotizacionesEnvio[storeKey].quotationId,
              skydropx_rate_id: tarifasSeleccionadas[storeKey].rateId,
              skydropx_rate: tarifasSeleccionadas[storeKey].rate,
              usuario: userData?.id,
              metadata: {
                usuario_email: user?.email ?? "unknown"
              },
              delivery_contact_information: {
                name: datosEntrega.nombre.trim(),
                phone: datosEntrega.telefono.trim(),
                further_information: datosEntrega.notas,
              }
            },
          };

          console.log("handleCrearPedidos - payloadPedido:", payloadPedido);

          // Request para registro de pedidos
          const res = await fetch(`${STRAPI}/api/pedidos`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payloadPedido),
          });

          if (!res.ok) {
            const text = await res.text();
            console.error("handleCrearPedidos - error creando pedido (strapi):", text);
            continue;
          }

          const created = await res.json();
          console.log("handleCrearPedidos- respuesta pedido creado (raw):", created);

          const createdData = created?.data ?? null;
          let attributes = createdData?.attributes ?? {};
          attributes = normalizeAttributesStore(attributes, storeGroup.store);

          const normalized = {
            id: createdData?.id ?? null,
            attributes,
            pago: attributes?.pago ?? attributes?.pago_id ?? createdData?.pago ?? null,
            _raw: created,
          };

          console.log("handleCrearPedidos - pedido normalizado:", normalized);
          pedidos.push(normalized);
        } catch (innerErr) {
          console.error("handleCrearPedidos - error creando pedido para una tienda:", innerErr);
        }
      }

      setPedidosCreados(pedidos);

      if (!isAuthenticated) {
        localStorage.removeItem("carrito");
        setLocalItems([]);
        setLocalTotal(0);
        localStorage.setItem("itemCount", "0");
        console.log("🧹 handleVaciarCarrito - carrito y itemCount eliminados");
        window.dispatchEvent(new CustomEvent("carritoLocalActualizado", { detail: { itemCount: 0 } }));
        return;
      }

      if (!user?.email) {
        console.warn("No hay email de usuario. No puedo vaciar.");
        return;
      }

      console.log("-".repeat(15))
      console.log("handleCrearPedidos- pedidos creados y normalizados:", pedidos);
      console.log("-".repeat(15))

      setErrorCotizacion(null);
      // Avanzar al paso de pagos si hay al menos 1 pedido creado
      if (pedidos.length > 0) {
        setActiveStep(3);
      } else {
        enqueueSnackbar({
          message: "No se pudieron crear pedidos.",
          variant: "error"
        })
      }
    } catch (err) {
      console.error("handleCrearPedidos- Error general:", err);
    } finally {
      console.log("-".repeat(20));
      setCreatingPedidos(false);
      handleClearCart();
    }
  };

  // Finaliza pedidos: marca pagado en Strapi y cambia estado del carrito si aplica.
  const handleFinalizar = async () => {
    console.log("-".repeat(20));
    console.log("handleFinalizar - iniciado");

    if (!allPedidosPagados) {
      enqueueSnackbar({
        message: "Faltan pagos de tiendas por completar.",
        variant: "warning"
      });
      return;
    }

    setFinalizing(true);

    try {
      for (const p of pedidosCreados) {
        if (!p?.id) {
          console.warn("handleFinalizar - pedido sin id, se omite:", p);
          continue;
        }

        console.log("handleFinalizar- marcando pedido como pagado, id:", p.id);

        const upd = await fetch(`${STRAPI}/api/pedidos/${p.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            data: {
              status: "pendiente_verificacion",
              fecha_pagado: new Date().toISOString(),
            },
          }),
        });

        if (!upd.ok) {
          console.error("handleFinalizar - error actualizando pedido id:", p.id, await upd.text());
        } else {
          console.log("handleFinalizar - pedido actualizado correctamente id:", p.id);
        }
      }

      // Omitimos el marcar carrito como pagado por el momento
      // if (carritoId) {
      //   console.log("handleFinalizar- marcando carrito como pagado id:", carritoId);
      //   const updCar = await fetch(`${STRAPI}/api/carritos/${carritoId}`, {
      //     method: "PUT",
      //     headers: { "Content-Type": "application/json" },
      //     body: JSON.stringify({
      //       data: { estado: "pagado" },
      //     }),
      //   });
      //   if (!updCar.ok) {
      //     console.error("cart y emojis - error actualizando carrito:", await updCar.text());
      //   } else {
      //     console.log("cart y emojis - carrito actualizado a pagado:", carritoId);
      //   }
      // }

      setActiveStep(4);
    } catch (err) {
      console.error("handleFinalizar - error:", err);
      enqueueSnackbar({
        message: 'Ocurrió un error al finalizar el proceso.',
        variant: "error",
      })
    } finally {
      console.log("-".repeat(20));
      setFinalizing(false);
    }
  };

  // Comprueba si todos los pedidos ya tienen pago registrado. Se soportan múltiples formas: pedido.pago, pedido.attributes.pago_id, etc.
  const allPedidosPagados = pedidosCreados.length > 0 && pedidosCreados.every((p) => {
    const hasRootPago = Boolean(p?.pago);
    const hasAttributesPago = Boolean(p?.attributes?.pago) || Boolean(p?.attributes?.pago_id) || Boolean(p?.attributes?.pagoId);
    return hasRootPago || hasAttributesPago;
  });

  // Comprueba si todas las tiendas tienen cotización de envío
  const todasLasTiendasTienenEnvio = Object.keys(porTienda).every((storeId) => Boolean(tarifasSeleccionadas[storeId]?.rateId));

  return (
    <Box sx={{ maxWidth: 980, margin: "0 auto", p: 2 }}>
      <Typography variant="h4" sx={{ mb: 2 }}>
        Finalizar compra
      </Typography>

      <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      <AnimatePresence mode="wait">
        {/* Paso 1 - Formulario de contacto */}
        {activeStep === 0 && (
          <motion.div key="dir" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Paper sx={{ p: 2 }}>
              <FormDatosEntrega
                nombre={datosEntrega.nombre}
                telefono={datosEntrega.telefono}
                notas={datosEntrega.notas}
                onChange={handleChangeDatosEntrega}
              />
            </Paper>
          </motion.div>
        )}

        {/* Paso 2 - Selección de dirección */}
        {activeStep === 1 && (
          <motion.div key="dir" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Paper sx={{ p: 2 }}>
              <DireccionSelector onConfirm={handleConfirmAddress} />
            </Paper>
          </motion.div>
        )}

        {/* Paso 3 - Seleccionar cotización de envío */}
        {activeStep === 2 && (
          <motion.div key="envios" initial={{ opacity: 0 }} animate={{ opacity: 1 }} >
            <Paper sx={{ p: 2 }}>
              <Typography
                variant="h5"
                sx={{ mb: 1 }}
              >
                Opciones de envío
              </Typography>

              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mb: 3 }}
              >
                Selecciona una opción de envío para cada tienda.
              </Typography>

              {Object.entries(porTienda).map(
                ([storeId, storeData]) => (
                  <EnvioPorTienda
                    key={storeId}
                    store={storeData.store}
                    quotation={cotizacionesEnvio[storeId]}
                    selectedRateId={tarifasSeleccionadas[storeId]?.rateId ?? ""}
                    onSelectRate={(rate) => {
                      handleSeleccionarTarifa(storeId, rate)
                    }}
                    loading={cargandoCotizaciones}
                  />
                )
              )}
            </Paper>
          </motion.div>
        )}

        {/* Paso 4 - Subir comprobantes por tienda */}
        {activeStep === 3 && (
          <motion.div key="pagos" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Paper sx={{ p: 2 }}>
              {/* Si no hay pedidos, mostramos mensaje */}
              {pedidosCreados.length === 0 && (
                <Typography sx={{ mb: 2 }}>
                  No hay pedidos creados. Vuelve a intentar crear los pedidos.
                </Typography>
              )}

              {/* Renderizamos PagoPorTienda con la estructura NORMALIZADA y le pasamos onPagoSubido */}
              {pedidosCreados.map((p) =>
                p && p.id ? (
                  <PagoPorTienda key={p.id} pedido={p} onPagoSubido={handlePagoSubido} />
                ) : (
                  <Paper key={Math.random()} sx={{ p: 1, mb: 1 }}>
                    <Typography variant="body2">Pedido inválido (revisa la consola).</Typography>
                  </Paper>
                )
              )}
            </Paper>
          </motion.div>
        )}

        {/* Paso 5 - Finalización */}
        {activeStep === 4 && (
          <motion.div key="ok" initial={{ opacity: 0 }} animate={{ opacity: 1 }} >
            <Paper
              sx={{
                p: { xs: 3, sm: 4 },
                borderRadius: 3,
              }}
            >
              <Stack spacing={3} alignItems="center">
                <CheckCircleRounded
                  color="success"
                  sx={{ fontSize: 70 }}
                />

                <Box textAlign="center">
                  <Typography variant="h5" fontWeight={700}>
                    ¡Comprobante enviado!
                  </Typography>

                  <Typography
                    color="text.secondary"
                    sx={{ mt: 1 }}
                  >
                    Tu comprobante de pago fue recibido correctamente.
                    Ahora comenzará el proceso de validación antes del envío
                    de tu pedido.
                  </Typography>
                </Box>

                <Stack
                  spacing={2}
                  sx={{
                    width: "100%",
                    mt: 1,
                  }}
                >
                  <Box display="flex" gap={2}>
                    <UploadFileRounded color="primary" />
                    <Box>
                      <Typography fontWeight={600}>
                        1. Comprobante recibido
                      </Typography>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                      >
                        Tu comprobante ya fue registrado en el sistema.
                      </Typography>
                    </Box>
                  </Box>

                  <Box display="flex" gap={2}>
                    <VerifiedRounded color="warning" />
                    <Box>
                      <Typography fontWeight={600}>
                        2. Validación del vendedor
                      </Typography>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                      >
                        El vendedor fue notificado y verificará que el pago
                        haya sido recibido correctamente.
                      </Typography>
                    </Box>
                  </Box>

                  <Box display="flex" gap={2}>
                    <LocalShippingRounded color="success" />
                    <Box>
                      <Typography fontWeight={600}>
                        3. Preparación y envío
                      </Typography>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                      >
                        Una vez confirmado el pago, tu pedido será preparado y
                        enviado. Podrás consultar su avance desde la sección
                        <strong> Mis compras</strong>.
                      </Typography>
                    </Box>
                  </Box>
                </Stack>

                <Button
                  fullWidth
                  size="large"
                  variant="contained"
                  onClick={() => navigate("/compras/pedidos")}
                >
                  Ir a Mis compras
                </Button>
              </Stack>
            </Paper>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Acciones */}
      <Box mt={3} display="flex" justifyContent={activeStep <= 2 ? "space-between" : "flex-end"}>
        {activeStep <= 2 && (
          <Button
            disabled={activeStep === 0}
            onClick={() => setActiveStep((s) => s - 1)}
          >
            Volver
          </Button>
        )}

        {activeStep === 0 && (
          <Button
            variant="contained"
            onClick={handleContinuarDatosEntrega}
          >
            Continuar
          </Button>
        )}

        {activeStep === 1 && (
          <Button
            variant="contained"
            onClick={cotizarEnvios}
            disabled={!selectedAddress || cargandoCotizaciones}
          >
            {cargandoCotizaciones ? (<CircularProgress size={18} sx={{ mr: 1 }} />) : null}
            {cargandoCotizaciones ? "Cotizando..." : "Continuar"}
          </Button>
        )}

        {activeStep === 2 && (
          <Button
            variant="contained"
            onClick={handleCrearPedidos}
            disabled={!selectedAddress || !todasLasTiendasTienenEnvio || creatingPedidos}
          >
            {creatingPedidos ? <CircularProgress size={18} /> : "Continuar"}
          </Button>
        )}

        {activeStep === 3 && (
          <Button
            variant="contained"
            onClick={handleFinalizar}
            disabled={!allPedidosPagados || finalizing}
          >
            {finalizing ? <CircularProgress size={18} /> : "Finalizar"}
          </Button>
        )}
      </Box>
    </Box>
  );
}
