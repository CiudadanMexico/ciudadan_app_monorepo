import React from 'react';
import { Box, Button, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

/**
 * CTA principal de una ficha de token.
 *
 * Antes cada moneda terminaba enviando a `/coowork` sin importar el token
 * (el texto del botón cambiaba pero el destino no). Ahora el destino sale
 * SIEMPRE de `token.action` en la configuración central, y sólo se declaran
 * destinos que existen de verdad en las rutas de la aplicación.
 *
 * Usa `RouterLink` para navegar dentro del SPA (sin recargar la página).
 */
const TokenAction = ({ token, extraActions = [] }) => {
  const primary = token?.action;
  const acciones = [primary, ...(Array.isArray(extraActions) ? extraActions : [])].filter(Boolean);

  if (acciones.length === 0) return null;

  return (
    <Box
      sx={{
        mt: 2.5,
        width: '100%',
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        flexWrap: 'wrap',
        gap: 1,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      {acciones.map((accion, index) => {
        const esPrimaria = index === 0;
        const button = (
          <Button
            variant={esPrimaria ? 'contained' : 'outlined'}
            size="medium"
            disabled={accion.disabled}
            component={accion.to ? RouterLink : 'button'}
            to={accion.to || undefined}
            onClick={accion.onClick}
            sx={{
              fontWeight: 700,
              textTransform: 'none',
              px: 2.5,
              py: 1,
              bgcolor: esPrimaria ? '#8A5CF5' : 'transparent',
              color: esPrimaria ? 'white' : '#c9b4ff',
              border: esPrimaria ? 'none' : '1px solid rgba(138,92,245,0.55)',
              '&:hover': {
                bgcolor: esPrimaria ? '#7346e0' : 'rgba(138,92,245,0.14)',
                borderColor: '#c9b4ff',
              },
              '&.Mui-disabled': {
                bgcolor: 'rgba(255,255,255,0.06)',
                color: 'rgba(255,255,255,0.45)',
                border: '1px solid rgba(255,255,255,0.12)',
              },
            }}
          >
            {accion.label}
          </Button>
        );

        return (
          <Box
            key={`${accion.label}-${index}`}
            sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}
          >
            {button}
            {accion.hint && (
              <Typography
                sx={{
                  mt: 0.5,
                  fontSize: 11,
                  color: 'rgba(255,255,255,0.6)',
                  maxWidth: 260,
                  textAlign: 'center',
                }}
              >
                {accion.hint}
              </Typography>
            )}
          </Box>
        );
      })}
    </Box>
  );
};

export default TokenAction;
