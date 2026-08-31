// src/components/Home/LaboryScrollScene.jsx
// Escena guiada por scroll (scroll trigger): un monigote geométrico cae por un
// plano cartesiano en 3D mientras el gran título cambia de perspectiva:
// "Labory — dinero que sirve y no al revés".
// La sección mide ~360vh y el contenido queda sticky a 100svh; el avance del
// scroll (useScroll) mueve la perspectiva del plano, la caída de la figura y
// las fases del título (useTransform).
import React, { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Box, Typography } from "@mui/material";
import { keyframes } from "@mui/system";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";

const HERO_FONT = '"Space Grotesk", "Poppins", system-ui, sans-serif';
const TURQUESA = "#2ee6c8";
const AMARILLO = "#ffe066";

// Aleteo suave de brazos/piernas mientras cae (loop independiente del scroll)
const limbSwing = keyframes`
  0%, 100% { transform: rotate(-7deg); }
  50% { transform: rotate(7deg); }
`;

export default function LaboryScrollScene() {
  const targetRef = useRef(null);

  // Progreso 0→1 mientras la sección recorre el viewport (contenido sticky)
  const { scrollYProgress } = useScroll({
    target: targetRef,
    offset: ["start start", "end end"],
  });

  // ---- Plano cartesiano: baja inclinado y se va enderezando ----
  const planeRotateX = useTransform(scrollYProgress, [0, 0.5, 1], [60, 34, 14]);
  const planeRotateZ = useTransform(scrollYProgress, [0, 1], [-9, 5]);
  const planeScale = useTransform(scrollYProgress, [0, 1], [0.8, 1.28]);
  const planeY = useTransform(scrollYProgress, [0, 1], ["-5%", "5%"]);

  // ---- Figura: se dibuja con el scroll y cae girando en 3D ----
  const figureDraw = useTransform(scrollYProgress, [0.02, 0.3], [0, 1]);
  const figureY = useTransform(scrollYProgress, [0, 1], ["-42vh", "48vh"]);
  const figureX = useTransform(scrollYProgress, [0, 0.5, 1], ["-12vw", "0vw", "10vw"]);
  const figureRotate = useTransform(scrollYProgress, [0, 0.5, 1], [-22, 9, -12]);
  const figureScale = useTransform(scrollYProgress, [0, 1], [0.72, 1.18]);
  const figureOpacity = useTransform(scrollYProgress, [0, 0.05, 0.95, 1], [0, 1, 1, 0.85]);

  // ---- Títulos por fases, con cambio de perspectiva 3D ----
  const t1Opacity = useTransform(scrollYProgress, [0.04, 0.12, 0.26, 0.34], [0, 1, 1, 0]);
  const t1RotateX = useTransform(scrollYProgress, [0.04, 0.34], [26, -32]);
  const t1Y = useTransform(scrollYProgress, [0.04, 0.34], [34, -70]);

  const t2Opacity = useTransform(scrollYProgress, [0.36, 0.44, 0.58, 0.66], [0, 1, 1, 0]);
  const t2RotateY = useTransform(scrollYProgress, [0.36, 0.66], [-42, 42]);
  const t2Y = useTransform(scrollYProgress, [0.36, 0.66], [44, -60]);

  const t3Opacity = useTransform(scrollYProgress, [0.68, 0.78, 1], [0, 1, 1]);
  const t3RotateX = useTransform(scrollYProgress, [0.68, 1], [-38, 0]);
  const t3Scale = useTransform(scrollYProgress, [0.68, 1], [0.82, 1.06]);

  const hintOpacity = useTransform(scrollYProgress, [0, 0.07], [1, 0]);
  const exitFadeOpacity = useTransform(scrollYProgress, [0.86, 0.98], [0, 1]);

  return (
    <Box
      ref={targetRef}
      sx={{
        position: "relative",
        height: "360vh",
        bgcolor: "#050b09",
        // NOTA: sin overflow hidden — rompería el position:sticky del hijo.
        // El recorte visual del plano gigante lo hace el Box sticky interior.
      }}
    >
      <Box
        sx={{
          position: "sticky",
          top: 0,
          height: "100svh",
          overflow: "hidden",
          background:
            "radial-gradient(1200px 700px at 50% 8%, rgba(46,230,200,0.10), rgba(0,0,0,0) 60%), radial-gradient(900px 500px at 80% 90%, rgba(255,224,102,0.07), rgba(0,0,0,0) 55%), #050b09",
        }}
      >
        {/* ---- Escena 3D: plano cartesiano con figura cayendo ---- */}
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            perspective: "1300px",
            display: "grid",
            placeItems: "center",
          }}
        >
          <motion.div
            style={{
              rotateX: planeRotateX,
              rotateZ: planeRotateZ,
              scale: planeScale,
              y: planeY,
              transformStyle: "preserve-3d",
              width: "150vmax",
              height: "110vmax",
              display: "grid",
              placeItems: "center",
            }}
          >
            <GridPlane />
            <motion.div
              style={{
                y: figureY,
                x: figureX,
                rotate: figureRotate,
                scale: figureScale,
                opacity: figureOpacity,
                z: 70,
                position: "absolute",
              }}
            >
              <StickFigure drawProgress={figureDraw} />
            </motion.div>
          </motion.div>
        </Box>

        {/* ---- Títulos por fases, con cambio de perspectiva 3D ---- */}
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            zIndex: 3,
            display: "grid",
            placeItems: "center",
            perspective: "900px",
            pointerEvents: "none",
            px: 2,
          }}
        >
          <motion.div
            style={{ opacity: t1Opacity, rotateX: t1RotateX, y: t1Y, transformStyle: "preserve-3d" }}
          >
            <Typography
              sx={{
                fontFamily: HERO_FONT,
                fontWeight: 700,
                fontSize: { xs: "3.4rem", md: "7rem" },
                lineHeight: 0.95,
                letterSpacing: "-0.03em",
                color: "#fff",
                textAlign: "center",
                textShadow: "0 4px 40px rgba(46,230,200,0.35)",
              }}
            >
              LABORY
            </Typography>
          </motion.div>

          <motion.div
            style={{ opacity: t2Opacity, rotateY: t2RotateY, y: t2Y, transformStyle: "preserve-3d" }}
          >
            <Typography
              sx={{
                fontFamily: HERO_FONT,
                fontWeight: 700,
                fontSize: { xs: "2.4rem", md: "5rem" },
                lineHeight: 1,
                letterSpacing: "-0.02em",
                color: "#fff",
                textAlign: "center",
                textShadow: "0 4px 40px rgba(255,224,102,0.3)",
              }}
            >
              DINERO QUE SIRVE A LAS PERSONAS
            </Typography>
          </motion.div>

          <motion.div
            style={{ opacity: t3Opacity, rotateX: t3RotateX, scale: t3Scale, transformStyle: "preserve-3d" }}
          >
            <Typography
              sx={{
                fontFamily: HERO_FONT,
                fontWeight: 700,
                fontSize: { xs: "2.6rem", md: "5.6rem" },
                lineHeight: 1,
                letterSpacing: "-0.02em",
                color: AMARILLO,
                textAlign: "center",
                textShadow: "0 4px 46px rgba(255,224,102,0.4)",
              }}
            >
              Y NO AL REVÉS
            </Typography>
            <Typography
              sx={{
                fontFamily: HERO_FONT,
                fontWeight: 500,
                fontSize: { xs: "0.95rem", md: "1.2rem" },
                color: "rgba(255,255,255,0.75)",
                textAlign: "center",
                mt: 1.5,
              }}
            >
              La moneda de la cooperación: se gana produciendo, no prometiendo.
            </Typography>
          </motion.div>
        </Box>

        {/* ---- Indicador de scroll (solo al inicio) ---- */}
        <Box
          sx={{
            position: "absolute",
            left: "50%",
            bottom: 26,
            transform: "translateX(-50%)",
            zIndex: 4,
            color: "rgba(255,255,255,0.65)",
            textAlign: "center",
          }}
        >
          <motion.div style={{ opacity: hintOpacity }}>
            <Typography sx={{ fontFamily: HERO_FONT, fontSize: 12, fontWeight: 600, letterSpacing: "0.18em" }}>
              DESLIZA
            </Typography>
            <KeyboardArrowDownRoundedIcon
              sx={{ animation: "bounceHint 1.6s ease-in-out infinite", "@keyframes bounceHint": { "0%, 100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(8px)" } } }}
            />
          </motion.div>
        </Box>

        {/* ---- Fundido de salida hacia la sección clara siguiente ---- */}
        <Box sx={{ position: "absolute", inset: 0, zIndex: 5, pointerEvents: "none" }}>
          <motion.div
            style={{
              opacity: exitFadeOpacity,
              position: "absolute",
              inset: 0,
              background: "#f7faf8",
            }}
          />
        </Box>
      </Box>
    </Box>
  );
}

/** Plano cartesiano: retícula + ejes X/Y, dibujado en SVG. */
function GridPlane() {
  return (
    <svg
      viewBox="0 0 1600 1000"
      width="100%"
      height="100%"
      style={{ position: "absolute", inset: 0, opacity: 0.5 }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="gridFade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2ee6c8" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#2ee6c8" stopOpacity="0.06" />
        </linearGradient>
      </defs>
      {/* retícula */}
      {Array.from({ length: 15 }, (_, i) => (
        <line key={`v${i}`} x1={i * 100} y1={0} x2={i * 100} y2={1000} stroke="url(#gridFade)" strokeWidth={1} />
      ))}
      {Array.from({ length: 9 }, (_, i) => (
        <line key={`h${i}`} x1={0} y1={i * 100} x2={1600} y2={i * 100} stroke="url(#gridFade)" strokeWidth={1} />
      ))}
      {/* ejes */}
      <line x1={0} y1={500} x2={1600} y2={500} stroke="#2ee6c8" strokeWidth={2.5} strokeOpacity={0.9} />
      <line x1={800} y1={0} x2={800} y2={1000} stroke="#ffe066" strokeWidth={2.5} strokeOpacity={0.85} />
    </svg>
  );
}

/**
 * Monigote geométrico (mera geometría: círculo + líneas).
 * Se dibuja con el scroll (pathLength) y aletea suavemente mientras cae.
 */
function StickFigure({ drawProgress }) {
  const limbs = { stroke: TURQUESA, strokeWidth: 6, strokeLinecap: "round" };
  return (
    <svg
      width="190"
      height="250"
      viewBox="0 0 120 160"
      style={{ filter: "drop-shadow(0 0 18px rgba(46,230,200,0.55))" }}
      aria-hidden="true"
    >
      <motion.circle cx={60} cy={26} r={15} fill="none" stroke={AMARILLO} strokeWidth={6} style={{ pathLength: drawProgress }} />
      <motion.line x1={60} y1={41} x2={60} y2={94} {...limbs} style={{ pathLength: drawProgress }} />
      {/* brazos */}
      <g style={{ transformBox: "fill-box", transformOrigin: "top center", animation: `${limbSwing} 1.4s ease-in-out infinite` }}>
        <motion.line x1={60} y1={54} x2={30} y2={82} {...limbs} style={{ pathLength: drawProgress }} />
        <motion.line x1={60} y1={54} x2={90} y2={82} {...limbs} style={{ pathLength: drawProgress }} />
      </g>
      {/* piernas */}
      <g style={{ transformBox: "fill-box", transformOrigin: "top center", animation: `${limbSwing} 1.4s ease-in-out infinite reverse` }}>
        <motion.line x1={60} y1={94} x2={36} y2={146} {...limbs} style={{ pathLength: drawProgress }} />
        <motion.line x1={60} y1={94} x2={84} y2={146} {...limbs} style={{ pathLength: drawProgress }} />
      </g>
    </svg>
  );
}
