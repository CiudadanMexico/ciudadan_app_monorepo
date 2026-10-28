import React from 'react';

import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Radio,
  Stack,
  Typography,
} from '@mui/material';

import { LocalShipping, Schedule } from '@mui/icons-material';

// Proveedores del tablero de cotizaciones (docs/FOOD-COTIZACIONES-ENVIO-MVP.md §3).
const PROVEEDORES = ['ciudadan', 'uber_direct'];

const NOMBRES_PROVEEDOR = {
  ciudadan: 'Envío Ciudadan',
  uber_direct: 'Envío Uber Direct',
};

const formatearHora = (fechaISO) => {
  const fecha = new Date(fechaISO);

  if (Number.isNaN(fecha.getTime())) {
    return null;
  }

  return fecha.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
};

/**
 * Opciones de envío de un restaurante del checkout de Food.
 *
 * Muestra una opción seleccionable por proveedor (Ciudadan / Uber Direct)
 * con precio, distancia aproximada y vigencia de la cotización. Las opciones
 * no disponibles se muestran deshabilitadas con el motivo que devolvió el
 * servidor (`codigoIndisponibilidad` + `mensaje`). Un `simulado: true`
 * (modo pruebas del proveedor) se marca como precio NO definitivo.
 *
 * @param {object} props
 * @param {object|undefined} props.cotizaciones tablero del restaurante
 *   `{ ciudadan, uber_direct }` (undefined mientras la cotización está en vuelo)
 * @param {string|null} props.proveedorSeleccionado proveedor elegido
 * @param {Function} props.onSeleccionar callback `(proveedor) => void`
 * @param {boolean} props.vencida la cotización seleccionada ya venció
 */
const FoodOpcionesEnvio = ({
  cotizaciones,
  proveedorSeleccionado = null,
  onSeleccionar,
  vencida = false,
}) => {
  const opciones = PROVEEDORES.filter((proveedor) => cotizaciones?.[proveedor]);

  // Todavía no hay tablero para este restaurante (la cotización sigue en
  // vuelo): no se muestra nada para no parpadear.
  if (!cotizaciones) {
    return null;
  }

  // El restaurante vino en el tablero pero sin ninguna opción de proveedor.
  if (opciones.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No hay opciones de envío disponibles para este restaurante.
      </Typography>
    );
  }

  return (
    <Box>
      <Typography variant="body2" fontWeight={700} sx={{ mb: 1 }}>
        Opciones de envío
      </Typography>

      <Stack spacing={1.5}>
        {opciones.map((proveedor) => {
          const cotizacion = cotizaciones[proveedor];
          const disponible = Boolean(cotizacion?.disponible);
          const seleccionada = disponible && proveedorSeleccionado === proveedor;
          const importe = cotizacion.importe != null ? Number(cotizacion.importe) : null;
          const distanciaMetros = cotizacion.distanciaMetros != null ? Number(cotizacion.distanciaMetros) : null;
          const mostrarDistancia = distanciaMetros != null && Number.isFinite(distanciaMetros) && distanciaMetros > 0;
          const horaVigencia = disponible ? formatearHora(cotizacion.vence) : null;

          return (
            <Card
              key={proveedor}
              variant="outlined"
              sx={{
                borderRadius: 2,
                borderWidth: seleccionada ? 2 : 1,
                borderColor: seleccionada ? 'primary.main' : 'divider',
                bgcolor: seleccionada ? 'action.hover' : 'background.paper',
                opacity: disponible ? 1 : 0.6,
                transition: 'border-color 150ms ease, background-color 150ms ease',
              }}
            >
              <CardActionArea
                disabled={!disponible || vencida}
                onClick={() => onSeleccionar?.(proveedor)}
              >
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                  <Stack direction="row" alignItems="flex-start" spacing={1}>
                    <Radio
                      checked={seleccionada}
                      onChange={() => onSeleccionar?.(proveedor)}
                      disabled={!disponible || vencida}
                      size="small"
                      inputProps={{ 'aria-label': `Envío ${NOMBRES_PROVEEDOR[proveedor]}` }}
                      sx={{ mt: -0.5, ml: -1.5 }}
                    />

                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Stack
                        direction="row"
                        alignItems="center"
                        justifyContent="space-between"
                        spacing={1}
                      >
                        <Typography fontWeight={700} noWrap>
                          {NOMBRES_PROVEEDOR[proveedor]}
                        </Typography>

                        {disponible && importe != null && Number.isFinite(importe) && (
                          <Typography variant="h6" fontWeight={800} noWrap>
                            ${importe.toFixed(2)}
                            <Typography
                              component="span"
                              variant="caption"
                              color="text.secondary"
                              sx={{ ml: 0.5 }}
                            >
                              {cotizacion.moneda ?? 'MXN'}
                            </Typography>
                          </Typography>
                        )}
                      </Stack>

                      {disponible ? (
                        <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                          {mostrarDistancia && (
                            <Stack direction="row" spacing={0.5} alignItems="center">
                              <LocalShipping sx={{ fontSize: 16, color: 'text.secondary' }} />
                              <Typography variant="body2" color="text.secondary">
                                Distancia aprox. {(distanciaMetros / 1000).toFixed(1)} km
                              </Typography>
                            </Stack>
                          )}

                          {horaVigencia && (
                            <Stack direction="row" spacing={0.5} alignItems="center">
                              <Schedule sx={{ fontSize: 16, color: 'text.secondary' }} />
                              <Typography variant="body2" color="text.secondary">
                                Cotización válida hasta {horaVigencia}
                              </Typography>
                            </Stack>
                          )}

                          {seleccionada && vencida && (
                            <Typography variant="body2" color="warning.main" fontWeight={600}>
                              Esta cotización venció. Vuelve a cotizar el envío.
                            </Typography>
                          )}

                          {cotizacion.simulado && (
                            <Chip
                              size="small"
                              color="warning"
                              variant="outlined"
                              label="Precio de prueba (simulado)"
                            />
                          )}
                        </Stack>
                      ) : (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                          {cotizacion?.mensaje ?? 'No disponible para esta entrega.'}
                        </Typography>
                      )}
                    </Box>
                  </Stack>
                </CardContent>
              </CardActionArea>
            </Card>
          );
        })}
      </Stack>
    </Box>
  );
};

export default FoodOpcionesEnvio;
