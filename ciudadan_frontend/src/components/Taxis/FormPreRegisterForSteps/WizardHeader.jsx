import React from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { FaCheck, FaWhatsapp } from 'react-icons/fa6';

const COLORS = {
  done: '#1BB358',
  current: '#F5D000',
  pending: 'rgba(255,255,255,0.24)',
  pendingText: 'rgba(255,255,255,0.72)',
  doneText: '#d1fae5',
  currentText: '#111827',
};

const getStepState = (index, currentIndex) => {
  if (index < currentIndex) return 'done';
  if (index === currentIndex) return 'current';
  return 'pending';
};

const getCircleStyles = (state) => {
  if (state === 'done') {
    return {
      bg: COLORS.done,
      border: COLORS.done,
      text: '#ffffff',
      shadow: '0 0 0 4px rgba(34,197,94,0.16)',
    };
  }
  if (state === 'current') {
    return {
      bg: COLORS.current,
      border: COLORS.current,
      text: COLORS.currentText,
      shadow: '0 0 0 4px rgba(242,209,0,0.2)',
    };
  }
  return {
    bg: 'rgba(255,255,255,0.06)',
    border: COLORS.pending,
    text: 'rgba(255,255,255,0.75)',
    shadow: 'none',
  };
};

const WizardHeader = ({ steps = [], currentStepId = '', progress = 0 }) => {
  const currentIndex = steps.findIndex((step) => step.id === currentStepId);

  return (
    <Box
      sx={{
        p: 2,
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 3,
        background: 'linear-gradient(180deg, rgba(20,20,20,0.96), rgba(30,30,30,0.96))',
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
        <Typography fontWeight={800} color="#fff">
          Preregistro de conductor
        </Typography>
        <Typography variant="body2" color="rgba(255,255,255,0.75)">
          Paso {Math.max(currentIndex + 1, 1)} de {steps.length}
        </Typography>
      </Stack>

      <Stack direction="row" spacing={1.2} sx={{ overflowX: 'auto', pb: 0.8 }}>
        {steps.map((step, index) => {
          const state = getStepState(index, currentIndex);
          const circle = getCircleStyles(state);
          const lineDone = index < currentIndex;
          let stepLabelColor = COLORS.pendingText;
          if (state === 'current') stepLabelColor = '#ffffff';
          if (state === 'done') stepLabelColor = COLORS.doneText;

          return (
            <Stack
              key={step.id}
              direction="row"
              alignItems="center"
              sx={{ minWidth: { xs: 88, sm: 105 }, flex: { xs: '0 0 auto', sm: 1 } }}
            >
              <Stack spacing={0.75} alignItems="center" sx={{ width: { xs: 64, sm: 86 } }}>
                <Box
                  sx={{
                    width: { xs: 30, sm: 34 },
                    height: { xs: 30, sm: 34 },
                    borderRadius: '50%',
                    border: `2px solid ${circle.border}`,
                    bgcolor: circle.bg,
                    boxShadow: circle.shadow,
                    display: 'grid',
                    placeItems: 'center',
                    color: circle.text,
                    fontWeight: 800,
                    fontSize: { xs: 13, sm: 14 },
                    transition: 'all 220ms ease',
                  }}
                >
                  {state === 'done' ? (
                    <FaCheck size={13} />
                  ) : step.icon === 'whatsapp' ? (
                    <FaWhatsapp size={13} />
                  ) : (
                    index + 1
                  )}
                </Box>
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: state === 'current' ? 800 : 600,
                    color: stepLabelColor,
                    textAlign: 'center',
                    lineHeight: 1.2,
                    transition: 'color 220ms ease',
                  }}
                >
                  {step.title}
                </Typography>
              </Stack>

              {index < steps.length - 1 ? (
                <Box
                  sx={{
                    flex: 1,
                    height: 3,
                    borderRadius: 99,
                    bgcolor: lineDone ? COLORS.done : COLORS.pending,
                    transition: 'background-color 220ms ease',
                    minWidth: { xs: 30, sm: 42 },
                  }}
                />
              ) : null}
            </Stack>
          );
        })}
      </Stack>
    </Box>
  );
};

export default WizardHeader;
