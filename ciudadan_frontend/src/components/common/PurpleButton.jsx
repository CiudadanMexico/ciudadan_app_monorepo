// src/components/common/PurpleButton.jsx
// Botón morado reutilizable de marca (#8A5CF5 / #6A3FCB).
// Contorno delgado + brillo neón sutil.
import React from "react";
import Button from "@mui/material/Button";
import { ThemeProvider, createTheme } from "@mui/material/styles";

// Morados de marca (los mismos del botón "Usar Labory" del home)
export const MORADO = "#8A5CF5";
export const MORADO_OSCURO = "#6A3FCB";

// Tema morado LOCAL: así el Button interno hereda los colores morados del tema
// y los selectores de MUI (que tienen mayor especificidad que sx) NUNCA pintan azul.
const purpleTheme = createTheme({
  palette: {
    primary: { main: MORADO, dark: MORADO_OSCURO, contrastText: "#fff" },
    secondary: { main: MORADO_OSCURO, dark: "#4a2a9a", contrastText: "#fff" },
  },
});

/**
 * PurpleButton — botón morado de marca.
 * Se envuelve en su propio ThemeProvider con tema morado local para que los
 * estilos internos de MUI (que se inyectan con mayor especificidad que sx)
 * usen los colores morados del tema en vez del azul default.
 */
export default function PurpleButton({ glowPulse, outlined, sx, children, ...rest }) {
  const { variant: _v, ...cleanRest } = rest;

  const baseSx = outlined
    ? {
        borderRadius: 999,
        border: "1px solid #8A5CF5",
        boxShadow: "none",
        textTransform: "none",
        fontFamily: '"Space Grotesk", "Poppins", system-ui, sans-serif',
        fontWeight: 700,
        letterSpacing: "0.01em",
        transition: "background 0.25s ease, box-shadow 0.25s ease",
        "&:hover": {
          background: "rgba(138,92,245,0.10)",
          boxShadow: "0 2px 12px rgba(138,92,245,0.25)",
        },
      }
    : {
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,0.35)",
        boxShadow: "0 4px 18px rgba(138,92,245,0.4), inset 0 1px 0 rgba(255,255,255,0.22)",
        textTransform: "none",
        fontFamily: '"Space Grotesk", "Poppins", system-ui, sans-serif',
        fontWeight: 700,
        letterSpacing: "0.01em",
        transition: "filter 0.25s ease, box-shadow 0.25s ease, transform 0.15s ease",
        "&:hover": {
          boxShadow: "0 6px 26px rgba(138,92,245,0.55), inset 0 1px 0 rgba(255,255,255,0.28)",
        },
        "&:active": { transform: "scale(0.97)" },
      };

  const finalSx = Array.isArray(sx) ? [baseSx, ...sx] : sx ? [baseSx, sx] : baseSx;

  return (
    <ThemeProvider theme={purpleTheme}>
      <Button
        variant="contained"
        color="primary"
        sx={finalSx}
        {...cleanRest}
      >
        {children}
      </Button>
    </ThemeProvider>
  );
}

