// src/components/common/PurpleButton.jsx
// Botón morado reutilizable de marca (#8A5CF5 / #6A3FCB, doc/subpaleta.txt).
// Contorno delgado + brillo neón sutil con CSS puro: el sheen del hover y el
// pulso del glow animan solo opacity/transform (GPU), sin imágenes, sin JS por
// frame y sin librerías extra — costo de carga prácticamente nulo.
import React from "react";
import Button from "@mui/material/Button";
import { styled } from "@mui/material/styles";

// Morados de marca (los mismos del botón "Usar Labory" del home)
export const MORADO = "#8A5CF5";
export const MORADO_OSCURO = "#6A3FCB";

/**
 * PurpleButton — botón morado de marca con contorno delgado y brillo neón.
 *
 * Props: todas las de <Button> de MUI (onClick, startIcon, endIcon, size,
 * fullWidth, disabled, component, to, href, ...) + sx para overrides.
 *
 * Ejemplos:
 *   <PurpleButton onClick={...}>Texto</PurpleButton>
 *   <PurpleButton component={RouterLink} to="/gana">Ir a Gana</PurpleButton>
 *   <PurpleButton startIcon={<RocketIcon />} fullWidth size="large" />
 */
const StyledButton = styled(Button, {
  // Evita que props custom lleguen al DOM
  shouldForwardProp: (prop) => prop !== "glowPulse",
})(({ glowPulse = true }) => ({
  // Colores de marca con alta especificidad: la app no tiene ThemeProvider con
  // morado, así que MUI default pinta #1976d2 azul. Los estilos internos de Button
  // se inyectan DESPUÉS del styled externo (el hijo renderiza después) y ganan
  // por orden de inserción. &.MuiButton-root (2 clases) le gana a los selectores
  // de una sola clase de MUI sin importar el orden.
  "&.MuiButton-root": {
    borderRadius: 999,
    color: "#fff",
    background: `linear-gradient(135deg, ${MORADO} 0%, ${MORADO_OSCURO} 100%)`,
    border: "1px solid rgba(255,255,255,0.35)",
    boxShadow: "0 4px 18px rgba(138,92,245,0.4), inset 0 1px 0 rgba(255,255,255,0.22)",
    "&:hover": {
      background: "linear-gradient(135deg, #9a6ffb 0%, #7a4ddb 100%)",
      boxShadow: "0 6px 26px rgba(138,92,245,0.55), inset 0 1px 0 rgba(255,255,255,0.28)",
    },
  },
  "&.Mui-disabled": {
    background: "rgba(138,92,245,0.35)",
    color: "rgba(255,255,255,0.6)",
    border: "1px solid rgba(255,255,255,0.15)",
    boxShadow: "none",
  },

  // Solo animaciones y pseudo-elementos (no colores).
  position: "relative",
  overflow: "hidden",
  textTransform: "none",
  fontFamily: '"Space Grotesk", "Poppins", system-ui, sans-serif',
  fontWeight: 700,
  letterSpacing: "0.01em",
  transition: "filter 0.25s ease, box-shadow 0.25s ease, transform 0.15s ease",

  // Capa del glow pulsante en reposo: solo anima opacity (barato en GPU)
  "&::before": {
    content: '""',
    position: "absolute",
    inset: -1,
    borderRadius: 999,
    boxShadow: "0 0 22px rgba(138,92,245,0.55), 0 0 44px rgba(106,63,203,0.35)",
    opacity: glowPulse ? 0.55 : 0.55,
    animation: glowPulse
      ? "purpleGlowPulse 3.4s ease-in-out infinite alternate"
      : "none",
    pointerEvents: "none",
  },

  // Destello diagonal (sheen) que cruza el botón al hover: solo transform
  "&::after": {
    content: '""',
    position: "absolute",
    top: "-40%",
    bottom: "-40%",
    left: 0,
    width: "55%",
    background:
      "linear-gradient(105deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.28) 45%, rgba(255,255,255,0.42) 50%, rgba(255,255,255,0.28) 55%, rgba(255,255,255,0) 100%)",
    transform: "translateX(-160%) skewX(-12deg)",
    transition: "transform 0.7s ease",
    pointerEvents: "none",
  },

  "&:hover::after": { transform: "translateX(320%) skewX(-12deg)" },
  "&:hover::before": { opacity: 0.9, animationPlayState: "paused" },
  "&:active": { transform: "scale(0.97)" },
  "&:focus-visible": { outline: "2px solid rgba(255,255,255,0.85)", outlineOffset: 2 },

  "@keyframes purpleGlowPulse": { "0%": { opacity: 0.3 }, "100%": { opacity: 0.8 } },

  // Accesibilidad: sin animaciones si el usuario las reduce
  "@media (prefers-reduced-motion: reduce)": {
    "&::before": { animation: "none" },
    "&::after": { transition: "none", transform: "translateX(-160%) skewX(-12deg)" },
  },
}));

export default function PurpleButton({ glowPulse = true, sx, children, ...rest }) {
  return (
    <StyledButton
      glowPulse={glowPulse}
      disableElevation
      {...rest}
    >
      {children}
    </StyledButton>
  );
}

