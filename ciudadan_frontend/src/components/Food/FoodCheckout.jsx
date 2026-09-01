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
import useUberDirect from '../../hooks/food/useUberDirect';
import FoodCheckoutPago from './FoodCheckoutPago';

const STRAPI_URL = process.env.REACT_APP_STRAPI_URL;

const STEPS = [
  'Dirección',
  'Confirmar pedido',
  'Pagos',
  'Verificación',
];

const FoodCheckout = () => {
  const navigate = useNavigate();
  const { userData } = useRoles();
  const {
    items = [],
    subtotal = 0,
    clearCart,
  } = useFoodCart();

  const {
    quotes,
    loading: uberLoading,
    error: uberError,
    getQuotes,
    getRestaurantQuote,
    getRestaurantFee,
    clearQuotes
  } = useUberDirect();

  const [activeStep, setActiveStep] = useState(0);
  const [direccionSeleccionada, setDireccionSeleccionada] = useState(null);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState('');
  const [ordenes, setOrdenes] = useState([]);
  const [cotizandoEnvios, setCotizandoEnvios] = useState(false);
  const [errorCotizacion, setErrorCotizacion] = useState('');
  const [todosLosPagosSubidos, setTodosLosPagosSubidos] = useState(false);
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
   * Por ahora esta función puede conectarse posteriormente con tu componente real de direcciones.
   */
  const seleccionarDireccion = (direccion) => {
    setDireccionSeleccionada(direccion);
    setError('');
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

    // Verificar que todos los restaurantes tengan una cotización
    const restaurantesSinQuote = restaurantes.filter((restaurante) => obtenerCostoEnvio(restaurante.id) == null);

    if (restaurantesSinQuote.length > 0) {
      setError(`No fue posible calcular el envío de: ${restaurantesSinQuote.map((r) => r.nombre).join(', ')}.`);
      return;
    }

    try {
      setProcesando(true);
      setError('');

      const nuevasOrdenes = [];

      for (const restaurante of restaurantes) {
        const subtotalRestaurante = calcularSubtotalRestaurante(restaurante.items);

        const envioRestaurante = obtenerCostoEnvio(restaurante.id);

        if (envioRestaurante == null) {
          throw new Error(`No existe una cotización de envío para ${restaurante.nombre}.`);
        }

        const totalRestaurante = Number((subtotalRestaurante + envioRestaurante).toFixed(2));
        /*
         * IMPORTANTE:
         * Aquí NO estamos repartiendo todavía el envío automáticamente.
         * Primero necesitamos definir la lógica exacta de envío por restaurante.
         */
        const quote = getRestaurantQuote(restaurante?.id);
        const payload = {
          data: {
            items: restaurante.items.map((item) => ({
              producto: item.producto?.id ?? item.producto,
              variante: item.variante?.id ?? item.variante ?? null,
              nombre: item.nombre,
              nombre_variante: item.nombre_variante ?? null,
              precio_unitario: item.precio_unitario,
              cantidad: item.cantidad,
              subtotal: item.subtotal,
              modificadores: item.modificadores ?? [],
              metadata: item.metadata ?? {},
            })),
            fecha_creacion: new Date().toISOString(),
            user: userData?.id,
            direccion_destino: direccionSeleccionada?.id ?? null,
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
               * Información de Uber Direct.
               */
              uber_direct: {
                quote_id: quote?.id ?? null,
                expires: quote?.expires ?? null,
                fee: quote?.quote?.fee ?? null,
                currency: quote?.quote?.currency ?? 'MXN',
                pickup: quote?.coordinates?.pickup ?? null,
                dropoff: quote?.coordinates?.dropoff ?? null,
                mock: Boolean(quote?.mock),

              },
            },
            restaurant: restaurante.id,
            fecha_verificado: null,
          },
        };

        const response = await fetch(`${STRAPI_URL}/api/food-orders`,
          {
            method: 'POST',
            headers: {
              'Content-Type':
                'application/json',
            },
            body: JSON.stringify(payload),
          }
        );

        if (!response.ok) {
          const responseData = await response.json().catch(() => null);
          throw new Error(responseData?.error?.message || `No se pudo crear la orden de ${restaurante.nombre}`);
        }

        const data = await response.json();

        nuevasOrdenes.push({
          ...data.data,
          restaurante: {
            id: restaurante.id,
            nombre: restaurante.nombre,
          },
        });
      }

      setOrdenes(nuevasOrdenes);

      /*
       * El carrito se convierte en órdenes.
       */
      await clearCart();

      setActiveStep(2);
    } catch (err) {
      console.error('Error creando food_orders:', err);
      setError(err.message ?? 'No fue posible crear las órdenes.');
    } finally {
      setProcesando(false);
    }
  };

  /**
   * Obtener costo de envío
  */
  const obtenerCostoEnvio = (restaurantId) => {
    const quote = getRestaurantQuote(restaurantId);

    if (!quote) return null;

    const fee = Number(quote?.quote?.fee);

    if (!Number.isFinite(fee)) return null;

    return fee;
  };

  /**
   * Obtener Envío por restaurante
  */
  const obtenerEnvioRestaurante = (restaurantId) => {
    return (obtenerCostoEnvio(restaurantId) ?? 0);
  };

  const subirComprobante = async ({
    orden,
    ordenId,
    file,
  }) => {

    console.log("Subiendo archivo SIN ref", {
      archivoName: file?.name,
      archivoType: file?.type,
      archivoSize: file?.size,
    });

    try {
      // ---------------- 1) Reusar pago existente si lo hay ----------------
      let pagoId = orden?.pago ?? orden?.attributes?.pago ?? orden?.attributes?.pago_id ?? null;
      const restaurant = orden?.restaurant ?? orden?.attributes?.restaurant ?? {
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
          food_order: orden.id,
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
          const errBody = await parseResponse(pagoRes);
          console.groupCollapsed("cart y emojis - ERROR creando pago (detalle)");
          console.warn("cart y emojis - status:", pagoRes.status, pagoRes.statusText);
          console.warn("cart y emojis - headers:", Array.from(pagoRes.headers.entries()));
          console.warn("cart y emojis - body:", errBody);
          console.groupEnd();
          throw new Error(
            `Error creando pago: ${pagoRes.status} ${pagoRes.statusText} — ${JSON.stringify(
              errBody
            )}`
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
        const pedidoBody = await parseResponse(pedidoRes);
        console.groupCollapsed("cart y emojis - ERROR actualizando pedido (detalle)");
        console.warn("cart y emojis - status:", pedidoRes.status, pedidoRes.statusText);
        console.warn("cart y emojis - headers:", Array.from(pedidoRes.headers.entries()));
        console.warn("cart y emojis - body:", pedidoBody);
        console.groupEnd();
        throw new Error(
          `Error actualizando pedido: ${pedidoRes.status} ${pedidoRes.statusText} — ${JSON.stringify(
            pedidoBody
          )}`
        );
      }

      const pedidoUpdatedJson = await pedidoRes.json();
      console.log("cart y emojis - pedido actualizado (raw):", pedidoUpdatedJson);
    } catch (err) {
      console.error("cart y emojis - Hubo un error en handleSubirComprobante:", err);
      setError(
        "Hubo un problema al subir el comprobante. Intenta de nuevo. " +
        (err?.message ? `Detalle: ${err.message}` : "")
      );
    } finally {
      console.log("cart y emojis - handleSubirComprobante finalizado, limpiando estado subiendo");
      setSubiendo(false);
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
  }, [restaurantes, quotes]);

  const totalCheckout = useMemo(() => {
    return Number((Number(subtotal ?? 0) + Number(totalEnviosCotizados ?? 0)).toFixed(2));
  }, [subtotal, totalEnviosCotizados,]);

  useEffect(() => {
    if (!direccionSeleccionada || restaurantes.length === 0) {
      clearQuotes();
      return;
    }

    let cancelled = false;

    const cotizarEnvios = async () => {
      setCotizandoEnvios(true);
      setErrorCotizacion('');

      try {
        const restaurantesUber = restaurantes.map((restaurante) => ({
          restaurantId: restaurante.id,
          restaurantName: restaurante.nombre,
        }));

        /*
         * Si la dirección está guardada usamos su ID.
         * Si es una dirección temporal creada desde DirecciónSelector, id será null y enviamos directamente el objeto de dirección.
         */
        const resultado = await getQuotes({
          restaurants: restaurantesUber,
          direccionDestinoId: direccionSeleccionada.id ?? null,
          direccionDestino: direccionSeleccionada.id ? null : direccionSeleccionada,
        });

        if (cancelled) {
          return;
        }

        console.log('Cotizaciones Uber Direct:', resultado);
      } catch (err) {
        if (cancelled) {
          return;
        }

        console.error('Error cotizando envíos:', err);

        setErrorCotizacion(err?.message ?? 'No fue posible calcular los envíos.');
      } finally {
        if (!cancelled) {
          setCotizandoEnvios(false);
        }
      }
    };

    cotizarEnvios();

    return () => {
      cancelled = true;
    };
  }, [direccionSeleccionada, restaurantes, getQuotes, clearQuotes]);

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
            navigate('/comida-carrito')
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

      <Stepper
        activeStep={activeStep}
        alternativeLabel
        sx={{ mb: 5 }}
      >
        {STEPS.map((label) => (
          <Step key={label}>
            <StepLabel>
              {label}
            </StepLabel>
          </Step>
        ))}
      </Stepper>

      {error && (
        <Alert
          severity="error"
          sx={{ mb: 3 }}
        >
          {error}
        </Alert>
      )}

      {/* PASO 1 */}
      {activeStep === 0 && (
        <Box>
          <Typography
            variant="h6"
            fontWeight={800}
            sx={{ mb: 2 }}
          >
            Dirección de entrega
          </Typography>

          {/*
           * Aquí conectaremos tu componente
           * existente de direcciones.
           *
           * Temporalmente:
           */}

          <Paper
            variant="outlined"
            sx={{
              p: 3,
              borderRadius: 3,
            }}
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
              onClick={continuarDireccion}
            >
              Continuar
            </Button>
          </Stack>
        </Box>
      )}

      {/* PASO 2 */}
      {activeStep === 1 && (
        <Box>
          <Typography
            variant="h6"
            fontWeight={800}
            sx={{ mb: 2 }}
          >
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
                          <CircularProgress size={18} />
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

            <Button
              variant="contained"
              endIcon={
                procesando ? (
                  <CircularProgress size={18} color="inherit" />
                ) : (
                  <ArrowForward />
                )
              }
              disabled={procesando || cotizandoEnvios}
              onClick={crearOrdenes}
            >
              {procesando ? 'Creando órdenes...' : cotizandoEnvios ? 'Calculando envío...' : 'Confirmar pedido'}
            </Button>
          </Stack>
        </Box>
      )}

      {/* PASO 3 */}
      {activeStep === 2 && (
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
            onPagoSubido={handlePagoSubido}
            onTodosLosPagosSubidos={setTodosLosPagosSubidos}
          />
          <Stack
            direction="row"
            justifyContent="flex-end"
            sx={{ mt: 3 }}
          >
            <Button
              variant="contained"
              disabled={!todosLosPagosSubidos}
              onClick={() =>
                setActiveStep(3)
              }
            >
              Continuar
            </Button>
          </Stack>
        </Box>
      )}

      {/* PASO 4 */}
      {activeStep === 3 && (
        <Box
          sx={{
            maxWidth: 650,
            mx: 'auto',
            textAlign: 'center',
            py: 5,
          }}
        >
          <CheckCircleOutline
            sx={{
              fontSize: 80,
              mb: 2,
            }}
          />

          <Typography
            variant="h5"
            fontWeight={800}
            gutterBottom
          >
            Pagos enviados
          </Typography>

          <Typography
            color="text.secondary"
            sx={{ mb: 3 }}
          >
            Los restaurantes recibirán tus
            comprobantes y verificarán cada pago.
            Cada restaurante será responsable de
            procesar y enviar su propia orden.
          </Typography>

          <Button
            variant="contained"
            onClick={() =>
              navigate('/comida-mis-pedidos')
            }
          >
            Ver mis pedidos
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default FoodCheckout;