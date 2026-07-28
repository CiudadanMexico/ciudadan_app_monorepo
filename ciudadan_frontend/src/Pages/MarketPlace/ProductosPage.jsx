import React from 'react';
import { Routes, Route, useParams } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { CircularProgress, Box, Typography } from '@mui/material';
import Cursos from '../../components/Cursos/Cursos';
import MarketPlace from './MarketPlace';

// Wrappers to extract URL params and pass props to Contenidos
const ProductosUsuario = () => {
  const { user, isLoading, isAuthenticated } = useAuth0();

  // Mientras se carga la sesión de usuario
  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  // Si no está autenticado, muestra un mensaje
  if (!isAuthenticated || !user) {
    return (
      <Box sx={{ textAlign: 'center', mt: 4 }}>
        <Typography variant="body1">
          Para ver tus productos debes iniciar sesión.
        </Typography>
      </Box>
    );
  }

  // Usuario ya cargado y autenticado: pasamos su email
  const usuario = user.email;
  return <MarketPlace filtros="mis-productos" parametros={usuario} />;
};

const ProductosBusqueda = () => {
  const { cadena } = useParams();
  return <MarketPlace filtros="busqueda" parametros={cadena} />;
};

const ProductosCategoria = () => {
  const { slug } = useParams();
  return <MarketPlace filtros="categoria" parametros={slug} />;
};

const ProductosEditar = () => {
  const { slug } = useParams();
  return <MarketPlace filtros="editar" parametros={slug} />;
};

const ProductosEliminar = () => {
  const { slug } = useParams();
  return <MarketPlace filtros="eliminar" parametros={slug} />;
};

const ProductosPage = () => {
  return (
    <Routes>
      {/* /Cursos */}
      <Route index element={<Cursos />} />
      {/* /productos/mis-productos */}
      <Route path="mis-productos" element={<ProductosUsuario />} />
      {/* /productos/busqueda/:cadena */}
      <Route path="busqueda/:cadena" element={<ProductosBusqueda />} />
      {/* /productos/categoria/:slug */}
      <Route path="categoria/:slug" element={<ProductosCategoria />} />
      {/* /productos/editar/:slug */}
      <Route path="productos/editar/:slug" element={<ProductosEditar />} />
      {/* /productos/eliminar/:slug */}
      <Route path="productos/eliminar/:slug" element={<ProductosEliminar />} />
    </Routes>
  );
};

export default ProductosPage;
