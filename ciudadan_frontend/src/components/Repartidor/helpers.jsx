import React from 'react';
import { Chip, Paper, Typography, Box } from '@mui/material';

/**
 * Etiquetas y componentes compartidos del modulo Repartidor.
 * Spanish-first, MUI v6 + sx (patron Cowork).
 */

export const ETIQUETAS_ESTADO = {
  draft: { label: 'Borrador', color: 'default' },
  pending_documents: { label: 'Documentos pendientes', color: 'warning' },
  pending_review: { label: 'En revisión', color: 'info' },
  corrections_required: { label: 'Correcciones solicitadas', color: 'warning' },
  eligible_for_video_review: { label: 'Listo para validación por video', color: 'secondary' },
  pending_federal_audit: { label: 'En auditoría federal', color: 'error' },
  approved: { label: 'Aprobado', color: 'success' },
  rejected: { label: 'Rechazado', color: 'error' },
  suspended: { label: 'Suspendido', color: 'error' },
};

export const ETIQUETAS_SLOT = {
  id_front: 'Identificación oficial (frente)',
  id_back: 'Identificación oficial (reverso)',
  selfie: 'Selfie reciente (rostro claro, sin lentes oscuros)',
  photo_front: 'Foto frontal del vehículo',
  photo_side: 'Foto lateral completa del vehículo',
  photo_back: 'Foto trasera (con placa visible)',
  photo_helmet: 'Foto del casco',
  photo_delivery_bag: 'Mochila térmica o equipo de reparto',
  video_presentation: 'Video de 15–30 s contigo y tu vehículo',
  motor_label_photo: 'Etiqueta del motor / ficha técnica del fabricante',
  license_front_photo: 'Licencia de conducir (frente)',
  license_back_photo: 'Licencia de conducir (reverso)',
  circulation_card_photo: 'Tarjeta de circulación',
  insurance_policy_photo: 'Póliza de seguro',
};

export const ETIQUETAS_FALTANTE = {
  identidad: 'Identidad (CURP, fecha de nacimiento y documentos)',
  phone: 'Teléfono de contacto',
  clabe: 'CLABE con dígito de control y titular declarado',
  vehicle: 'Vehículo permitido registrado',
  training: 'Examen de capacitación aprobado (mínimo 8/10)',
  terms: 'Aceptación del convenio y aviso de privacidad',
  profile: 'Expediente',
};

export const TIPOS_VEHICULO = [
  { id: 'bicicleta', label: 'Bicicleta convencional', icono: '🚲', descripcion: 'Sin placa ni licencia. Fotos, video y equipo de reparto.' },
  { id: 'bicicleta_electrica', label: 'Bicicleta eléctrica', icono: '🚴', descripcion: 'Además: potencia, velocidad de asistencia y ficha del fabricante.' },
  { id: 'motocicleta', label: 'Motocicleta', icono: '🏍️', descripcion: 'Licencia, tarjeta de circulación y seguro vigentes.' },
];

/** Evidencias exigidas por tipo (guia de UI; el backend revalida todo). */
export const SLOTS_POR_TIPO = {
  bicicleta: ['photo_front', 'photo_side', 'photo_delivery_bag', 'video_presentation'],
  bicicleta_electrica: ['photo_front', 'photo_side', 'photo_delivery_bag', 'video_presentation', 'motor_label_photo'],
  motocicleta: [
    'photo_front',
    'photo_side',
    'photo_back',
    'photo_helmet',
    'photo_delivery_bag',
    'video_presentation',
    'license_front_photo',
    'license_back_photo',
    'circulation_card_photo',
    'insurance_policy_photo',
  ],
};

export const ChipEstado = ({ status }) => {
  const info = ETIQUETAS_ESTADO[status] || { label: status, color: 'default' };
  return <Chip label={info.label} color={info.color} variant="filled" size="small" sx={{ fontWeight: 600 }} />;
};

export const TarjetaPaso = ({ titulo, children, ...rest }) => (
  <Paper
    variant="outlined"
    sx={{
      p: { xs: 2, md: 3 },
      borderRadius: 3,
      bgcolor: 'rgba(255,255,255,0.04)',
      borderColor: 'rgba(138,92,245,0.35)',
      ...rest?.sx,
    }}
  >
    {titulo && (
      <Typography variant="h6" sx={{ mb: 2, color: '#8A5CF5', fontWeight: 700 }}>
        {titulo}
      </Typography>
    )}
    <Box>{children}</Box>
  </Paper>
);

/** Texto legible para un faltante devuelto por /me. */
export const etiquetaFaltante = (faltante) => {
  if (!faltante) return '';
  if (faltante.campo) return ETIQUETAS_FALTANTE[faltante.campo] || `Dato: ${faltante.campo}`;
  if (faltante.media) return ETIQUETAS_SLOT[faltante.media] || `Evidencia: ${faltante.media}`;
  return faltante.motivo || 'Requisito pendiente';
};
