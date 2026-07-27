import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import { Box, Typography, useMediaQuery, useTheme } from '@mui/material';
import { useRoles } from '../../Contexts/RolesContext';
import StoreImagePlaceholder from '../../assets/agencia.png';
import { useFoodRestaurants } from '../../hooks/food/useFoodRestaurants';
import ProductosRestaurante from '../../components/Food/ProductosRestaurante';
import AgregarProducto from '../../components/Food/AgregarProducto';

const restaurantSectionKey = '@restaurant-section-key';

const TABS = [
  { label: 'Productos', path: 'productos' },
  { label: 'Agregar producto', path: 'agregar-producto' },
  { label: 'Pedidos a entregar', path: '' },
];
// { label: 'Entregados', path: 'entregados' },
// { label: 'Pagos', path: 'pagos' },
// { label: 'Configuración', path: 'configuracion' }

const Restaurant = () => {
  const { slug } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isLoading } = useAuth0();
  const { isActivaMembresia } = useRoles();
  const theme = useTheme();
  const isMobileDevice = useMediaQuery(theme.breakpoints.down('md'));

  const { getRestaurantBySlugFromUserEmail } = useFoodRestaurants();

  const [tabIndex, setTabIndex] = useState(0);
  const [restaurantImageURL, setRestaurantImageURL] = useState(null);
  const [restaurant, setRestaurant] = useState(null);
  // const [productos, setProductos] = useState([]);

  const fetchStoreData = async (restaurantSlug = '', userEmail = '') => {
    try {
      if (!restaurantSlug || !userEmail) return;

      const restaurant = await getRestaurantBySlugFromUserEmail(restaurantSlug, userEmail);
      if (restaurant) {
        setRestaurant(restaurant);
        const imagen = restaurant?.attributes?.imagen?.data?.attributes?.url;
        if (imagen) {
          const baseUrl = process.env.REACT_APP_STRAPI_URL.replace(/\/$/, '');
          const fullURL = `${baseUrl}${imagen}`;
          console.log('📷 Imagen encontrada:', fullURL);
          setRestaurantImageURL(fullURL);
        }
      } else {
        setTimeout(() => navigate('/comida/afiliar-restaurante', { replace: true }), 800);
      }
    } catch (error) {
      console.error('❌ Error al traer datos de la tienda:', error);
    }
  };

  const handleChange = (event, newValue) => {
    setTabIndex(newValue);
    localStorage.setItem(restaurantSectionKey, newValue);
  };

  const handleInitializeSection = () => {
    const k = localStorage.getItem(restaurantSectionKey)
    if (k)
      setTabIndex(+k)
  };

  useEffect(() => {
    handleInitializeSection();
    if (!slug || !user?.email) return;
    fetchStoreData(slug, user?.email ?? '');
  }, [slug, user?.email]);

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
          src={restaurantImageURL || StoreImagePlaceholder}
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
        {/* <Typography sx={{ fontSize: { xs: '0.85rem', sm: '1rem' } }}>
          Productos: <strong>{productos.length}</strong> &nbsp;&nbsp; Ventas: <strong>700</strong>
        </Typography> */}
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mt: 1, flexWrap: 'wrap' }}>
          <i className="material-icons" style={{ color: '#FFC107' }}>star</i>
          <i className="material-icons" style={{ color: '#FFC107' }}>star</i>
          <i className="material-icons" style={{ color: '#FFC107' }}>star</i>
          <i className="material-icons" style={{ color: '#FFC107' }}>star_half</i>
          <i className="material-icons" style={{ color: '#ccc' }}>star_border</i>
          <Typography component="span" sx={{ ml: 1, fontSize: { xs: '0.85rem', sm: '1rem' } }}>325 calificaciones</Typography>
        </Box>
        <Typography sx={{ mt: 1, fontSize: { xs: '0.85rem', sm: '1rem' } }}>n reseñas</Typography>
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
            TABS.map(({ label, path }, index) => (
              <Tab key={`item-tab-${index}`} label={label} {...a11yProps(0)} />
            ))
          }
        </Tabs>

        <Box sx={{ mt: { xs: 1.5, sm: 2 }, width: '100%', overflowX: 'hidden' }}>
          {tabIndex === 0 && <ProductosRestaurante restaurante={restaurant} />}
          {tabIndex === 1 && <AgregarProducto restaurant={restaurant} />}
          {/* {tabIndex === 1 && <PedidosEntregados />}
          {tabIndex === 2 && <MisProductos filtros={filtros} />}
          {tabIndex === 4 && <PreguntasProducto />}
          {tabIndex === 5 && <PagosTienda />}
          {tabIndex === 6 && <ConfiguracionTienda />} */}
        </Box>
      </Box>
    </Box>
  );
};

export default Restaurant;
