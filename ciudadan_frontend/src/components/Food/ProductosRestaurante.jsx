import React, { useEffect, useState } from 'react';
import { Box, CircularProgress, Grid, Typography } from '@mui/material';
import { useAuth0 } from '@auth0/auth0-react';
import useProductsRestaurant from '../../hooks/food/useProductsRestaurant';
import FoodProductoCardOwner from './ProductoCardOwner';

const ProductosRestaurante = ({ restaurante }) => {
  const { user } = useAuth0();
  const { loading, getProductsByRestaurant } = useProductsRestaurant();
  const [productos, setProductos] = useState([]);

  // Handlers

  useEffect(() => {
    if (!user?.email || !restaurante) return;
    const handleFetchProducts = async () => {
      try {
        const auxProducts = await getProductsByRestaurant(restaurante.id);
        setProductos(auxProducts);
      } catch (error) {
        console.error("-- Error on handleFetchProducts: ", error);
      }
    };
    handleFetchProducts();
  }, [user, restaurante]);

  return (
    <Grid container spacing={2}>
      {
        loading && !productos.length && (
          <Box display='flex' gap={5} justifyContent='center' alignItems='center' p={5}>
            <Typography>Cargando platillos...</Typography>
            <CircularProgress />
          </Box>
        )
      }
      {
        !loading && !productos.length && (
          <Box display='flex' gap={5} justifyContent='center' alignItems='center' p={5}>
            <Typography>No tienes platillos publicados.</Typography>
          </Box>
        )
      }
      {
        productos.map((p) => {
          return (
            <Grid item xs={12} sm={6} md={4} key={`product-item-container-${p?.id}`}>
              <FoodProductoCardOwner producto={p}/>
            </Grid>
          );
        })
      }
    </Grid>
  );
};

export default ProductosRestaurante;
