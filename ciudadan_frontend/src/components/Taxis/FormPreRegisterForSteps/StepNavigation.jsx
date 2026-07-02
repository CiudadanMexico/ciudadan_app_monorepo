import React from 'react';
import { Button, CircularProgress, Stack } from '@mui/material';
import { FaArrowLeft, FaArrowRight, FaFloppyDisk } from 'react-icons/fa6';

const StepNavigation = ({
  canGoBack,
  isLastStep,
  loading = false,
  onBack,
  onNext,
  nextLabel,
  hideNext = false,
  nextDisabled = false,
}) => (
  <Stack direction="row" spacing={1.5} justifyContent="space-between" sx={{ mt: 2 }}>
    <Button
      variant="outlined"
      disabled={!canGoBack || loading}
      onClick={onBack}
      startIcon={<FaArrowLeft />}
      sx={{ textTransform: 'none' }}
    >
      Anterior
    </Button>

    {!hideNext ? (
      <Button
        variant="contained"
        disabled={loading || nextDisabled}
        onClick={onNext}
        endIcon={
          loading ? (
            <CircularProgress size={14} color="inherit" />
          ) : isLastStep ? (
            <FaFloppyDisk />
          ) : (
            <FaArrowRight />
          )
        }
        sx={{
          textTransform: 'none',
          bgcolor: '#f2d100',
          color: '#111',
          fontWeight: 700,
          opacity: loading || nextDisabled ? 0.4 : 1,
          cursor: loading || nextDisabled ? 'not-allowed' : 'pointer',
          '&:hover': { bgcolor: '#e4c600' },
        }}
      >
        {loading ? 'Guardando...' : nextLabel || (isLastStep ? 'Agendar Cita' : 'Siguiente')}
      </Button>
    ) : null}
  </Stack>
);

export default StepNavigation;
