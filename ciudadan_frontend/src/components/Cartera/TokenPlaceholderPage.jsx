import React from 'react';
import { Box, Chip, Container, Paper, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Button from '@mui/material/Button';
import ConstructionIcon from '@mui/icons-material/Construction';

/**
 * Shell reutilizable para las páginas que hoy son marcadores de posición
 * (Id-Token → /identidad, Vote-Token → /votaciones, Object-Token → /objetos).
 *
 * Mantiene la estética oscura/violeta de Cartera y deja explícito qué existe
 * hoy y qué está en desarrollo: no simula contenido ni datos.
 *
 * `bloques` = [{ titulo, texto }]
 */
const TokenPlaceholderPage = ({
  titulo,
  subtitulo,
  chip = 'En desarrollo',
  bloques = [],
  notaEstado,
  backTo = '/cartera',
  backLabel = 'Volver a la Cartera',
}) => (
  <Box
    sx={{
      minHeight: '100vh',
      background:
        'radial-gradient(1100px 520px at 12% -8%, rgba(138,92,245,0.22) 0%, rgba(0,0,0,0) 60%), radial-gradient(900px 480px at 108% 18%, rgba(106,63,203,0.18) 0%, rgba(0,0,0,0) 55%), linear-gradient(180deg, #0b0716 0%, #0e0a1c 45%, #080512 100%)',
      color: 'white',
      py: { xs: 3, sm: 6 },
    }}
  >
    <Container maxWidth="md">
      <Button
        component={RouterLink}
        to={backTo}
        startIcon={<ArrowBackIcon />}
        sx={{ mb: 2, color: '#c9b4ff', textTransform: 'none', fontWeight: 600 }}
      >
        {backLabel}
      </Button>

      <Paper
        elevation={10}
        sx={{
          p: { xs: 3, sm: 4 },
          borderRadius: 4,
          background:
            'linear-gradient(160deg, rgba(138,92,245,0.16) 0%, rgba(20,12,36,0.94) 45%, rgba(106,63,203,0.18) 100%)',
          border: '1px solid rgba(138,92,245,0.32)',
          color: 'white',
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }} flexWrap="wrap">
          <ConstructionIcon sx={{ color: '#c9b4ff' }} />
          <Chip
            label={chip}
            size="small"
            sx={{ bgcolor: 'rgba(138,92,245,0.25)', color: '#e5dcff', fontWeight: 700 }}
          />
        </Stack>

        <Typography
          variant="h4"
          sx={{
            fontWeight: 700,
            fontSize: { xs: '1.5rem', sm: '2rem' },
            color: '#c9b4ff',
            mb: 1,
            letterSpacing: '-0.02em',
          }}
        >
          {titulo}
        </Typography>

        {subtitulo && (
          <Typography sx={{ color: 'rgba(255,255,255,0.85)', lineHeight: 1.6, mb: 2 }}>
            {subtitulo}
          </Typography>
        )}

        {bloques.map((bloque) => (
          <Box key={bloque.titulo} sx={{ mt: 2.5 }}>
            <Typography
              sx={{
                fontWeight: 700,
                fontSize: '0.8rem',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                color: '#8ee9d6',
                mb: 0.5,
              }}
            >
              {bloque.titulo}
            </Typography>
            <Typography
              sx={{
                color: 'rgba(255,255,255,0.88)',
                fontSize: { xs: '0.85rem', sm: '0.9rem' },
                lineHeight: 1.6,
                whiteSpace: 'pre-line',
              }}
            >
              {bloque.texto}
            </Typography>
          </Box>
        ))}

        {notaEstado && (
          <Typography
            sx={{
              mt: 3,
              p: 1.5,
              borderRadius: 2,
              bgcolor: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              fontSize: '0.85rem',
              color: 'rgba(255,255,255,0.8)',
            }}
          >
            {notaEstado}
          </Typography>
        )}
      </Paper>
    </Container>
  </Box>
);

export default TokenPlaceholderPage;
