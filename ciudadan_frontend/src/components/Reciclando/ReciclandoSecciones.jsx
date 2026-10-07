// src/components/Reciclando/ReciclandoSecciones.jsx
// Secciones de la landing /gana/reciclando — economía circular productiva.
// MUI v6 + tokens del tema (legible en claro/oscuro) + gradientes de marca.
import React from 'react';
import { Box, Card, CardContent, Chip, Paper, Stack, Typography } from '@mui/material';
import RecyclingIcon from '@mui/icons-material/Recycling';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import CategoryIcon from '@mui/icons-material/Category';
import BuildIcon from '@mui/icons-material/Build';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import StorefrontIcon from '@mui/icons-material/Storefront';
import ElectricalServicesIcon from '@mui/icons-material/ElectricalServices';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import PrintIcon from '@mui/icons-material/Print';
import HandymanIcon from '@mui/icons-material/Handyman';
import CampaignIcon from '@mui/icons-material/Campaign';
import ForestIcon from '@mui/icons-material/Forest';
import GroupsIcon from '@mui/icons-material/Groups';
import NatureIcon from '@mui/icons-material/Nature';
import VolunteerActivismIcon from '@mui/icons-material/VolunteerActivism';
import SavingsIcon from '@mui/icons-material/Savings';
import InsightsIcon from '@mui/icons-material/Insights';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import HandshakeIcon from '@mui/icons-material/Handshake';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';

export const VERDE = '#0f7b52';
export const VERDE_OSCURO = '#0a5238';
export const VERDE_NEON = '#00ff99';

const gridCards = {
  display: 'grid',
  gap: 2,
  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0,1fr))', md: 'repeat(3, minmax(0,1fr))' },
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

const CADENA = [
  'Residuo',
  'Clasificación',
  'Reparación / reutilización',
  'Transformación',
  'Producto o insumo',
  'Uso / venta',
  'Recompensa comunitaria',
];

export const ReciclandoCadena = () => (
  <Paper
    elevation={0}
    sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, p: { xs: 2.5, md: 3 } }}
  >
    <Typography sx={{ fontWeight: 800, mb: 1.5 }}>Economía circular productiva</Typography>
    <Typography sx={{ color: 'text.secondary', mb: 2, lineHeight: 1.65 }}>
      El objetivo no es acumular residuo, sino devolverle valor y convertirlo en recurso para la
      comunidad.
    </Typography>
    <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
      {CADENA.map((paso, i) => (
        <React.Fragment key={paso}>
          <Chip
            label={paso}
            size="small"
            sx={{
              fontWeight: 700,
              bgcolor: 'transparent',
              border: '1px solid',
              borderColor: 'divider',
            }}
          />
          {i < CADENA.length - 1 && (
            <Typography sx={{ color: 'text.secondary', fontWeight: 800 }}>↓</Typography>
          )}
        </React.Fragment>
      ))}
    </Box>
  </Paper>
);

const CICLO = [
  {
    icono: <DeleteSweepIcon />,
    titulo: 'Recolección',
    texto: 'Trae materiales y objetos a puntos de colecta de la comunidad.',
  },
  {
    icono: <CategoryIcon />,
    titulo: 'Clasificación',
    texto: 'Separamos materiales según su tipo, condición y posible aprovechamiento.',
  },
  {
    icono: <BuildIcon />,
    titulo: 'Reparación y reutilización',
    texto: 'Antes de destruir algo, buscamos darle una segunda vida.',
  },
  {
    icono: <AutorenewIcon />,
    titulo: 'Transformación',
    texto: 'Los materiales recuperados pueden convertirse en materia prima.',
  },
  {
    icono: <PrecisionManufacturingIcon />,
    titulo: 'Fabricación',
    texto: 'Los talleres pueden convertir esos recursos en nuevos objetos, piezas o productos.',
  },
  {
    icono: <StorefrontIcon />,
    titulo: 'Uso y economía local',
    texto: 'Los productos pueden regresar a la comunidad o incorporarse al ecosistema productivo.',
  },
];

export const ReciclandoElCiclo = () => (
  <Box>
    <SectionTitle hint="Cada etapa aprovecha lo que la anterior recuperó: el residuo es el punto de partida, no el final.">
      El ciclo
    </SectionTitle>
    <Box sx={gridCards}>
      {CICLO.map((paso, i) => (
        <Card
          key={paso.titulo}
          elevation={0}
          sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, height: '100%' }}
        >
          <CardContent>
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  display: 'grid',
                  placeItems: 'center',
                  color: '#fff',
                  background: `linear-gradient(135deg, ${VERDE} 0%, ${VERDE_OSCURO} 100%)`,
                  flexShrink: 0,
                }}
              >
                {paso.icono}
              </Box>
              <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary' }}>
                PASO {i + 1}
              </Typography>
            </Stack>
            <Typography sx={{ fontWeight: 800, mb: 0.5 }}>{paso.titulo}</Typography>
            <Typography sx={{ color: 'text.secondary', lineHeight: 1.6 }}>{paso.texto}</Typography>
          </CardContent>
        </Card>
      ))}
    </Box>
  </Box>
);

const SISTEMA = [
  { icono: <StorefrontIcon />, nombre: 'Puntos de colecta' },
  { icono: <Inventory2Icon />, nombre: 'Materiales reciclables' },
  { icono: <ElectricalServicesIcon />, nombre: 'Electrónica' },
  { icono: <BuildIcon />, nombre: 'Reparación' },
  { icono: <AutorenewIcon />, nombre: 'Reutilización' },
  { icono: <RecyclingIcon />, nombre: 'Plásticos' },
  { icono: <PrintIcon />, nombre: 'Impresión 3D' },
  { icono: <HandymanIcon />, nombre: 'Fabricación local' },
  { icono: <GroupsIcon />, nombre: 'Talleres comunitarios' },
  { icono: <CampaignIcon />, nombre: 'Campañas ambientales' },
  { icono: <ForestIcon />, nombre: 'Reforestación' },
  { icono: <HandshakeIcon />, nombre: 'Proyectos comunitarios' },
];

export const ReciclandoSistema = () => (
  <Box>
    <SectionTitle hint="Piezas del ecosistema que iremos habilitando por fases.">
      ¿Qué formará parte del sistema?
    </SectionTitle>
    <Box
      sx={{
        display: 'grid',
        gap: 1.5,
        gridTemplateColumns: {
          xs: 'repeat(2, minmax(0,1fr))',
          sm: 'repeat(3, minmax(0,1fr))',
          md: 'repeat(4, minmax(0,1fr))',
        },
      }}
    >
      {SISTEMA.map((item) => (
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
          <Box sx={{ color: VERDE }}>{item.icono}</Box>
          <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', lineHeight: 1.35 }}>
            {item.nombre}
          </Typography>
        </Stack>
      ))}
    </Box>
  </Box>
);

export const ReciclandoRecompensas = () => (
  <Paper
    elevation={0}
    sx={{ borderRadius: 3, p: { xs: 2.5, md: 3 }, border: '1px solid', borderColor: 'divider' }}
  >
    <SectionTitle hint="La contribución correcta se reconoce: separar bien, recuperar y participar también produce valor.">
      Recompensas
    </SectionTitle>
    <Typography sx={{ color: 'text.secondary', lineHeight: 1.7, mb: 2 }}>
      En fases posteriores, las personas que contribuyan correctamente con materiales, separación,
      recuperación y actividades comunitarias podrán recibir recompensas dentro del ecosistema
      Ciudadan.
    </Typography>
    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
      <Chip icon={<SavingsIcon />} label="Labory / Laborys (futuro)" size="small" variant="outlined" />
      <Chip icon={<VolunteerActivismIcon />} label="Beneficio comunitario" size="small" variant="outlined" />
      <Chip icon={<InsightsIcon />} label="Impacto medible" size="small" variant="outlined" />
    </Stack>
    <Typography sx={{ color: 'text.secondary', fontSize: '0.9rem', lineHeight: 1.6 }}>
      Por ahora esto es una vista previa del modelo: todavía no hay wallet, pagos ni acreditación de
      Laborys en esta sección.
    </Typography>
  </Paper>
);

const TALLERES = [
  { icono: <RecyclingIcon />, nombre: 'Reciclaje' },
  { icono: <ElectricalServicesIcon />, nombre: 'Electrónica' },
  { icono: <BuildIcon />, nombre: 'Reparación' },
  { icono: <Inventory2Icon />, nombre: 'Plásticos' },
  { icono: <PrintIcon />, nombre: 'Impresión 3D' },
  { icono: <HandymanIcon />, nombre: 'Fabricación' },
  { icono: <PrecisionManufacturingIcon />, nombre: 'Transformación de materias primas' },
];

export const ReciclandoTalleres = () => (
  <Box>
    <SectionTitle hint="Los talleres son el puente entre el material recuperado y un producto útil para la comunidad.">
      Talleres productivos
    </SectionTitle>
    <Box
      sx={{
        display: 'grid',
        gap: 1.5,
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0,1fr))', md: 'repeat(4, minmax(0,1fr))' },
        mb: 2,
      }}
    >
      {TALLERES.map((item) => (
        <Stack
          key={item.nombre}
          spacing={1}
          alignItems="center"
          sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, p: 2, textAlign: 'center' }}
        >
          <Box sx={{ color: VERDE }}>{item.icono}</Box>
          <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', lineHeight: 1.35 }}>
            {item.nombre}
          </Typography>
        </Stack>
      ))}
    </Box>
    <Card
      elevation={0}
      sx={{
        borderRadius: 3,
        color: '#fff',
        background: `linear-gradient(135deg, ${VERDE} 0%, ${VERDE_OSCURO} 100%)`,
      }}
    >
      <CardContent>
        <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.05rem', md: '1.2rem' }, lineHeight: 1.45 }}>
          No se trata solamente de reciclar. Se trata de recuperar valor y producir localmente.
        </Typography>
      </CardContent>
    </Card>
  </Box>
);

const FUTURO = [
  { icono: <StorefrontIcon />, nombre: 'Puntos comunitarios de colecta' },
  { icono: <Inventory2Icon />, nombre: 'Inventario distribuido de materiales' },
  { icono: <LocalShippingIcon />, nombre: 'Recolección domiciliaria' },
  { icono: <CampaignIcon />, nombre: 'Campañas ambientales' },
  { icono: <ForestIcon />, nombre: 'Proyectos de reforestación' },
  { icono: <SavingsIcon />, nombre: 'Recompensas' },
  { icono: <NatureIcon />, nombre: 'Proyectos productivos' },
  { icono: <QrCode2Icon />, nombre: 'Trazabilidad de materiales' },
];

export const ReciclandoFuturo = () => (
  <Box>
    <SectionTitle hint="Funciones próximas dentro del ecosistema. Se irán liberando por fases.">
      Futuro
    </SectionTitle>
    <Box sx={gridCards}>
      {FUTURO.map((item) => (
        <Stack
          key={item.nombre}
          direction="row"
          spacing={1.5}
          alignItems="center"
          sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, p: 2 }}
        >
          <Box sx={{ color: VERDE, display: 'flex' }}>{item.icono}</Box>
          <Typography sx={{ fontWeight: 700, lineHeight: 1.4 }}>{item.nombre}</Typography>
        </Stack>
      ))}
    </Box>
    <Box sx={{ mt: 3, textAlign: 'center' }}>
      <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="center">
        <RocketLaunchIcon sx={{ color: VERDE }} />
        <Typography variant="h6" sx={{ fontWeight: 900, letterSpacing: '0.04em' }}>
          PRÓXIMAMENTE EN CIUDADAN
        </Typography>
      </Stack>
      <Typography sx={{ mt: 1, color: 'text.secondary' }}>
        Reciclando se conecta con las tareas, los talleres y las recompensas del ecosistema.
      </Typography>
    </Box>
  </Box>
);


