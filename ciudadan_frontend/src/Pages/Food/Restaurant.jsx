import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import { Box, CircularProgress, Typography, useMediaQuery, useTheme } from '@mui/material';
import { useRoles } from '../../Contexts/RolesContext';
import StoreImagePlaceholder from '../../assets/agencia.png';
import { useFoodRestaurants } from '../../hooks/food/useFoodRestaurants';
import ProductosRestaurante from '../../components/Food/ProductosRestaurante';
import AgregarProducto from '../../components/Food/AgregarProducto';
import RestaurantAdministration from './RestaurantAdministration';
import { motion } from 'framer-motion';

const restaurantSectionKey = '@restaurant-section-key';

const TABS = [
  { label: 'Platillos', path: 'platillos' },
  { label: 'Agregar platillo', path: 'agregar-platillo' },
  { label: 'Pedidos a entregar', path: '' },
];
// { label: 'Entregados', path: 'entregados' },
// { label: 'Pagos', path: 'pagos' },
// { label: 'Configuración', path: 'configuracion' }

const Restaurant = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user, isLoading } = useAuth0();
  const { isActivaMembresia } = useRoles();
  const { getRestaurantBySlugFromUserEmail, loading } = useFoodRestaurants();

  const [restaurant, setRestaurant] = useState(null);
  // const [productos, setProductos] = useState([]);

  const fetchStoreData = async (restaurantSlug = '', userEmail = '') => {
    try {
      if (!restaurantSlug || !userEmail) return;

      const restaurant = await getRestaurantBySlugFromUserEmail(restaurantSlug, userEmail);
      if (restaurant) {
        setRestaurant(restaurant);
      } else {
        setTimeout(() => navigate('/comida/afiliar-restaurante', { replace: true }), 800);
      }
    } catch (error) {
      console.error('❌ Error al traer datos de la tienda:', error);
    }
  };

  useEffect(() => {
    if (!slug || !user?.email) return;
    fetchStoreData(slug, user?.email ?? '');
  }, [slug, user?.email]);

  const a11yProps = (index) => ({
    id: `simple-tab-${index}`,
    'aria-controls': `simple-tabpanel-${index}`,
  });


  if (isLoading || loading) return (
    <Box
      sx={{
        width: '100%',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <CircularProgress size={56} />
        <Typography sx={{ mt: 2 }}>Cargando...</Typography>
      </motion.div>
    </Box>
  );

  // ---------- RETORNO TEMPRANO: si la membresía está presente y NO está activa,
  // devolvemos SOLO el componente de activación y NO renderizamos nada más ----------
  if (!isActivaMembresia()) {
    //return <ActivaTuMembresia />;
  }
  // -------------------------------------------------------------------------------
  return (
    <RestaurantAdministration restaurantData={restaurant} />
  );
};

export default Restaurant;
