// src/Pages/Coowork/ProfesoresPage.jsx
// Página /coowork/profesores — MASTERS CIUDADAN (vista previa).
// Placeholder visualmente terminado: no implementa el sistema de profesores todavía.
import React from 'react';
import { Box, Card, CardContent, Chip, Container, Stack, Typography } from '@mui/material';
import SchoolIcon from '@mui/icons-material/School';
import HandshakeIcon from '@mui/icons-material/Handshake';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import { MORADO, MORADO_OSCURO } from '../../components/common/PurpleButton.jsx';

const PILARES = [
  {
    icono: <SchoolIcon fontSize="large" />,
    titulo: 'ENSEÑA',
    texto: 'Comparte experiencia y conocimiento.',
  },
  {
    icono: <HandshakeIcon fontSize="large" />,
    titulo: 'PARTICIPA',
    texto: 'Integra formación con proyectos reales.',
  },
  {
    icono: <PersonAddIcon fontSize="large" />,
    titulo: 'FORMA NUEVOS EQUIPOS',
    texto: 'Ayuda a preparar a la siguiente generación de colaboradores.',
  },
];

export default function ProfesoresPage() {
  return (
    <Container maxWidth="md" sx={{ py: { xs: 3, md: 5 } }}>
      <Stack spacing={3}>
        <Card
          elevation={0}
          sx={{
            borderRadius: 4,
            color: '#fff',
            background: `linear-gradient(135deg, ${MORADO} 0%, ${MORADO_OSCURO} 100%)`,
            boxShadow: '0 8px 28px rgba(138,92,245,0.35)',
          }}
        >
          <CardContent sx={{ p: { xs: 3, md: 4 } }}>
            <Chip
              label="PRÓXIMAMENTE"
              size="small"
              sx={{ bgcolor: 'rgba(255,255,255,0.22)', color: '#fff', fontWeight: 800, mb: 2 }}
            />
            <Typography
              variant="h4"
              component="h1"
              sx={{ fontWeight: 900, letterSpacing: '-0.01em', fontSize: { xs: '1.7rem', md: '2.3rem' } }}
            >
              MASTERS CIUDADAN
            </Typography>
            <Typography sx={{ mt: 1.5, fontWeight: 600, fontSize: { xs: '1.05rem', md: '1.15rem' } }}>
              Enseña. Investiga. Produce. Forma a quienes vienen detrás.
            </Typography>
            <Typography sx={{ mt: 1.5, color: 'rgba(255,255,255,0.92)', lineHeight: 1.7 }}>
              Próximamente podrás incorporarte como profesor o Master de la red Ciudadan, compartir
              conocimiento, participar en proyectos productivos y formar nuevos equipos.
            </Typography>
          </CardContent>
        </Card>

        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0,1fr))' },
          }}
        >
          {PILARES.map((pilar) => (
            <Card
              key={pilar.titulo}
              elevation={0}
              sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, height: '100%' }}
            >
              <CardContent>
                <Box sx={{ color: MORADO, mb: 1.5 }}>{pilar.icono}</Box>
                <Typography sx={{ fontWeight: 800, mb: 0.5, letterSpacing: '0.02em' }}>
                  {pilar.titulo}
                </Typography>
                <Typography sx={{ color: 'text.secondary', lineHeight: 1.6 }}>
                  {pilar.texto}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Box>
      </Stack>
    </Container>
  );
}
