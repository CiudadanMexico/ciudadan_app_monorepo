import React, { useEffect, useMemo, useState } from 'react';

import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  Radio,
  RadioGroup,
  Stack,
  Typography,
} from '@mui/material';

import {
  Add,
  Close,
  Remove,
} from '@mui/icons-material';

const STRAPI_URL = process.env.REACT_APP_STRAPI_URL;
const FoodProductConfigModal = ({
  open,
  onClose,
  producto,
  variantes = [],
  varianteInicial = null,
  modificadores = [],
  onConfirm,
}) => {
  const [varianteSeleccionada, setVarianteSeleccionada] = useState(varianteInicial);

  const [cantidad, setCantidad] = useState(1);
  const [modificadoresSeleccionados, setModificadoresSeleccionados] = useState([]);

  /*
   * Reiniciamos la configuración cada vez que se abre el modal
   * o cambia el producto.
   */
  useEffect(() => {
    if (!open) return;

    setVarianteSeleccionada(varianteInicial || null);
    setCantidad(1);
    setModificadoresSeleccionados([]);
  }, [open, producto?.id, varianteInicial]);

  /*
   * Normalizamos la variante para soportar tanto:
   *
   * variante.attributes
   *
   * como objetos ya normalizados.
   */
  const obtenerAtributos = (item) => {
    if (!item) return {};
    return item.attributes || item;
  };

  const varianteActual = useMemo(() => {
    if (!varianteSeleccionada) return null;

    return obtenerAtributos(varianteSeleccionada);
  }, [varianteSeleccionada]);

  /*
   * Precio base del producto.
   */
  const precioBase = useMemo(() => {
    const attrs = obtenerAtributos(producto);

    return Number(attrs.precio ?? attrs.precio_base ?? 0);
  }, [producto]);

  /*
   * Precio adicional de la variante.
   */
  const precioVariante = useMemo(() => {
    if (!varianteActual) return 0;

    return Number(varianteActual.precio_adicional ?? varianteActual.precio ?? varianteActual.precio_variante ?? 0);
  }, [varianteActual]);

  /*
   * Total de los modificadores seleccionados.
   */
  const totalModificadores = useMemo(() => {
    return modificadoresSeleccionados.reduce((total, modificador) => {
      const precio = Number(modificador.precio ?? modificador.attributes?.precio ?? 0);
      const cantidadModificador = Number(modificador.cantidad || 1);
      return total + precio * cantidadModificador;
    }, 0);
  }, [modificadoresSeleccionados]);

  /*
   * Precio unitario final.
   */
  const precioUnitario = useMemo(() => {
    if (precioVariante)
      return (precioVariante + totalModificadores);
    return (precioBase + totalModificadores);
  }, [precioBase, precioVariante, totalModificadores,]);

  /*
   * Subtotal considerando cantidad.
   */
  const subtotal = useMemo(() => {
    return precioUnitario * cantidad;
  }, [precioUnitario, cantidad]);

  const modificarCantidad = (delta) => {
    setCantidad((actual) => {
      const nuevaCantidad = actual + delta;

      if (nuevaCantidad < 1) {
        return 1;
      }

      if (nuevaCantidad > 99) {
        return 99;
      }

      return nuevaCantidad;
    });
  };

  /*
   * Selecciona/deselecciona un modificador.
   *
   * Para esta primera versión asumimos que un modificador puede seleccionarse una sola vez.
   */
  const toggleModificador = (modificador) => {
    const id = modificador.id ?? modificador.documentId;

    setModificadoresSeleccionados((actuales) => {
      const existe = actuales.some((item) => (item.id ?? item.documentId) === id);

      if (existe) {
        return actuales.filter((item) => (item.id ?? item.documentId) !== id);
      }

      return [
        ...actuales,
        {
          ...obtenerAtributos(modificador),
          id,
          cantidad: 1,
        },
      ];
    });
  };

  const estaSeleccionado = (modificador) => {
    const id = modificador.id ?? modificador.documentId;
    return modificadoresSeleccionados.some((item) => (item.id ?? item.documentId) === id);
  };

  /*
   * Confirmamos la configuración.
   */
  const handleConfirmar = () => {
    if (!producto) return;
    const { food_restaurant } = producto;
    const restaurante = { id: food_restaurant?.data?.id, ...food_restaurant?.data?.attributes };
    const image_url = varianteSeleccionada ? varianteSeleccionada?.imagen_predeterminada?.data?.attributes?.url ?? '' : producto?.imagen_predeterminada?.data?.attributes?.url ?? '';
    const imagen = image_url ? !image_url.startsWith("http") ? `${STRAPI_URL}${image_url}` : image_url : '';
    onConfirm?.({
      producto,
      variante: varianteSeleccionada,
      restaurante,
      nombre: producto?.nombre,
      nombre_variante: varianteSeleccionada ? varianteSeleccionada?.nombre : "",
      imagen,
      precio_base: producto?.precio_base,
      precio_variante: varianteSeleccionada ? varianteSeleccionada?.precio : 0,
      cantidad,
      modificadores: modificadoresSeleccionados,
    });

    onClose?.();
  };

  const nombreProducto = obtenerAtributos(producto).nombre ?? 'Producto';

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      scroll="paper"
    >
      {/* HEADER */}
      <DialogTitle
        sx={{
          pr: 6,
          fontWeight: 700,
        }}
      >
        Configurar producto
        <IconButton
          onClick={onClose}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
          }}
        >
          <Close />
        </IconButton>

        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }} >
          {nombreProducto}
        </Typography>
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={3}>
          {/* VARIANTES */}
          {variantes.length > 0 && (
            <Box>
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }} >
                Presentación
              </Typography>

              <RadioGroup
                defaultValue={0}
                value={varianteSeleccionada?.id ?? varianteSeleccionada?.documentId ?? '0'
                }
                onChange={(event) => {
                  const id = event.target.value;
                  const variante = variantes.find((item) => String(item.id ?? item.documentId) === String(id));
                  console.log("Id:", id, "Variante:", variante, "Variante Seleccionada:", varianteSeleccionada);
                  if (id == 0)
                    setVarianteSeleccionada(null);
                  else
                    setVarianteSeleccionada(variante || null);
                }}
              >
                <Stack spacing={1}>
                  <Box
                    key={0}
                    sx={{
                      border: '1px solid',
                      borderColor: varianteSeleccionada == null ? 'primary.main' : 'divider',
                      borderRadius: 2,
                      p: 1,
                    }}
                  >
                    <FormControlLabel
                      value={0}
                      control={<Radio />}
                      label={
                        <Box>
                          <Typography variant="body2" fontWeight={600} >
                            {producto?.nombre}
                          </Typography>

                          <Typography variant="caption" color="text.secondary" >
                            + $
                            {producto?.precio_base.toFixed(2)}
                          </Typography>
                        </Box>
                      }
                      sx={{
                        width: '100%',
                        m: 0,
                      }}
                    />
                  </Box>
                  {variantes.map((variante) => {
                    const attrs = obtenerAtributos(variante);

                    const id = variante.id ?? variante.documentId;
                    const nombre = attrs?.nombre ?? attrs?.nombre_variante ?? 'Presentación';
                    const precio = Number(attrs.precio_adicional ?? attrs.precio ?? attrs.precio_variante ?? 0);

                    return (
                      <Box
                        key={id}
                        sx={{
                          border: '1px solid',
                          borderColor: varianteSeleccionada?.id === id ? 'primary.main' : 'divider',
                          borderRadius: 2,
                          p: 1,
                        }}
                      >
                        <FormControlLabel
                          value={id}
                          control={<Radio />}
                          label={
                            <Box>
                              <Typography variant="body2" fontWeight={600} >
                                {nombre}
                              </Typography>

                              {precio > 0 && (
                                <Typography variant="caption" color="text.secondary" >
                                  + $
                                  {precio.toFixed(2)}
                                </Typography>
                              )}
                            </Box>
                          }
                          sx={{
                            width: '100%',
                            m: 0,
                          }}
                        />
                      </Box>
                    );
                  })}
                </Stack>
              </RadioGroup>
            </Box>
          )}

          {/* MODIFICADORES */}
          {modificadores.length > 0 && (
            <Box>
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
                Personaliza tu producto
              </Typography>

              <Stack spacing={1}>
                {modificadores.map((modificador) => {
                  const attrs = obtenerAtributos(modificador);

                  const id = modificador.id ?? modificador.documentId;
                  const nombre = attrs?.nombre ?? 'Modificador';
                  const descripcion = attrs.descripcion;
                  const precio = Number(attrs.precio || 0);
                  const seleccionado = estaSeleccionado(modificador);

                  return (
                    <Box
                      key={id}
                      sx={{
                        border: '1px solid',
                        borderColor: seleccionado
                          ? 'primary.main'
                          : 'divider',
                        borderRadius: 2,
                        px: 1.5,
                        py: 1,
                      }}
                    >
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={seleccionado}
                            onChange={() =>
                              toggleModificador(
                                modificador
                              )
                            }
                          />
                        }
                        label={
                          <Box>
                            <Typography variant="body2" fontWeight={600} >
                              {nombre}
                            </Typography>

                            {descripcion && (
                              <Typography variant="caption" color="text.secondary" display="block" >
                                {descripcion}
                              </Typography>
                            )}

                            {precio > 0 && (
                              <Typography variant="caption" color="text.secondary">
                                + $
                                {precio.toFixed(2)}
                              </Typography>
                            )}
                          </Box>
                        }
                        sx={{
                          width: '100%',
                          m: 0,
                        }}
                      />
                    </Box>
                  );
                })}
              </Stack>
            </Box>
          )}

          <Divider />

          {/* CANTIDAD */}
          <Box>
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }} >
              Cantidad
            </Typography>

            <Stack
              direction="row"
              alignItems="center"
              spacing={1}
            >
              <IconButton
                onClick={() =>
                  modificarCantidad(-1)
                }
                disabled={cantidad <= 1}
                size="small"
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Remove />
              </IconButton>

              <Typography
                sx={{
                  minWidth: 40,
                  textAlign: 'center',
                  fontWeight: 700,
                }}
              >
                {cantidad}
              </Typography>

              <IconButton
                onClick={() =>
                  modificarCantidad(1)
                }
                disabled={cantidad >= 99}
                size="small"
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Add />
              </IconButton>
            </Stack>
          </Box>

          <Divider />

          {/* RESUMEN */}
          <Box>
            <Stack spacing={0.8}>
              <Stack
                direction="row"
                justifyContent="space-between"
              >
                <Typography variant="body2">
                  Producto
                </Typography>

                <Typography variant="body2">
                  ${
                    precioVariante ? precioVariante.toFixed(2) : precioBase.toFixed(2)
                  }
                </Typography>
              </Stack>

              {/* {precioVariante > 0 && (
                <Stack
                  direction="row"
                  justifyContent="space-between"
                >
                  <Typography variant="body2">
                    Presentación
                  </Typography>

                  <Typography variant="body2">
                    +$
                    {precioVariante.toFixed(2)}
                  </Typography>
                </Stack>
              )} */}

              {totalModificadores > 0 && (
                <Stack
                  direction="row"
                  justifyContent="space-between"
                >
                  <Typography variant="body2">
                    Modificadores
                  </Typography>

                  <Typography variant="body2">
                    +$
                    {totalModificadores.toFixed(2)}
                  </Typography>
                </Stack>
              )}

              <Stack
                direction="row"
                justifyContent="space-between"
              >
                <Typography variant="body2">
                  Precio unitario
                </Typography>

                <Typography variant="body2">
                  ${precioUnitario.toFixed(2)}
                </Typography>
              </Stack>

              <Divider sx={{ my: 0.5 }} />

              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
              >
                <Typography variant="subtitle1" fontWeight={700}>
                  Subtotal
                </Typography>
                <Typography variant="h6" fontWeight={800}>
                  ${subtotal.toFixed(2)}
                </Typography>
              </Stack>
            </Stack>
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions
        sx={{
          p: 2,
          gap: 1,
        }}
      >
        <Button
          onClick={onClose}
          color="inherit"
        >
          Cancelar
        </Button>

        <Button
          variant="contained"
          onClick={handleConfirmar}
          disabled={!producto}
        >
          Agregar al pedido
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default FoodProductConfigModal;