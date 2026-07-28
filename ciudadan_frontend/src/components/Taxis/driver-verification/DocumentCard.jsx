import React from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Card,
  CardActions,
  CardContent,
  Chip,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import InsertDriveFileOutlinedIcon from '@mui/icons-material/InsertDriveFileOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import ZoomInOutlinedIcon from '@mui/icons-material/ZoomInOutlined';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';

const STATUS_CONFIG = {
  approved: { label: 'Aprobado', color: 'success', borderColor: '#5DCAA5', barColor: '#1D9E75' },
  rejected: { label: 'Rechazado', color: 'error', borderColor: '#F09595', barColor: '#E24B4A' },
  pending: { label: 'Pendiente', color: 'warning', borderColor: '#EF9F27', barColor: '#EF9F27' },
  needs_review: { label: 'Revisar', color: 'info', borderColor: '#85B7EB', barColor: '#378ADD' },
  resub_requested: {
    label: 'Reenvío',
    color: 'secondary',
    borderColor: '#AFA9EC',
    barColor: '#7F77DD',
  },
};

const DocumentCard = ({
  doc,
  onApprove,
  onReject,
  onRequestResub,
  onZoom,
  actionsDisabled = false,
}) => {
  const status = STATUS_CONFIG[doc.status] || STATUS_CONFIG.pending;
  const hasPreview = Boolean(doc.imageUrl);
  const hasFile = Boolean(doc.fileUrl || doc.imageUrl);

  return (
    <Card
      sx={{
        border: '1px solid',
        borderColor: status.borderColor,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}
    >
      <Box
        sx={{
          position: 'relative',
          width: '100%',
          aspectRatio: '4 / 3',
          minHeight: { xs: 100, sm: 120 },
          overflow: 'hidden',
          bgcolor: 'grey.100',
          display: 'grid',
          placeItems: 'center',
          flexShrink: 0,
          '&:hover .overlay': { opacity: 1 },
        }}
      >
        {hasPreview ? (
          <Box
            component="img"
            src={doc.imageUrl}
            alt={doc.name}
            sx={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center',
            }}
          />
        ) : (
          <InsertDriveFileOutlinedIcon color="action" />
        )}
        <Stack
          className="overlay"
          direction="row"
          spacing={1}
          sx={{
            position: 'absolute',
            inset: 0,
            bgcolor: 'rgba(0,0,0,0.35)',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: 0,
            transition: 'opacity .2s ease',
          }}
        >
          <IconButton
            size="small"
            sx={{ bgcolor: 'background.paper' }}
            component="a"
            href={hasFile ? doc.fileUrl || doc.imageUrl : undefined}
            target="_blank"
            rel="noreferrer"
            disabled={!hasFile}
          >
            <VisibilityOutlinedIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            sx={{ bgcolor: 'background.paper' }}
            onClick={() => onZoom?.(doc)}
          >
            <ZoomInOutlinedIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            sx={{ bgcolor: 'background.paper' }}
            component="a"
            href={hasFile ? doc.fileUrl || doc.imageUrl : undefined}
            download
            disabled={!hasFile}
          >
            <DownloadOutlinedIcon fontSize="small" />
          </IconButton>
        </Stack>
      </Box>
      <Box sx={{ height: 3, bgcolor: status.barColor }} />
      <CardContent sx={{ pb: 1, flexGrow: 1 }}>
        <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
          <Typography variant="subtitle2">{doc.name}</Typography>
          <Chip size="small" color={status.color} label={status.label} />
        </Stack>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          {doc.note}
        </Typography>
      </CardContent>
      <CardActions sx={{ pt: 0, px: 1.5, pb: 1.5 }}>
        <Tooltip title={actionsDisabled ? 'Validación completada' : 'Aprobar'}>
          <span>
            <IconButton
              color="success"
              size="small"
              onClick={() => onApprove(doc.id)}
              disabled={actionsDisabled}
            >
              <CheckCircleOutlineIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title={actionsDisabled ? 'Validación completada' : 'Rechazar'}>
          <span>
            <IconButton
              color="error"
              size="small"
              onClick={() => onReject(doc.id)}
              disabled={actionsDisabled}
            >
              <CancelOutlinedIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title={actionsDisabled ? 'Validación completada' : 'Solicitar reenvío'}>
          <span>
            <IconButton
              color="secondary"
              size="small"
              onClick={() => onRequestResub(doc.id)}
              disabled={actionsDisabled}
            >
              <ChatBubbleOutlineIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Zoom">
          <IconButton size="small" onClick={() => onZoom?.(doc)}>
            <ZoomInOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </CardActions>
    </Card>
  );
};

DocumentCard.propTypes = {
  doc: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    status: PropTypes.string.isRequired,
    note: PropTypes.string,
    imageUrl: PropTypes.string,
    fileUrl: PropTypes.string,
  }).isRequired,
  onApprove: PropTypes.func.isRequired,
  onReject: PropTypes.func.isRequired,
  onRequestResub: PropTypes.func.isRequired,
  onZoom: PropTypes.func,
  actionsDisabled: PropTypes.bool,
};

export default DocumentCard;
