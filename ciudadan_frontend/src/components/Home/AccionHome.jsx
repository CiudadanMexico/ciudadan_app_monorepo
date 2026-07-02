// QuickActionBar.jsx
import React, { useState, useCallback } from "react";
import { Box, Grid, Typography } from "@mui/material";
import { keyframes } from "@mui/system";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

import kitGif from "../../assets/kitautocultivo.gif";
import afiliatuGif from "../../assets/afiliatuclub.gif";
import suscribeGif from "../../assets/logo_bailarin.gif";

const BRAND_PURPLE = "#a073c4"; // color títulos y efectos
const BG_GREEN = "rgba(199,224,106,0.95)"; // fondo general
const NEON_PURPLE = "#c798ff"; // outline focus y shimmer
const PURPLE_ACCENT = "#7b2cff"; // borde superior

const pulse = keyframes`
  0% { box-shadow: 0 6px 14px rgba(199,0,255,0.15); transform: translateY(0); }
  50% { box-shadow: 0 12px 26px rgba(199,0,255,0.35); transform: translateY(-1px); }
  100% { box-shadow: 0 6px 14px rgba(199,0,255,0.15); transform: translateY(0); }
`;

const twinkle = keyframes`
  0% { opacity: 0; transform: scale(0.55) rotate(0deg); }
  30% { opacity: 1; transform: scale(1.1) rotate(18deg); }
  100% { opacity: 0; transform: scale(0.9) rotate(36deg); }
`;

const MotionBox = motion(Box);

function Sparkles({ positions = [], active = false }) {
  if (!active) return null;
  return (
    <>
      {positions.map((p, idx) => (
        <Box
          key={idx}
          aria-hidden
          sx={{
            position: "absolute",
            left: p.left,
            top: p.top,
            width: p.size,
            height: p.size,
            transform: "translate(-50%,-50%) rotate(10deg)",
            borderRadius: "50%",
            pointerEvents: "none",
            opacity: 0,
            filter: "drop-shadow(0 0 12px rgba(199,0,255,0.9))",
            background:
              "radial-gradient(circle, rgba(199,0,255,1) 0%, rgba(199,0,255,0.4) 60%, rgba(199,0,255,0) 100%)",
            display: "block",
            animation: `${twinkle} 1300ms ease-in-out ${p.delay}ms forwards`,
            zIndex: 999,
          }}
        />
      ))}
    </>
  );
}

function ActionCard({ to, imgSrc, title, subtitle, ariaLabel }) {
  const navigate = useNavigate();
  const [hovered, setHovered] = useState(false);

  const sparkles = [
    { left: "82%", top: "16%", size: 10, delay: 0 },
    { left: "60%", top: "10%", size: 8, delay: 100 },
    { left: "72%", top: "26%", size: 7, delay: 200 },
    { left: "40%", top: "70%", size: 9, delay: 400 },
  ];

  const handleClick = useCallback(
    (e) => {
      const native = e?.nativeEvent;
      const isModified = e.ctrlKey || e.metaKey || e.shiftKey || e.altKey;
      const isMiddleClick = native && (native.which === 2 || native.button === 1);
      if (isModified || isMiddleClick) return;
      e.preventDefault();
      navigate(to);
    },
    [navigate, to]
  );

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        navigate(to);
      }
    },
    [navigate, to]
  );

  const shimmerStyle = {
    position: "absolute",
    top: -40,
    left: hovered ? "120%" : "-120%",
    width: "40%",
    height: "160%",
    background:
      "linear-gradient(120deg, rgba(255,255,255,0) 0%, rgba(199,0,255,0.2) 50%, rgba(255,255,255,0) 100%)",
    transform: "skewX(-18deg)",
    transition: "left 900ms linear",
    opacity: hovered ? 1 : 0,
    pointerEvents: "none",
  };

  return (
    <MotionBox
      component="a"
      href={to}
      role="link"
      aria-label={ariaLabel || title}
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      sx={{
        width: "100%",
        display: "flex",
        flexDirection: { xs: "column", sm: "row" },
        gap: { xs: 1.1, sm: 1.8 },
        alignItems: "center",
        textAlign: "left",
        borderRadius: 2,
        overflow: "hidden",
        p: { xs: 1, sm: 1.4 },
        border: `2px solid rgba(199,0,255,0.4)`,
        background: "rgba(199,224,106,0.95)", // fondo intacto de toda la sección
        cursor: "pointer",
        position: "relative",
        animation: `${pulse} 4200ms ease-in-out infinite`,
        "&:hover": {
          transform: "translateY(-6px) scale(1.03)",
          boxShadow:
            "0 0 25px rgba(199,0,255,0.8), 0 0 50px rgba(199,0,255,0.5)",
        },
        "&:focus-visible": {
          outline: `3px solid ${NEON_PURPLE}`,
          outlineOffset: 4,
        },
        transition: "transform 240ms ease, box-shadow 240ms ease",
        zIndex: 100,
      }}
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      whileHover={{ y: -6, scale: 1.03 }}
      whileTap={{ scale: 0.99 }}
      transition={{ type: "spring", stiffness: 240, damping: 20 }}
    >
      <Box
        aria-hidden
        sx={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          overflow: "visible",
          borderRadius: 2,
          zIndex: 2,
        }}
      >
        <Sparkles positions={sparkles} active={hovered} />
      </Box>

      <Box
        aria-hidden
        sx={{
          width: { xs: "100%", sm: 120, md: 140 },
          height: { xs: 110, sm: 96, md: 110 },
          borderRadius: 1.5,
          overflow: "hidden",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "transparent",
          boxShadow: "0 0 20px rgba(199,0,255,0.4)",
          zIndex: 3,
        }}
      >
        <Box
          component="img"
          src={imgSrc}
          alt={title}
          sx={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
            transform: "translateZ(0)",
          }}
        />
      </Box>

      <Box
        sx={{
          flex: 1,
          minWidth: 0,
          py: { xs: 0.4, sm: 0 },
          zIndex: 3,
          position: "relative",
        }}
      >
        <Typography
          component="h3"
          sx={{
            fontFamily: "'Playfair Display', 'Poppins', system-ui, sans-serif",
            fontWeight: 700,
            color: BRAND_PURPLE,
            fontSize: { xs: 15, sm: 15.5, md: 16 },
            lineHeight: 1.02,
            mb: 0.25,
            textShadow: "0 0 12px rgba(199,0,255,0.7)",
          }}
        >
          {title}
        </Typography>

        <Typography
          sx={{
            color: "#3a1a3c", // subtítulos más legibles sobre el verde
            fontFamily: "'Poppins', system-ui, sans-serif",
            fontSize: { xs: 12, sm: 13 },
          }}
        >
          {subtitle}
        </Typography>

        <Box
          aria-hidden
          sx={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            overflow: "hidden",
            borderRadius: 2,
          }}
        >
          <Box sx={shimmerStyle} />
        </Box>
      </Box>
    </MotionBox>
  );
}

export default function AccionHome() {
  return (
    <Box
      component="section"
      aria-label="Barra de accesos rápidos"
      sx={{
        width: "100%",
        px: { xs: 2, sm: 3.5, md: 6 },
        py: { xs: 1.2, sm: 1.6 },
        background: BG_GREEN,
        borderTop: `4px solid ${PURPLE_ACCENT}`,
        borderBottom: `2px solid rgba(0,0,0,0.04)`,
        position: "relative",
      }}
    >
      <Box sx={{ maxWidth: 1400, mx: "auto" }}>
        <Grid container spacing={{ xs: 1, sm: 1.6 }} alignItems="stretch">
          <Grid item xs={12} sm={4}>
            <ActionCard
              to="/herramientas/kitautocultivo"
              imgSrc={kitGif}
              title="Kit AutoCultivo"
              subtitle="Todo lo que necesitas para comenzar tu huerta en casa"
              ariaLabel="Ir a Kit AutoCultivo"
            />
          </Grid>

          <Grid item xs={12} sm={4}>
            <ActionCard
              to="/clubs/tipos-clubs"
              imgSrc={afiliatuGif}
              title="Afíliate a un Club"
              subtitle="Únete a la comunidad y aprovecha beneficios exclusivos"
              ariaLabel="Ir a Afíliate a un Club"
            />
          </Grid>

          <Grid item xs={12} sm={4}>
            <ActionCard
              to="/membresias"
              imgSrc={suscribeGif}
              title="Suscríbete"
              subtitle="Planes con ventajas, descuentos y contenido premium"
              ariaLabel="Ir a Suscríbete"
            />
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
}
