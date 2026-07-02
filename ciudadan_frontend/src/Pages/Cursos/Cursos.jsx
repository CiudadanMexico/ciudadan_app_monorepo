import React from 'react';
import { Routes, Route, useParams } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { CircularProgress, Box, Typography } from '@mui/material';
import Cursos from '../../components/Cursos/Cursos';

// Wrappers to extract URL params and pass props to Contenidos
const CursosUsuario = () => {
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
          Para ver tus cursos debes iniciar sesión.
        </Typography>
      </Box>
    );
  }

  // Usuario ya cargado y autenticado: pasamos su email
  const usuario = user.email;
  console.log('cursos cargando componente desde la página de mis-cursos');
  return <Cursos filtros="mis-cursos" parametros={usuario} />;
};

const CursosBusqueda = () => {
  const { cadena } = useParams();
  return <Cursos filtros="busqueda" parametros={cadena} />;
};

const CursosCategoria = () => {
  const { slug } = useParams();
  return <Cursos filtros="categoria" parametros={slug} />;
};

const CursosEditar = () => {
  const { slug } = useParams();
  return <Cursos filtros="editar" parametros={slug} />;
};

const CursosEliminar = () => {
  const { slug } = useParams();
  return <Cursos filtros="eliminar" parametros={slug} />;
};

const CursosPage = () => {
  return (
    <Routes>
      {/* /Cursos */}
      <Route index element={<Cursos />} />
      {/* /cursos/mis-cursos */}
      <Route path="mis-cursos/*" element={<CursosUsuario />} />
      {/* /cursos/busqueda/:cadena */}
      <Route path="busqueda/:cadena" element={<CursosBusqueda />} />
      {/* /cursos/categoria/:slug */}
      <Route path="categoria/:slug" element={<CursosCategoria />} />
      {/* /cursos/editar/:slug */}
      <Route path="categoria/:slug" element={<CursosEditar />} />
      {/* /cursos/eliminar/:slug */}
      <Route path="categoria/:slug" element={<CursosEliminar />} />
    </Routes>
  );
};

export default CursosPage;
