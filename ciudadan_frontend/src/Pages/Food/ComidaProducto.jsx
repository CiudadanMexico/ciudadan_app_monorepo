import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Breadcrumbs,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Divider,
  IconButton,
  Paper,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';

import {
  ArrowBackIosNew,
  ArrowForwardIos,
  CheckCircle,
  Restaurant,
  ShoppingCart,
} from '@mui/icons-material';

import { useLocation, useNavigate, useParams } from 'react-router-dom';
import useProductsRestaurant from '../../hooks/food/useProductsRestaurant';
import FoodProductConfigModal from '../../components/Food/FoodProductConfigModal';
import { useFoodCart } from '../../Contexts/FoodCartContext';

const STRAPI_URL = process.env.REACT_APP_STRAPI_URL;

const ComidaProducto = () => {
  const { slug } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { getProductBySlug, getProductById } = useProductsRestaurant();
  const theme = useTheme();
  const isMobilDevice = useMediaQuery(theme.breakpoints.down('md'));
  const { addItem, cart, clearCart } = useFoodCart();

  const productIdFromState = location.state?.product_id;

  const [producto, setProducto] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [imagenActiva, setImagenActiva] = useState(0);
  const [varianteSeleccionada, setVarianteSeleccionada] = useState(null);
  const [selectedModifiers, setSelectedModifiers] = useState([]);
  const [configModalOpen, setConfigModalOpen] = useState(false);

  //OBTENER PRODUCTO
  useEffect(() => {
    const obtenerProducto = async () => {
      try {
        setLoading(true);
        setError('');

        let response;
        // Búsqueda por id
        if (productIdFromState) {
          response = await getProductById(productIdFromState);
        } else if (slug) {
          /// Búsqueda por slug
          response = await getProductBySlug(slug);
        } else {
          throw new Error('No se proporcionó un producto');
        }
        const data = response;
        if (!data) {
          throw new Error('No fue posible obtener el producto');
        }

        setProducto(data);
      } catch (err) {
        console.error(err);
        setError(err?.message ?? 'No fue posible cargar la información del producto.');
      } finally {
        setLoading(false);
      }
    };

    obtenerProducto();
  }, [slug, productIdFromState]);

  // Normalizar producto
  // Permite trabajar independientemente de si la respuesta viene como: data.attributes o directamente: data
  const productoData = useMemo(() => {
    if (!producto) return {};
    return producto?.attributes ? ({ id: producto?.id, ...producto?.attributes }) : producto;
  }, [producto]);

  // Variantes
  const variantes = useMemo(() => {
    const variantesData = productoData?.food_product_variants ?? productoData?.food_product_variants?.data ?? productoData?.variants ?? [];

    const lista = Array.isArray(variantesData) ? variantesData : variantesData?.data ?? [];

    return lista.map((item) => {
      if (item?.attributes) {
        return {
          id: item.id,
          ...item.attributes,
        };
      }
      return item;
    });
  }, [productoData]);

  // Imágenes
  const imagenes = useMemo(() => {
    if (!productoData) return [];

    // Función para normalizar imágenes
    const normalizarImagen = (item) => {
      if (!item) return null;
      const image = item?.attributes ?? item;
      let url = image?.url ?? image?.formats?.small?.url ?? image?.formats?.medium?.url ?? image?.formats?.large?.url ?? '';
      if (!url) return null;

      if (url.startsWith('/')) {
        url = `${STRAPI_URL}${url}`;
      }

      return {
        id: item?.id ?? image?.id ?? null,
        alternativeText: image?.alternativeText ?? productoData?.name ?? 'Imagen del producto',
        url,
      };
    };

    // OBTENER IMÁGENES DEL PRODUCTO
    const obtenerImagenesProducto = () => {
      const resultado = [];

      // Imagen predeterminada
      const imagenPredeterminada = normalizarImagen(productoData?.imagen_predeterminada);

      if (imagenPredeterminada) {
        resultado.push(imagenPredeterminada);
      }

      /** Galería general del producto */
      const imagenesData = productoData?.images ?? productoData?.imagenes ?? productoData?.gallery ?? [];

      const lista = Array.isArray(imagenesData) ? imagenesData : imagenesData?.data ?? [];

      lista.map(normalizarImagen).filter(Boolean).forEach((imagen) => {
        const existe = resultado.some((item) => item.id === imagen.id ?? item.url === imagen.url);
        if (!existe) {
          resultado.push(imagen);
        }
      });

      return resultado;
    };

    // OBTENER IMÁGENES DE LA VARIANTE 
    const obtenerImagenesVariante = () => {
      const resultado = [];

      if (!varianteSeleccionada) {
        return resultado;
      }
      // Imagen predeterminada de la variante
      const imagenPredeterminada = normalizarImagen(varianteSeleccionada?.imagen_predeterminada);

      if (imagenPredeterminada) {
        resultado.push(imagenPredeterminada);
      }

      // Galería de imágenes de la variante
      const imagenesData = varianteSeleccionada?.images ?? varianteSeleccionada?.imagenes ?? varianteSeleccionada?.gallery ?? [];

      const lista = Array.isArray(imagenesData) ? imagenesData : imagenesData?.data ?? [];

      lista.map(normalizarImagen).filter(Boolean).forEach((imagen) => {
        const existe = resultado.some((item) => item.id === imagen.id || item.url === imagen.url);
        if (!existe) {
          resultado.push(imagen);
        }
      });

      return resultado;
    };


    // SELECCIONAR GALERÍA
    const imagenesVariante = obtenerImagenesVariante();

    /**
     * Si la variante tiene imágenes, utilizamos exclusivamente las imágenes de la variante.
     * Si no tiene imágenes, hacemos fallback a las imágenes del producto.
    */

    if (imagenesVariante.length > 0) {
      return imagenesVariante;
    }
    return obtenerImagenesProducto();

  }, [productoData, varianteSeleccionada]);

  // PRECIO
  // Si la variante seleccionada tiene precio, utilizamos el precio de la variante.
  // En caso contrario utilizamos el precio base del producto.
  const precio = useMemo(() => {
    const precioVariante = varianteSeleccionada?.price ?? varianteSeleccionada?.precio;
    const precioProducto = productoData?.price ?? productoData?.precio_base;
    return precioVariante ?? precioProducto ?? null;
  }, [productoData, varianteSeleccionada]);

  const modifiersByGroup = useMemo(() => {
    const grouped = productoData?.food_modifiers?.data?.reduce((groups, item) => {
      const modifierGroup = item?.attributes?.food_modifier_group?.data;
      const key = String(modifierGroup?.id);
      if (groups[key] == undefined) {
        groups[key] = {
          id: modifierGroup?.id,
          ...modifierGroup?.attributes,
          modificadores: [],
        }
      }
      groups[key].modificadores.push({ id: item?.id, ...item?.attributes });
      return groups;
    }, {});
    return Object.values(grouped ?? {}) ?? [];
  }, [productoData?.food_modifiers?.data]);

  // FORMATEAR PRECIO
  const formatoPrecio = (valor) => {
    if (valor === null || valor === undefined) {
      return null;
    }

    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(Number(valor));
  };

  /**
   * ============================================================
   * CAMBIAR IMAGEN
   * ============================================================
   */
  const siguienteImagen = () => {
    if (!imagenes.length) return;

    setImagenActiva((prev) =>
      prev === imagenes.length - 1 ? 0 : prev + 1
    );
  };

  const anteriorImagen = () => {
    if (!imagenes.length) return;

    setImagenActiva((prev) =>
      prev === 0 ? imagenes.length - 1 : prev - 1
    );
  };

  const handleAddToCart = (producto, variante, modificadores) => {
    const { food_restaurant } = productoData;
    const restaurant = { id: food_restaurant?.data?.id, ...food_restaurant?.data?.attributes };
    const modifiersSelected = productoData?.food_modifiers?.data?.filter((item) => modificadores.includes(item.id));
    // const itemAdded = addItem({ producto, variante, restaurant, cantidad: 1, modificadores: modifiersSelected });
    // console.log("Item created on cart:", itemAdded);
  };

  const handleAgregarAlPedido = () => {
    setConfigModalOpen(true);
  };

  /**
   * ============================================================
   * LOADING
   * ============================================================
   */
  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '70vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  /**
   * ============================================================
   * ERROR
   * ============================================================
   */
  if (error || !producto) {
    return (
      <Container maxWidth="lg" sx={{ py: 6 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          {error || 'Producto no encontrado'}
        </Alert>

        <Button
          variant="outlined"
          onClick={() => navigate('/comida')}
        >
          Regresar a comida
        </Button>
      </Container>
    );
  }

  const nombre = varianteSeleccionada ? varianteSeleccionada?.nombre ?? 'Producto' : productoData?.name ?? productoData?.nombre ?? 'Producto';
  const descripcion = varianteSeleccionada ? varianteSeleccionada?.descripcion ?? varianteSeleccionada?.description ?? '' : productoData?.description ?? productoData?.descripcion ?? '';
  const categoria = productoData?.category?.data?.attributes?.name ?? productoData?.category?.name ?? productoData?.categoria?.name ?? '';
  const disponible = productoData?.disponible ?? productoData?.available ?? productoData?.is_available ?? true;
  const imagenPrincipal = imagenes[imagenActiva]?.url ?? productoData?.image?.url ?? '';
  const peso = varianteSeleccionada ? varianteSeleccionada?.peso : productoData?.peso;
  const calorias = varianteSeleccionada ? varianteSeleccionada?.calorias : productoData?.calorias;
  const ingredientes = varianteSeleccionada ? varianteSeleccionada.ingredientes : productoData.ingredientes;
  const alergenos = varianteSeleccionada ? varianteSeleccionada.alergenos : productoData?.alergenos;

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: '#fafafa',
        py: {
          xs: 2,
          md: 4,
        },
      }}
    >
      <Container maxWidth="lg">
        {/* Breadcrumbs */}
        <Breadcrumbs
          sx={{
            mb: {
              xs: 2,
              md: 3,
            },
          }}
        >
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              cursor: 'pointer',
              '&:hover': {
                textDecoration: 'underline',
              },
            }}
            onClick={() => navigate('/comida')}
          >
            Comida
          </Typography>

          {categoria && (
            <Typography
              variant="body2"
              color="text.secondary"
            >
              {categoria}
            </Typography>
          )}

          <Typography
            variant="body2"
            color="text.primary"
            fontWeight={600}
          >
            {nombre}
          </Typography>
        </Breadcrumbs>
        {/* PRODUCTO */}
        <Paper
          elevation={0}
          sx={{
            borderRadius: {
              xs: 2,
              md: 4,
            },
            overflow: 'hidden',
            border: '1px solid',
            borderColor: 'divider',
            backgroundColor: '#fff',
          }}
        >
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                md: '1fr 1fr',
              },
              gap: {
                xs: 3,
                md: 5,
              },
              p: {
                xs: 2,
                sm: 3,
                md: 5,
              },
            }}
          >
            {/* GALERÍA */}
            <Box>
              <Box
                sx={{
                  position: 'relative',
                  width: '100%',
                  aspectRatio: '1 / 1',
                  borderRadius: 3,
                  overflow: 'hidden',
                  backgroundColor: '#f4f4f4',
                }}
              >
                {/* Visualización de imagen */}
                {
                  imagenPrincipal ? (
                    <Box
                      component="img"
                      src={imagenPrincipal}
                      alt={imagenes[imagenActiva]?.alternativeText ?? nombre
                      }
                      sx={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: 'block',
                      }}
                    />
                  ) : (
                    <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', }}>
                      <Restaurant sx={{ fontSize: 80, color: 'text.disabled', }} />
                    </Box>
                  )
                }
                {/* Botones de acción de cambio de imágenes */}
                {
                  imagenes.length > 1 && (
                    <>
                      <IconButton
                        onClick={anteriorImagen}
                        sx={{
                          position: 'absolute',
                          left: 12,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          backgroundColor:
                            'rgba(255,255,255,.9)',
                          '&:hover': {
                            backgroundColor: '#fff',
                          },
                        }}
                      >
                        <ArrowBackIosNew fontSize="small" />
                      </IconButton>
                      <IconButton
                        onClick={siguienteImagen}
                        sx={{
                          position: 'absolute',
                          right: 12,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          backgroundColor:
                            'rgba(255,255,255,.9)',
                          '&:hover': {
                            backgroundColor: '#fff',
                          },
                        }}
                      >
                        <ArrowForwardIos fontSize="small" />
                      </IconButton>
                    </>
                  )
                }
              </Box>
              {/* Miniaturas */}
              {
                imagenes.length > 1 && (
                  <Stack
                    direction="row"
                    spacing={1}
                    sx={{
                      mt: 1.5,
                      overflowX: 'auto',
                      pb: 1,
                    }}
                  >
                    {imagenes.map((imagen, index) => (
                      <Box
                        key={imagen.id || index}
                        onClick={() =>
                          setImagenActiva(index)
                        }
                        sx={{
                          flex: '0 0 auto',
                          width: {
                            xs: 65,
                            sm: 75,
                          },
                          height: {
                            xs: 65,
                            sm: 75,
                          },
                          borderRadius: 2,
                          overflow: 'hidden',
                          cursor: 'pointer',
                          border: '2px solid',
                          borderColor: imagenActiva === index ? 'primary.main' : 'transparent',
                          transition: 'all .2s',
                          '&:hover': {
                            opacity: 0.8,
                          },
                        }}
                      >
                        <Box
                          component="img"
                          src={imagen.url}
                          alt={imagen.alternativeText}
                          sx={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                          }}
                        />
                      </Box>
                    ))}
                  </Stack>
                )
              }
            </Box>
            {/* INFORMACIÓN */}
            <Box sx={{ display: 'flex', flexDirection: 'column', }} >
              {/* Categoría */}
              {
                categoria && (
                  <Typography variant="overline" color="primary" fontWeight={700} sx={{ letterSpacing: 1, }} >
                    {categoria}
                  </Typography>
                )
              }
              {/* Nombre */}
              <Typography variant="h3" component="h1" fontWeight={800} sx={{ fontSize: { xs: '2rem', md: '2.6rem', }, lineHeight: 1.15, mb: 1.5, }} >
                {nombre}
              </Typography>
              {/* Disponibilidad */}
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                <Chip
                  icon={disponible ? (<CheckCircle />) : undefined}
                  label={disponible ? 'Disponible' : 'No disponible'}
                  size="small"
                  color={disponible ? 'success' : 'default'}
                  variant="outlined"
                />
              </Stack>
              {/* Precio */}
              {
                precio !== null && (
                  <Typography variant="h4" fontWeight={800} sx={{ mb: 2, }} >
                    {formatoPrecio(precio)}
                  </Typography>
                )
              }
              {/* Descripción */}
              {descripcion && (
                <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.7, mb: 3, }} >
                  {descripcion}
                </Typography>
              )}
              {/* VARIANTES */}
              {variantes.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" fontWeight={700} sx={{ mb: 1.5 }} >
                    Elige una opción
                  </Typography>
                  <Stack spacing={1}>
                    {variantes.map((variante) => {
                      const seleccionada = varianteSeleccionada?.id === variante.id;
                      const nombreVariante = variante?.name ?? variante?.nombre ?? variante?.title ?? 'Variante';
                      const precioVariante = variante?.price ?? variante?.precio;
                      const descripcionVariante = variante?.description ?? variante?.descripcion ?? '';
                      const disponibleVariante = variante?.available ?? variante?.disponible ?? true;

                      return (
                        <Card
                          key={variante.id}
                          variant="outlined"
                          onClick={() => {
                            if (disponibleVariante && variante?.id != varianteSeleccionada?.id) {
                              setVarianteSeleccionada(variante);
                            } else {
                              setVarianteSeleccionada(null);
                            }
                          }}
                          sx={{
                            cursor: disponibleVariante ? 'pointer' : 'default',
                            borderWidth: seleccionada ? 2 : 1,
                            borderColor: seleccionada ? 'primary.main' : 'divider',
                            backgroundColor: seleccionada ? 'primary.50' : '#fff',
                            opacity: disponibleVariante ? 1 : 0.5,
                            transition: 'all .2s',
                            '&:hover': disponibleVariante ? { borderColor: 'primary.main' } : {},
                          }}
                        >
                          <CardContent
                            sx={{
                              '&:last-child': {
                                pb: 2,
                              },
                            }}
                          >
                            <Stack
                              direction="row"
                              justifyContent="space-between"
                              alignItems="center"
                              spacing={2}
                            >
                              <Box>
                                <Typography fontWeight={700}>
                                  {nombreVariante}
                                </Typography>

                                {descripcionVariante && (
                                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }} >
                                    {descripcionVariante}
                                  </Typography>
                                )}
                              </Box>
                              <Box sx={{ textAlign: 'right', flexShrink: 0, }} >
                                {precioVariante !== undefined && (
                                  <Typography fontWeight={700} >
                                    {formatoPrecio(precioVariante)}
                                  </Typography>
                                )}
                                {seleccionada && (
                                  <CheckCircle
                                    color="primary"
                                    sx={{
                                      mt: 0.5,
                                    }}
                                  />
                                )}
                              </Box>
                            </Stack>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </Stack>
                </Box>
              )}
              <Divider sx={{ mb: 3 }} />
              {/* Tiempo preparación / peso */}
              <Box display="flex" justifyContent="space-between" gap={1} flexWrap='wrap'>
                <Typography variant="caption" color="text.secondary">Tiempo preparación: {productoData?.tiempo_preparacion ?? 0}</Typography>
                <Typography variant="caption" color="text.secondary">Peso: {peso ?? 0}{" "} Kg</Typography>
              </Box>
              {/* Calorias / porciones */}
              <Box display="flex" justifyContent="space-between" gap={1} flexWrap='wrap'>
                <Typography variant="caption" color="text.secondary">Calorias: {calorias ?? 0}</Typography>
                <Typography variant="caption" color="text.secondary">Porciones: {productoData?.porciones ?? 0}</Typography>
              </Box>
              {/* Picante / Temperatura */}
              <Box display="flex" justifyContent="space-between" gap={1} flexWrap='wrap'>
                <Typography variant="caption" color="text.secondary">Picante: {productoData?.nivel_picante ?? 'ninguno'}</Typography>
                <Typography variant="caption" color="text.secondary">Temperatura: {productoData?.temperatura ?? ''}</Typography>
              </Box>
              {/* INGREDIENTES */}
              {ingredientes?.length > 0 && (
                <Box sx={{ mb: 3 }}>

                  <Typography
                    variant="h6"
                    fontWeight={700}
                    sx={{ mb: 1 }}
                  >
                    Ingredientes
                  </Typography>

                  <Typography
                    variant="body2"
                    color="text.secondary"
                  >
                    {ingredientes.map((item) => item?.name ?? item?.nombre ?? item).join(', ')}
                  </Typography>
                </Box>
              )}
              {/* Alergenos */}
              {alergenos?.length > 0 && (
                <Box sx={{ mb: 3 }}>

                  <Typography
                    variant="h6"
                    fontWeight={700}
                    sx={{ mb: 1 }}
                  >
                    Alérgenos
                  </Typography>

                  <Typography
                    variant="body2"
                    color="text.secondary"
                  >
                    {alergenos.join(', ')}
                  </Typography>
                </Box>
              )}
              <Box display="flex" alignItems="center" gap={1} flexWrap="wrap" mt={2}>
                {productoData?.vegetariano && (<Chip label="Vegetariano" color="success" size="small" sx={{ fontWeight: 700 }} />)}
                {productoData?.vegano && (<Chip label="Vegano" color="success" size="small" sx={{ fontWeight: 700 }} />)}
                {productoData?.sin_gluten && (<Chip label="Sin gluten" color="default" size="small" sx={{ fontWeight: 700 }} />)}
                {productoData?.contiene_lacteos && (<Chip label="Contiene lacteos" color="info" size="small" sx={{ fontWeight: 700 }} />)}
                {productoData?.contiene_mariscos && (<Chip label="Contiene mariscos" color="error" size="small" sx={{ fontWeight: 700 }} />)}
                {productoData?.contiene_cerdo && (<Chip label="Contiene cerdo" color="secondary" size="small" sx={{ fontWeight: 700 }} />)}
              </Box>
              {/* Modificadores */}
              {
                /*
                modifiersByGroup.length > 0 && isMobilDevice && (
                  <SeleccionarProductoModificadores
                    modifierGroups={modifiersByGroup}
                    selectedModifiers={selectedModifiers}
                    setSelectedModifiers={setSelectedModifiers}
                    showAlert={false}
                    indicationMessage='Selecciona las opciones para personalizar tu pedido.'
                  />
                )
                  */
              }

              {/* ================================================== */}
              {/* ACCIÓN */}
              {/* ================================================== */}

              <Box sx={{ mt: 'auto', pt: 2 }}>

                <Button
                  fullWidth
                  variant="contained"
                  size="large"
                  disabled={!disponible}
                  startIcon={<ShoppingCart />}
                  sx={{
                    py: 1.6,
                    borderRadius: 2,
                    fontWeight: 700,
                    textTransform: 'none',
                    fontSize: '1rem',
                  }}
                  onClick={() => {
                    handleAgregarAlPedido();
                  }}
                >
                  Agregar al pedido
                </Button>

              </Box>

            </Box>
          </Box>
        </Paper>
        <FoodProductConfigModal
          open={configModalOpen}
          onClose={() => setConfigModalOpen(false)}
          producto={productoData}
          variantes={variantes}
          varianteInicial={varianteSeleccionada}
          modificadores={productoData?.food_modifiers?.data}
          onConfirm={(configuracion) => {
            console.log("Datos a registrar carrito:", configuracion)
            const item = addItem(configuracion);
            console.log("Item carrito agregado:", item);
          }}
        />
      </Container>
    </Box >
  );
};

export default ComidaProducto;