// src/components/common/PurpleButton.jsx
// Botón morado reutilizable de marca (#8A5CF5 / #6A3FCB).
import React from "react";
import Button from "@mui/material/Button";
import { styled } from "@mui/material/styles";

// Morados de marca (los mismos del botón "Usar Labory" del home)
export const MORADO = "#8A5CF5";
export const MORADO_OSCURO = "#6A3FCB";

/**
 * PurpleButton — botón morado de marca que NUNCA pierde contra MUI.
 * Usa `&&&` (0,3,0 de especificidad) para vencer CUALQUIER selector interno
 * de MUI sin importar orden de inyección ni tema default (primary azul).
 */
const Styled = styled(Button)({
  "&&&": {
    borderRadius: 999,
    color: "#fff",
    background: `linear-gradient(135deg, ${MORADO} 0%, ${MORADO_OSCURO} 100%)`,
    textTransform: "none",
    fontFamily: '"Space Grotesk", "Poppins", system-ui, sans-serif',
    fontWeight: 700,
    letterSpacing: "0.01em",
    boxShadow: "0 4px 14px rgba(138,92,245,0.35)",
    transition: "filter 0.25s ease, box-shadow 0.25s ease, transform 0.15s ease",
    "&:hover": {
      background: "linear-gradient(135deg, #9a6ffb 0%, #7a4ddb 100%)",
      boxShadow: "0 6px 22px rgba(138,92,245,0.5)",
      transform: "translateY(-1px)",
    },
    "&:active": { transform: "translateY(0)" },
    "&.Mui-disabled": { color: "rgba(255,255,255,0.7)" },
  },
});

export default function PurpleButton({ sx, children, ...rest }) {
  const { variant: _v, color: _c, glowPulse: _g, ...cleanRest } = rest;
  return (
    <Styled
      disableElevation
      disableRipple
      sx={sx}
      {...cleanRest}
    >
      {children}
    </Styled>
  );
}

