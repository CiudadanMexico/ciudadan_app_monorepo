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

const STRAPI_URL = process.env.REACT_APP_STRAPI_URL;

const ComidaProducto = () => {
  const { slug } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { getProductBySlug, getProductById } = useProductsRestaurant();

  /**
   * Puede venir mediante:
   *
   * navigate(`/comida/producto/${slug}`)
   *
   * o:
   *
   * navigate(`/comida/producto/${slug}`, {
   *   state: {
   *     product_id: producto.id
   *   }
   * })
   */
  const productIdFromState = location.state?.product_id;

  const [producto, setProducto] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [imagenActiva, setImagenActiva] = useState(0);
  const [varianteSeleccionada, setVarianteSeleccionada] = useState(null);

  /**
   * ============================================================
   * OBTENER PRODUCTO
   * ============================================================
   */
  useEffect(() => {
    const obtenerProducto = async () => {
      try {
        setLoading(true);
        setError('');

        let response;

        /**
         * Si tenemos product_id en state,
         * damos prioridad al ID.
         */
        if (productIdFromState) {
          response = await getProductById(productIdFromState);
        } else if (slug) {
          /**
           * Búsqueda mediante slug.
           */
          response = await getProductBySlug(slug);
        } else {
          throw new Error('No se proporcionó un producto');
        }

        const data = response;

        if (!data) {
          throw new Error('No fue posible obtener el producto');
        }
        console.log("Producto data:", data);
        setProducto(data);

        /**
         * Seleccionar automáticamente
         * la primera variante disponible.
         */
        const variantes =
          data?.attributes?.variants ||
          data?.attributes?.food_product_variants ||
          data?.variants ||
          [];

        const variantesNormalizadas = Array.isArray(variantes)
          ? variantes
          : variantes?.data || [];

        if (variantesNormalizadas.length > 0) {
          // setVarianteSeleccionada(variantesNormalizadas[0]);
        }
      } catch (err) {
        console.error(err);

        setError(
          err?.message ||
          'No fue posible cargar la información del producto.'
        );
      } finally {
        setLoading(false);
      }
    };

    obtenerProducto();
  }, [slug, productIdFromState]);


  /**
   * ============================================================
   * NORMALIZAR PRODUCTO
   * ============================================================
   *
   * Permite trabajar independientemente de si la respuesta
   * viene como:
   *
   * data.attributes
   *
   * o directamente:
   *
   * data
   */
  const productoData = useMemo(() => {
    if (!producto) return {};

    return producto?.attributes
      ? {
        id: producto.id,
        ...producto.attributes,
      }
      : producto;
  }, [producto]);


  /**
   * ============================================================
   * VARIANTES
   * ============================================================
   */
  const variantes = useMemo(() => {
    const variantesData =
      productoData?.variants ||
      productoData?.food_product_variants ||
      productoData?.food_product_variants?.data ||
      [];

    const lista = Array.isArray(variantesData)
      ? variantesData
      : variantesData?.data || [];

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


  /**
   * ============================================================
   * IMÁGENES
   * ============================================================
   */
  const imagenes = useMemo(() => {
    if (!productoData) return [];
    /**
     * ============================================================
     * NORMALIZAR IMAGEN
     * ============================================================
     */
    const normalizarImagen = (item) => {
      if (!item) return null;

      const image = item?.attributes || item;

      let url =
        image?.url ??
        image?.formats?.small?.url ??
        image?.formats?.medium?.url ??
        image?.formats?.large?.url ??
        '';

      if (!url) return null;

      /**
       * Si la URL es relativa, agregamos STRAPI_URL.
       */
      if (url.startsWith('/')) {
        url = `${STRAPI_URL}${url}`;
      }

      return {
        id: item?.id ?? image?.id ?? null,
        url,
        alternativeText:
          image?.alternativeText ||
          productoData?.name ||
          'Imagen del producto',
      };
    };
    /**
     * ============================================================
     * OBTENER IMÁGENES DEL PRODUCTO
     * ============================================================
     */
    const obtenerImagenesProducto = () => {
      const resultado = [];
      /**
       * Imagen predeterminada
       */
      const imagenPredeterminada = normalizarImagen(productoData?.imagen_predeterminada);

      if (imagenPredeterminada) {
        resultado.push(imagenPredeterminada);
      }

      /**
       * Galería general del producto
       */
      const imagenesData = productoData?.images ?? productoData?.imagenes ?? productoData?.gallery ?? [];

      const lista = Array.isArray(imagenesData)
        ? imagenesData
        : imagenesData?.data || [];

      lista
        .map(normalizarImagen)
        .filter(Boolean)
        .forEach((imagen) => {
          const existe = resultado.some(
            (item) =>
              item.id === imagen.id ||
              item.url === imagen.url
          );

          if (!existe) {
            resultado.push(imagen);
          }
        });

      return resultado;
    };


    /**
     * ============================================================
     * OBTENER IMÁGENES DE LA VARIANTE
     * ============================================================
     */
    const obtenerImagenesVariante = () => {
      if (!varianteSeleccionada) {
        return [];
      }

      const resultado = [];

      /**
       * Imagen predeterminada de la variante
       */
      const imagenPredeterminada =
        normalizarImagen(
          varianteSeleccionada?.imagen_predeterminada
        );

      if (imagenPredeterminada) {
        resultado.push(imagenPredeterminada);
      }

      /**
       * Galería de imágenes de la variante
       */
      const imagenesData =
        varianteSeleccionada?.images ??
        varianteSeleccionada?.imagenes ??
        varianteSeleccionada?.gallery ??
        [];

      const lista = Array.isArray(imagenesData)
        ? imagenesData
        : imagenesData?.data || [];

      lista
        .map(normalizarImagen)
        .filter(Boolean)
        .forEach((imagen) => {
          const existe = resultado.some(
            (item) =>
              item.id === imagen.id ||
              item.url === imagen.url
          );

          if (!existe) {
            resultado.push(imagen);
          }
        });

      return resultado;
    };


    /**
     * ============================================================
     * SELECCIONAR GALERÍA
     * ============================================================
     */
    const imagenesVariante = obtenerImagenesVariante();

    /**
     * Si la variante tiene imágenes,
     * utilizamos exclusivamente las imágenes de la variante.
     *
     * Si no tiene imágenes,
     * hacemos fallback a las imágenes del producto.
     */
    if (imagenesVariante.length > 0) {
      return imagenesVariante;
    }
    return obtenerImagenesProducto();

  }, [productoData, varianteSeleccionada]);


  /**
   * ============================================================
   * PRECIO
   * ============================================================
   *
   * Si la variante seleccionada tiene precio,
   * utilizamos el precio de la variante.
   *
   * En caso contrario utilizamos el precio base
   * del producto.
   */
  const precio = useMemo(() => {
    const precioVariante =
      varianteSeleccionada?.price ??
      varianteSeleccionada?.precio;

    const precioProducto =
      productoData?.price ??
      productoData?.precio;

    return precioVariante ?? precioProducto ?? null;
  }, [productoData, varianteSeleccionada]);


  /**
   * ============================================================
   * FORMATEAR PRECIO
   * ============================================================
   */
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

  const categoria =
    productoData?.category?.data?.attributes?.name ||
    productoData?.category?.name ||
    productoData?.categoria?.name ||
    '';

  const disponible =
    productoData?.available ??
    productoData?.disponible ??
    productoData?.is_available ??
    true;

  const imagenPrincipal =
    imagenes[imagenActiva]?.url ||
    productoData?.image?.url ||
    '';


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

        {/* ================================================== */}
        {/* BREADCRUMBS */}
        {/* ================================================== */}

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


        {/* ================================================== */}
        {/* PRODUCTO */}
        {/* ================================================== */}

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

            {/* ================================================== */}
            {/* GALERÍA */}
            {/* ================================================== */}

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
                {imagenPrincipal ? (
                  <Box
                    component="img"
                    src={imagenPrincipal}
                    alt={
                      imagenes[imagenActiva]?.alternativeText ||
                      nombre
                    }
                    sx={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block',
                    }}
                  />
                ) : (
                  <Box
                    sx={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Restaurant
                      sx={{
                        fontSize: 80,
                        color: 'text.disabled',
                      }}
                    />
                  </Box>
                )}

                {imagenes.length > 1 && (
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
                )}
              </Box>


              {/* Miniaturas */}

              {imagenes.length > 1 && (
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
                        borderColor:
                          imagenActiva === index
                            ? 'primary.main'
                            : 'transparent',
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
              )}
            </Box>


            {/* ================================================== */}
            {/* INFORMACIÓN */}
            {/* ================================================== */}

            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
              }}
            >

              {/* Categoría */}

              {categoria && (
                <Typography
                  variant="overline"
                  color="primary"
                  fontWeight={700}
                  sx={{
                    letterSpacing: 1,
                  }}
                >
                  {categoria}
                </Typography>
              )}


              {/* Nombre */}

              <Typography
                variant="h3"
                component="h1"
                fontWeight={800}
                sx={{
                  fontSize: {
                    xs: '2rem',
                    md: '2.6rem',
                  },
                  lineHeight: 1.15,
                  mb: 1.5,
                }}
              >
                {nombre}
              </Typography>


              {/* Disponibilidad */}

              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                sx={{ mb: 2 }}
              >
                <Chip
                  icon={
                    disponible ? (
                      <CheckCircle />
                    ) : undefined
                  }
                  label={
                    disponible
                      ? 'Disponible'
                      : 'No disponible'
                  }
                  size="small"
                  color={
                    disponible
                      ? 'success'
                      : 'default'
                  }
                  variant="outlined"
                />
              </Stack>


              {/* Precio */}

              {precio !== null && (
                <Typography
                  variant="h4"
                  fontWeight={800}
                  sx={{
                    mb: 2,
                  }}
                >
                  {formatoPrecio(precio)}
                </Typography>
              )}


              {/* Descripción */}

              {descripcion && (
                <Typography
                  variant="body1"
                  color="text.secondary"
                  sx={{
                    lineHeight: 1.7,
                    mb: 3,
                  }}
                >
                  {descripcion}
                </Typography>
              )}


              {/* ================================================== */}
              {/* VARIANTES */}
              {/* ================================================== */}

              {variantes.length > 0 && (
                <Box sx={{ mb: 3 }}>

                  <Typography
                    variant="h6"
                    fontWeight={700}
                    sx={{ mb: 1.5 }}
                  >
                    Elige una opción
                  </Typography>

                  <Stack spacing={1}>
                    {variantes.map((variante) => {

                      const seleccionada =
                        varianteSeleccionada?.id ===
                        variante.id;

                      const nombreVariante =
                        variante?.name ||
                        variante?.nombre ||
                        variante?.title ||
                        'Variante';

                      const precioVariante =
                        variante?.price ??
                        variante?.precio;

                      const descripcionVariante =
                        variante?.description ||
                        variante?.descripcion ||
                        '';

                      const disponibleVariante =
                        variante?.available ??
                        variante?.disponible ??
                        true;

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
                            cursor: disponibleVariante
                              ? 'pointer'
                              : 'default',
                            borderWidth: seleccionada
                              ? 2
                              : 1,
                            borderColor: seleccionada
                              ? 'primary.main'
                              : 'divider',
                            backgroundColor:
                              seleccionada
                                ? 'primary.50'
                                : '#fff',
                            opacity:
                              disponibleVariante
                                ? 1
                                : 0.5,
                            transition: 'all .2s',
                            '&:hover': disponibleVariante
                              ? {
                                borderColor:
                                  'primary.main',
                              }
                              : {},
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
                                <Typography
                                  fontWeight={700}
                                >
                                  {nombreVariante}
                                </Typography>

                                {descripcionVariante && (
                                  <Typography
                                    variant="body2"
                                    color="text.secondary"
                                    sx={{ mt: 0.5 }}
                                  >
                                    {descripcionVariante}
                                  </Typography>
                                )}
                              </Box>

                              <Box
                                sx={{
                                  textAlign: 'right',
                                  flexShrink: 0,
                                }}
                              >
                                {precioVariante !==
                                  undefined && (
                                    <Typography
                                      fontWeight={700}
                                    >
                                      {formatoPrecio(
                                        precioVariante
                                      )}
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


              {/* ================================================== */}
              {/* CARACTERÍSTICAS */}
              {/* ================================================== */}

              {productoData?.characteristics?.length > 0 && (
                <Box sx={{ mb: 3 }}>

                  <Typography
                    variant="h6"
                    fontWeight={700}
                    sx={{ mb: 1 }}
                  >
                    Características
                  </Typography>

                  <Stack
                    direction="row"
                    flexWrap="wrap"
                    gap={1}
                  >
                    {productoData.characteristics.map(
                      (item, index) => (
                        <Chip
                          key={item?.id || index}
                          label={
                            item?.name ||
                            item?.nombre ||
                            item
                          }
                          variant="outlined"
                        />
                      )
                    )}
                  </Stack>
                </Box>
              )}


              {/* ================================================== */}
              {/* INGREDIENTES */}
              {/* ================================================== */}

              {productoData?.ingredients?.length > 0 && (
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
                    {productoData.ingredients
                      .map(
                        (item) =>
                          item?.name ||
                          item?.nombre ||
                          item
                      )
                      .join(', ')}
                  </Typography>
                </Box>
              )}


              {/* ================================================== */}
              {/* ACCIÓN */}
              {/* ================================================== */}

              <Box sx={{ mt: 'auto', pt: 2 }}>

                <Button
                  fullWidth
                  variant="contained"
                  size="large"
                  disabled={
                    !disponible ||
                    !varianteSeleccionada &&
                    variantes.length > 0
                  }
                  startIcon={<ShoppingCart />}
                  sx={{
                    py: 1.6,
                    borderRadius: 2,
                    fontWeight: 700,
                    textTransform: 'none',
                    fontSize: '1rem',
                  }}
                  onClick={() => {
                    /**
                     * Aquí posteriormente podemos conectar
                     * tu carrito.
                     *
                     * Por ahora dejamos preparado el objeto.
                     */
                    const productoCarrito = {
                      product_id:
                        productoData?.id ||
                        producto?.id,
                      variant_id:
                        varianteSeleccionada?.id ||
                        null,
                      quantity: 1,
                    };

                    console.log(
                      'Producto para carrito:',
                      productoCarrito
                    );
                  }}
                >
                  Agregar al pedido
                </Button>

              </Box>

            </Box>
          </Box>
        </Paper>

      </Container>
    </Box>
  );
};

export default ComidaProducto;