import React, { useEffect, useState } from 'react';
import { Box, CircularProgress, Grid, Typography } from '@mui/material';
import { useAuth0 } from '@auth0/auth0-react';
import axios from 'axios';
import ProductoCard from '../MarketPlace/ProductoCard';
import useProductsRestaurant from '../../hooks/food/useProductsRestaurant';

const ProductosRestaurante = ({ restaurante }) => {
  const { user } = useAuth0();
  const { loading, getProducts } = useProductsRestaurant();
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);

  // Handlers

  useEffect(() => {
    if (!user?.email) return;
    const handleFetchProducts = async () => {
      if (!restaurante) return;
      try {
        const auxProducts = await getProducts(restaurante.id);
        setProductos(auxProducts);
      } catch (error) {
        console.error("-- Error on handleFetchProducts: ", error);
      }
    };
    handleFetchProducts();
  }, [user, restaurante]);

  if (loading) {
    return <Typography>Cargando productos...</Typography>;
  }

  if (productos.length === 0) {
    return <Typography>No tienes productos publicados.</Typography>;
  }

  return (
    <Grid container spacing={2}>
      {loading && !productos.length && (
        <Box display='flex' gap={5} justifyContent='center' alignItems='center'>
          <Typography>Cargando productos...</Typography>;
          <CircularProgress />
        </Box>
      )}
      {productos.map((producto) => {
        const attr = producto.attributes;

        return (
          <Grid item xs={12} sm={6} md={4} key={producto.id}>
            <ProductoCard
              titulo={attr.nombre}
              slug={attr.slug}
              imagenes={attr.imagenes}
              descripcion={attr.descripcion}
              imagen={producto.imagenURL}
              precio={attr.precio}
              localidad={attr.localidad}
              estado={attr.estado}
              calificacion={attr.calificaciones > 0 ? attr.calificacion : null}
              numeroCalificaciones={attr.calificaciones}
              vendidos={attr.vendidos || 0}
            />
          </Grid>
        );
      })}
    </Grid>
  );
};

export default ProductosRestaurante;
