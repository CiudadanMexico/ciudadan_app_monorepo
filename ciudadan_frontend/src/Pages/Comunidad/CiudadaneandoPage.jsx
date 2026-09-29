// src/Pages/Comunidad/CiudadaneandoPage.jsx
// Página /comunidad/ciudadaneando — vista previa (placeholder atractivo).
// No implementa todavía la funcionalidad Ciudadaneando.
import React from 'react';
import { Box, Card, CardContent, Chip, Container, Stack, Typography } from '@mui/material';
import HubIcon from '@mui/icons-material/Hub';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import HandshakeIcon from '@mui/icons-material/Handshake';
import StoreIcon from '@mui/icons-material/Store';
import GroupsIcon from '@mui/icons-material/Groups';
import Diversity3Icon from '@mui/icons-material/Diversity3';
import PeopleIcon from '@mui/icons-material/People';
import NatureIcon from '@mui/icons-material/Nature';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import SavingsIcon from '@mui/icons-material/Savings';
import { MORADO, MORADO_OSCURO } from '../../components/common/PurpleButton.jsx';

const ETIQUETAS = [
  { icono: <HubIcon />, nombre: 'Compartir' },
  { icono: <AutorenewIcon />, nombre: 'Colaborar' },
  { icono: <HandshakeIcon />, nombre: 'Trueque' },
  { icono: <StoreIcon />, nombre: 'Tekio' },
  { icono: <GroupsIcon />, nombre: 'Comunidad' },
  { icono: <Diversity3Icon />, nombre: 'Cooperativas' },
  { icono: <PeopleIcon />, nombre: 'Vecinos' },
  { icono: <NatureIcon />, nombre: 'Huertos' },
  { icono: <Inventory2Icon />, nombre: 'Objetos' },
  { icono: <SavingsIcon />, nombre: 'Labory' },
];

const NODOS = [0, 1, 2, 3];

export default function CiudadaneandoPage() {
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
              variant="h3"
              component="h1"
              sx={{ fontWeight: 900, letterSpacing: '-0.02em', fontSize: { xs: '1.9rem', md: '2.7rem' } }}
            >
              CIUDADANEANDO
            </Typography>
            <Typography sx={{ mt: 1.5, fontWeight: 600, fontSize: { xs: '1.05rem', md: '1.2rem' } }}>
              Una nueva forma de compartir, colaborar y construir comunidad.
            </Typography>
            <Typography sx={{ mt: 1, color: 'rgba(255,255,255,0.92)', lineHeight: 1.65 }}>
              Ciudadanear es participar: trueque, tekio, huertos, consejos vecinales, cooperativas de
              consumo y todo lo que fortalece a la comunidad local.
            </Typography>

            {/* Red de nodos: decoración CSS ligera, sin dependencias de animación */}
            <Box
              sx={{
                mt: 3,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 0,
                opacity: 0.9,
              }}
            >
              {NODOS.map((nodo, i) => (
                <React.Fragment key={nodo}>
                  <Box
                    sx={{
                      width: { xs: 12, md: 16 },
                      height: { xs: 12, md: 16 },
                      borderRadius: '50%',
                      bgcolor: 'rgba(255,255,255,0.85)',
                      boxShadow: '0 0 0 6px rgba(255,255,255,0.18)',
                      flexShrink: 0,
                    }}
                  />
                  {i < NODOS.length - 1 && (
                    <Box
                      sx={{
                        height: '2px',
                        flex: 1,
                        maxWidth: { xs: 56, md: 90 },
                        background:
                          'linear-gradient(90deg, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.35) 100%)',
                      }}
                    />
                  )}
                </React.Fragment>
              ))}
            </Box>
          </CardContent>
        </Card>

        <Box>
          <Typography variant="h5" component="h2" sx={{ fontWeight: 800, mb: 0.5 }}>
            Lo que se viene
          </Typography>
          <Typography sx={{ color: 'text.secondary', mb: 2, lineHeight: 1.6 }}>
            Piezas que formarán parte de Ciudadaneando en las siguientes fases.
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {ETIQUETAS.map((etiqueta) => (
              <Chip
                key={etiqueta.nombre}
                icon={etiqueta.icono}
                label={etiqueta.nombre}
                sx={{
                  fontWeight: 700,
                  borderRadius: 999,
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'transparent',
                  '& .MuiChip-icon': { color: MORADO },
                }}
              />
            ))}
          </Stack>
        </Box>

        <Card
          elevation={0}
          sx={{ border: '1px dashed', borderColor: 'divider', borderRadius: 3, bgcolor: 'transparent' }}
        >
          <CardContent>
            <Typography sx={{ fontWeight: 800, mb: 0.5 }}>Comunidad en construcción</Typography>
            <Typography sx={{ color: 'text.secondary', lineHeight: 1.65 }}>
              Esta sección todavía no está operativa: muestra cómo se conectará Ciudadaneando con el
              resto de las herramientas de Ciudadan para el reempoderamiento ciudadano local.
            </Typography>
          </CardContent>
        </Card>
      </Stack>
    </Container>
  );
}
