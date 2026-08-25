// src/Pages/MarketPlace/MarketPlace.jsx
import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Buscador from '../../components/MarketPlace/Buscador.jsx';
import ProductoCard from '../../components/MarketPlace/ProductoCard.jsx';
import CategoriasSlider from '../../components/MarketPlace/CategoriasSlider.jsx';
import PreCargador from '../../components/PreCargador.jsx';
import IconButton from '@mui/material/IconButton'; // o agrégalo al import de @mui/material que ya tienes
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

// hooks
import { useCategorias } from '../../hooks/useCategorias.jsx';
import { useUbicacion } from '../../hooks/useUbicacion.jsx';
import useProductos from '../../hooks/useProductos.jsx';

import {
  Box,
  Grid,
  Container,
  Typography,
  TextField,
  useMediaQuery,
  useTheme,
  Pagination,
  Skeleton,
} from '@mui/material';
import { useRoles } from '../../Contexts/RolesContext.jsx';

export default function MarketPage() {
  // Hooks
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const navigate = useNavigate();
  const location = useLocation();
  const { getCategorias, loading: loadingCategorias } = useCategorias();
  const { ubicacion } = useUbicacion();
  const { userData } = useRoles();
  const {
    getProducts,
    precotizarMienvio,
    precotizacionTotal,
    calificacionPromedio,
    obtenerNumeroCalificaciones,
    obtenerImagenProducto,
    calcularPromedioRankingsPorProducto,
    setPagina,
    pagina,
    porPagina,
    loading: loadingFetchProducts
  } = useProductos({ paginado: true, porPaginaDefault: 5 });

  // UI states
  const [categories, setCategories] = useState([]);
  const [visible, setVisible] = useState({});
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [errorProductos, setErrorProductos] = useState(null);
  const [hasMore, setHasMore] = useState(true); // state para saber si hay más paginas
  // Filter states
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [advancedFilters, setAdvancedFilters] = useState({ applied: false, priceRange: [0, 100], selectedBrand: '', selectedStore: '' });
  const [enableClearSearch, setEnableClearSearch] = useState(false);

  // Refs
  const itemRefs = useRef(new Map()); // id -> element
  const observerRef = useRef(null);
  const lastProductRef = useRef(null);
  const loadMoreObserver = useRef(null);
  const isNewSearchRef = useRef(false); // Flag para distinguir si cuando cambian filtros
  const requestingNextPage = useRef(false); // Flag para prevenir solicitar 2 páginas a la vez

  const enrichProduct = useCallback(async (p) => {
    try {
      const { attributes, id } = p ?? {};
      const { cp, precio, alto, ancho, largo, peso, ...restAttributes } = attributes;
      const originPostalCode = cp ?? '11590';
      const destinationPostalCode = ubicacion?.codigoPostal ?? '11560';
      const productPrice = Number(precio ?? 0);
      const [
        responseEnvio,
        responseImagen,
        responseTotal,
        responseCalifications,
        responsePromedioObject
      ] = await Promise.allSettled([
        (async () => { try { return await precotizarMienvio(originPostalCode, destinationPostalCode, largo, ancho, alto, peso); } catch (e) { console.error("Error on precotizarEnvio:", e); return null; } })(),
        (async () => { try { return await obtenerImagenProducto(p.id); } catch (e) { console.error("Error on obtenerImagenProducto:", e); return null; } })(),
        (async () => { try { return await precotizacionTotal({ ...restAttributes, cp, alto, ancho, largo, peso, precio: productPrice, id }, destinationPostalCode) } catch (error) { console.error("Error on precotizacionTotal:", error); return null; } })(),
        (async () => { try { return await obtenerNumeroCalificaciones(p); } catch (e) { console.error("Error on obtenerNumeroCalificaciones:", e); return 0; } })(),
        (async () => { try { return await calcularPromedioRankingsPorProducto(p.id); } catch (e) { console.error("Error on calcularPromedioRankingsPorProducto:", e); return { avg5: null, count: 0 }; } })(),
      ]);

      const envio = responseEnvio.status === 'fulfilled' ? responseEnvio.value : null;
      const imagen = responseImagen.status === 'fulfilled' ? responseImagen.value : null;
      const total = responseTotal.status === 'fulfilled' ? responseTotal.value : null;
      const numCalificaciones = responseCalifications.status === 'fulfilled' ? responseCalifications.value : null;
      const promedioObject = responsePromedioObject.status === 'fulfilled' ? responsePromedioObject.value : null;

      setProducts(prev => prev.map(prevProduct => {
        if (prevProduct.id !== p.id) return prevProduct;
        const auxObject = {
          ...prevProduct,
          envio,
          total,
          imagen: imagen ?? prevProduct?.imagen,
          calificacion: promedioObject?.avg5 ?? prevProduct?.calificacion,
          numCalificaciones: numCalificaciones ?? prevProduct?.numCalificaciones ?? 0,
          precio: productPrice,
        };
        return auxObject;
      }));

    } catch (error) {
      console.error("[MarketPlace] enrichProduct error:", error);
    }
  }, [ubicacion?.codigoPostal]);

  const handleGetProducts = async (page = 1, perPage = 10, categoryFetch = '', searchFetch = '', advancedFilters = { applied: false, priceRange: [0, 100], selectedBrand: '', selectedStore: '' }) => {
    try {
      const requestParams = {
        'pagination[page]': page,
        'pagination[pageSize]': perPage,
      }
      if (categoryFetch)
        requestParams['filters[store_category][slug][$eq]'] = categoryFetch;

      if (searchFetch) {
        requestParams['filters[$or][0][nombre][$containsi]'] = searchFetch;
        requestParams['filters[$or][1][descripcion][$containsi]'] = searchFetch;
      }

      const { applied, priceRange: [firstPriceRange, secondPriceRange], selectedBrand, selectedStore } = advancedFilters;
      if (applied) {
        if (firstPriceRange !== 0) {
          requestParams['filters[precio][$gte]'] = firstPriceRange;
        }
        if (secondPriceRange !== 100) {
          requestParams['filters[precio][$lte]'] = secondPriceRange;
        }
        if (selectedBrand) {
          requestParams['filters[marca][$eq]'] = selectedBrand;
        }
        if (selectedStore) {
          requestParams['filters[store][name][$eq]'] = selectedStore;
        }
      }

      const responseProducts = await getProducts(requestParams, () => console.log("<- Success fetch products ->"));
      const { data, meta } = responseProducts;
      if (isNewSearchRef.current) {
        setProducts(data ?? []);
        isNewSearchRef.current = false;
      } else {
        setProducts(prev => [...prev, ...(data ?? [])]);
      }
      setHasMore(meta?.pagination?.page < meta.pagination.pageCount);
      (data ?? []).forEach((product) => enrichProduct(product));
    } catch (error) {
      console.error("Error on handleGetProducts:", error);
    } finally {
      requestingNextPage.current = false;
      setLoadingProducts(prev => prev ? false : prev);
    }
  };

  const handleChangePriceRange = (newPriceRange = [0, 100]) => setAdvancedFilters(filters => ({ ...filters, priceRange: newPriceRange }));
  const handleChangeSelectedBrand = (newBrand = '') => setAdvancedFilters(filters => ({ ...filters, selectedBrand: newBrand }));
  const handleChangeSelectedStore = (newStore = '') => setAdvancedFilters(filters => ({ ...filters, selectedStore: newStore }));

  const handlerClearSearch = () => {
    setSelectedCategory(prev => prev ? '' : prev);
    setSearch('');
    setEnableClearSearch(true);
  }
  const filtersKey = useMemo(() => JSON.stringify(advancedFilters), [advancedFilters]);
  // Cargar categorías (una vez)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const categoriesData = await getCategorias();
        if (mounted) setCategories(categoriesData || []);
      } catch (err) {
        console.error('[MarketPlace] getCategorias error', err);
        if (mounted) setCategories([]);
      }
    })();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Reiniciar listado cuando cambia el contexto de búsqueda
  useEffect(() => {
    setProducts([]);
    setVisible({});
    setHasMore(true);
    isNewSearchRef.current = true;
    setPagina(v => v !== 1 ? 1 : v);
  }, [search, selectedCategory, filtersKey]);
  // Cargar productos
  useEffect(() => {
    if (!ubicacion?.codigoPostal) {
      setProducts([]);
      setLoadingProducts(false);
      return;
    }

    setLoadingProducts(true);
    setErrorProductos(null);

    handleGetProducts(pagina, porPagina, selectedCategory, search, advancedFilters);
  }, [ubicacion?.codigoPostal, pagina, porPagina, search, selectedCategory, filtersKey]);

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
  }, [products]);

  useEffect(() => {
    if (loadMoreObserver.current) {
      loadMoreObserver.current.disconnect();
    }

    loadMoreObserver.current = new IntersectionObserver(
      entries => {
        const first = entries[0];
        if (first.isIntersecting && !loadingProducts && hasMore && !requestingNextPage.current) {
          requestingNextPage.current = true;
          setPagina(prev => prev + 1);
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

  }, [products, loadingProducts, hasMore]);

  const { showCategories, title } = useMemo(() => {
    if (search)
      return ({ showCategories: false, title: `Resultados de Búsqueda «${(search).charAt(0).toUpperCase() + (search).slice(1)}»` });
    if (selectedCategory)
      return ({ showCategories: false, title: `Productos en Categoría «${(selectedCategory).charAt(0).toUpperCase() + (selectedCategory).slice(1)}»` });
    return ({ showCategories: true, title: '' });
  }, [search, selectedCategory]);

  const shouldShowCategorias = showCategories && categories.length > 0 && !loadingCategorias;

  return (
    <Container maxWidth="lg" sx={{ mt: 2, mb: 2 }}>
      <Box display="flex" alignItems="center" mb={2}>
        <Box sx={{ flex: 1, mr: 1 }}>
          <Buscador
            search={search}
            advanceFilter={advancedFilters}
            onChangeSearch={(s) => setSearch(s)}
            onChangeAdvanceFilters={(newFilters) => setAdvancedFilters(newFilters)}
            onChangePriceRange={handleChangePriceRange}
            onChangeSelectedBrand={handleChangeSelectedBrand}
            onChangeSelectedStore={handleChangeSelectedStore}
            flagEnableClearSearch={enableClearSearch}
            initializeClearSearch={() => setEnableClearSearch(false)}
          />
        </Box>
      </Box>

      {
        shouldShowCategorias && (
          <Box mt={4}>
            <CategoriasSlider
              categorias={categories.map(c => ({
                nombre: c.attributes?.nombre || c.nombre || '—',
                slug: c.attributes?.slug || c.slug || '—',
                imagen: c.attributes?.imagen?.data?.attributes?.url ? `${process.env.REACT_APP_STRAPI_URL}${c.attributes.imagen.data.attributes.url}` : null,
              }))}
              onClick={(slug) => setSelectedCategory(slug)}
            />
          </Box>
        )
      }
      {
        title && (
          <Box display="flex" alignItems="center" gap={1} sx={{ mb: 2 }}>
            <IconButton
              onClick={handlerClearSearch}
              aria-label="volver"
              size="small"
            >
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h6" fontWeight={700} sx={{ m: 0 }}>
              <u className="productos-titulo">{title}</u>
            </Typography>
          </Box>
        )
      }
      {
        (!ubicacion?.codigoPostal && (!search || !selectedCategory)) && (
          <Box my={2} textAlign="center">
            <Typography>📍 No hemos detectado tu ubicación. Por favor configura tu ubicación para mostrar productos cercanos.</Typography>
          </Box>
        )
      }
      {
        errorProductos && (
          <Box my={2}>
            <Typography color="error">{errorProductos}</Typography>
          </Box>
        )
      }
      <Grid container mt={3} p={1} alignContent={'center'}>
        {
          (loadingProducts && products.length === 0) && Array.from({ length: isDesktop ? 8 : 4 }).map((_, i) => (
            <Grid key={`skel-${i}`} item xs={12} sm={6} md={3}>
              <Skeleton variant="rectangular" height={220} />
              <Skeleton width="60%" sx={{ mt: 1 }} />
              <Skeleton width="40%" />
            </Grid>
          ))
        }
        {
          (!loadingProducts && products.length === 0) && (
            <Grid item xs={12}>
              <Box display="flex" flexDirection="column" alignItems="center" py={6}>
                <Typography variant="h6">{(search || selectedCategory) ? (loadingFetchProducts ? '' : 'No hay productos.') : 'No se encontraron productos.'}</Typography>
                {loadingFetchProducts && <PreCargador text="Buscando productos..." />}
              </Box>
            </Grid>
          )
        }
        {
          products.map((prod, idx) => {
            const id = prod.id ?? prod.attributes?.id ?? Math.random().toString(36).slice(2, 9);
            const tituloProd = prod.attributes?.nombre ?? prod.nombre ?? 'Sin título';
            const slug = prod.attributes?.slug ?? prod.slug ?? '';
            const imagen = prod.imagen ?? (prod.attributes?.imagenes?.data?.[0]?.attributes?.url ? `${process.env.REACT_APP_STRAPI_URL}${prod.attributes.imagenes.data[0].attributes.url}` : null);
            const descripcion = prod.attributes?.descripcion ?? prod.descripcion ?? '';
            const precio = prod.precio ?? Number(prod.attributes?.precio) ?? null;
            const envioAprox = prod.envio && (typeof prod.envio === 'object' ? (prod.envio.costo ? `$${prod.envio.costo} aprox.` : null) : prod.envio);
            const localidad = prod.attributes?.localidad ?? '';
            const isLast = idx === products.length - 1;
            return (
              <Grid
                key={`product-item-${id}`}
                item
                xs={12}
                sm={6}
                md={3}
                data-id={id}
                ref={(el) => {
                  if (el) itemRefs.current.set(id, el);
                  else itemRefs.current.delete(id);
                  if (isLast)
                    lastProductRef.current = el;
                }}
                className="producto-card"
                sx={{
                  opacity: visible[id] ? 1 : 0,
                  transform: visible[id] ? 'translateY(0)' : 'translateY(20px)',
                  transition: 'all 0.6s ease'
                }}
              >
                <ProductoCard
                  titulo={tituloProd}
                  slug={slug}
                  imagenes={prod.attributes?.imagenes}
                  descripcion={descripcion}
                  imagen={imagen}
                  precio={precio}
                  envioAprox={envioAprox}
                  localidad={localidad}
                  estado={prod.attributes?.estado}
                  // PASAMOS calificacion en escala 0..5 y numero de calificaciones
                  calificacion={prod.calificacion ?? null}
                  numeroCalificaciones={prod.numCalificaciones ?? prod.attributes?.numero_calificaciones ?? 0}
                  vendidos={prod.attributes?.vendidos}
                  total={prod.total && `$${prod.total}`}
                  productoId={id}
                  currentUserId={userData?.id}
                />
              </Grid>
            );
          })
        }
        {/* {
          (search || selectedCategory) && products.length > 0 && (
            <Box mt={3} display="flex" justifyContent="center" alignItems="center">
              <Pagination count={Math.ceil(products.length / (porPagina || 1))} page={pagina} onChange={(_, v) => setPagina(v)} />
              <TextField select value={porPagina} onChange={e => setPorPagina(Number(e.target.value))} SelectProps={{ native: true }} size="small" sx={{ width: 100, ml: 2 }}>
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </TextField>
            </Box>
          )
        } */}
      </Grid>

    </Container>
  )
};
