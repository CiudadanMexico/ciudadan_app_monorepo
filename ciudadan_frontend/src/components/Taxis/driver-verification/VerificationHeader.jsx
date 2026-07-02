import React from 'react';
import PropTypes from 'prop-types';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/es-mx';
import { Avatar, Box, Button, Chip, LinearProgress, Paper, Stack, Typography } from '@mui/material';

dayjs.extend(relativeTime);
dayjs.locale('es-mx');

const STATUS_MAP = {
  draft: { color: 'default', label: 'Borrador' },
  pending_documents: { color: 'warning', label: 'Pendiente documentos' },
  pending_appointment: { color: 'warning', label: 'Pendiente cita' },
  pending_review: { color: 'info', label: 'En revisión' },
  documents_rejected: { color: 'error', label: 'Documentos rechazados' },
  approved: { color: 'success', label: 'Aprobado' },
  rejected: { color: 'error', label: 'Rechazado' },
  suspended: { color: 'warning', label: 'Suspendido' },
  blocked: { color: 'error', label: 'Bloqueado' },
  pending: { color: 'warning', label: 'Pendiente' },
  active: { color: 'info', label: 'Activa' },
  under_review: { color: 'info', label: 'En revisión' },
  awaiting_resubmission: { color: 'warning', label: 'Esperando reenvío' },
  completed: { color: 'success', label: 'Completada' },
  expired: { color: 'default', label: 'Expirada' },
  cancelled: { color: 'default', label: 'Cancelada' },
  pendiente: { color: 'warning', label: 'Cita pendiente' },
  en_revision: { color: 'info', label: 'Cita en revisión' },
  resubir_archivos: { color: 'warning', label: 'Resubir archivos' },
  completada: { color: 'success', label: 'Cita completada' },
  cancelada: { color: 'default', label: 'Cita cancelada' },
  expirada: { color: 'default', label: 'Cita expirada' },
};

const formatAppointmentDate = (value) => {
  if (!value) return 'Sin cita';
  return dayjs(value).format('D MMM YYYY, h:mm a');
};

const VerificationHeader = ({ driver, validation, agenda, docsProgress }) => {
  if (!driver) return null;

  const statusKey = validation?.status || driver?.status;
  const statusConfig = STATUS_MAP[statusKey] || STATUS_MAP.pending;
  const agendaStatusKey = agenda?.estado;
  const agendaStatusConfig = agendaStatusKey
    ? STATUS_MAP[agendaStatusKey] || {
        color: 'default',
        label: agenda?.estadoLabel || agendaStatusKey,
      }
    : null;
  const appointmentDate =
    validation?.appointmentDate || agenda?.fechaInicio || driver?.appointmentDate;
  const progress = docsProgress || driver?.docsProgress;
  const progressValue = ((progress?.completed || 0) / (progress?.total || 1)) * 100;

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack direction="row" spacing={2} justifyContent="space-between" alignItems="center">
        <Stack direction="row" spacing={2} alignItems="center" sx={{ minWidth: 0 }}>
          <Avatar sx={{ bgcolor: '#E6F1FB', color: '#0C447C', width: 44, height: 44 }}>
            {driver?.initials}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h6" noWrap>
              {driver?.name}
            </Typography>
            <Typography variant="body2" color="text.secondary" noWrap>
              {driver?.id} • {formatAppointmentDate(appointmentDate)} • {driver?.branch}
            </Typography>
          </Box>
          <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
            <Chip color={statusConfig.color} label={statusConfig.label} size="small" />
            {agendaStatusConfig ? (
              <Chip
                color={agendaStatusConfig.color}
                label={agendaStatusConfig.label}
                size="small"
                variant="outlined"
              />
            ) : null}
          </Stack>
        </Stack>

        <Stack direction="row" spacing={1}>
          <Button variant="outlined" size="small">
            Contactar
          </Button>
          <Button variant="outlined" size="small">
            Historial
          </Button>
        </Stack>
      </Stack>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mt: 2 }} alignItems="center">
        <Box sx={{ flex: 1, width: '100%' }}>
          <Typography variant="caption" color="text.secondary">
            Progreso documental ({progress?.completed}/{progress?.total})
          </Typography>
          <LinearProgress
            variant="determinate"
            value={progressValue}
            sx={{ mt: 0.75, height: 8, borderRadius: 1 }}
          />
        </Box>
        <Typography variant="body2" color="text.secondary">
          Revisor: {driver?.reviewer}{' '}
          {driver?.assignedAt ? `• asignado ${dayjs(driver.assignedAt).fromNow()}` : ''}
        </Typography>
      </Stack>
    </Paper>
  );
};

VerificationHeader.propTypes = {
  driver: PropTypes.shape({
    id: PropTypes.string,
    initials: PropTypes.string,
    name: PropTypes.string,
    status: PropTypes.string,
    appointmentDate: PropTypes.string,
    branch: PropTypes.string,
    reviewer: PropTypes.string,
    assignedAt: PropTypes.string,
    docsProgress: PropTypes.shape({
      completed: PropTypes.number,
      total: PropTypes.number,
    }),
  }).isRequired,
  validation: PropTypes.shape({
    id: PropTypes.string,
    status: PropTypes.string,
    statusLabel: PropTypes.string,
    appointmentDate: PropTypes.string,
  }),
  agenda: PropTypes.shape({
    id: PropTypes.string,
    estado: PropTypes.string,
    estadoLabel: PropTypes.string,
    fechaInicio: PropTypes.string,
  }),
  docsProgress: PropTypes.shape({
    completed: PropTypes.number,
    total: PropTypes.number,
    reviewed: PropTypes.number,
  }),
};

export default VerificationHeader;
