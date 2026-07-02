import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  CardMedia,
  Box,
  Button,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import BotonEditar from './BotonEditar';
import productoImg from '../../assets/placeholders/contenido.png';

const CursoCard = ({
  titulo,
  slug,
  maestro,
  maestro_email,
  resumen,
  portada,
  categoria,
  fecha_publicacion,
}) => {
  const STRAPI_URL = process.env.REACT_APP_STRAPI_URL;
  const navigate = useNavigate();

  console.log('🧩 CursoCard props:', {
    titulo,
    slug,
    maestro,
    maestro_email,
    resumen,
    portada,
    categoria,
    fecha_publicacion,
  });

  const resolveImage = (portada) => {
    if (!portada) return productoImg;

    // si viene como objeto Strapi
    if (typeof portada === 'object') {
      const url = portada?.data?.attributes?.url;
      if (!url) return productoImg;
      return `${STRAPI_URL}${url}`;
    }

    // si ya es URL absoluta
    if (portada.startsWith('http://') || portada.startsWith('https://')) {
      return portada;
    }

    // si es ruta relativa
    return `${STRAPI_URL}/api/${portada}`;
  };

  const imagenUrl = resolveImage(portada);


  const handleClick = () => {
    navigate(`/curso/${slug}`);
  };

  const handleEdit = () => {
    navigate(`/cursos/editar/${slug}`);
  };

  return (
    <Card
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        borderRadius: 2,
        boxShadow: 3,
        overflow: 'hidden',
      }}
    >
      <CardMedia
        component="img"
        height="180"
        image={imagenUrl}
        alt={titulo}
        sx={{ objectFit: 'cover' }}
      />

      <CardContent sx={{ flexGrow: 1 }}>
        <Typography variant="h6" component="div" gutterBottom>
          {titulo}
        </Typography>

        {maestro && (
          <Typography variant="body2" color="text.secondary">
            Por: {maestro}
          </Typography>
        )}

        {categoria && (
          <Typography variant="caption" color="primary" display="block">
            Categoría: {categoria}
          </Typography>
        )}

        {resumen && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {resumen.length > 120 ? resumen.substring(0, 120) + '…' : resumen}
          </Typography>
        )}

        <Box display="flex" justifyContent="space-between" mt={2}>
          <BotonEditar 
            handleEdit={handleEdit}
            autor_email={maestro_email}
          />
          <Button onClick={handleClick} variant="outlined" size="small">
            <span className="material-icons" style={{ marginRight: 4 }}>chevron_right</span>
            Leer más
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};

export default CursoCard;