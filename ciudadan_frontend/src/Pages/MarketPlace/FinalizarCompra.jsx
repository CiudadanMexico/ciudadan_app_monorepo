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

const STRAPI = process.env.REACT_APP_STRAPI_URL;
const steps = ["Dirección", "Pagos", "Confirmación"];

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

  return { id: id || null, name };
};

/**
 * Agrupa items por tienda. Normaliza store UNA VEZ aquí.
 */
const groupByStore = (items) =>
  items.reduce((acc, item) => {
    const rawStore = item.store;
    const store = extractStore(rawStore);

    const storeKey = store.id || "sin_tienda";

    if (!acc[storeKey]) {
      acc[storeKey] = {
        store, // { id, name }
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
  const navigate = useNavigate();

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

  useEffect(() => {
    console.log("cart y emojis - useEffect itemsContext changed:", itemsContext);
    if (Array.isArray(itemsContext) && itemsContext.length > 0) {
      setItems(itemsContext);
      const grouped = groupByStore(itemsContext);
      setPorTienda(grouped);
      console.log("cart y emojis - agrupado por tienda (normalizado):", grouped);
    } else {
      setItems([]);
      setPorTienda({});
      console.log("cart y emojis - carrito vacío o inválido");
    }
  }, [itemsContext]);

  // ------------------ handlePagoSubido (callback para hijos y listener global) ------------------
  // Actualiza pedidosCreados cuando un PagoPorTienda informa que subió comprobante/pago.
  const handlePagoSubido = useCallback((pedidoId, pagoId, fileId, pagoUpdateSuccess, fileUrl = null) => {
    console.log("cart y emojis - handlePagoSubido llamado:", { pedidoId, pagoId, fileId, pagoUpdateSuccess, fileUrl });

    if (!pedidoId) {
      console.warn("cart y emojis - handlePagoSubido: pedidoId inválido, abortando");
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
        attributes.status = attributes.status || "enviar";

        const updated = {
          ...p,
          attributes,
          // también pondremos campo raíz para que comprobaciones rápidas funcionen
          pago: pagoId || p.pago || attributes.pago,
        };

        console.log("cart y emojis - handlePagoSubido actualizando pedido local:", {
          pedidoId: p.id,
          updatedAttributes: attributes,
        });

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
        console.log("cart y emojis - FinalizarCompra evento cart:paymentUploaded recibido:", detail);
        const { pedidoId, pagoId, fileId, pagoUpdateSuccess, fileUrl } = detail;
        handlePagoSubido(pedidoId, pagoId, fileId, pagoUpdateSuccess, fileUrl);
      } catch (err) {
        console.warn("cart y emojis - FinalizarCompra handler error:", err);
      }
    };

    window.addEventListener("cart:paymentUploaded", handler);
    return () => window.removeEventListener("cart:paymentUploaded", handler);
  }, [handlePagoSubido]);

  const handleConfirmAddress = useCallback((dir) => {
    console.log("cart y emojis - dirección seleccionada:", dir);
    setSelectedAddress(dir);
  }, []);

  // 🔥 MAPEO CORRECTO DEL COMPONENTE
  const mapItemToComponent = (it) => {
    const storeId =
      it?.store?.id ||
      it?.store?.data?.id ||
      (typeof it?.store === "number" ? it.store : null) ||
      null;

    const mapped = {
      producto: it.producto?.id || it.producto || null,
      nombre:
        it.producto?.nombre ||
        it.producto?.attributes?.nombre ||
        it.nombre ||
        "Sin nombre",
      precio_unitario: it.precio_unitario || 0,
      cantidad: it.cantidad || 1,
      subtotal:
        typeof it.subtotal === "number"
          ? it.subtotal
          : (it.precio_unitario || 0) * (it.cantidad || 1),
      envio: it.envio || 0,
      subtotal_volumetrico: it.subtotal_volumetrico || 0,
      esquema_impuestos: it.esquema_impuestos || "sin_iva",
      cp: it.cp || null,
      total:
        typeof it.total === "number"
          ? it.total
          : (typeof it.subtotal === "number" ? it.subtotal : 0) + (it.envio || 0),
      comisionStripe: it.comisionStripe || 0,
      comisionPlataforma: it.comisionPlataforma || 0,
      store: storeId,
      calificado: false,
      status: "pendiente",
    };
    console.log("cart y emojis - mapItemToComponent ->", mapped);
    return mapped;
  };

  const normalizeAttributesStore = (attributes, fallbackStore) => {
    if (!attributes || typeof attributes !== "object") {
      return { ...attributes, store: fallbackStore || { id: null, name: "Tienda sin nombre" } };
    }

    const rawStore = attributes.store || null;
    if (rawStore) {
      const flat = extractStore(rawStore);
      return { ...attributes, store: flat };
    }

    return { ...attributes, store: fallbackStore || { id: null, name: "Tienda sin nombre" } };
  };

  /**
   * Función principal para crear pedidos agrupados por tienda.
   */
  const handleCrearPedidos = async () => {
    console.log("cart y emojis - handleCrearPedidos iniciado");
    if (!isAuthenticated) {
      console.log("cart y emojis - usuario NO autenticado, redirigiendo a login");
      await loginWithRedirect({ appState: { returnTo: "/carrito/finalizar" } });
      return;
    }

    if (!selectedAddress) {
      alert("Selecciona una dirección primero.");
      return;
    }

    const tiendaEntries = Object.entries(porTienda);
    if (tiendaEntries.length === 0) {
      alert("No hay productos.");
      return;
    }

    setCreatingPedidos(true);

    try {
      // ----------------------------
      // CREAR / ACTUALIZAR CARRITO
      // ----------------------------
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

      console.log("cart y emojis - payload carrito:", carritoPayload);

      // Buscar carrito activo del usuario
      const carritoRes = await fetch(
        `${STRAPI}/api/carritos?filters[usuario_email][$eq]=${encodeURIComponent(
          user?.email || ""
        )}&filters[estado][$eq]=activo`
      );

      if (!carritoRes.ok) {
        const t = await carritoRes.text();
        console.error("cart y emojis - error buscando carrito:", t);
        throw new Error("Error buscando carrito");
      }

      const carritoJson = await carritoRes.json();
      console.log("cart y emojis - carrito encontrado (raw):", carritoJson);

      let carritoCreatedId = null;

      if (carritoJson?.data?.length > 0) {
        carritoCreatedId = carritoJson.data[0].id;
        console.log("cart y emojis - actualizando carrito id:", carritoCreatedId);

        const upd = await fetch(`${STRAPI}/api/carritos/${carritoCreatedId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(carritoPayload),
        });

        if (!upd.ok) {
          console.error("cart y emojis - error actualizando carrito:", await upd.text());
          throw new Error("Error actualizando carrito");
        }
      } else {
        console.log("cart y emojis - creando nuevo carrito");
        const newCarrito = await fetch(`${STRAPI}/api/carritos`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(carritoPayload),
        });

        if (!newCarrito.ok) {
          console.error("cart y emojis - error creando carrito:", await newCarrito.text());
          throw new Error("Error creando carrito");
        }

        const newJson = await newCarrito.json();
        carritoCreatedId = newJson?.data?.id;
        console.log("cart y emojis - carrito creado id:", carritoCreatedId, newJson);
      }

      setCarritoId(carritoCreatedId);

      // ----------------------------
      // CREAR PEDIDOS POR TIENDA
      // ----------------------------
      const pedidos = [];

      for (const [storeKey, storeGroup] of tiendaEntries) {
        try {
          const subtotal = storeGroup.items.reduce(
            (acc, i) => acc + (i.subtotal || 0),
            0
          );
          const envio = storeGroup.items.reduce((acc, i) => acc + (i.envio || 0), 0);

          const storeName = storeGroup.store?.name || storeKey;

          console.log(
            "cart y emojis - creando pedido para tienda:",
            storeName,
            { subtotal, envio, cantidadItems: storeGroup.items.length, storeGroupStore: storeGroup.store }
          );

          const payloadPedido = {
            data: {
              item: storeGroup.items.map(mapItemToComponent),
              tipo: "tienda",
              timestamp_creacion: new Date().toISOString(),
              monto_envio: envio,
              monto_total: subtotal + envio,
              status: "enviar",
              carrito_id: carritoCreatedId,
              direccion_destino: selectedAddress.id,
              metadata: { usuario_email: user?.email || "unknown" },
            },
          };

          console.log("cart y emojis - payloadPedido:", payloadPedido);

          const res = await fetch(`${STRAPI}/api/pedidos`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payloadPedido),
          });

          if (!res.ok) {
            const text = await res.text();
            console.error("cart y emojis - error creando pedido (strapi):", text);
            continue;
          }

          const created = await res.json();
          console.log("cart y emojis - respuesta pedido creado (raw):", created);

          const createdData = created?.data || null;
          let attributes = createdData?.attributes || {};
          attributes = normalizeAttributesStore(attributes, storeGroup.store);

          const normalized = {
            id: createdData?.id || null,
            attributes,
            pago:
              attributes?.pago ||
              attributes?.pago_id ||
              createdData?.pago ||
              null,
            _raw: created,
          };

          console.log("cart y emojis - pedido normalizado:", normalized);
          pedidos.push(normalized);
        } catch (innerErr) {
          console.error("cart y emojis - error creando pedido para una tienda:", innerErr);
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

    try {
      const resFetch = await fetch(
        `${process.env.REACT_APP_STRAPI_URL}/api/carritos?filters[usuario_email][$eq]=${encodeURIComponent(
          user.email
        )}&filters[estado][$eq]=activo`,
        {
          credentials: "include",
        }
      );
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
      const resPut = await fetch(
        `${process.env.REACT_APP_STRAPI_URL}/api/carritos/${carritoIdStrapi}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(payload),
        }
      );
      if (!resPut.ok) {
        const errText = await resPut.text();
        console.error("Error de Strapi:", errText);
        return;
      }
      clearCart();
    } catch (err) {
      console.error("Error en handleVaciarCarrito:", err);
    }


    
      console.log("cart y emojis - pedidos creados y normalizados:", pedidos);

      // Avanzar al paso de pagos si hay al menos 1 pedido creado
      if (pedidos.length > 0) {
        setActiveStep(1);
      } else {
        alert("No se pudieron crear pedidos. Revisa la consola para más detalles.");
      }
    } catch (err) {
      console.error("cart y emojis - Error general en handleCrearPedidos:", err);
      alert("Error creando pedidos. Revisa la consola.");
    } finally {
      setCreatingPedidos(false);
    }
  };

  /**
   * Comprueba si todos los pedidos ya tienen pago registrado.
   * Se soportan múltiples formas: pedido.pago, pedido.attributes.pago_id, etc.
   */
  const allPedidosPagados =
    pedidosCreados.length > 0 &&
    pedidosCreados.every((p) => {
      const hasRootPago = Boolean(p?.pago);
      const hasAttributesPago =
        Boolean(p?.attributes?.pago) ||
        Boolean(p?.attributes?.pago_id) ||
        Boolean(p?.attributes?.pagoId);
      return hasRootPago || hasAttributesPago;
    });

  console.log("cart y emojis - allPedidosPagados:", allPedidosPagados, "pedidosCreados:", pedidosCreados);

  /**
   * Finaliza pedidos: marca pagado en Strapi y cambia estado del carrito si aplica.
   */
  const handleFinalizar = async () => {
    console.log("cart y emojis - handleFinalizar iniciado");
    if (!allPedidosPagados) {
      alert("Faltan pagos.");
      return;
    }

    setFinalizing(true);

    try {
      for (const p of pedidosCreados) {
        if (!p?.id) {
          console.warn("cart y emojis - pedido sin id, se omite:", p);
          continue;
        }

        console.log("cart y emojis - marcando pedido como pagado, id:", p.id);

        const upd = await fetch(`${STRAPI}/api/pedidos/${p.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            data: {
              status: "enviar",
              fecha_pagado: new Date().toISOString(),
            },
          }),
        });

        if (!upd.ok) {
          console.error("cart y emojis - error actualizando pedido id:", p.id, await upd.text());
        } else {
          console.log("cart y emojis - pedido actualizado correctamente id:", p.id);
        }
      }

      if (carritoId) {
        console.log("cart y emojis - marcando carrito como pagado id:", carritoId);
        const updCar = await fetch(`${STRAPI}/api/carritos/${carritoId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            data: { estado: "pagado" },
          }),
        });

        if (!updCar.ok) {
          console.error("cart y emojis - error actualizando carrito:", await updCar.text());
        } else {
          console.log("cart y emojis - carrito actualizado a pagado:", carritoId);
        }
      }

      setActiveStep(2);
    } catch (err) {
      console.error("cart y emojis - error en handleFinalizar:", err);
      alert("Ocurrió un error al finalizar. Revisa la consola.");
    } finally {
      setFinalizing(false);
    }
  };

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
        {activeStep === 0 && (
          <motion.div key="dir" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Paper sx={{ p: 2 }}>
              <DireccionSelector onConfirm={handleConfirmAddress} />
            </Paper>
          </motion.div>
        )}

        {activeStep === 1 && (
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

        {activeStep === 2 && (
          <motion.div key="ok" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Paper sx={{ p: 4, textAlign: "center" }}>
              <Typography variant="h5">¡Pedido enviado!</Typography>
              <Button
                variant="contained"
                sx={{ mt: 2 }}
                onClick={() => {
                  console.log("cart y emojis - navegando a /mis-compras");
                  navigate("/mis-compras");
                }}
              >
                Ver mis compras
              </Button>
            </Paper>
          </motion.div>
        )}
      </AnimatePresence>

      <Box mt={3} display="flex" justifyContent="space-between">
        <Button disabled={activeStep === 0} onClick={() => setActiveStep((s) => s - 1)}>
          Volver
        </Button>

        {activeStep === 0 && (
          <Button
            variant="contained"
            onClick={handleCrearPedidos}
            disabled={!selectedAddress || creatingPedidos}
          >
            {creatingPedidos ? <CircularProgress size={18} /> : "Crear pedidos"}
          </Button>
        )}

        {activeStep === 1 && (
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
