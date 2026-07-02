/** Estados operativos de agenda (campo canónico: agendas.estado). */
export const AGENDA_ESTADO = {
  PENDIENTE: 'pendiente',
  EN_REVISION: 'en_revision',
  RESUBIR_ARCHIVOS: 'resubir_archivos',
  COMPLETADA: 'completada',
  CANCELADA: 'cancelada',
  EXPIRADA: 'expirada',
};

export const AGENDA_ESTADO_VALUES = Object.values(AGENDA_ESTADO);

export const AGENDA_ESTADO_LABELS = {
  [AGENDA_ESTADO.PENDIENTE]: 'Pendiente',
  [AGENDA_ESTADO.EN_REVISION]: 'En revisión',
  [AGENDA_ESTADO.RESUBIR_ARCHIVOS]: 'Resubir archivos',
  [AGENDA_ESTADO.COMPLETADA]: 'Completada',
  [AGENDA_ESTADO.CANCELADA]: 'Cancelada',
  [AGENDA_ESTADO.EXPIRADA]: 'Expirada',
};

/** Cola operativa del admin (ConductoresAgencia). */
export const AGENDA_ESTADO_ACTIVE_QUEUE = [
  AGENDA_ESTADO.PENDIENTE,
  AGENDA_ESTADO.EN_REVISION,
  AGENDA_ESTADO.RESUBIR_ARCHIVOS,
];

export const normalizeAgendaEstado = (value, fallback = AGENDA_ESTADO.PENDIENTE) => {
  const key = String(value ?? '').trim();
  return AGENDA_ESTADO_VALUES.includes(key) ? key : fallback;
};

export const getAgendaEstadoLabel = (value) =>
  AGENDA_ESTADO_LABELS[normalizeAgendaEstado(value)] || 'Pendiente';

export const AGENDA_ESTADO_CHIP_STYLES = {
  [AGENDA_ESTADO.PENDIENTE]: { backgroundColor: '#64748b', color: '#ffffff' },
  [AGENDA_ESTADO.EN_REVISION]: { backgroundColor: '#3b82f6', color: '#ffffff' },
  [AGENDA_ESTADO.RESUBIR_ARCHIVOS]: { backgroundColor: '#f59e0b', color: '#ffffff' },
  [AGENDA_ESTADO.COMPLETADA]: { backgroundColor: '#00ff99', color: '#0f172a' },
  [AGENDA_ESTADO.CANCELADA]: { backgroundColor: '#ef4444', color: '#ffffff' },
  [AGENDA_ESTADO.EXPIRADA]: { backgroundColor: '#475569', color: '#ffffff' },
};

/** Props listas para `<Chip />` según el estado de agenda. */
export const getAgendaEstadoChipProps = (value) => {
  const estado = normalizeAgendaEstado(value);
  return {
    label: getAgendaEstadoLabel(estado),
    sx: {
      width: 'fit-content',
      fontWeight: 600,
      ...AGENDA_ESTADO_CHIP_STYLES[estado],
    },
  };
};
