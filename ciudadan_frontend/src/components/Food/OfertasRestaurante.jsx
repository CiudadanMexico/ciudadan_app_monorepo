import React, { useEffect, useMemo, useState } from "react";

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  TextField,
  Typography
} from "@mui/material";

import {
  Add,
  Delete,
  Edit,
  LocalOffer,
  Restaurant,
  Close
} from "@mui/icons-material";
import useOfertasRestaurante from "../../hooks/food/useOfertasRestaurante";
import ModificadoresOferta from "./ModificadoresOferta";


const OfertasRestaurante = ({ restaurante }) => {
  const {
    loading,
    error,
    obtenerOfertas,
    crearOferta,
    actualizarOferta,
    eliminarOferta,
    obtenerGruposModificadores,
    obtenerProductos,
    loadingModificadores,
    loadingProductos
  } = useOfertasRestaurante();

  const [openDialog, setOpenDialog] = useState(false);
  const [editingOffer, setEditingOffer] = useState(null);
  const [ofertas, setOfertas] = useState([]);

  const [productos, setProductos] = useState([]);
  const [gruposModificadores, setGruposModificadores] = useState([]);

  const handleNuevaOferta = () => {
    setEditingOffer(null);
    setOpenDialog(true);
  };

  const handleEditarOferta = (oferta) => {
    setEditingOffer(oferta);
    setOpenDialog(true);
  };

  const handleCerrarDialog = () => {
    setEditingOffer(null);
    setOpenDialog(false);
  };

  const handleGuardarOferta = async (oferta) => {
    if (editingOffer) {
      try {
        await actualizarOferta(editingOffer?.id, oferta);
      } catch (error) {
        console.error("<handleGuardarOferta - actualizarOferta>: ", error)
      }
    } else {
      try {
        await crearOferta({ ...oferta, restaurant: restaurante.id });
      } catch (error) {
        console.error("<handleGuardarOferta - crearOferta>:", error);
      }
    }

    if (restaurante?.id)
      await handleInitOfertas(restaurante?.id);

    handleCerrarDialog();
  };

  const handleEliminarOferta = async (id) => {
    try {
      await eliminarOferta(id);
    } catch (error) {
      console.error("<handleEliminarOferta - eliminarOferta>:", error);
    } finally {
      if (restaurante?.id)
        await handleInitOfertas(restaurante?.id);
    }
  };

  const handleToggleOferta = (id) => {

    setOfertas((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
            ...item,
            activa: !item.activa
          }
          : item
      )
    );

  };

  const handleInitOfertas = async (restaurante_id) => {
    try {
      const ofertasIniciales = await obtenerOfertas(restaurante_id);
      setOfertas(ofertasIniciales);
    } catch (error) {
      console.error("<handleInitOfertas - obtenerOfertas>:", error);
    }
  };

  useEffect(() => {
    if (!restaurante?.id) return;

    handleInitOfertas(restaurante?.id);
  }, [restaurante?.id])

  useEffect(() => {
    const cargarDatos = async () => {
      const restaurantId = restaurante?.id;
      if (!restaurantId) return;

      const [productosResponse, gruposModificadoresResponse] = await Promise.all([obtenerProductos(restaurantId), obtenerGruposModificadores(restaurantId)]);

      setProductos(productosResponse);
      setGruposModificadores(gruposModificadoresResponse);
    };

    cargarDatos();
  }, [restaurante?.id, obtenerProductos, obtenerGruposModificadores]);

  return (
    <Box sx={{ width: "100%" }}>
      {/* HEADER */}
      <Box
        sx={{
          display: "flex",
          alignItems: {
            xs: "flex-start",
            sm: "center"
          },
          justifyContent: "space-between",
          gap: 2,
          mb: 3,
          flexDirection: {
            xs: "column",
            sm: "row"
          }
        }}
      >
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Ofertas
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Crea promociones combinando tus platillos y complementos.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleNuevaOferta}
          sx={{
            borderRadius: 2,
            width: {
              xs: "100%",
              sm: "auto"
            }
          }}
        >
          Nueva oferta
        </Button>
      </Box>


      {/* SIN OFERTAS */}
      {ofertas.length === 0 && (
        <Paper
          variant="outlined"
          sx={{
            p: {
              xs: 3,
              sm: 5
            },
            textAlign: "center",
            borderRadius: 3
          }}
        >

          <LocalOffer
            sx={{
              fontSize: 48,
              color: "text.secondary",
              mb: 1
            }}
          />

          <Typography variant="h6" fontWeight={600}>
            Aún no tienes ofertas
          </Typography>

          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              maxWidth: 450,
              mx: "auto",
              mt: 1,
              mb: 3
            }}
          >
            Crea una oferta para combinar tus platillos, cantidades y complementos en una promoción.
          </Typography>

          <Button
            variant="outlined"
            startIcon={<Add />}
            onClick={handleNuevaOferta}
          >
            Crear primera oferta
          </Button>
        </Paper>
      )}

      {/* LISTADO DE OFERTAS */}
      <Stack spacing={2}>
        {
          ofertas.map((oferta) => {
            console.log("Oferta:", oferta)
            return (
              <Card
                key={`oferta-item-card-${oferta?.id}`}
                variant="outlined"
                sx={{
                  borderRadius: 3
                }}
              >
                <CardContent>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 2,
                      alignItems: {
                        xs: "flex-start",
                        sm: "center"
                      },
                      flexDirection: {
                        xs: "column",
                        sm: "row"
                      }
                    }}
                  >
                    <Box
                      sx={{
                        minWidth: 0,
                        flex: 1
                      }}
                    >
                      <Stack
                        direction="row"
                        spacing={1}
                        alignItems="center"
                        flexWrap="wrap"
                      >
                        <Typography variant="h6" fontWeight={700}>
                          {oferta?.attributes?.titulo ?? "Oferta"}
                        </Typography>

                        <Chip
                          size="small"
                          label={
                            oferta?.attributes?.activa ? "Activa" : "Inactiva"
                          }
                          color={
                            oferta?.attributes?.activa ? "success" : "default"
                          }
                        />
                      </Stack>

                      {oferta?.attributes?.descripcion && (

                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                          {oferta?.attributes?.descripcion}
                        </Typography>

                      )}


                      <Typography variant="h6" fontWeight={700} sx={{ mt: 1 }}>
                        ${Number(oferta?.attributes?.precio).toFixed(2)}
                      </Typography>

                    </Box>


                    <Stack
                      direction="row"
                      spacing={1}
                      alignItems="center"
                    >

                      <FormControlLabel
                        control={
                          <Switch
                            checked={oferta?.attributes?.activa}
                            onChange={() =>
                              handleToggleOferta(oferta.id)
                            }
                          />
                        }
                        label="Activa"
                      />

                      {/* <IconButton
                    onClick={() =>
                      handleEditarOferta(oferta)
                    }
                  >
                    <Edit />  
                  </IconButton> */}

                      {/* <IconButton
                    color="error"
                    onClick={() =>
                      handleEliminarOferta(oferta.id)
                    }
                  >
                    <Delete />
                  </IconButton> */}
                    </Stack>
                  </Box>
                  <Divider sx={{ my: 2 }} />
                  <Stack spacing={1}>
                    {oferta?.attributes?.items?.map((item, index) => (
                      <Box
                        key={index}
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 2,
                          alignItems: "center"
                        }}
                      >
                        <Typography variant="body2">
                          <strong>
                            {item.cantidad} ×
                          </strong>{" "}
                          {item?.product?.data?.attributes?.nombre}
                        </Typography>
                        {
                          item?.food_modifiers?.data?.length > 0 && (
                            <Typography variant="caption" color="text.secondary">
                              + {item?.food_modifiers?.data?.map(item => item?.attributes?.nombre).join(", ")}
                            </Typography>

                          )
                        }
                      </Box>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            )
          })
        }
      </Stack>
      {/* DIALOG */}
      <OfertaDialog
        open={openDialog}
        onClose={handleCerrarDialog}
        onSave={handleGuardarOferta}
        oferta={editingOffer}
        productos={productos}
        gruposModificadores={gruposModificadores}
        loadingProductos={loadingProductos}
        loadingModificadores={loadingModificadores}
      />

    </Box>
  );
};

const OfertaDialog = ({
  open = false,
  loadingProductos = false,
  loadingModificadores = false,
  productos = [],
  gruposModificadores = [],
  oferta,
  onClose,
  onSave,
}) => {

  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [precio, setPrecio] = useState("");
  const [cantidad, setCantidad] = useState(1);
  const [activa, setActiva] = useState(true);

  const [items, setItems] = useState([]);


  useEffect(() => {
    if (oferta) {
      setTitulo(oferta.titulo || "");
      setDescripcion(oferta.descripcion || "");
      setPrecio(oferta.precio || "");
      setCantidad(oferta.cantidad || 1);
      setActiva(
        oferta.activa !== undefined
          ? oferta.activa
          : true
      );

      setItems(oferta.items || []);

    } else {

      setTitulo("");
      setDescripcion("");
      setPrecio("");
      setCantidad(1);
      setActiva(true);
      setItems([]);

    }

  }, [oferta, open]);


  const agregarProducto = () => {
    setItems((prev) => [
      ...prev,
      {
        product: "",
        producto: "",
        cantidad: 1,
        precio: 0,
        food_modifiers: []
      }
    ]);
  };

  const eliminarProducto = (index) => {
    setItems((prev) =>
      prev.filter((_, i) => i !== index)
    );
  };

  const actualizarItem = (index, field, value) => {
    setItems((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
            ...item,
            [field]: value
          }
          : item
      )
    );
  };

  const handleProductoChange = (index, productId) => {
    const producto = productos.find((item) => String(item.id) === String(productId));
    if (!producto) return;

    const attributes = producto.attributes || {};
    setItems((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
            ...item,
            product: producto.id,
            producto: attributes?.nombre ?? attributes?.name ?? "Producto",
            precio: attributes.precio ?? attributes.price ?? 0,
            food_modifiers: []
          }
          : item
      )
    );
  };

  const handleSubmit = () => {
    if (!titulo.trim()) return;

    if (!precio || Number(precio) <= 0) return;

    if (items.length === 0) return;

    onSave({
      titulo,
      descripcion,
      precio: Number(precio),
      cantidad: Number(cantidad),
      activa,
      items
    });

  };


  return (

    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      fullScreen={false}
      PaperProps={{
        sx: {
          borderRadius: {
            xs: 0,
            sm: 3
          },
          m: {
            xs: 0,
            sm: 2
          },
          width: {
            xs: "100%",
            sm: "calc(100% - 32px)"
          },
          maxHeight: {
            xs: "100%",
            sm: "90vh"
          }
        }
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between"
        }}
      >
        <Box>
          <Typography variant="h6" fontWeight={700}>
            {oferta ? "Editar oferta" : "Nueva oferta"}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Configura la promoción de tu restaurante.
          </Typography>
        </Box>
        <IconButton onClick={onClose}>
          <Close />
        </IconButton>

      </DialogTitle>


      <DialogContent dividers>
        <Stack spacing={3}>
          {/* INFORMACIÓN GENERAL */}
          <Box>
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
              Información de la oferta
            </Typography>
            <Stack spacing={2}>
              <TextField
                fullWidth
                label="Nombre de la oferta"
                placeholder="Ej. Combo familiar"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                required
              />
              <TextField
                fullWidth
                multiline
                minRows={3}
                label="Descripción"
                placeholder="Describe qué incluye esta promoción"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
              />
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "1fr",
                    sm: "1fr 1fr"
                  },
                  gap: 2
                }}
              >
                <TextField
                  fullWidth
                  type="number"
                  label="Precio de la oferta"
                  value={precio}
                  onChange={(e) => setPrecio(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <Typography
                        sx={{
                          mr: 1,
                          color: "text.secondary"
                        }}
                      >
                        $
                      </Typography>
                    )
                  }}
                  required
                />

                <TextField
                  fullWidth
                  type="number"
                  label="Cantidad disponible"
                  value={cantidad}
                  onChange={(e) => setCantidad(Math.max(1, Number(e.target.value)))}
                  inputProps={{
                    min: 1
                  }}
                />
              </Box>
              <FormControlLabel
                control={
                  <Switch
                    checked={activa}
                    onChange={(e) => setActiva(e.target.checked)}
                  />
                }
                label="Oferta activa"
              />
            </Stack>
          </Box>
          <Divider />
          {/* PRODUCTOS */}
          <Box>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: {
                  xs: "flex-start",
                  sm: "center"
                },
                gap: 2,
                flexDirection: {
                  xs: "column",
                  sm: "row"
                },
                mb: 2
              }}
            >
              <Box>
                <Typography variant="subtitle1" fontWeight={700}>
                  Platillos incluidos
                </Typography>

                <Typography variant="body2" color="text.secondary">
                  Selecciona los platillos que formarán parte de esta oferta.
                </Typography>
              </Box>
              <Button
                variant="outlined"
                startIcon={<Add />}
                onClick={agregarProducto}
                sx={{
                  width: {
                    xs: "100%",
                    sm: "auto"
                  }
                }}
              >
                Agregar platillo
              </Button>
            </Box>

            {
              items.length === 0 && (
                <Alert severity="info">
                  Debes agregar al menos un platillo para crear la oferta.
                </Alert>
              )
            }
            <Stack spacing={2}>
              {
                items.map((item, index) => (
                  <Paper
                    key={index}
                    variant="outlined"
                    sx={{
                      p: {
                        xs: 1.5,
                        sm: 2
                      },
                      borderRadius: 2
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        mb: 2
                      }}
                    >
                      <Typography variant="subtitle2" fontWeight={700}>
                        Platillo #{index + 1}
                      </Typography>
                      <IconButton
                        color="error"
                        size="small"
                        onClick={() => eliminarProducto(index)}
                      >
                        <Delete />
                      </IconButton>
                    </Box>
                    <Stack spacing={2}>
                      <TextField
                        select
                        fullWidth
                        label="Platillo"
                        value={item.product || ""}
                        onChange={(e) => handleProductoChange(index, e.target.value)}
                      >
                        <MenuItem value="">
                          Selecciona un platillo
                        </MenuItem>
                        {
                          productos.map((producto) => {
                            const attributes = producto?.attributes ?? {};
                            return (
                              <MenuItem
                                key={`menu-item-product-${producto?.id}`}
                                value={producto.id}
                              >
                                {attributes?.nombre ?? attributes?.name ?? `Producto ${producto?.id}`}
                              </MenuItem>
                            );
                          })
                        }
                      </TextField>
                      <Box
                        sx={{
                          display: "grid",
                          gridTemplateColumns: {
                            xs: "1fr",
                            sm: "1fr 1fr"
                          },
                          gap: 2
                        }}
                      >
                        <TextField
                          type="number"
                          label="Cantidad"
                          value={item?.cantidad}
                          onChange={(e) => actualizarItem(index, "cantidad", Math.max(1, Number(e.target.value)))}
                          inputProps={{
                            min: 1
                          }}
                        />
                        <TextField
                          type="number"
                          label="Precio del platillo"
                          value={item.precio}
                          onChange={(e) => actualizarItem(index, "precio", Number(e.target.value))}
                          InputProps={{
                            startAdornment: (
                              <Typography
                                sx={{
                                  mr: 1,
                                  color:
                                    "text.secondary"
                                }}
                              >
                                $
                              </Typography>
                            )
                          }}
                        />
                      </Box>

                      {/* COMPLEMENTOS */}
                      <Box>

                        <Typography variant="body2" fontWeight={600} sx={{ mb: 1.5 }}>
                          Complementos disponibles
                        </Typography>
                        {!item.product ? (
                          <Alert severity="info">
                            Selecciona primero un platillo para configurar sus complementos.
                          </Alert>
                        ) : (
                          <ModificadoresOferta
                            grupos={gruposModificadores}
                            seleccionados={
                              item?.food_modifiers ?? []
                            }
                            onChange={(modificadores) =>
                              actualizarItem(index, "food_modifiers", modificadores)
                            }
                            loading={loadingModificadores}
                          />
                        )}
                      </Box>
                    </Stack>
                  </Paper>
                ))}
            </Stack>

          </Box>

        </Stack>

      </DialogContent>


      <DialogActions
        sx={{
          p: 2,
          flexDirection: {
            xs: "column-reverse",
            sm: "row"
          },
          gap: 1
        }}
      >

        <Button
          onClick={onClose}
          sx={{
            width: {
              xs: "100%",
              sm: "auto"
            }
          }}
        >
          Cancelar
        </Button>


        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={
            !titulo.trim() ||
            !precio ||
            Number(precio) <= 0 ||
            items.length === 0
          }
          sx={{
            width: {
              xs: "100%",
              sm: "auto"
            }
          }}
        >
          {oferta
            ? "Guardar cambios"
            : "Crear oferta"}
        </Button>

      </DialogActions>

    </Dialog>

  );
};

export default OfertasRestaurante;