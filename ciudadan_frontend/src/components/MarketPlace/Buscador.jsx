import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button, Box, TextField, Accordion, AccordionSummary, AccordionDetails,
  Typography, Slider, MenuItem, FormControl, InputLabel, Select,
  InputAdornment
} from '@mui/material';
import '../../styles/BuscadorTienda.css';
import BotonVender from './BotonVender';
import useProductos from '../../hooks/useProductos';
import SearchOffIcon from '@mui/icons-material/SearchOff';
import SearchIcon from '@mui/icons-material/Search';

const Buscador = ({
  search = '',
  onChangeSearch = (s = '') => console.log("default onChangeSearch:", s),
  advanceFilters = { applied: false, priceRange: [0, 100], selectedBranch: '', selectedStore: '' },
  onChangeAdvanceFilters = (advanceFilter) => console.log("default onChangeAdvanceFilters:", advanceFilter),
  onChangePriceRange = (priceRange = [0, 10]) => console.log("default onChangePriceRange:", priceRange),
  onChangeSelectedBrand = (selectedBrand = '') => console.log("default onChangeSelectedBrand:", selectedBrand),
  onChangeSelectedStore = (selectedStore = '') => console.log("default onChangeSelectedStore:", selectedStore),
}) => {
  const [busqueda, setBusqueda] = useState(search);
  const [marcas, setMarcas] = useState([]);
  const [tiendas, setTiendas] = useState([]);
  const [localPrecio, setLocalPrecio] = useState(advanceFilters.priceRange);
  const [selectedLocalMarca, setSelectedLocalMarca] = useState(advanceFilters.selectedBranch);
  const [selectedLocalTienda, setSelectedLocalTienda] = useState(advanceFilters.selectedStore);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [precioMaximo, setPrecioMaximo] = useState(500);

  const navigate = useNavigate();

  // usamos el hook para traer productos y utilidades
  const {
    getProductos,            // para traer productos (puede usarse con params)
    getProductosPorTienda,   // expuesto por el hook (si en el futuro quieres usarlo)
    buscarProductos,         // disponible si necesitas búsquedas directas
    obtenerPrecioMaximo
  } = useProductos();

  // Extrae marcas / tiendas de una lista de items Strapi de forma tolerante
  const extractMarcasYTiendas = (items = []) => {
    const marcasSet = new Set();
    const tiendasSet = new Set();

    items.forEach(item => {
      const attr = item?.attributes || {};

      // posibles ubicaciones de marca
      const possibleMarca =
        attr.marca ||
        attr.brand ||
        attr.attributes?.marca ||
        attr.attributes?.brand ||
        null;

      if (possibleMarca && typeof possibleMarca === 'string') {
        const m = possibleMarca.trim();
        if (m) marcasSet.add(m);
      }

      // posibles ubicaciones de tienda / store name
      // revisamos varias rutas por compatibilidad con distintos modelos en Strapi
      const storeCandidates = [
        attr.store,
        attr.tienda,
        attr.store_name,
        attr.store?.data?.attributes,
        attr.store?.data,
        attr.store?.name,
        attr.tienda_nombre,
        attr.shop,
      ];

      // intentar extraer nombre desde varias formas
      let tiendaName = null;
      if (attr.store && typeof attr.store === 'object') {
        // caso relación: store: { data: { attributes: { nombre } } }
        tiendaName =
          attr.store?.data?.attributes?.nombre ||
          attr.store?.data?.attributes?.name ||
          attr.store?.attributes?.nombre ||
          attr.store?.attributes?.name ||
          null;
      }

      // fallback: propiedades directas
      tiendaName =
        tiendaName ||
        attr.tienda_nombre ||
        attr.tienda ||
        attr.store_name ||
        attr.shop?.nombre ||
        attr.shop?.name ||
        null;

      // si store viene solo como id o numero, intentamos dejarlo así (pero preferimos nombres)
      if (!tiendaName && attr.store_id) {
        tiendaName = String(attr.store_id);
      }

      if (tiendaName && typeof tiendaName === 'string') {
        const t = tiendaName.trim();
        if (t) tiendasSet.add(t);
      }
    });

    // convertir a arrays ordenados
    const marcasArr = Array.from(marcasSet).sort((a, b) => a.localeCompare(b, 'es'));
    const tiendasArr = Array.from(tiendasSet).sort((a, b) => a.localeCompare(b, 'es'));
    return { marcasArr, tiendasArr };
  };

  // Traer marcas y tiendas desde Strapi usando getProductos
  useEffect(() => {
    let mounted = true;
    const fetchOptions = async () => {
      setLoadingOptions(true);
      try {
        // pedimos una cantidad razonable (ajusta pageSize si necesitas más)
        // el hook getProductos acepta params que van como query params a Strapi
        const items = await getProductos({ 'pagination[pageSize]': 200, populate: '*' });
        // getProductos puede devolver array de items (según tu hook)
        // si tu hook devuelve objeto paginado, items ya será array por la implementación
        if (!mounted) return;

        const { marcasArr, tiendasArr } = extractMarcasYTiendas(items || []);
        setMarcas(marcasArr);
        setTiendas(tiendasArr);
        const precioMaximo = obtenerPrecioMaximo(items);
        setPrecioMaximo(v => precioMaximo ?? v);
      } catch (err) {
        console.error('Error cargando marcas/tiendas:', err);
      } finally {
        if (mounted) setLoadingOptions(false);
      }
    };

    fetchOptions();

    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // ejecutar una vez al montar

  const handleBuscar = () => {
    const slug = busqueda.trim().toLowerCase().replace(/\s+/g, '-');
    // if (!slug && !selectedMarca && !selectedTienda) return;

    // // armamos query params si hay marca/tienda seleccionada
    // const params = new URLSearchParams();
    // if (selectedMarca) params.set('marca', selectedMarca);
    // if (selectedTienda) params.set('tienda', selectedTienda);
    // // también puedes pasar rango de precio si lo quieres
    // if (precio && Array.isArray(precio)) {
    //   params.set('precio_min', String(precio[0]));
    //   params.set('precio_max', String(precio[1]));
    // }

    // const query = params.toString();
    // const path = slug ? `/productos/busqueda/${slug}` : `/market`;
    // navigate(query ? `${path}?${query}` : path);
    onChangeSearch(slug);
  };

  const handleChangeRangeSlider = (newRange = [0, 100]) => {
    setLocalPrecio(newRange);
    if (advanceFilters.applied)
      onChangePriceRange(newRange);
  };

  const handleChangeBrand = (brand = '') => {
    setSelectedLocalMarca(brand);
    if (advanceFilters.applied)
      onChangeSelectedBrand(brand);
  };

  const handleChangeStore = (store = '') => {
    setSelectedLocalTienda(store);
    if (advanceFilters.applied)
      onChangeSelectedStore(store);
  };

  const handleClearAdvanceFilters = () => {
    setLocalPrecio([0, 100]);
    setSelectedLocalMarca('');
    setSelectedLocalTienda('');
    onChangeAdvanceFilters({ applied: false, priceRange: [0, 100], selectedBrand: '', selectedStore: '' });
  };

  const handleApplyAdvanceFilters = () => onChangeAdvanceFilters({ applied: true, priceRange: localPrecio, selectedBrand: selectedLocalMarca, selectedStore: selectedLocalTienda });

  return (
    <Box mt={3} textAlign="center">
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        sx={{
          gap: 1,
          maxWidth: '100%',
          mx: 'auto',
          px: { xs: 1, md: 2 },
          flexWrap: { xs: 'wrap', md: 'nowrap' },
        }}
      >
        {/* Buscador */}
        <Box
          component="form"
          onSubmit={(e) => { e.preventDefault(); handleBuscar(); }}
          sx={{
            display: 'flex',
            flexGrow: 1,
            minWidth: 0,
            maxWidth: { xs: '100%', md: 520 },
          }}
        >
          <TextField
            onChange={(e) => setBusqueda(e.target.value)}
            onSubmit={e => { e.preventDefault(); handleBuscar(); }}
            value={busqueda}
            variant="outlined"
            placeholder="Buscar productos en MarketPlace 4:20..."
            fullWidth
            sx={{
              boxShadow: 3,
              borderRadius: 2,
              '& .MuiOutlinedInput-root': {
                height: { xs: 48, md: 56 },
                fontSize: { xs: '0.9rem', md: '1rem' },
              },
            }}
          />

          <Button
            type="submit"
            variant="contained"
            sx={{
              ml: 1,
              minWidth: 48,
              height: { xs: 48, md: 56 },
              backgroundColor: '#000',
              color: '#fff200',
              borderRadius: 2,
              fontWeight: 'bold',
              textTransform: 'none',
              flexShrink: 0,
              '&:hover': {
                backgroundColor: '#222',
                transform: 'scale(1.05)',
              },
            }}
          >
            <span className="material-icons">search</span>
          </Button>
        </Box>

        {/* Botón vender */}
        <Box
          sx={{
            width: { xs: '100%', md: 'auto' },
            display: 'flex',
            justifyContent: 'center',
            mt: { xs: 1, md: 0 },
            flexShrink: 0,
          }}
        >
          <BotonVender />
        </Box>
      </Box>

      {/* Filtros avanzados */}
      <Box mt={4} sx={{ maxWidth: 700, mx: 'auto', px: { xs: 1, md: 0 } }}>
        <Accordion elevation={3}>
          <AccordionSummary expandIcon={<span className="material-icons">expand_more</span>}>
            <Typography>Filtros avanzados</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box display="grid" gap={2}>
              <Box>
                <Typography gutterBottom>Rango de Precio ($)</Typography>
                <Slider
                  value={localPrecio}
                  onChange={(e, newValue) => handleChangeRangeSlider(Array.isArray(newValue) ? newValue : [newValue, localPrecio[1]])}
                  min={0}
                  max={precioMaximo}
                  valueLabelDisplay="auto"
                  sx={{
                    color: 'rgb(0, 200, 0)',
                    '& .MuiSlider-thumb': {
                      backgroundColor: '#fff',
                      border: '2px solid rgb(0, 200, 0)',
                    },
                    '& .MuiSlider-track': {
                      backgroundColor: 'rgb(0, 200, 0)',
                    },
                    '& .MuiSlider-rail': {
                      backgroundColor: '#ccc',
                    },
                  }}
                />
              </Box>

              <FormControl fullWidth>
                <InputLabel>Marca</InputLabel>
                <Select
                  value={selectedLocalMarca}
                  label="Marca"
                  onChange={(e) => handleChangeBrand(e.target.value)}
                >
                  <MenuItem value="">Todas</MenuItem>
                  {loadingOptions ? (
                    <MenuItem disabled>Cargando...</MenuItem>
                  ) : (
                    marcas.map((m) => (
                      <MenuItem key={m} value={m}>{m}</MenuItem>
                    ))
                  )}
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel>Tienda</InputLabel>
                <Select
                  value={selectedLocalTienda}
                  label="Tienda"
                  onChange={(e) => handleChangeStore(e.target.value)}
                >
                  <MenuItem value="">Todas</MenuItem>
                  {loadingOptions ? (
                    <MenuItem disabled>Cargando...</MenuItem>
                  ) : (
                    tiendas.map((t) => (
                      <MenuItem key={t} value={t}>{t}</MenuItem>
                    ))
                  )}
                </Select>
              </FormControl>
              <Box display='flex' justifyContent='flex-end' gap={5}>
                {
                  advanceFilters.applied ? (
                    <Button onClick={handleClearAdvanceFilters} color='error'>
                      Retirar filtros
                    </Button>
                  ) : (
                    <Button onClick={handleApplyAdvanceFilters}>
                      Aplicar filtros
                    </Button>
                  )
                }
              </Box>
            </Box>
          </AccordionDetails>
        </Accordion>
      </Box>
    </Box>

  );
};

export default Buscador;
