import React, { useEffect, useState } from 'react';
import { Grid, Typography } from '@mui/material';
import { useAuth0 } from '@auth0/auth0-react';
import axios from 'axios';
import ProductoCard from '../../components/MarketPlace/ProductoCard';

const MisProductos = () => {
    const filtros = 'mios';
  const { user } = useAuth0();
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (!user?.email) return;

    const fetchProductos = async () => {
      try {
        setCargando(true);
        const baseUrl = process.env.REACT_APP_STRAPI_URL.replace(/\/$/, '');
        const url = `${baseUrl}/api/productos?populate=*&filters[store_email][$eq]=${user.email}`;
        const res = await axios.get(url);

        const data = res.data.data || [];

        // Adjuntar URL de imagen principal si existe
        const productosConImagen = data.map((p) => {
          const imagen = p.attributes.imagenes?.data?.[0]?.attributes?.url;
          const imagenURL = imagen ? `${baseUrl}${imagen}` : null;

          return {
            ...p,
            imagenURL,
          };
        });

        setProductos(productosConImagen);
      } catch (error) {
        console.error('❌ Error al traer productos del vendedor:', error);
      } finally {
        setCargando(false);
      }
    };

    fetchProductos();
  }, [user]);

  if (cargando) {
    return <Typography>Cargando productos...</Typography>;
  }

  if (productos.length === 0) {
    return <Typography>No tienes productos publicados.</Typography>;
  }

  return (
    <Grid container spacing={2}>
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
              filtros={filtros}
            />
          </Grid>
        );
      })}
    </Grid>
  );
};

export default MisProductos;
