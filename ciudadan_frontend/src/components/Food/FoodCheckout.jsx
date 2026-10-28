import React, { useEffect, useMemo, useState } from 'react';

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  Paper,
  Stack,
  Step,
  StepLabel,
  Stepper,
  Typography,
} from '@mui/material';

import {
  ArrowBack,
  ArrowForward,
  CheckCircleOutline,
} from '@mui/icons-material';

import { useNavigate } from 'react-router-dom';
import { useFoodCart } from '../../Contexts/FoodCartContext';
import { useRoles } from '../../Contexts/RolesContext';
import DireccionSelector from '../MarketPlace/DireccionSelector';
import useCotizacionesEnvio from '../../hooks/food/useCotizacionesEnvio';
import useAuth0Token from '../../hooks/useAuth0Token';
import FoodOpcionesEnvio from './FoodOpcionesEnvio';
import FoodCheckoutPago from './FoodCheckoutPago';
import FoodDeliveryContact from './FoodDeliveryContact';
import { useSnackbar } from 'notistack';
import { guardarDireccionEnvio } from '../../services/food/cotizacionesEnvioService';

const STRAPI_URL = process.env.REACT_APP_STRAPI_URL;

const STEPS = [
  'Dirección',
  'Datos de entrega',
  'Confirmar pedido',
  'Pagos',
  'Verificación',
];

const FoodCheckout = () => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  // Token Auth0 con la audience de la API (hook compartido del repo).
  const { getToken, tokenError } = useAuth0Token();
  const { userData } = useRoles();
  const {
    items = [],
    subtotal = 0,
    cartId,
    syncing: sincronizandoCarrito,
    clearCart,
  } = useFoodCart();

  /*
   * Tablero de cotizaciones de envío (MVP food-shipping): una sola llamada a
   * POST /api/food-shipping/cotizar devuelve las opciones por restaurante
   * (Ciudadan y Uber Direct) con precio, distancia y vigencia.
   */
  const {
    tablero,
    selecciones,
    cotizando: cotizandoEnvios,
    error: errorCotizacion,
    puedeContinuar,
    tic,
    cotizar,
    limpiarCotizaciones,
    seleccionarProveedor,
    getCotizacionesRestaurante,
    getCotizacionSeleccionada,
    seleccionVencida,
  } = useCotizacionesEnvio();

  const [activeStep, setActiveStep] = useState(0);
  const [direccionSeleccionada, setDireccionSeleccionada] = useState(null);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState('');
  const [ordenes, setOrdenes] = useState([]);
  const [guardandoDireccion, setGuardandoDireccion] = useState(false);
  const [todosLosPagosSubidos, setTodosLosPagosSubidos] = useState(false);
  const [datosEntrega, setDatosEntrega] = useState({ nombre: '', telefono: '', notas: '', });

  // Función para cambiar state de datos de entrega
  const handleDatosEntregaChange = (campo, valor) => {
    setDatosEntrega((prev) => ({
      ...prev,
      [campo]: valor,
    }));
  };

  const validarDatosEntrega = () => {
    const nombre = datosEntrega.nombre.trim();
    const telefono = datosEntrega.telefono.trim();

    if (!nombre) {
      enqueueSnackbar('Ingresa el nombre de quien recibirá el pedido.', { variant: 'warning' });
      return false;
    }

    if (!telefono) {
      enqueueSnackbar('Ingresa un número de teléfono para la entrega.', { variant: 'warning', });
      return false;
    }

    return true;
  };

  const handleContinuarDatosEntrega = () => {
    const datosEntregaValidados = validarDatosEntrega();
    if (datosEntregaValidados)
      setActiveStep(2);

  };

  /*
   * Agrupar productos por restaurante.
   */
  const restaurantes = useMemo(() => {
    const grupos = {};

    items.forEach((item) => {
      const restauranteId = item.restaurante?.id ?? item.restaurante?.data?.id ?? item.restaurante;

      if (!restauranteId) {
        return;
      }

      if (!grupos[restauranteId]) {
        grupos[restauranteId] = {
          id: restauranteId,
          nombre: item.restaurante?.nombre ?? item.restaurante?.data?.attributes?.nombre ?? item.restaurante_nombre ?? 'Restaurante',
          nombre_bancario: item?.restaurante?.nombre_bancario ?? item?.restaurante?.data?.attributes?.nombre_bancario ?? item.restaurante?.attributes?.nombre_bancario ?? '',
          clabe_bancaria: item?.restaurante?.clabe_bancaria ?? item?.restaurante?.data?.attributes?.clabe_bancaria ?? item?.restaurante?.attributes?.clabe_bancaria ?? '',
          banco: item?.restaurante?.banco ?? item?.restaurante?.data?.attributes?.banco ?? item?.restaurante?.attributes?.banco ?? '',
          direccion: item?.restaurante?.direccion?.data ?? null,
          items: [],
        };
      }
      grupos[restauranteId].items.push(item);
    });

    return Object.values(grupos);
  }, [items]);

  const calcularSubtotalRestaurante = (restaurantItems) => {
    return restaurantItems.reduce((total, item) => total + Number(item.subtotal || 0), 0);
  };

  /*
   * Registra la dirección de entrega elegida.
   *
   * Si la dirección es temporal (sin id, p.ej. "Usar sin guardar" del
   * DireccionSelector) se guarda primero como dirección del usuario: la
   * cotización se pide con `direccionDestinoId` (destino guardado preferido
   * del contrato) y la confirmación de la orden revalida `direccion_destino`
   * contra la cotización (si no coincide → 409 DESTINO_MODIFICADO).
   */
  const seleccionarDireccion = async (direccion) => {
    setError('');

    if (direccion?.id) {
      setDireccionSeleccionada(direccion);
      return;
    }

    try {
      setGuardandoDireccion(true);

      const data = await guardarDireccionEnvio(direccion);
      const id = data?.data?.id ?? null;

      if (!id) {
        throw new Error('La dirección de entrega no pudo guardarse.');
      }

      setDireccionSeleccionada({ ...direccion, id });
    } catch (err) {
      const mensaje = err?.message ?? 'No fue posible guardar la dirección de entrega.';
      setError(mensaje);
      enqueueSnackbar(mensaje, { variant: 'error' });
    } finally {
      setGuardandoDireccion(false);
    }
  };

  const continuarDireccion = () => {
    if (!direccionSeleccionada) {
      setError('Debes seleccionar una dirección de entrega.');
      return;
    }

    setError('');
    setActiveStep(1);
  };

  /*
   * Crear una food_order por restaurante.
   */
  const crearOrdenes = async () => {
    // Verificar que se haya seleccionado una dirección
    if (!direccionSeleccionada) {
      setError('No existe una dirección de entrega seleccionada.');
      return;
    }

    // Verificar que todos los restaurantes tengan una cotización seleccionada
    if (restaurantesSinCotizacion.length > 0) {
      const mensaje = `No fue posible calcular el envío de: ${restaurantesSinCotizacion.map((r) => r.nombre).join(', ')}. Vuelve al paso de dirección e inténtalo de nuevo.`;
      setError(mensaje);
      enqueueSnackbar(mensaje, { variant: 'error' });
      return;
    }

    // Las cotizaciones vencen (vigencia por defecto: 15 min).
    if (hayCotizacionVencida) {
      const mensaje = 'Una o más cotizaciones de envío vencieron. Vuelve a cotizar el envío.';
      setError(mensaje);
      enqueueSnackbar(mensaje, { variant: 'warning' });
      return;
    }

    try {
      setProcesando(true);
      setError('');

      const nuevasOrdenes = [];

      for (const restaurante of restaurantes) {
        const subtotalRestaurante = calcularSubtotalRestaurante(restaurante.items);

        const cotizacion = getCotizacionSeleccionada(restaurante.id);

        if (!cotizacion?.cotizacionId) {
          throw new Error(`No existe una cotización de envío para ${restaurante.nombre}.`);
        }

        const envioRestaurante = Number(cotizacion.importe);

        if (!Number.isFinite(envioRestaurante)) {
          throw new Error(`La cotización de envío de ${restaurante.nombre} no tiene un importe válido.`);
        }

        const totalRestaurante = Number((subtotalRestaurante + envioRestaurante).toFixed(2));
        /*
         * IMPORTANTE:
         * El importe de envío que viaja aquí es solo un preview: el backend
         * revalida la cotización, la consume atómicamente y sobrescribe
         * monto_envio/monto_total con el importe autoritativo (lifecycle
         * beforeCreate de food-order). El precio del cliente no manda.
         */
        const payload = {
          data: {
            items: restaurante.items.map((item) => ({
              product: item.producto?.id ?? item.producto,
              restaurant: restaurante.id,
              nombre: item.nombre,
              precio_unitario: item.precio_unitario,
              nombre_variante: item.nombre_variante ?? null,
              variant: item.variante?.id ?? item.variante ?? null,
              cantidad: item.cantidad,
              subtotal: item.subtotal,
              modifiers: item?.modificadores ?? [],
              metadata: item.metadata ?? {},
            })),
            fecha_creacion: new Date().toISOString(),
            user: userData?.id,
            direccion_destino: direccionSeleccionada?.id ?? null,
            direccion_origen: restaurante?.direccion?.id ?? null,
            monto_envio: envioRestaurante,
            monto_total: totalRestaurante,
            moneda: 'MXN',
            status: 'pendiente_pago',
            finalizado: false,
            calificado: false,
            metadata: {
              origen: 'food_cart',
              food_cart_item_keys: restaurante.items.map((item) => item.item_key),
              user_email: userData?.email,
              /*
               * Cotización de envío seleccionada (MVP food-shipping): solo
               * viaja el código opaco de la cotización elegida. El backend
               * revalida (vigencia, huella del carrito, destino,
               * disponibilidad), consume la cotización y deja
               * metadata.cotizacion_envio_confirmada con el importe real.
               */
              cotizacion_envio: {
                codigo: cotizacion.cotizacionId,
              },
            },
            restaurant: restaurante.id,
            fecha_verificado: null,
            delivery_contact_name: datosEntrega.nombre.trim(),
            delivery_contact_phone: datosEntrega.telefono.trim(),
            delivery_notes: datosEntrega.notas.trim() || null,
          },
        };

        const response = await fetch(`${STRAPI_URL}/api/food-orders`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          }
        );

        if (!response.ok) {
          const responseData = await response.json().catch(() => null);
          const errorOrden = new Error(
            responseData?.error?.message || `No se pudo crear la orden de ${restaurante.nombre}`
          );
          errorOrden.status = response.status;
          throw errorOrden;
        }

        const data = await response.json();

        nuevasOrdenes.push({
          ...data.data,
          restaurante: {
            id: restaurante.id,
            nombre: restaurante.nombre,
            nombre_bancario: restaurante?.nombre_bancario,
            clabe_bancaria: restaurante?.clabe_bancaria,
            banco: restaurante?.banco,
            direccion: restaurante?.direccion,
          },
        });
      }

      setOrdenes(nuevasOrdenes);

      /*
       * El carrito se convierte en órdenes.
       */
      await clearCart();

      setActiveStep(3);
    } catch (err) {
      console.error('Error creando food_orders:', err);

      const mensaje = err?.message ?? 'No fue posible crear las órdenes.';
      setError(mensaje);

      /*
       * 409 (COTIZACION_EXPIRADA, COTIZACION_YA_USADA, CARRITO_MODIFICADO,
       * DESTINO_MODIFICADO, SIN_REPARTIDORES): la cotización ya no es válida.
       * Se vuelve al paso de dirección para volver a cotizar con el mensaje
       * del servidor (docs/FOOD-COTIZACIONES-ENVIO-MVP.md §4).
       */
      if (err?.status === 409) {
        enqueueSnackbar(mensaje, { variant: 'warning' });
        limpiarCotizaciones();
        setActiveStep(0);
      } else {
        enqueueSnackbar(mensaje, { variant: 'error' });
      }
    } finally {
      setProcesando(false);
    }
  };

  /**
   * Costo de envío de un restaurante: importe de la cotización de envío
   * seleccionada (Ciudadan o Uber Direct). null si no hay selección válida
   * y disponible.
  */
  const obtenerCostoEnvio = (restaurantId) => {
    const cotizacion = getCotizacionSeleccionada(restaurantId);

    if (!cotizacion?.disponible) return null;

    const importe = Number(cotizacion.importe);

    if (!Number.isFinite(importe)) return null;

    return importe;
  };

  const subirComprobante = async ({ orden, ordenId, file }) => {

    console.log("Subiendo archivo SIN ref", {
      archivoName: file?.name,
      archivoType: file?.type,
      archivoSize: file?.size,
    });

    try {
      // ---------------- 1) Reusar pago existente si lo hay ----------------
      let pagoId = orden?.pago ?? orden?.attributes?.pago ?? orden?.attributes?.pago_id ?? null;
      const restaurant = orden?.restaurante ?? orden?.restaurant ?? orden?.attributes?.restaurant ?? {
        name: "Tienda sin nombre",
        banco: "—",
        clabe_bancaria: "—",
        nombre_bancario: "—",
      };
      if (pagoId) {
        console.log("cart y emojis - reutilizando pago existente:", pagoId);
      } else {
        // ---------------- 2) Crear el recurso 'pago' en Strapi ----------------
        const montoNumeric = Number(orden?.attributes?.monto_total ?? orden?.attributes?.monto ?? orden?.attributes?.total ?? 0);

        const formPedido = new FormData();

        const pagoPayload = {
          tipo: "comida",
          fecha_pagado: new Date().toISOString(),
          usuario: userData?.id,
          monto: montoNumeric,
          status: "pendiente_verificacion",
          food_order: ordenId,
          usuario_email: userData?.email,
          food_restaurant: restaurant?.id,
        };

        console.log("cart y emojis - creando pago, payload:", pagoPayload);

        formPedido.append("data", JSON.stringify(pagoPayload));
        formPedido.append("files.comprobante", file);
        const pagoRes = await fetch(`${STRAPI_URL}/api/pagos`, {
          method: "POST",
          body: formPedido,
        });

        if (!pagoRes.ok) {
          throw new Error(
            `Error creando pago: ${pagoRes.status} ${pagoRes.statusText}`
          );
        }

        const pagoJson = await pagoRes.json();
        console.log("cart y emojis - pago creado (raw):", pagoJson);

        pagoId = pagoJson?.data;
        if (!pagoId) {
          console.error("cart y emojis - pago creado sin id:", pagoJson);
          throw new Error("Respuesta inválida al crear pago (sin id).");
        }
        // setPagoIdState(pagoId);
      }

      // ---------------- 3) Actualizar pedido asociando pago_id y status ----------------
      const pedidoUpdatePayload = {
        data: {
          pago: pagoId?.id,
          fecha_pagado: new Date().toISOString(),
          status: "pendiente_verificacion",
        },
      };

      console.log("cart y emojis - actualizando pedido:", orden?.id, pedidoUpdatePayload);

      const pedidoRes = await fetch(`${STRAPI_URL}/api/food-orders/${orden.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(pedidoUpdatePayload),
      });

      if (!pedidoRes.ok) {
        throw new Error(
          `Error actualizando pedido: ${pedidoRes.status} ${pedidoRes.statusText}`
        );
      }

      const pedidoUpdatedJson = await pedidoRes.json();
      console.log("cart y emojis - pedido actualizado (raw):", pedidoUpdatedJson);

      return pagoId;
    } catch (err) {
      console.error("cart y emojis - Hubo un error en handleSubirComprobante:", err);
      setError(
        "Hubo un problema al subir el comprobante. Intenta de nuevo. " +
        (err?.message ? `Detalle: ${err.message}` : "")
      );
    } finally {
      console.log("cart y emojis - handleSubirComprobante finalizado, limpiando estado subiendo");
    }
  };

  const totalEnviosCotizados = useMemo(() => {
    return restaurantes.reduce((total, restaurante) => {
      const envio = obtenerCostoEnvio(restaurante.id);

      if (envio == null) {
        return total;
      }

      return total + envio;
    }, 0);
  }, [restaurantes, tablero, selecciones]);

  const totalCheckout = useMemo(() => {
    return Number((Number(subtotal ?? 0) + Number(totalEnviosCotizados ?? 0)).toFixed(2));
  }, [subtotal, totalEnviosCotizados,]);

  /*
   * Restaurantes sin una cotización de envío seleccionada y disponible.
   * Si la lista no está vacía, no se permite crear las órdenes.
   */
  const restaurantesSinCotizacion = useMemo(() => {
    return restaurantes.filter((restaurante) => obtenerCostoEnvio(restaurante.id) == null);
  }, [restaurantes, tablero, selecciones]);

  const cotizacionIncompleta = restaurantesSinCotizacion.length > 0;

  /*
   * Alguna cotización seleccionada ya venció (vigencia por defecto: 15 min):
   * hay que volver a cotizar antes de confirmar.
   *
   * `tic` (reloj del hook, cambia cada 30 s) entra como dependencia para que la
   * caducidad se detecte sola, aunque el usuario no toque nada.
   */
  const hayCotizacionVencida = useMemo(() => {
    return restaurantes.some((restaurante) => seleccionVencida(restaurante.id));
  }, [restaurantes, tablero, selecciones, tic]);

  /*
   * Mostrar snackbar cuando falle la cotización de envío.
   */
  useEffect(() => {
    if (errorCotizacion) {
      enqueueSnackbar(errorCotizacion, { variant: 'error' });
    }
  }, [errorCotizacion, enqueueSnackbar]);

  /*
   * Huella del carrito (item_key:cantidad): dependencia estable del efecto de
   * cotización para volver a cotizar SOLO cuando cambia el contenido del
   * carrito (la re-cotización invalida en servidor las cotizaciones activas
   * previas del mismo carrito).
   */
  const huellaCarrito = useMemo(() => {
    return items
      .map((item) => `${item.item_key ?? item.producto}:${item.cantidad ?? 0}`)
      .sort()
      .join('|');
  }, [items]);

  /*
   * Cotizar el envío del carrito hacia la dirección de entrega seleccionada.
   *
   * Se vuelve a cotizar cuando cambia la dirección, el contenido del carrito
   * (huella) o cuando el carrito termina de sincronizarse con Strapi
   * (cartId): el endpoint resuelve TODO en servidor a partir de
   * { foodCartId, direccionDestinoId } y no acepta listas de restaurantes del
   * cliente.
   *
   * La petición se hace con un pequeño retardo (debounce) y se espera a que
   * el carrito termine de sincronizarse: la cotización se calcula sobre el
   * carrito que vive en Strapi y la confirmación de la orden revalida la
   * huella del carrito (si se cotiza antes de que el servidor guarde el
   * cambio, el servidor responde 409 CARRITO_MODIFICADO).
   */
  useEffect(() => {
    if (!direccionSeleccionada || items.length === 0 || !cartId) {
      limpiarCotizaciones();
      return;
    }

    // El carrito se está sincronizando: la cotización se hará al terminar.
    if (sincronizandoCarrito) {
      return;
    }

    /*
     * Las cotizaciones anteriores quedan obsoletas (cambió la dirección o el
     * carrito): se limpian para que no se pueda confirmar con un precio
     * vencido. El backend invalida del mismo modo las cotizaciones activas
     * previas del mismo carrito al volver a cotizar.
     */
    limpiarCotizaciones();

    let cancelado = false;

    const temporizador = setTimeout(async () => {
      const token = await getToken();

      if (cancelado) {
        return;
      }

      if (!token) {
        const mensaje =
          'No fue posible validar tu sesión para cotizar el envío. Vuelve a iniciar sesión.';
        setError(mensaje);
        enqueueSnackbar(mensaje, { variant: 'warning' });
        return;
      }

      try {
        await cotizar(
          {
            foodCartId: cartId,
            direccionDestinoId: direccionSeleccionada.id ?? null,
            // Respaldo: destino inline si la dirección no llegó a guardarse.
            direccionDestino: direccionSeleccionada.id ? null : direccionSeleccionada,
          },
          token
        );
      } catch (err) {
        if (cancelado) {
          return;
        }

        // El mensaje ya viaja en `errorCotizacion` (el hook lo expone y la UI
        // lo muestra); aquí solo se deja la traza para depurar.
        console.error('Error cotizando envíos:', err);
      }
    }, 800);

    return () => {
      cancelado = true;
      clearTimeout(temporizador);
    };
  }, [
    direccionSeleccionada,
    cartId,
    huellaCarrito,
    items.length,
    sincronizandoCarrito,
    cotizar,
    limpiarCotizaciones,
    getToken,
  ]);

  /*
   * Re-cotiza con la dirección y el carrito actuales (p.ej. cuando la
   * cotización seleccionada ya venció o cuando la petición falló).
   */
  const volverACotizar = async () => {
    const token = await getToken();

    if (!token) {
      const mensaje =
        'No fue posible validar tu sesión para cotizar el envío. Vuelve a iniciar sesión.';
      setError(mensaje);
      enqueueSnackbar(mensaje, { variant: 'warning' });
      return;
    }

    try {
      await cotizar(
        {
          foodCartId: cartId,
          direccionDestinoId: direccionSeleccionada?.id ?? null,
          direccionDestino: direccionSeleccionada?.id ? null : direccionSeleccionada,
        },
        token
      );
    } catch (err) {
      // El mensaje se muestra desde `errorCotizacion` (Alert + snackbar).
      console.error('Error volviendo a cotizar el envío:', err);
    }
  };

  /*
   * Si no hay productos.
   */
  if (!items.length && activeStep === 0) {
    return (
      <Box
        sx={{
          maxWidth: 700,
          mx: 'auto',
          px: 2,
          py: 8,
          textAlign: 'center',
        }}
      >
        <Typography
          variant="h5"
          fontWeight={700}
          gutterBottom
        >
          No hay productos para comprar
        </Typography>

        <Button
          variant="contained"
          onClick={() =>
            navigate('/carrito')
          }
        >
          Regresar al carrito
        </Button>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        maxWidth: 1100,
        mx: 'auto',
        px: { xs: 1.5, sm: 2, md: 3 },
        py: 3,
      }}
    >
      <Typography variant="h4" fontWeight={800} sx={{ mb: 4 }} >
        Finalizar compra
      </Typography>

      <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 5 }} >
        {STEPS.map((label) => (
          <Step key={label}>
            <StepLabel>
              {label}
            </StepLabel>
          </Step>
        ))}
      </Stepper>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} >
          {error}
        </Alert>
      )}

      {tokenError && (
        <Alert severity="warning" sx={{ mb: 3 }} >
          {tokenError}
        </Alert>
      )}

      {activeStep === 2 && errorCotizacion && (
        <Alert
          severity="error"
          sx={{ mb: 3 }}
          action={
            <Button
              color="inherit"
              size="small"
              disabled={cotizandoEnvios}
              onClick={volverACotizar}
            >
              Reintentar
            </Button>
          }
        >
          {errorCotizacion}
        </Alert>
      )}

      {activeStep === 2 && !cotizandoEnvios && !errorCotizacion && cotizacionIncompleta && (
        <Alert severity="warning" sx={{ mb: 3 }} >
          No fue posible calcular el envío de: {restaurantesSinCotizacion.map((r) => r.nombre).join(', ')}.
          Regresa al paso de dirección para volver a cotizar.
        </Alert>
      )}

      {activeStep === 2 && tablero && !puedeContinuar && (
        <Alert severity="warning" sx={{ mb: 3 }} >
          No hay servicio de envío disponible para uno o más restaurantes del pedido.
          Cambia la dirección de entrega o vuelve a cotizar.
        </Alert>
      )}

      {activeStep === 2 && hayCotizacionVencida && (
        <Alert severity="warning" sx={{ mb: 3 }} >
          Una o más cotizaciones de envío ya vencieron (vigencia de 15 minutos).
          Vuelve a cotizar para continuar con el pedido.
        </Alert>
      )}

      {/* PASO 1 */}
      {activeStep === 0 && (
        <Box>
          <Typography variant="h6" fontWeight={800} sx={{ mb: 2 }} >
            Dirección de entrega
          </Typography>
          <Paper
            variant="outlined"
            sx={{ p: 3, borderRadius: 3, }}
          >
            {/* <Typography color="text.secondary" sx={{ mb: 2 }}>
              Aquí se mostrará el selector de direcciones del usuario.
            </Typography>
            <Button variant="outlined" onClick={() => seleccionarDireccion({ id: 1 })}>
              Usar dirección de ejemplo
            </Button> */}
            <DireccionSelector onConfirm={seleccionarDireccion} />
          </Paper>

          <Stack
            direction="row"
            justifyContent="flex-end"
            sx={{ mt: 3 }}
          >
            <Button
              variant="contained"
              endIcon={<ArrowForward />}
              disabled={guardandoDireccion}
              onClick={continuarDireccion}
            >
              {guardandoDireccion ? 'Guardando dirección...' : 'Continuar'}
            </Button>
          </Stack>
        </Box>
      )}
      {/** PASO 2 */}
      {activeStep === 1 && (
        <Box>
          <FoodDeliveryContact
            nombre={datosEntrega?.nombre}
            telefono={datosEntrega?.telefono}
            notas={datosEntrega?.notas}
            onChange={handleDatosEntregaChange}
          />
          <Stack direction="row" justifyContent="flex-end" sx={{ mt: 3 }} >
            <Button
              variant="contained"
              onClick={() => handleContinuarDatosEntrega()}
            >
              Continuar
            </Button>
          </Stack>
        </Box>
      )}

      {/* PASO 3 */}
      {activeStep === 2 && (
        <Box>
          <Typography variant="h6" fontWeight={800} sx={{ mb: 2 }} >
            Confirmar pedido
          </Typography>

          <Stack spacing={2}>
            {restaurantes.map((restaurante) => {
              const subtotalRestaurante = calcularSubtotalRestaurante(restaurante.items);

              return (
                <Card key={restaurante.id} variant="outlined" sx={{ borderRadius: 3, }}>
                  <CardContent>
                    <Typography fontWeight={800} variant="h6">
                      {restaurante.nombre}
                    </Typography>

                    <Stack spacing={1} sx={{ mt: 2 }}>
                      {restaurante.items.map((item) => (
                        <Stack key={item.item_key} direction="row" justifyContent="space-between">
                          <Typography>
                            {item.cantidad} ×{' '}{item.nombre}
                          </Typography>

                          <Typography fontWeight={600}>
                            ${Number(item.subtotal || 0).toFixed(2)}
                          </Typography>
                        </Stack>
                      )
                      )}
                    </Stack>

                    <Divider sx={{ my: 2 }} />

                    <Stack direction="row" justifyContent="space-between">
                      <Typography fontWeight={700}>
                        Subtotal
                      </Typography>

                      <Typography fontWeight={800}>
                        ${subtotalRestaurante.toFixed(2)}
                      </Typography>
                    </Stack>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography color="text.secondary">
                        Envío
                      </Typography>

                      {
                        cotizandoEnvios ? (
                          <Stack direction="row" spacing={1} alignItems="center">
                            <CircularProgress size={16} />
                            <Typography variant="body2" color="text.secondary">
                              Cotizando...
                            </Typography>
                          </Stack>
                        ) : obtenerCostoEnvio(restaurante.id) != null ? (
                          <Typography fontWeight={700}>
                            ${obtenerCostoEnvio(restaurante.id).toFixed(2)}
                          </Typography>
                        ) : (
                          <Typography color="text.secondary">
                            No disponible
                          </Typography>
                        )
                      }
                    </Stack>

                    {/*
                      Opciones de envío del restaurante (Ciudadan / Uber Direct):
                      precio, distancia y vigencia; el usuario elige una y el
                      total se recalcula con el importe seleccionado.
                    */}
                    <Box sx={{ mt: 2 }}>
                      <FoodOpcionesEnvio
                        cotizaciones={getCotizacionesRestaurante(restaurante.id)?.cotizaciones}
                        proveedorSeleccionado={selecciones[String(restaurante.id)] ?? null}
                        onSeleccionar={(proveedor) => seleccionarProveedor(restaurante.id, proveedor)}
                        vencida={seleccionVencida(restaurante.id)}
                      />
                    </Box>
                  </CardContent>
                </Card>
              );
            }
            )}
          </Stack>

          <Card variant="outlined" sx={{ mt: 3, borderRadius: 3, }}>
            <CardContent>
              <Stack spacing={1}>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                >
                  <Typography>
                    Productos
                  </Typography>
                  <Typography>
                    ${Number(subtotal).toFixed(2)}
                  </Typography>
                </Stack>

                <Stack
                  direction="row"
                  justifyContent="space-between"
                >
                  <Typography>
                    Envío
                  </Typography>

                  {
                    cotizandoEnvios ? (
                      <Stack direction="row" spacing={1} alignItems="center">
                        <CircularProgress size={16} />
                        <Typography variant="body2" color="text.secondary">
                          Calculando...
                        </Typography>
                      </Stack>
                    ) : (
                      <Typography>
                        ${totalEnviosCotizados.toFixed(2)}
                      </Typography>
                    )
                  }
                </Stack>

                <Divider />

                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="h6" fontWeight={800}>
                    Total
                  </Typography>
                  <Typography variant="h6" fontWeight={800}>
                    ${totalCheckout.toFixed(2)}
                  </Typography>
                </Stack>
              </Stack>
            </CardContent>
          </Card>

          <Stack
            direction="row"
            justifyContent="space-between"
            sx={{ mt: 3 }}
          >
            <Button
              startIcon={<ArrowBack />}
              onClick={() =>
                setActiveStep(0)
              }
            >
              Regresar
            </Button>

            {(hayCotizacionVencida || errorCotizacion) && (
              <Button
                variant="outlined"
                disabled={cotizandoEnvios}
                onClick={volverACotizar}
              >
                Volver a cotizar
              </Button>
            )}

            <Button
              variant="contained"
              endIcon={
                procesando ? (
                  <CircularProgress size={18} color="inherit" />
                ) : (
                  <ArrowForward />
                )
              }
              disabled={procesando || cotizandoEnvios || cotizacionIncompleta || hayCotizacionVencida || !puedeContinuar}
              onClick={crearOrdenes}
            >
              {procesando
                ? 'Creando órdenes...'
                : cotizandoEnvios
                  ? 'Cotizando envío...'
                  : hayCotizacionVencida
                    ? 'Cotización vencida'
                    : !tablero && !errorCotizacion
                      ? 'Calculando envío...'
                      : cotizacionIncompleta
                        ? 'Envío no disponible'
                        : 'Confirmar pedido'}
            </Button>
          </Stack>
        </Box>
      )}

      {/* PASO 4 */}
      {activeStep === 3 && (
        <Box>
          {/* <Typography variant="h6" fontWeight={800} sx={{ mb: 2 }}>
            Realizar pagos
          </Typography>

          <Alert
            severity="info"
            sx={{ mb: 3 }}
          >
            Como tu pedido contiene productos de
            diferentes restaurantes, debes realizar
            un pago independiente para cada uno.
          </Alert>

          <Stack spacing={2}>
            {ordenes.map((orden) => (
              <Card
                key={orden.id}
                variant="outlined"
                sx={{
                  borderRadius: 3,
                }}
              >
                <CardContent>
                  <Typography
                    variant="h6"
                    fontWeight={800}
                  >
                    {orden.restaurante?.nombre}
                  </Typography>

                  <Typography
                    color="text.secondary"
                    sx={{ mt: 1 }}
                  >
                    Orden #{orden.id}
                  </Typography>

                  <Typography
                    variant="h5"
                    fontWeight={800}
                    sx={{ mt: 2 }}
                  >
                    $
                    {Number(
                      orden.attributes
                        ?.monto_total ||
                      0
                    ).toFixed(2)}
                  </Typography>

                  <Divider
                    sx={{ my: 2 }}
                  />

                  <Typography
                    variant="body2"
                    color="text.secondary"
                  >
                    Aquí mostraremos los datos
                    bancarios del restaurante y el
                    formulario para subir el
                    comprobante.
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </Stack> */}
          <FoodCheckoutPago
            ordenes={ordenes}
            subirComprobante={subirComprobante}
            onTodosLosPagosSubidos={setTodosLosPagosSubidos}
          />
          <Stack direction="row" justifyContent="flex-end" sx={{ mt: 3 }}>
            <Button
              variant="contained"
              disabled={!todosLosPagosSubidos}
              onClick={() =>
                setActiveStep(4)
              }
            >
              Continuar
            </Button>
          </Stack>
        </Box>
      )}

      {/* PASO 5 */}
      {activeStep === 4 && (
        <Box sx={{ maxWidth: 650, mx: 'auto', textAlign: 'center', py: 5, }} >
          <CheckCircleOutline sx={{ fontSize: 80, mb: 2, }} />
          <Typography variant="h5" fontWeight={800} gutterBottom >
            Pagos enviados
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }} >
            Los restaurantes recibirán tus comprobantes y verificarán cada pago.
            Cada restaurante será responsable de procesar y enviar su propia orden.
          </Typography>

          <Button
            variant="contained"
            onClick={() => navigate('/compras/ordenes-comida')}
          >
            Ver mis pedidos
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default FoodCheckout;