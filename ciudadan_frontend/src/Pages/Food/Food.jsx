// src/pages/MarketPlace/Food.jsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Buscador from '../../components/Food/Buscador.jsx';
import ProductoCard from '../../components/MarketPlace/ProductoCard.jsx';
import CategoriasSlider from '../../components/MarketPlace/CategoriasSlider.jsx';
import { useUbicacion } from '../../hooks/useUbicacion.jsx';
import useProductos from '../../hooks/useProductos.jsx';
import EnviosBanner from '../../components/Food/EnviosBanner.jsx';
import {
  Box,
  Grid,
  Container,
  Typography,
  Button,
  TextField,
  Stack,
  Pagination,
  useMediaQuery,
  useTheme,
  Paper,
  Chip,
  Tab,
  Tabs,
} from '@mui/material';

// Iconos
import DeliveryDiningIcon from '@mui/icons-material/DeliveryDining';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import { useFoodCategories } from '../../hooks/food/useFoodCategories.jsx';
import useProductsRestaurant from '../../hooks/food/useProductsRestaurant.jsx';
import FoodProductCard from '../../components/Food/FoodProductCard.jsx';
import { useRoles } from '../../Contexts/RolesContext.jsx';
import { useFoodRestaurants } from '../../hooks/food/useFoodRestaurants.jsx';
import RestaurantAdministration from './RestaurantAdministration.jsx';

const tabs = ['Platillos', 'Restaurante'];
const Food = ({ filtros = '', parametros = '' }) => {
  // colores y constantes de UI
  const BG_LIGHT = '#fff4e5'; // fondo clarito naranja
  const SEARCH_ORANGE = '#ff6f00'; // botón buscar naranja fuerte
  const SELL_ORANGE = '#ff3300'; // vender - naranja aún más fuerte

  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const navigate = useNavigate();

  const safeLogError = (ctx, err) => {
    try {
      console.error(ctx, err);
    } catch (e) {
      try {
        console.error(ctx, String(err));
      } catch (e2) {
        console.error(ctx, 'Unknown error (failed to stringify)');
      }
    }
  };

  // hooks y datos
  const { getCategories, loading: loadingCategories } = useFoodCategories();
  const { ubicacion } = useUbicacion();
  const { getProducts, page, pagination, setPage, loading: loadingProducts, } = useProductsRestaurant();
  const { roles, userData } = useRoles();

  const { getRestaurantsByEmail } = useFoodRestaurants();

  const [productos, setProductos] = useState([]);

  const [categorias, setCategorias] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [visible, setVisible] = useState({});
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedTab, setSelectedTab] = useState(0);
  const [restaurant, setRestaurant] = useState(null);

  const itemRefs = useRef(new Map()); // id -> element
  const observerRef = useRef(null);
  const lastProductRef = useRef(null);
  const loadMoreObserver = useRef(null);
  const isNewSearchRef = useRef(false); // Flag para distinguir si cuando cambian filtros
  const requestingNextPage = useRef(false); // Flag para prevenir solicitar 2 páginas a la vez

  // títulos
  const { showCategories, title } = useMemo(() => {
    if (busqueda)
      return ({ showCategories: false, title: `Resultados de Búsqueda «${(busqueda).charAt(0).toUpperCase() + (busqueda).slice(1)}»` });
    if (selectedCategory)
      return ({ showCategories: false, title: `Platillos en Categoría «${(selectedCategory).charAt(0).toUpperCase() + (selectedCategory).slice(1)}»` });
    return ({ showCategories: true, title: '' });
  }, [busqueda, selectedCategory]);

  const hasMore = useMemo(() => {
    return (pagination?.page < pagination?.pageCount);
  }, [pagination]);

  const hasRestaurant = useMemo(() => {
    if (!Array.isArray(roles)) return false;
    return roles.includes('restaurant');
  }, [roles]);
  // handlers
  const handleBuscar = () => {
    const slug = busqueda.trim().toLowerCase().replace(/\s+/g, '-');
    if (!slug) return;
    navigate(`/productos/busqueda/${slug}`);
  };
  const handleCategoriaClick = (slug) => navigate(`/productos/categoria/${slug}`);
  const handleOfertas = () => navigate('/comida-ofertas');
  const handleEnvios = () => navigate('/comida/envios');

  const handleGetProducts = async (search = '', category = '') => {
    const fetchParams = {};
    if (search) {
      fetchParams['filters[$or][0][nombre][$containsi]'] = search;
      fetchParams['filters[$or][1][descripcion][$containsi]'] = search;
    }
    if (category) {
      fetchParams['filters[food_categories][slug][$eq]'] = category;
    }

    const products = await getProducts(fetchParams);
    setProductos(products);

  };

  const fetchStoreData = async (userEmail = '') => {
    try {
      if (!userEmail || !hasRestaurant) return;

      const restaurants = await getRestaurantsByEmail(userEmail);
      if (restaurants.length) {
        setRestaurant(restaurants[0]);
      } else {
        setTimeout(() => navigate('/comida/afiliar-restaurante', { replace: true }), 800);
      }
    } catch (error) {
      console.error('❌ Error al traer datos de la tienda:', error);
    }
  };

  const handleChange = (event, newValue) => {
    setSelectedTab(newValue);
  };

  // cargar categorias
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const cats = await getCategories();
        if (!mounted) return;
        setCategorias(cats || []);
        console.log("Categorias food:", cats);
      } catch (e) {
        safeLogError('Error cargando categorías', e);
        if (mounted) setCategorias([]);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!userData?.email || !hasRestaurant) return;
    fetchStoreData(userData?.email);
  }, [userData?.email, hasRestaurant])


  useEffect(() => {
    setProductos([]);
    setPage(v => v !== 1 ? 1 : v);
    setVisible({});
  }, [busqueda, selectedCategory])


  // cargar productos
  useEffect(() => {
    if (filtros) return;
    let mounted = true;
    handleGetProducts(busqueda, selectedCategory);
    return () => {
      mounted = false;
    };
  }, [busqueda, selectedCategory, page]);

  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          const id = e.target.getAttribute('data-id');
          if (id) {
            setVisible(v => ({ ...v, [id]: true }));
            try { observer.unobserve(e.target); } catch (_) { }
          }
        }
      });
    }, { threshold: 0.2 });

    observerRef.current = observer;
    itemRefs.current.forEach(el => {
      if (el) observer.observe(el);
    });

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
    };
  }, [productos]);

  useEffect(() => {
    if (loadMoreObserver.current) {
      loadMoreObserver.current.disconnect();
    }

    loadMoreObserver.current = new IntersectionObserver(
      entries => {
        const first = entries[0];
        if (first.isIntersecting && !loadingProducts && hasMore && !requestingNextPage.current) {
          requestingNextPage.current = true;
          setPage(prev => prev + 1);
        }
      },
      {
        threshold: 0.5
      }
    );

    if (lastProductRef.current) {
      loadMoreObserver.current.observe(lastProductRef.current);
    }

    return () => {
      loadMoreObserver.current?.disconnect();
    };

  }, [productos, loadingProducts, hasMore]);

  // useEffect(() => {
  //   if (!filtros) return;
  //   try {
  //     fetchProductosFiltros({ filtros, parametros });
  //   } catch (e) {
  //     safeLogError('fetchProductosFiltros falló', e);
  //   }
  // }, [pagina, porPagina, filtros, parametros, fetchProductosFiltros]);

  // useEffect(() => {
  //   const observer = new IntersectionObserver(
  //     (entries) => {
  //       entries.forEach((e) => {
  //         if (e.isIntersecting) {
  //           const id = e.target.getAttribute('data-id');
  //           if (!id) return;
  //           setVisible((v) => ({ ...v, [id]: true }));
  //           try {
  //             observer.unobserve(e.target);
  //           } catch (e) {}
  //         }
  //       });
  //     },
  //     { threshold: 0.18 }
  //   );
  //   const lista = filtros ? productosFiltrados?.data ?? [] : productos;
  //   if (Array.isArray(lista)) {
  //     lista.forEach((prod) => {
  //       try {
  //         const id = prod?.id;
  //         if (!id) return;
  //         const el = document.querySelector(`[data-id='${id}']`);
  //         if (el) observer.observe(el);
  //       } catch (e) {
  //         safeLogError('Observer error', e);
  //       }
  //     });
  //   }
  //   return () => observer.disconnect();
  // }, [filtros ? productosFiltrados : productos]);
  const a11yProps = (index) => ({
    id: `simple-tab-${index}`,
    'aria-controls': `simple-tabpanel-${index}`,
  });

  if (hasRestaurant) {
    return (
      <>
        <EnviosBanner />
        <Tabs
          value={selectedTab}
          onChange={handleChange}
          aria-label="basic tabs example"
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={{
            px:1,
            minHeight: { xs: 40, sm: 48 },
            '& .MuiTab-root': {
              minHeight: { xs: 40, sm: 48 },
              minWidth: { xs: 'auto', sm: 90 },
              fontSize: { xs: '0.75rem', sm: '0.875rem' },
              px: { xs: 1.25, sm: 2 },
              whiteSpace: 'nowrap'
            }
          }}
        >
          {
            tabs.map((item, index) => (
              <Tab key={`item-tab-${index}`} label={item} {...a11yProps(index)} />
            ))
          }
        </Tabs>
        {
          selectedTab == 0 && (
            <Box sx={{ bgcolor: BG_LIGHT, minHeight: '100vh', pb: 8 }}>
              <Container maxWidth="lg" sx={{ pt: 3 }}>
                {/* TOP: buscador + banner envío */}
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center" mb={2}>
                  {/* Buscador */}
                  <Box
                    sx={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      bgcolor: '#fff1e0',
                      p: 1,
                      borderRadius: 2,
                      boxShadow: '0 6px 18px rgba(0,0,0,0.06)',
                    }}
                  >
                    <Box sx={{ flex: 1 }}>
                      <Buscador
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        onSearch={handleBuscar}
                        placeholder="Busca comida, restaurantes o platillos..."
                      />
                    </Box>
                  </Box>

                  {/* 🔥 Envío <45 min con efecto latido */}
                  <Paper
                    onClick={handleEnvios}
                    elevation={0}
                    sx={{
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      px: 2,
                      py: 1,
                      borderRadius: '10px',
                      background: 'linear-gradient(90deg, rgba(255,255,255,0.92), rgba(255,250,240,0.9))',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
                      animation: 'pulseEnvio 2s infinite ease-in-out',
                      '@keyframes pulseEnvio': {
                        '0%': { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(255,111,0,0.3)' },
                        '50%': { transform: 'scale(1.03)', boxShadow: '0 0 10px 3px rgba(255,111,0,0.15)' },
                        '100%': { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(255,111,0,0.3)' },
                      },
                      transition: 'transform 0.3s ease',
                      '&:hover': { transform: 'scale(1.04)' },
                    }}
                  >
                    <AccessTimeIcon sx={{ color: SEARCH_ORANGE }} />
                    <Box>
                      <Typography variant="body2" fontWeight={800}>
                        Envío <span style={{ color: SEARCH_ORANGE }}>&lt;45 min</span>
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                      >
                        <MonetizationOnIcon sx={{ fontSize: 14 }} /> Pago justo al repartidor
                      </Typography>
                    </Box>
                  </Paper>
                </Stack>

                {/* CATEGORÍAS */}
                {(!loadingCategories && categorias.length > 0 && showCategories) && (
                  <Box sx={{ mb: 3 }}>
                    <Paper
                      elevation={1}
                      sx={{
                        p: 2,
                        mb: 2,
                        borderRadius: 2,
                        display: 'flex',
                        gap: 2,
                        alignItems: 'center',
                        background: 'linear-gradient(90deg, rgba(255,242,224,0.95), rgba(255,245,232,0.95))',
                      }}
                    >
                      <DeliveryDiningIcon sx={{ fontSize: 40, color: SEARCH_ORANGE }} />
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle1" fontWeight={900} sx={{ color: '#d35400' }}>
                          Tu comida favorita en casa en menos de 45 min
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Pago justo para quien te la trae • Opciones rápidas y sin contacto
                        </Typography>
                      </Box>
                      <Button
                        onClick={handleOfertas}
                        variant="contained"
                        sx={{
                          bgcolor: '#ffb74d',
                          color: '#4b2e00',
                          fontWeight: 700,
                          textTransform: 'none',
                        }}
                      >
                        Ver ofertas
                      </Button>
                    </Paper>

                    <Box sx={{ mb: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <Chip label="Entrega rápida" icon={<AccessTimeIcon />} sx={{ bgcolor: '#fff7f0', fontWeight: 700 }} />
                      <Chip label="Pago justo" icon={<MonetizationOnIcon />} sx={{ bgcolor: '#fff7f0', fontWeight: 700 }} />
                      <Chip label="Vegano" sx={{ bgcolor: '#fff7f0', fontWeight: 700 }} />
                      <Chip label="Sin contacto" sx={{ bgcolor: '#fff7f0', fontWeight: 700 }} />
                    </Box>

                    <Box sx={{ bgcolor: 'transparent', p: 1, borderRadius: 2 }}>
                      <CategoriasSlider
                        categorias={categorias.map((c) => ({
                          nombre: c.attributes?.nombre,
                          slug: c.attributes?.slug,
                          imagen: c?.attributes?.imagen?.urls?.thumbnail ?? c?.attributes?.imagen?.urls?.small ?? c?.attributes?.imagen?.urls?.original ?? '',
                        }))}
                        onClick={(slug) => handleCategoriaClick(slug)}
                      />
                    </Box>
                  </Box>
                )}

                {/* TITULO */}
                {title && (
                  <Typography variant="h6" fontWeight={900} sx={{ mb: 2, color: '#d35400' }}>
                    {title}
                  </Typography>
                )}

                {/* GRID DE PRODUCTOS */}
                <Grid container spacing={3}>
                  {productos.length === 0 && (
                    <Grid item xs={12}>
                      <Typography textAlign="center" color="text.secondary">
                        {filtros
                          ? 'Cargando platillos...'
                          : 'Aún no hay platillos publicados.'}
                      </Typography>
                    </Grid>
                  )}

                  {productos.map((product, idx) => (
                    <Grid
                      key={`product-item-${product?.id ?? Math.random()}`}
                      item
                      xs={12}
                      sm={6}
                      md={3}
                      data-id={product?.id ?? ''}
                      ref={(el) => {
                        if (el) itemRefs.current.set(product?.id, el);
                        else itemRefs.current.delete(product?.id);
                        if (idx === (productos.length - 1))
                          lastProductRef.current = el;
                      }}
                      sx={{
                        opacity: visible[product?.id] ? 1 : 0,
                        transform: visible[product?.id] ? 'translateY(0)' : 'translateY(18px)',
                        transition: 'all 0.55s cubic-bezier(.2,.9,.3,1)',
                      }}
                    >
                      <FoodProductCard producto={product} />
                    </Grid>
                  ))}
                </Grid>

                {/* PAGINACIÓN */}
                {/* {filtros && Array.isArray(productosFiltrados?.data) && productosFiltrados.data.length > porPagina && (
            <Box mt={3} display="flex" justifyContent="center" alignItems="center">
              <Pagination
                count={Math.ceil(totalItems / porPagina)}
                page={pagina}
                onChange={(_, v) => setPage(v)}
                color="primary"
              />
              <TextField
                select
                value={porPagina}
                onChange={(e) => setPorPagina(Number(e.target.value))}
                SelectProps={{ native: true }}
                size="small"
                sx={{ width: 92, ml: 2 }}
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
              </TextField>
            </Box>
          )} */}
              </Container>
            </Box>
          )
        }
        {
          selectedTab == 1 && (
            <RestaurantAdministration restaurantData={restaurant} />
          )
        }
      </>
    );
  }

  return (
    <>
      <EnviosBanner />

      <Box sx={{ bgcolor: BG_LIGHT, minHeight: '100vh', pb: 8 }}>
        <Container maxWidth="lg" sx={{ pt: 3 }}>
          {/* TOP: buscador + banner envío */}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center" mb={2}>
            {/* Buscador */}
            <Box
              sx={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                bgcolor: '#fff1e0',
                p: 1,
                borderRadius: 2,
                boxShadow: '0 6px 18px rgba(0,0,0,0.06)',
              }}
            >
              <Box sx={{ flex: 1 }}>
                <Buscador
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  onSearch={handleBuscar}
                  placeholder="Busca comida, restaurantes o platillos..."
                />
              </Box>
            </Box>

            {/* 🔥 Envío <45 min con efecto latido */}
            <Paper
              onClick={handleEnvios}
              elevation={0}
              sx={{
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                px: 2,
                py: 1,
                borderRadius: '10px',
                background: 'linear-gradient(90deg, rgba(255,255,255,0.92), rgba(255,250,240,0.9))',
                boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
                animation: 'pulseEnvio 2s infinite ease-in-out',
                '@keyframes pulseEnvio': {
                  '0%': { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(255,111,0,0.3)' },
                  '50%': { transform: 'scale(1.03)', boxShadow: '0 0 10px 3px rgba(255,111,0,0.15)' },
                  '100%': { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(255,111,0,0.3)' },
                },
                transition: 'transform 0.3s ease',
                '&:hover': { transform: 'scale(1.04)' },
              }}
            >
              <AccessTimeIcon sx={{ color: SEARCH_ORANGE }} />
              <Box>
                <Typography variant="body2" fontWeight={800}>
                  Envío <span style={{ color: SEARCH_ORANGE }}>&lt;45 min</span>
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                >
                  <MonetizationOnIcon sx={{ fontSize: 14 }} /> Pago justo al repartidor
                </Typography>
              </Box>
            </Paper>
          </Stack>

          {/* CATEGORÍAS */}
          {(!loadingCategories && categorias.length > 0 && showCategories) && (
            <Box sx={{ mb: 3 }}>
              <Paper
                elevation={1}
                sx={{
                  p: 2,
                  mb: 2,
                  borderRadius: 2,
                  display: 'flex',
                  gap: 2,
                  alignItems: 'center',
                  background: 'linear-gradient(90deg, rgba(255,242,224,0.95), rgba(255,245,232,0.95))',
                }}
              >
                <DeliveryDiningIcon sx={{ fontSize: 40, color: SEARCH_ORANGE }} />
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle1" fontWeight={900} sx={{ color: '#d35400' }}>
                    Tu comida favorita en casa en menos de 45 min
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Pago justo para quien te la trae • Opciones rápidas y sin contacto
                  </Typography>
                </Box>
                <Button
                  onClick={handleOfertas}
                  variant="contained"
                  sx={{
                    bgcolor: '#ffb74d',
                    color: '#4b2e00',
                    fontWeight: 700,
                    textTransform: 'none',
                  }}
                >
                  Ver ofertas
                </Button>
              </Paper>

              <Box sx={{ mb: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip label="Entrega rápida" icon={<AccessTimeIcon />} sx={{ bgcolor: '#fff7f0', fontWeight: 700 }} />
                <Chip label="Pago justo" icon={<MonetizationOnIcon />} sx={{ bgcolor: '#fff7f0', fontWeight: 700 }} />
                <Chip label="Vegano" sx={{ bgcolor: '#fff7f0', fontWeight: 700 }} />
                <Chip label="Sin contacto" sx={{ bgcolor: '#fff7f0', fontWeight: 700 }} />
              </Box>

              <Box sx={{ bgcolor: 'transparent', p: 1, borderRadius: 2 }}>
                <CategoriasSlider
                  categorias={categorias.map((c) => ({
                    nombre: c.attributes?.nombre,
                    slug: c.attributes?.slug,
                    imagen: c?.attributes?.imagen?.urls?.thumbnail ?? c?.attributes?.imagen?.urls?.small ?? c?.attributes?.imagen?.urls?.original ?? '',
                  }))}
                  onClick={(slug) => handleCategoriaClick(slug)}
                />
              </Box>
            </Box>
          )}

          {/* TITULO */}
          {title && (
            <Typography variant="h6" fontWeight={900} sx={{ mb: 2, color: '#d35400' }}>
              {title}
            </Typography>
          )}

          {/* GRID DE PRODUCTOS */}
          <Grid container spacing={3}>
            {productos.length === 0 && (
              <Grid item xs={12}>
                <Typography textAlign="center" color="text.secondary">
                  {filtros
                    ? 'Cargando platillos...'
                    : 'Aún no hay platillos publicados.'}
                </Typography>
              </Grid>
            )}

            {productos.map((product, idx) => (
              <Grid
                key={`product-item-${product?.id ?? Math.random()}`}
                item
                xs={12}
                sm={6}
                md={3}
                data-id={product?.id ?? ''}
                ref={(el) => {
                  if (el) itemRefs.current.set(product?.id, el);
                  else itemRefs.current.delete(product?.id);
                  if (idx === (productos.length - 1))
                    lastProductRef.current = el;
                }}
                sx={{
                  opacity: visible[product?.id] ? 1 : 0,
                  transform: visible[product?.id] ? 'translateY(0)' : 'translateY(18px)',
                  transition: 'all 0.55s cubic-bezier(.2,.9,.3,1)',
                }}
              >
                <FoodProductCard producto={product} />
              </Grid>
            ))}
          </Grid>

          {/* PAGINACIÓN */}
          {/* {filtros && Array.isArray(productosFiltrados?.data) && productosFiltrados.data.length > porPagina && (
            <Box mt={3} display="flex" justifyContent="center" alignItems="center">
              <Pagination
                count={Math.ceil(totalItems / porPagina)}
                page={pagina}
                onChange={(_, v) => setPage(v)}
                color="primary"
              />
              <TextField
                select
                value={porPagina}
                onChange={(e) => setPorPagina(Number(e.target.value))}
                SelectProps={{ native: true }}
                size="small"
                sx={{ width: 92, ml: 2 }}
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
              </TextField>
            </Box>
          )} */}
        </Container>
      </Box>
    </>
  );
};

export default Food;
