import React from 'react';
import { Routes, Route, useParams } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { CircularProgress, Box, Typography } from '@mui/material';
import Contenidos from '../../components/Blog/Contenidos';

// Wrappers to extract URL params and pass props to Contenidos
const ContenidosUsuario = () => {
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
          Para ver tus contenidos debes iniciar sesión.
        </Typography>
      </Box>
    );
  }

  // Usuario ya cargado y autenticado: pasamos su email
  const usuario = user.email;
  return <Contenidos filtros="mis-contenidos" parametros={usuario} />;
};

const ContenidosBusqueda = () => {
  const { cadena } = useParams();
  return <Contenidos filtros="busqueda" parametros={cadena} />;
};

const ContenidosCategoria = () => {
  const { slug } = useParams();
  return <Contenidos filtros="categoria" parametros={slug} />;
};

const ContenidosEditar = () => {
  const { slug } = useParams();
  return <Contenidos filtros="editar" parametros={slug} />;
};

const ContenidosEliminar = () => {
  const { slug } = useParams();
  return <Contenidos filtros="eliminar" parametros={slug} />;
};

const ContenidosPage = () => {
  return (
    <Routes>
      {/* /contenidos */}
      <Route index element={<Contenidos />} />
      {/* /contenidos/mis-contenidos */}
      <Route path="mis-contenidos" element={<ContenidosUsuario />} />
      {/* /contenidos/busqueda/:cadena */}
      <Route path="busqueda/:cadena" element={<ContenidosBusqueda />} />
      {/* /contenidos/categoria/:slug */}
      <Route path="categoria/:slug" element={<ContenidosCategoria />} />
      {/* /contenidos/editar/:slug */}
      <Route path="categoria/:slug" element={<ContenidosEditar />} />
      {/* /contenidos/eliminar/:slug */}
      <Route path="categoria/:slug" element={<ContenidosEliminar />} />
    </Routes>
  );
};

export default ContenidosPage;
