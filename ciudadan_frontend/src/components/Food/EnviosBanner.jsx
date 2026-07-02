// src/components/EnviosBanner.jsx
import React, { useState, useEffect } from "react";
import { Box, Typography, Link as MuiLink } from "@mui/material";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom"; // importante para navegación interna

const palabras = [
  { texto: "Rápidos", color: "#fff200" },
  { texto: "Económicos", color: "#00e676" },
  { texto: "Justos", color: "#2196f3" },
];

const MotorcycleSVG = ({ width = 140, height = 42 }) => (
  <svg viewBox="0 0 440 110" width={width} height={height} xmlns="http://www.w3.org/2000/svg">
    <g>
      <circle cx="100" cy="85" r="30" fill="#212121" />
      <circle cx="340" cy="85" r="30" fill="#212121" />
      <circle cx="100" cy="85" r="10" fill="#6d6e71" />
      <circle cx="340" cy="85" r="10" fill="#6d6e71" />
      <path d="M80 80 Q200 30 360 60 L380 78 L340 82 Q280 60 160 80 Z" fill="#fdd835" stroke="#000" strokeWidth="3" />
      <path d="M160 58 Q210 38 260 52 L270 62 L210 62 Z" fill="#212121" />
      <circle cx="220" cy="38" r="16" fill="#0d0d0d" />
      <rect x="208" y="54" width="24" height="28" rx="4" fill="#1976d2" />
      <path d="M232 70 L270 92" stroke="#1976d2" strokeWidth="6" strokeLinecap="round" />
      <rect x="280" y="38" width="36" height="36" rx="4" fill="#ffeb3b" stroke="#6d6e71" strokeWidth="1.5" />
      <text x="298" y="60" fontSize="14" fontFamily="Arial Black" fill="#000" textAnchor="middle">C</text>
      <circle cx="300" cy="62" r="4" fill="#6d6e71" />
    </g>
  </svg>
);

const ShopAwningIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    <path d="M3 11 L12 4 L21 11 V20 H14 V14 H10 V20 H3 Z" fill="#fff" stroke="#6d6e71" strokeWidth="0.8" />
    <path d="M2 11c1.5-1.2 2-2 4-2s2.5.8 4 0 2.5 0 4 0 2.5.8 4 0v0h-20z" fill="#ff1744" opacity="0.95" />
    <rect x="11" y="13" width="2" height="5" rx="0.4" fill="#6d6e71" />
  </svg>
);

/**
 * CursorClickAnimation
 *
 * Comportamiento:
 * - Cursor dentro del área de "Afilia tu Restaurante".
 * - El "círculo" de click ahora cubre toda el área del link y es amarillo bastante transparente.
 * - El resto del componente NO se modifica.
 */
const CursorClickAnimation = ({ isMobile }) => {
  // posiciones aproximadas donde está el link "Afilia tu Restaurante"
  const desktopStart = "20%";
  const desktopMid = "26%";
  const mobileStart = "12px";
  const mobileMid = "60px";

  const startX = isMobile ? mobileStart : desktopStart;
  const midX = isMobile ? mobileMid : desktopMid;

  return (
    <>
      {/* Cursor principal (movimiento dentro del área) */}
      <motion.div
        initial={{ left: startX, top: "50%", scale: 1 }}
        animate={{
          left: [startX, midX, startX],
          top: ["48%", "56%", "48%"],
          scale: [1, 0.92, 1],
        }}
        transition={{
          duration: 2.0,
          ease: "easeInOut",
          repeat: Infinity,
          repeatDelay: 0.5,
        }}
        style={{
          position: "absolute",
          width: 28,
          height: 36,
          transform: "translate(-50%,-50%)",
          zIndex: 22,
          pointerEvents: "none",
        }}
      >
        <svg width="28" height="36" viewBox="0 0 28 36">
          <path d="M2 2 L22 18 L14 20 L24 34 L16 36 L6 22 L2 2 Z" fill="#fff" stroke="#000" strokeWidth="0.6" />
        </svg>
      </motion.div>

      {/* --- CÍRCULO VISIBLE Y AMARILLO: ahora más grande y con gradiente amarillo --- */}
      <Box
        component="div"
        sx={{
          position: "absolute",
          left: { xs: "6px", md: "20%" },
          top: "50%",
          transform: "translate(-50%,-50%)",
          width: { xs: 140, md: 260 },
          height: { xs: 90, md: 120 },
          pointerEvents: "none",
          zIndex: 18,
        }}
      >
        {/* primer ripple: amarillo con centro más intenso */}
        <motion.span
          initial={{ scale: 0.2, opacity: 0.5 }}
          animate={{ scale: [0.2, 1.6], opacity: [0.5, 0] }}
          transition={{ duration: 1.0, repeat: Infinity, repeatDelay: 2.2, ease: "easeOut", delay: 0.6 }}
          style={{
            display: "block",
            width: "100%",
            height: "100%",
            borderRadius: "50%",
            background: "radial-gradient(circle at 50% 50%, rgba(255,242,0,0.45), rgba(255,242,0,0.02))",
            boxShadow: "0 8px 30px rgba(255,198,0,0.12)",
          }}
        />

        {/* segundo ripple: más grande y más sutil */}
        <motion.span
          initial={{ scale: 0.2, opacity: 0.38 }}
          animate={{ scale: [0.2, 2.2], opacity: [0.38, 0] }}
          transition={{ duration: 1.4, repeat: Infinity, repeatDelay: 2.2, ease: "easeOut", delay: 1.1 }}
          style={{
            display: "block",
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            background: "radial-gradient(circle at 50% 50%, rgba(255,242,0,0.30), rgba(255,242,0,0.01))",
          }}
        />
      </Box>
    </>
  );
};

const EnviosBanner = () => {
  const [index, setIndex] = useState(0);
  const [mostrarAfilia, setMostrarAfilia] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setIndex((p) => (p + 1) % palabras.length), 2000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setMostrarAfilia((p) => !p), 4000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return (
    <Box
      component="section"
      sx={{
        position: "relative",
        width: "100%",
        height: { xs: 120, md: 160 },
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(90deg, #ff8c00 0%, #ffa500 40%, #ffcc00 80%, #fff200 100%)",
        overflow: "hidden",
        borderTop: "2px solid #6d6e71",
        borderBottom: "2px solid rgba(0,0,0,0.05)",
        boxShadow: "0px 4px 18px rgba(0,0,0,0.18)",
        px: { xs: 2, md: 6 },
      }}
    >

        {/* patrón sutil */}
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          background: "repeating-linear-gradient(45deg, rgba(255,255,255,0.04) 0, rgba(255,255,255,0.04) 3px, transparent 3px, transparent 12px)",
          zIndex: 0,
        }}
        aria-hidden
      />


      {/* Texto Izquierdo clickeable */}
      <Box
        sx={{
          position: "absolute",
          left: { xs: "6px", md: "20%" },
          top: "50%",
          transform: "translateY(-50%)",
          zIndex: 6,
          textAlign: "left",
          maxWidth: { xs: 120, md: 260 },
        }}
        component={Link}
        to="/comida/afiliate"
        style={{ textDecoration: "none" }}
      >
        <AnimatePresence mode="wait">
          {mostrarAfilia && (
            <motion.div
              key="afilia"
              initial={{ opacity: 0, x: -18 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -18 }}
              transition={{ duration: 0.75 }}
            >
              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.2 }}>
                <Typography
                  sx={{
                    color: "#ff1a1a",
                    fontFamily: "'Bebas Neue', sans-serif",
                    fontSize: { xs: 14, md: 22 },
                    lineHeight: 1,
                    letterSpacing: "1px",
                    fontWeight: 900,
                    textTransform: "uppercase",
                    textShadow: "0 3px 8px rgba(0,0,0,0.45)",
                  }}
                >
                  Afilia tu
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.6 }}>
                  <ShopAwningIcon size={18} />
                  <Typography
                    sx={{
                      color: "#ff1a1a",
                      fontFamily: "'Bebas Neue', sans-serif",
                      fontSize: { xs: 14, md: 22 },
                      fontWeight: 900,
                      textTransform: "uppercase",
                      textShadow: "0 3px 8px rgba(0,0,0,0.45)",
                    }}
                  >
                    Restaurante
                  </Typography>
                </Box>
              </Box>
            </motion.div>
          )}
        </AnimatePresence>
      </Box>

      {/* Texto Central */}
      <Box sx={{ zIndex: 5, display: "flex", flexDirection: "column", alignItems: "center", gap: 0.4 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography
            variant="h4"
            sx={{
              color: "#fff",
              fontWeight: 900,
              letterSpacing: "2px",
              textTransform: "uppercase",
              fontFamily: "'Russo One', sans-serif",
              textShadow: "0px 2px 8px rgba(0,0,0,0.45)",
              fontSize: { xs: 15, md: 28 },
            }}
          >
            Envíos&nbsp;
          </Typography>

          <AnimatePresence mode="wait">
            <motion.span
              key={index}
              initial={{ opacity: 0, y: 22, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -22, scale: 0.95 }}
              transition={{ duration: 0.45 }}
              style={{
                display: "inline-block",
                background: palabras[index].color,
                color: "#000",
                padding: "6px 14px",
                borderRadius: 10,
                boxShadow: "0px 6px 14px rgba(0,0,0,0.28)",
                fontFamily: "'Orbitron', sans-serif",
                fontWeight: 800,
                fontSize: 15,
                lineHeight: 1,
              }}
            >
              {palabras[index].texto}
            </motion.span>
          </AnimatePresence>
        </Box>

        {/* Enlace inferior */}
        <MuiLink
          component={Link}
          to="/comida/envios"
          underline="hover"
          sx={{
            mt: 0.6,
            color: "#fff",
            fontSize: { xs: 12, md: 14 },
            fontFamily: "Roboto, sans-serif",
            opacity: 0.9,
            "&:hover": { opacity: 1 },
          }}
        >
          Conocer más →
        </MuiLink>
      </Box>

      {/* Moto animada (sin tocar posición, sólo escala) */}
      <motion.div
        initial={{ x: "110%" }}
        animate={{ x: "-30%" }}
        transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
        style={{
          position: "absolute",
          bottom: 12,
          right: "30%",
          width: 140,
          zIndex: 10,
          transform: "scaleX(-1)",
          transformOrigin: "center",
          pointerEvents: "none",
        }}
      >
        <MotorcycleSVG width={140} height={42} />
      </motion.div>

      <CursorClickAnimation isMobile={isMobile} />
    </Box>
  );
};

export default EnviosBanner;
