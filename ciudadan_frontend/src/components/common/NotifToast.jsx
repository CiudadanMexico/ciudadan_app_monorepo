// src/components/common/NotifToast.jsx
//
// Toast de MARCA para el módulo de notificaciones: morado de marca con contorno
// verde neón (la misma pareja de la barra de comunidad y del botón "Usar Labory").
//
// Cómo se activa: se registra como variante custom de notistack en el
// SnackbarProvider (ver src/index.js) y sólo se usa desde
// useNotifications().toast.* / el toast de llegada del socket. Los
// `useSnackbar()` legacy del resto de la app siguen con el look default de
// notistack, a propósito, para no tocar 15 archivos de otros módulos.
//
// notistack renderiza este componente como hijo directo de su Snackbar y le
// pasa el snack entero (`message`, `variant`, `className`, `style`, `data`...).
import React, { forwardRef } from 'react';
import Box from '@mui/material/Box';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';

import { MORADO, MORADO_OSCURO } from './PurpleButton.jsx';

/** Verde neón del sitio (MenuTopBar.css, barra de comunidad). */
export const VERDE_NEON = '#00ff88';

/** Variantes custom: `notif-<tipo>`. La clave debe coincidir con el enqueue. */
export const NOTIF_VARIANTS = {
  success: 'notif-success',
  error: 'notif-error',
  warning: 'notif-warning',
  info: 'notif-info',
  default: 'notif-default',
};

const ICON_BY_VARIANT = {
  [NOTIF_VARIANTS.success]: CheckCircleIcon,
  [NOTIF_VARIANTS.error]: ErrorOutlineIcon,
  [NOTIF_VARIANTS.warning]: WarningAmberIcon,
  [NOTIF_VARIANTS.info]: NotificationsActiveIcon,
  [NOTIF_VARIANTS.default]: NotificationsNoneIcon,
};

/** Expuesto para tests: el contrato "cada variante tiene su icono". */
export { ICON_BY_VARIANT };

/**
 * NotifToast — la tarjeta. El fondo morado y el contorno verde neón son siempre
 * los mismos; lo único que cambia por variante es el icono, para que un error
 * se distinga sin perder el lenguaje visual del sitio.
 *
 * `forwardRef` NO es decorativo: notistack envuelve el snack en su
 * TransitionComponent (`Slide` por defecto), que hace
 * `cloneElement(children, { ref })` y después lee `nodeRef.current` para medir y
 * animar la entrada. Un componente que no reenvía el ref deja ese ref en `null`
 * y `Transition` lanza en pleno mount
 * "notistack - Custom snackbar is not refForwarding" (pantalla de runtime error
 * de CRA). Lo cubre el test de integración con el SnackbarProvider real en
 * NotifToast.test.jsx — renderizar este componente suelto NO lo detecta.
 */
export const NotifToast = forwardRef(function NotifToast(
  { message, variant, className, style },
  ref
) {
  const Icon = ICON_BY_VARIANT[variant] || ICON_BY_VARIANT[NOTIF_VARIANTS.default];

  return (
    <Box
      ref={ref}
      role="alert"
      className={className}
      style={style}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.25,
        boxSizing: 'border-box',
        minWidth: { xs: '100%', sm: 288 },
        maxWidth: 420,
        px: 1.75,
        py: 1.25,
        borderRadius: '12px',
        border: `1px solid ${VERDE_NEON}`,
        background: `linear-gradient(135deg, ${MORADO} 0%, ${MORADO_OSCURO} 100%)`,
        boxShadow: `0 0 12px rgba(0,255,128,0.35), 0 6px 18px rgba(0,0,0,0.35)`,
        color: '#e6ffe6',
        fontFamily: '"Space Grotesk", "Poppins", system-ui, sans-serif',
        fontSize: '0.875rem',
        lineHeight: 1.45,
        letterSpacing: '0.01em',
      }}
    >
      <Icon
        sx={{
          fontSize: 20,
          flexShrink: 0,
          color: VERDE_NEON,
          filter: `drop-shadow(0 0 4px ${VERDE_NEON})`,
        }}
      />
      <Box component="span" sx={{ minWidth: 0, wordBreak: 'break-word' }}>
        {message}
      </Box>
    </Box>
  );
});

/** Mapeo listo para el prop `Components` del SnackbarProvider. */
export const NOTIF_TOAST_COMPONENTS = Object.values(NOTIF_VARIANTS).reduce(
  (acc, variant) => ({ ...acc, [variant]: NotifToast }),
  {}
);

export default NotifToast;
