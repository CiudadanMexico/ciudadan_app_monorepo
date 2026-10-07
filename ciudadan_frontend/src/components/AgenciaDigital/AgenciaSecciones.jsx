// src/components/AgenciaDigital/AgenciaSecciones.jsx
// Secciones de la landing /gana/agencias — Agencia Digital IA (Ciudadan + Publia).
// MUI v6 + morados de marca (PurpleButton) + tokens del tema.
import React from 'react';
import { Box, Card, CardContent, Chip, Paper, Stack, Typography } from '@mui/material';
import DesignServicesIcon from '@mui/icons-material/DesignServices';
import PublicIcon from '@mui/icons-material/Public';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import HubIcon from '@mui/icons-material/Hub';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import CampaignIcon from '@mui/icons-material/Campaign';
import Diversity3Icon from '@mui/icons-material/Diversity3';
import BrushIcon from '@mui/icons-material/Brush';
import CategoryIcon from '@mui/icons-material/Category';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import VideocamIcon from '@mui/icons-material/Videocam';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import DnsIcon from '@mui/icons-material/Dns';
import BuildIcon from '@mui/icons-material/Build';
import PrintIcon from '@mui/icons-material/Print';
import SchoolIcon from '@mui/icons-material/School';
import GroupsIcon from '@mui/icons-material/Groups';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import InsightsIcon from '@mui/icons-material/Insights';
import HandshakeIcon from '@mui/icons-material/Handshake';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import { MORADO, MORADO_OSCURO } from '../common/PurpleButton.jsx';

const gridCards = {
  display: 'grid',
  gap: 2,
  gridTemplateColumns: {
    xs: 'repeat(2, minmax(0,1fr))',
    sm: 'repeat(3, minmax(0,1fr))',
    md: 'repeat(4, minmax(0,1fr))',
  },
};

const SectionTitle = ({ children, hint }) => (
  <Box sx={{ mb: 2 }}>
    <Typography variant="h5" component="h2" sx={{ fontWeight: 800, letterSpacing: '-0.01em' }}>
      {children}
    </Typography>
    {hint && (
      <Typography sx={{ mt: 0.5, color: 'text.secondary', lineHeight: 1.6 }}>{hint}</Typography>
    )}
  </Box>
);

const CAPACIDADES = [
  { icono: <DesignServicesIcon />, nombre: 'Websites' },
  { icono: <PublicIcon />, nombre: 'Landing pages' },
  { icono: <ShoppingCartIcon />, nombre: 'E-commerce' },
  { icono: <SmartToyIcon />, nombre: 'Agentes de IA' },
  { icono: <HubIcon />, nombre: 'Chatbots' },
  { icono: <AutorenewIcon />, nombre: 'Automatización' },
  { icono: <CampaignIcon />, nombre: 'Marketing digital' },
  { icono: <Diversity3Icon />, nombre: 'Redes sociales' },
  { icono: <BrushIcon />, nombre: 'Branding' },
  { icono: <CategoryIcon />, nombre: 'Diseño gráfico' },
  { icono: <PhotoCameraIcon />, nombre: 'Imagen' },
  { icono: <VideocamIcon />, nombre: 'Video' },
  { icono: <MusicNoteIcon />, nombre: 'Audio' },
  { icono: <MusicNoteIcon />, nombre: 'Música' },
  { icono: <InsightsIcon />, nombre: 'Multimedia' },
  { icono: <DnsIcon />, nombre: 'Infraestructura tecnológica' },
  { icono: <BuildIcon />, nombre: 'Desarrollo y soluciones a la medida' },
  { icono: <PrintIcon />, nombre: 'Impresión 3D / prototipado' },
];

export const AgenciaCapacidades = () => (
  <Box>
    <SectionTitle hint="Capacidades del modelo y del ecosistema. Se incorporan por fases, según la especialidad de cada agencia.">
      ¿Qué puedes ofrecer?
    </SectionTitle>
    <Box sx={gridCards}>
      {CAPACIDADES.map((item) => (
        <Stack
          key={item.nombre}
          spacing={1}
          alignItems="center"
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 3,
            p: 2,
            textAlign: 'center',
            height: '100%',
          }}
        >
          <Box sx={{ color: MORADO }}>{item.icono}</Box>
          <Typography sx={{ fontWeight: 700, fontSize: '0.88rem', lineHeight: 1.35 }}>
            {item.nombre}
          </Typography>
        </Stack>
      ))}
    </Box>
    <Typography sx={{ mt: 2, color: 'text.secondary', fontSize: '0.9rem', lineHeight: 1.6 }}>
      No todas las capacidades están operativas hoy: algunas se habilitan conforme la red suma
      especialistas y talleres.
    </Typography>
  </Box>
);

const APOYOS = [
  { icono: <BuildIcon />, nombre: 'Herramientas compartidas' },
  { icono: <AutorenewIcon />, nombre: 'Procesos' },
  { icono: <SchoolIcon />, nombre: 'Capacitación' },
  { icono: <InsightsIcon />, nombre: 'Know-how' },
  { icono: <DnsIcon />, nombre: 'Infraestructura' },
  { icono: <SmartToyIcon />, nombre: 'Agentes de IA' },
  { icono: <HandshakeIcon />, nombre: 'Colaboración con especialistas' },
  { icono: <GroupsIcon />, nombre: 'Apoyo de la red' },
];

export const AgenciaNoEmpiezasDeCero = () => (
  <Box>
    <SectionTitle hint="Entras a una red que ya construyó el camino: no arrancas solo ni desde cero.">
      No empiezas desde cero
    </SectionTitle>
    <Box
      sx={{
        display: 'grid',
        gap: 1.5,
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0,1fr))', md: 'repeat(4, minmax(0,1fr))' },
      }}
    >
      {APOYOS.map((item) => (
        <Stack
          key={item.nombre}
          direction="row"
          spacing={1.5}
          alignItems="center"
          sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, p: 2 }}
        >
          <Box sx={{ color: MORADO, display: 'flex' }}>{item.icono}</Box>
          <Typography sx={{ fontWeight: 700, lineHeight: 1.4 }}>{item.nombre}</Typography>
        </Stack>
      ))}
    </Box>
  </Box>
);

const RUTA = [
  'APRENDES',
  'VENDES',
  'PRODUCES',
  'CONSTRUYES EQUIPO',
  'FORMAS TALENTO',
  'CREAS CAPACIDAD LOCAL',
  'OPERAS COMO NODO PRODUCTIVO',
];

export const AgenciaRutaCrecimiento = () => (
  <Paper
    id="agencia-ruta"
    elevation={0}
    sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, p: { xs: 2.5, md: 3 } }}
  >
    <SectionTitle hint="Una progresión clara: primero aprendes y vendes, después produces y formas equipo.">
      Ruta de crecimiento
    </SectionTitle>
    <Stack
      direction={{ xs: 'column', md: 'row' }}
      spacing={1}
      alignItems={{ xs: 'stretch', md: 'center' }}
      flexWrap="wrap"
      useFlexGap
    >
      {RUTA.map((paso, i) => (
        <React.Fragment key={paso}>
          <Chip
            label={paso}
            sx={{
              fontWeight: 800,
              borderRadius: 2,
              color: '#fff',
              background: `linear-gradient(135deg, ${MORADO} 0%, ${MORADO_OSCURO} 100%)`,
            }}
          />
          {i < RUTA.length - 1 && (
            <>
              <Typography
                sx={{
                  display: { xs: 'block', md: 'none' },
                  textAlign: 'center',
                  color: MORADO,
                  fontWeight: 900,
                }}
              >
                ↓
              </Typography>
              <Typography sx={{ display: { xs: 'none', md: 'block' }, color: MORADO, fontWeight: 900 }}>
                →
              </Typography>
            </>
          )}
        </React.Fragment>
      ))}
    </Stack>
  </Paper>
);

export const AgenciaIaPersonas = () => (
  <Box>
    <SectionTitle>IA + personas</SectionTitle>
    <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0,1fr))' } }}>
      <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
        <CardContent>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
            <SmartToyIcon sx={{ color: MORADO }} />
            <Typography sx={{ fontWeight: 800 }}>La IA</Typography>
          </Stack>
          <Typography sx={{ color: 'text.secondary', lineHeight: 1.65 }}>
            Automatiza y multiplica la capacidad del equipo: produce más, más rápido y con menos
            costo operativo.
          </Typography>
        </CardContent>
      </Card>
      <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
        <CardContent>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
            <PersonAddIcon sx={{ color: MORADO }} />
            <Typography sx={{ fontWeight: 800 }}>Las personas</Typography>
          </Stack>
          <Typography sx={{ color: 'text.secondary', lineHeight: 1.65 }}>
            Aportan estrategia, creatividad, conocimiento local y la relación con los clientes.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  </Box>
);

export const AgenciaRedCooperativa = () => (
  <Paper
    elevation={0}
    sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, p: { xs: 2.5, md: 3 } }}
  >
    <SectionTitle hint="No es una franquicia aislada: la agencia opera como nodo de una red cooperativa.">
      Red cooperativa
    </SectionTitle>
    <Typography sx={{ color: 'text.secondary', lineHeight: 1.7, mb: 2 }}>
      Cada agencia comparte con la red lo que produce y recibe lo que la red ya construyó:
      tecnología, conocimiento, herramientas, infraestructura, especialistas, capacidades y
      oportunidades.
    </Typography>
    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
      <Chip icon={<DnsIcon />} label="Tecnología" size="small" variant="outlined" />
      <Chip icon={<InsightsIcon />} label="Conocimiento" size="small" variant="outlined" />
      <Chip icon={<BuildIcon />} label="Herramientas" size="small" variant="outlined" />
      <Chip icon={<GroupsIcon />} label="Especialistas" size="small" variant="outlined" />
      <Chip icon={<HandshakeIcon />} label="Oportunidades" size="small" variant="outlined" />
    </Stack>
  </Paper>
);

export const AgenciaCierre = () => {
  const irARuta = () => {
    if (typeof document === 'undefined') return;
    document.getElementById('agencia-ruta')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
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
        <Typography
          variant="h5"
          component="h2"
          sx={{ fontWeight: 900, letterSpacing: '-0.01em', fontSize: { xs: '1.5rem', md: '2rem' } }}
        >
          ABRE TU AGENCIA DIGITAL
        </Typography>
        <Typography sx={{ mt: 1.5, color: 'rgba(255,255,255,0.92)', lineHeight: 1.65 }}>
          Empieza desde tu localidad, con la tecnología y la red de Ciudadan y Publia detrás de ti.
        </Typography>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.5}
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          sx={{ mt: 2.5 }}
        >
          <Chip
            label="PRÓXIMAMENTE"
            sx={{ bgcolor: 'rgba(255,255,255,0.22)', color: '#fff', fontWeight: 800 }}
          />
          <Chip
            clickable
            onClick={irARuta}
            icon={<RocketLaunchIcon sx={{ color: '#fff !important' }} />}
            label="Conoce el modelo"
            sx={{
              bgcolor: 'rgba(0,0,0,0.28)',
              color: '#fff',
              fontWeight: 800,
              border: '1px solid rgba(255,255,255,0.5)',
              '&:hover': { bgcolor: 'rgba(0,0,0,0.42)' },
            }}
          />
        </Stack>
        <Typography sx={{ mt: 2, color: 'rgba(255,255,255,0.85)', fontSize: '0.9rem', lineHeight: 1.6 }}>
          El alta de agencias todavía no está habilitada: esta sección muestra el modelo completo,
          sin registro ni contratación por ahora.
        </Typography>
      </CardContent>
    </Card>
  );
};


