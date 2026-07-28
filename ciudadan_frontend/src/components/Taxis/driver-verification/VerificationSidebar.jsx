import React from 'react';
import PropTypes from 'prop-types';
import {
  Avatar,
  Box,
  Chip,
  LinearProgress,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import RecentActorsIcon from '@mui/icons-material/RecentActors';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import BusinessIcon from '@mui/icons-material/Business';
import FaceRetouchingNaturalIcon from '@mui/icons-material/FaceRetouchingNatural';

const SECTIONS = [
  { id: 'account', label: 'Cuenta', icon: 'PersonOutline', status: 'approved', sub: 'Verificado' },
  {
    id: 'personal',
    label: 'Datos personales',
    icon: 'BadgeOutlined',
    status: 'approved',
    sub: 'Aprobado',
  },
  {
    id: 'identity',
    label: 'Identidad',
    icon: 'RecentActors',
    status: 'needs_review',
    sub: '2 pendientes',
  },
  { id: 'license', label: 'Licencia', icon: 'CreditCard', status: 'approved', sub: 'Aprobado' },
  {
    id: 'vehicle',
    label: 'Vehículo',
    icon: 'DirectionsCar',
    status: 'pending',
    sub: 'En revisión',
  },
  {
    id: 'photos',
    label: 'Fotos vehículo',
    icon: 'PhotoCamera',
    status: 'rejected',
    sub: '1 rechazada',
  },
  {
    id: 'final',
    label: 'Validación final',
    icon: 'VerifiedUser',
    status: 'pending',
    sub: 'Pendiente',
  },
];

const ICON_MAP = {
  PersonOutline: PersonOutlineIcon,
  BadgeOutlined: BadgeOutlinedIcon,
  RecentActors: RecentActorsIcon,
  CreditCard: CreditCardIcon,
  DirectionsCar: DirectionsCarIcon,
  PhotoCamera: PhotoCameraIcon,
  VerifiedUser: VerifiedUserIcon,
  Business: BusinessIcon,
  FaceRetouchingNatural: FaceRetouchingNaturalIcon,
};

const STATUS_COLORS = {
  default: { bg: 'grey.200', fg: 'grey.800' },
  approved: { bg: 'success.light', fg: 'success.dark' },
  pending: { bg: 'warning.light', fg: 'warning.dark' },
  rejected: { bg: 'error.light', fg: 'error.dark' },
  needs_review: { bg: 'info.light', fg: 'info.dark' },
};

const VerificationSidebar = ({ sections = SECTIONS, activeSection, onSectionChange, score }) => (
  <Paper variant="outlined" sx={{ p: 1.5 }}>
    <List disablePadding>
      {sections.map((section) => {
        const isActive = section.id === activeSection;
        const statusColor = STATUS_COLORS[section.status] || STATUS_COLORS.pending;
        const Icon = ICON_MAP[section.icon] || PersonOutlineIcon;

        return (
          <ListItemButton
            key={section.id}
            selected={isActive}
            onClick={() => onSectionChange(section.id)}
            sx={{
              borderRadius: 1,
              mb: 0.5,
              border: '1px solid',
              borderColor: isActive ? 'info.main' : 'transparent',
              py: 1,
              alignItems: 'flex-start',
            }}
          >
            <Avatar
              sx={{
                width: 28,
                height: 28,
                bgcolor: statusColor.bg,
                color: statusColor.fg,
                mr: 1.25,
              }}
            >
              <Icon fontSize="small" />
            </Avatar>

            <ListItemText
              sx={{ minWidth: 0, mr: 1 }}
              primary={
                <Typography variant="body2" sx={{ lineHeight: 1.2 }}>
                  {section.label}
                </Typography>
              }
              secondary={
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ lineHeight: 1.2, display: 'block', mt: 0.25 }}
                >
                  {section.sub}
                </Typography>
              }
            />
            <Chip
              size="small"
              variant="outlined"
              label={section.count ?? section.status.replace('_', ' ')}
              sx={{
                maxWidth: 92,
                '& .MuiChip-label': {
                  px: 1,
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                  overflow: 'hidden',
                },
              }}
            />
          </ListItemButton>
        );
      })}
    </List>
  </Paper>
);

VerificationSidebar.propTypes = {
  sections: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      icon: PropTypes.string.isRequired,
      status: PropTypes.string.isRequired,
      sub: PropTypes.string.isRequired,
      count: PropTypes.number,
    })
  ),
  activeSection: PropTypes.string.isRequired,
  onSectionChange: PropTypes.func.isRequired,
  score: PropTypes.shape({
    overall: PropTypes.number,
    identity: PropTypes.number,
    docs: PropTypes.number,
    vehicle: PropTypes.number,
  }).isRequired,
};

export default VerificationSidebar;
