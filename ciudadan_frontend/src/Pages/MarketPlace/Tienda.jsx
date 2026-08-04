import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useRoles } from '../../Contexts/RolesContext';
import StoreImagePlaceholder from '../../assets/agencia.png';
import AgregarProducto from './AgregarProducto';
import { useAuth0 } from '@auth0/auth0-react';
import axios from 'axios';
import MisProductos from './MisProductos';
import PedidosPendientes from './PedidosPendientes';
import PedidosEntregados from './PedidosEntregados';
import PagosTienda from './PagosTienda';
import ConfiguracionTienda from './ConfiguracionTienda';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import { Box, Typography, useMediaQuery, useTheme } from '@mui/material';
import PreguntasProductos from '../../components/MarketPlace/PreguntasProductos';

const Tienda = () => {
  const { slug } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isLoading } = useAuth0();
  const { isActivaMembresia } = useRoles();
  const theme = useTheme();
  const isMobileDevice = useMediaQuery(theme.breakpoints.down('md'));
  console.log('🔎🔎🔎🔎🔎🔎🔎🔎🔎🔎🔽🔽🔽 tienda es activa membresia', isActivaMembresia);
  console.log('Es dispositivo móvil', isMobileDevice);


  const [tabIndex, setTabIndex] = useState(0);
  const [storeData, setStoreData] = useState(null);
  const [storeImageURL, setStoreImageURL] = useState(null);
  const [productos, setProductos] = useState([]);

  const tabs = [
    { label: 'Pedidos a entregar', path: '' },
    { label: 'Entregados', path: 'entregados' },
    { label: 'Productos', path: 'productos' },
    { label: 'Agregar producto', path: 'agregar-producto' },
    { label: 'Preguntas', path: 'preguntas-producto' },
    { label: 'Pagos', path: 'pagos' },
    { label: 'Configuración', path: 'configuracion' }
  ];

  useEffect(() => {
    const path = location.pathname;
    if (path.includes('/agregar')) setTabIndex(3);
    else if (path.includes('/productos')) setTabIndex(2);
    else if (path.includes('/entregados')) setTabIndex(1);
    else if (path.includes('/preguntas')) setTabIndex(4);
    else if (path.includes('/pagos')) setTabIndex(5);
    else if (path.includes('/configuracion')) setTabIndex(6);
    else setTabIndex(0);
  }, [location.pathname]);

  const handleTabClick = (index, path) => {
    setTabIndex(index);
    const basePath = `/market/store/${slug}`;
    const newPath = path ? `${basePath}/${path}` : basePath;
    navigate(newPath);
  };

  useEffect(() => {
    if (!slug) return;

    const fetchStoreData = async () => {
      try {
        const baseUrl = process.env.REACT_APP_STRAPI_URL.replace(/\/$/, '');
        const res = await axios.get(`${baseUrl}/api/stores?filters[slug][$eq]=${slug}&populate=imagen`);
        console.log('📦 Respuesta de tienda:', res.data);

        const tienda = res.data.data[0];
        setStoreData(tienda);
        const imagen = tienda?.attributes?.imagen?.data?.attributes?.url;

        if (imagen) {
          const fullURL = `${baseUrl}${imagen}`;
          console.log('📷 Imagen encontrada:', fullURL);
          setStoreImageURL(fullURL);
        }
        if (!tienda)
          setTimeout(() => navigate(-1), 1900);
      } catch (error) {
        console.error('❌ Error al traer datos de la tienda:', error);
      }
    };

    fetchStoreData();
  }, [slug]);

  useEffect(() => {
    if (!user?.email) return;

    const fetchProductos = async () => {
      try {
        const baseUrl = process.env.REACT_APP_STRAPI_URL.replace(/\/$/, '');
        const url = `${baseUrl}/api/productos?populate=*&filters[store_email][$eq]=${user.email}`;
        console.log('🔎 URL de productos por email:', url);

        const res = await axios.get(url);
        console.log('🛒 Productos encontrados:', res.data);
        setProductos(res.data.data || []);
      } catch (error) {
        console.error('❌ Error al cargar productos:', error);
      }
    };

    fetchProductos();
  }, [user]);

  const handleChange = (event, newValue) => {
    const selectedTab = tabs.at(newValue);
    if (selectedTab) {
      handleTabClick(newValue, selectedTab.path);
    }
  };

  const a11yProps = (index) => ({
    id: `simple-tab-${index}`,
    'aria-controls': `simple-tabpanel-${index}`,
  });


  if (isLoading) return <p>Cargando...</p>;

  // ---------- RETORNO TEMPRANO: si la membresía está presente y NO está activa,
  // devolvemos SOLO el componente de activación y NO renderizamos nada más ----------
  if (!isActivaMembresia()) {
    //return <ActivaTuMembresia />;
  }
  // -------------------------------------------------------------------------------

  const filtros = 'mios';

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        p: { xs: 1.5, sm: 3 },
        gap: 4,
        flexWrap: 'wrap',
        width: '100%',
        boxSizing: 'border-box',
        overflowX: 'hidden'
      }}
    >
      {/* Columna izquierda */}
      <Box
        sx={{
          flex: { xs: '1 1 100%', md: '0 0 30%' },
          maxWidth: { xs: '100%', md: '30%' },
          textAlign: 'center'
        }}
      >
        <Box
          component="img"
          src={storeImageURL || StoreImagePlaceholder}
          alt="Tienda"
          sx={{
            width: { xs: '55%', sm: '40%', md: '100%' },
            maxWidth: 260,
            aspectRatio: '1 / 1',
            borderRadius: '16px',
            boxShadow: '0px 4px 10px rgba(0,0,0,0.1)',
            objectFit: 'cover',
            mx: 'auto',
            display: 'block'
          }}
        />
        <Typography
          component="h1"
          sx={{ mt: 2, mb: 1, fontSize: { xs: '1.4rem', sm: '1.7rem', md: '2rem' }, fontWeight: 'bold' }}
        >
          {slug}
        </Typography>
        <Typography sx={{ fontSize: { xs: '0.85rem', sm: '1rem' } }}>
          Productos: <strong>{productos.length}</strong> &nbsp;&nbsp; Ventas: <strong>700</strong>
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mt: 1, flexWrap: 'wrap' }}>
          <i className="material-icons" style={{ color: '#FFC107' }}>star</i>
          <i className="material-icons" style={{ color: '#FFC107' }}>star</i>
          <i className="material-icons" style={{ color: '#FFC107' }}>star</i>
          <i className="material-icons" style={{ color: '#FFC107' }}>star_half</i>
          <i className="material-icons" style={{ color: '#ccc' }}>star_border</i>
          <Typography component="span" sx={{ ml: 1, fontSize: { xs: '0.85rem', sm: '1rem' } }}>325 calificaciones</Typography>
        </Box>
        <Typography sx={{ mt: 1, fontSize: { xs: '0.85rem', sm: '1rem' } }}>201 reseñas</Typography>
        <Typography sx={{ fontSize: { xs: '0.8rem', sm: '0.9rem' }, wordBreak: 'break-word' }}>
          Usuario Auth0: {user.email}
        </Typography>
      </Box>

      {/* Columna derecha */}
      <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 65%' }, minWidth: 0, width: '100%', mt: 3 }}>
        <Tabs
          value={tabIndex}
          onChange={handleChange}
          aria-label="basic tabs example"
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={{
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
            tabs.map(({ label, path }, index) => (
              <Tab key={`item-tab-${index}`} label={label} {...a11yProps(0)} />
            ))
          }
        </Tabs>

        <Box sx={{ mt: { xs: 1.5, sm: 2 }, width: '100%', overflowX: 'hidden' }}>
          {tabIndex === 0 && <PedidosPendientes store={storeData}/>}
          {tabIndex === 1 && <PedidosEntregados />}
          {tabIndex === 2 && <MisProductos filtros={filtros} />}
          {tabIndex === 3 && <AgregarProducto />}
          {tabIndex === 4 && <PreguntasProductos  storeId={storeData?.id}/>}
          {tabIndex === 5 && <PagosTienda />}
          {tabIndex === 6 && <ConfiguracionTienda />}
        </Box>
      </Box>
    </Box>
  );
};

export default Tienda;
