import React from 'react';
import PropTypes from 'prop-types';
import { Button, Stack, Tooltip, Typography } from '@mui/material';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import PersonRemoveIcon from '@mui/icons-material/PersonRemove';
import RefreshIcon from '@mui/icons-material/Refresh';

const FinalActions = ({ documents, onApprove, onReject, onRequestResub, disabled = false }) => {
  const pendingCount = documents.filter(
    (doc) => doc.status === 'pending' || doc.status === 'needs_review'
  ).length;

  return (
    <Stack spacing={1}>
      <Tooltip
        title={pendingCount > 0 ? 'Hay documentos pendientes de revisión' : ''}
        disableHoverListener={pendingCount === 0}
      >
        <span>
          <Button
            fullWidth
            variant="contained"
            color="success"
            startIcon={<HowToRegIcon />}
            disabled={disabled || pendingCount > 0}
            onClick={onApprove}
          >
            Aprobar conductor
          </Button>
        </span>
      </Tooltip>
      <Button
        fullWidth
        variant="contained"
        color="error"
        startIcon={<PersonRemoveIcon />}
        disabled={disabled}
        onClick={onReject}
      >
        Rechazar conductor
      </Button>
      <Button
        fullWidth
        variant="contained"
        startIcon={<RefreshIcon />}
        disabled={disabled}
        sx={{ bgcolor: '#7F77DD', '&:hover': { bgcolor: '#6B64C8' } }}
        onClick={onRequestResub}
      >
        Solicitar reenvío
      </Button>
      <Typography variant="caption" color="text.secondary">
        {pendingCount} documentos pendientes de revisión
      </Typography>
    </Stack>
  );
};

FinalActions.propTypes = {
  documents: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      status: PropTypes.string.isRequired,
    })
  ).isRequired,
  onApprove: PropTypes.func.isRequired,
  onReject: PropTypes.func.isRequired,
  onRequestResub: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

export default FinalActions;
