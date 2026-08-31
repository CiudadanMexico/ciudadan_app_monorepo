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
import laborySvg from "../../assets/labory.svg";

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

  // ---- Escenografía integrada (efectos del papel, esferas y la red) ----
  const decorOpacity = useTransform(scrollYProgress, [0.02, 0.12, 0.8, 0.9], [0, 1, 1, 0]);
  const bolaOpacity = useTransform(scrollYProgress, [0.05, 0.16, 0.35, 0.5], [0, 1, 1, 0]);
  const acumOpacity = useTransform(scrollYProgress, [0.3, 0.42, 0.52, 0.62], [0, 1, 1, 0]);
  const poderOpacity = useTransform(scrollYProgress, [0.4, 0.52, 0.68, 0.8], [0, 1, 1, 0]);
  const sistemaOpacity = useTransform(scrollYProgress, [0.52, 0.64, 0.76, 0.88], [0, 1, 1, 0]);

  // ---- Monedas Labory: protagonista grande + moneditas en paralelo ----
  const coinOpacity = useTransform(scrollYProgress, [0.04, 0.14, 0.82, 0.92], [0, 1, 1, 0]);
  const coinRotateY = useTransform(scrollYProgress, [0.05, 1], [0, 540]);
  const coinY = useTransform(scrollYProgress, [0, 0.5, 1], ["-3vh", "2vh", "-4vh"]);
  const coinScale = useTransform(scrollYProgress, [0.04, 0.22, 0.9], [0.78, 1.06, 0.94]);
  const rainOpacity = useTransform(scrollYProgress, [0.02, 0.1, 0.9, 1], [0, 1, 1, 0]);

  // ---- Ensamblaje de la moneda grande (los trazos se van formando) ----
  const coinCircleO = useTransform(scrollYProgress, [0.05, 0.12], [0, 1]);
  const coinCircleI = useTransform(scrollYProgress, [0.10, 0.18], [0, 1]);
  const coinLBlack = useTransform(scrollYProgress, [0.13, 0.23], [0, 1]);
  const coinLYellow = useTransform(scrollYProgress, [0.22, 0.32], [0, 1]);
  const coinPieces = useTransform(scrollYProgress, [0.30, 0.38], [0, 1]);

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
          zIndex: 0,
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

        {/* ---- Escenografía: efectos integrados (papel, esferas, red) ---- */}
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            zIndex: -1,
            overflow: "hidden",
            pointerEvents: "none",
          }}
        >
          {/* Papel milimétrico en perspectiva (gira igual que el plano cartesiano) */}
          <motion.div
            style={{
              position: "absolute",
              inset: 0,
              perspective: "1300px",
              rotateX: planeRotateX,
              rotateZ: planeRotateZ,
              scale: planeScale,
              y: planeY,
            }}
          >
            <PerspectivePaper />
          </motion.div>

          {/* Cuadrícula fina de fondo */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage:
                "linear-gradient(rgba(255,255,255,.018) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.018) 1px, transparent 1px)",
              backgroundSize: "4px 4px",
              opacity: 0.25,
            }}
          />

          {/* Líneas de poder */}
          <PowerLine left="13%" top="58%" rotate={-8} />
          <PowerLine left="47%" top="44%" rotate={7} />
          <PowerLine left="58%" top="64%" rotate={-13} />

          {/* Esferas de dinero flotando */}
          <motion.div
            animate={{ y: [0, -9, 0], rotate: [0, 7, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            style={{ position: "absolute", left: "78%", top: "30%", opacity: bolaOpacity }}
          >
            <MoneyBall size={0.7} />
          </motion.div>
          <motion.div
            animate={{ y: [0, 7, 0] }}
            transition={{ duration: 2.7, repeat: Infinity, ease: "easeInOut" }}
            style={{ position: "absolute", left: "18%", top: "68%", opacity: bolaOpacity }}
          >
            <MoneyBall size={0.5} symbol="¢" />
          </motion.div>

          {/* Personajes de la red (colaboración) */}
          <motion.div style={{ position: "absolute", inset: 0, opacity: decorOpacity }}>
            <CharacterMini left="8%" top="60%" scale={0.6} posture="carry" />
            <CharacterMini left="28%" top="50%" scale={0.72} posture="push" />
            <CharacterMini left="66%" top="46%" scale={0.78} posture="pull" />
            <CharacterMini left="84%" top="58%" scale={0.62} posture="normal" />
          </motion.div>

          {/* Acumulación: pila de esferas + bloque de capital */}
          <motion.div style={{ position: "absolute", left: "50%", top: "58%", opacity: acumOpacity }}>
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={`stack-${i}`} style={{ marginTop: i === 0 ? 0 : -14, position: "relative" }}>
                <MoneyBall size={0.34 + i * 0.03} />
              </div>
            ))}
          </motion.div>
          <motion.div style={{ position: "absolute", left: "22%", top: "74%", opacity: acumOpacity }}>
            <CapitalBlock size={0.85} />
          </motion.div>

          {/* Poder central: figura dominante dorada sobre plataforma */}
          <motion.div style={{ position: "absolute", left: "76%", top: "24%", opacity: poderOpacity, scale: 1.15 }}>
            <MiniFigure posture="dominate" color="#ffe066" accent="#ffe066" size={1.1} />
          </motion.div>
          <motion.div
            style={{
              position: "absolute",
              left: "72%",
              top: "52%",
              width: 170,
              height: 16,
              border: "2px solid rgba(255,224,102,.55)",
              background: "rgba(255,224,102,.04)",
              transform: "skewX(-22deg)",
              boxShadow: "0 0 25px rgba(255,224,102,.12)",
              opacity: poderOpacity,
            }}
          />

          {/* Red del sistema */}
          <motion.div style={{ position: "absolute", inset: 0, opacity: sistemaOpacity }}>
            <SystemFrame />
            <CharacterMini left="12%" top="54%" scale={0.5} posture="pull" />
            <CharacterMini left="31%" top="63%" scale={0.45} posture="pull" />
            <CharacterMini left="63%" top="60%" scale={0.48} posture="pull" />
          </motion.div>

          {/* Viñeta */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "radial-gradient(circle at center, transparent 35%, rgba(0,0,0,.5) 100%)",
            }}
          />
        </Box>

        {/* ---- Monedas Labory: protagonista y moneditas en paralelo ---- */}
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            zIndex: 1,
            overflow: "hidden",
            pointerEvents: "none",
          }}
        >
          {/* Moneda protagonista: grande, gira con el scroll y hace parallax */}
          <motion.div
            style={{
              position: "absolute",
              left: "57%",
              top: "19%",
              opacity: coinOpacity,
              rotateY: coinRotateY,
              y: coinY,
              scale: coinScale,
              transformStyle: "preserve-3d",
              zIndex: 2,
            }}
          >
            <LaboryCoinAssemble
              width={300}
              height={280}
              circleO={coinCircleO}
              circleI={coinCircleI}
              lBlack={coinLBlack}
              lYellow={coinLYellow}
              pieces={coinPieces}
            />
          </motion.div>

          {/* Moneditas que rotan sin parar (spin infinito) */}
          <motion.div
            animate={{ rotateY: [0, 360], y: [0, -12, 0] }}
            transition={{ duration: 9, repeat: Infinity, ease: "linear" }}
            style={{ position: "absolute", left: "12%", top: "26%", opacity: rainOpacity, transformStyle: "preserve-3d" }}
          >
            <LaboryCoin width={66} height={62} />
          </motion.div>
          <motion.div
            animate={{ rotateY: [360, 0], y: [0, 10, 0] }}
            transition={{ duration: 7, repeat: Infinity, ease: "linear" }}
            style={{ position: "absolute", right: "12%", top: "60%", opacity: rainOpacity, transformStyle: "preserve-3d" }}
          >
            <LaboryCoin width={54} height={50} />
          </motion.div>

          {/* Moneditas que flotan suavemente en distintas posiciones */}
          <motion.div
            animate={{ y: [0, -14, 0], rotate: [-8, 8, -8] }}
            transition={{ duration: 5.2, repeat: Infinity, ease: "easeInOut" }}
            style={{ position: "absolute", left: "6%", top: "66%", opacity: rainOpacity }}
          >
            <LaboryCoin width={46} height={43} />
          </motion.div>
          <motion.div
            animate={{ y: [0, 12, 0], rotate: [10, -10, 10] }}
            transition={{ duration: 4.6, repeat: Infinity, ease: "easeInOut" }}
            style={{ position: "absolute", right: "20%", top: "18%", opacity: rainOpacity }}
          >
            <LaboryCoin width={40} height={37} />
          </motion.div>
          <motion.div
            animate={{ y: [0, -9, 0], rotate: [-6, 6, -6] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            style={{ position: "absolute", left: "38%", top: "78%", opacity: rainOpacity }}
          >
            <LaboryCoin width={34} height={32} />
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

/* =========================================================
   EFECTOS INTEGRADOS (escenografía de la red)
   Mini figuras con posturas · esfera de dinero · bloque de
   capital · líneas de poder · papel milimétrico · sistema.
   Se colocan en zIndex: -1 (detrás del plano y los textos).
========================================================= */

/** Mini figura geométrica con posturas (colaboración de la red). */
function MiniFigure({
  size = 0.75,
  posture = "normal",
  color = TURQUESA,
  accent = TURQUESA,
}) {
  const postures = {
    normal: {
      head: [50, 18],
      body: [50, 34, 50, 70],
      arm1: [50, 39, 28, 52],
      arm2: [50, 39, 72, 52],
      leg1: [50, 70, 34, 96],
      leg2: [50, 70, 68, 96],
    },
    push: {
      head: [50, 18],
      body: [50, 34, 50, 70],
      arm1: [50, 40, 20, 35],
      arm2: [50, 40, 22, 50],
      leg1: [50, 70, 34, 96],
      leg2: [50, 70, 70, 91],
    },
    pull: {
      head: [50, 18],
      body: [50, 34, 50, 70],
      arm1: [50, 40, 77, 31],
      arm2: [50, 48, 78, 51],
      leg1: [50, 70, 35, 96],
      leg2: [50, 70, 69, 96],
    },
    carry: {
      head: [50, 18],
      body: [50, 34, 50, 70],
      arm1: [50, 40, 30, 57],
      arm2: [50, 40, 70, 57],
      leg1: [50, 70, 35, 96],
      leg2: [50, 70, 67, 96],
    },
    dominate: {
      head: [50, 18],
      body: [50, 34, 50, 70],
      arm1: [50, 38, 20, 25],
      arm2: [50, 38, 80, 25],
      leg1: [50, 70, 35, 96],
      leg2: [50, 70, 70, 96],
    },
  };

  const p = postures[posture] || postures.normal;

  const drawLine = (coords, key) => (
    <line
      key={key}
      x1={coords[0]}
      y1={coords[1]}
      x2={coords[2]}
      y2={coords[3]}
      stroke={color}
      strokeWidth="3.2"
      strokeLinecap="round"
    />
  );

  return (
    <svg
      width={90 * size}
      height={125 * size}
      viewBox="0 0 100 125"
      aria-hidden="true"
      style={{
        overflow: "visible",
        filter: `drop-shadow(0 0 ${6 * size}px ${accent})`,
      }}
    >
      <circle
        cx={p.head[0]}
        cy={p.head[1]}
        r="10"
        fill="none"
        stroke={color}
        strokeWidth="3.2"
      />
      {drawLine(p.body, "body")}
      {drawLine(p.arm1, "arm1")}
      {drawLine(p.arm2, "arm2")}
      {drawLine(p.leg1, "leg1")}
      {drawLine(p.leg2, "leg2")}
    </svg>
  );
}

/** Personaje posicionado de la red (sin animación propia; el padre controla el fade). */
function CharacterMini({ left, top, scale = 1, posture = "normal", color = TURQUESA, accent = TURQUESA }) {
  return (
    <div
      style={{
        position: "absolute",
        left,
        top,
        zIndex: 0,
        transform: `scale(${scale})`,
        transformOrigin: "center bottom",
      }}
    >
      <MiniFigure size={0.75} posture={posture} color={color} accent={accent} />
    </div>
  );
}

/** Esfera de dinero flotante. */
function MoneyBall({ size = 1, symbol = "$" }) {
  return (
    <div
      style={{
        width: 58 * size,
        height: 58 * size,
        borderRadius: "50%",
        border: "2px solid #ffe066",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#ffe066",
        fontSize: 24 * size,
        fontWeight: 700,
        boxShadow: `
          0 0 ${10 * size}px rgba(255,224,102,.4),
          inset 0 0 ${12 * size}px rgba(255,224,102,.08)
        `,
        background: "rgba(255,224,102,0.035)",
      }}
    >
      {symbol}
    </div>
  );
}

/** Línea de poder dorada (efecto diagonal con glow). */
function PowerLine({
  left,
  top,
  width = "42%",
  rotate = -12,
}) {
  return (
    <div
      style={{
        position: "absolute",
        left,
        top,
        width,
        height: 2,
        background:
          "linear-gradient(90deg, transparent, rgba(255,224,102,.7), transparent)",
        transform: `rotate(${rotate}deg)`,
        transformOrigin: "left center",
        boxShadow: "0 0 8px rgba(255,224,102,.3)",
      }}
    />
  );
}

/** Papel milimétrico en perspectiva (degradado turquesa→amarillo). */
function PerspectivePaper() {
  const verticalLines = Array.from({ length: 31 });
  const horizontalLines = Array.from({ length: 18 });

  return (
    <svg
      viewBox="0 0 1600 1000"
      width="100%"
      height="100%"
      preserveAspectRatio="none"
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
      }}
    >
      <defs>
        <linearGradient id="paperFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2ee6c8" stopOpacity="0.025" />
          <stop offset="55%" stopColor="#2ee6c8" stopOpacity="0.07" />
          <stop offset="100%" stopColor="#ffe066" stopOpacity="0.025" />
        </linearGradient>

        <linearGradient id="fineGrid" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2ee6c8" stopOpacity="0.06" />
          <stop offset="100%" stopColor="#2ee6c8" stopOpacity="0.38" />
        </linearGradient>

        <linearGradient id="majorGrid" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2ee6c8" stopOpacity="0.10" />
          <stop offset="100%" stopColor="#ffe066" stopOpacity="0.30" />
        </linearGradient>
      </defs>

      <polygon
        points="150,885 1450,885 1235,205 365,205"
        fill="url(#paperFill)"
        stroke="#2ee6c8"
        strokeOpacity="0.18"
        strokeWidth="2"
      />

      {verticalLines.map((_, i) => {
        const t = i / (verticalLines.length - 1);
        const bottomX = 150 + t * 1300;
        const topX = 365 + t * 870;
        const major = i % 5 === 0;

        return (
          <line
            key={`v-${i}`}
            x1={bottomX}
            y1="885"
            x2={topX}
            y2="205"
            stroke={major ? "url(#majorGrid)" : "url(#fineGrid)"}
            strokeWidth={major ? 1.6 : 0.7}
          />
        );
      })}

      {horizontalLines.map((_, i) => {
        const t = i / (horizontalLines.length - 1);
        const y = 885 - t * 680;
        const leftX = 150 + t * 215;
        const rightX = 1450 - t * 215;
        const major = i % 3 === 0;

        return (
          <line
            key={`h-${i}`}
            x1={leftX}
            y1={y}
            x2={rightX}
            y2={y}
            stroke={major ? "url(#majorGrid)" : "url(#fineGrid)"}
            strokeWidth={major ? 1.5 : 0.7}
          />
        );
      })}

      <line
        x1="800"
        y1="885"
        x2="800"
        y2="205"
        stroke="#ffe066"
        strokeOpacity="0.30"
        strokeWidth="2"
        strokeDasharray="7 9"
      />

      <circle cx="800" cy="205" r="6" fill="#ffe066" opacity="0.8" />
      <circle cx="800" cy="205" r="15" fill="none" stroke="#ffe066" strokeOpacity="0.18" />
    </svg>
  );
}

/** Bloque de capital: caja visual con brillo (sin texto para respetar nuestra narrativa). */
function CapitalBlock({ size = 1 }) {
  return (
    <div
      style={{
        width: 85 * size,
        height: 42 * size,
        border: "2px solid rgba(232,255,249,.85)",
        background: "rgba(46,230,200,.045)",
        boxShadow: "0 0 20px rgba(46,230,200,.10)",
      }}
    />
  );
}

/** Marco del sistema: recuadro con doble borde (sin letras). */
function SystemFrame() {
  return (
    <div
      style={{
        position: "absolute",
        left: "32%",
        top: "36%",
        width: "42%",
        height: "110px",
        border: "2px solid rgba(232,255,249,.35)",
        background: "rgba(46,230,200,.035)",
        transform: "skewX(-18deg)",
        boxShadow: "0 0 45px rgba(46,230,200,.07)",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 15,
          border: "1px solid rgba(255,224,102,.15)",
        }}
      />
    </div>
  );
}

/** Moneda Labory real (SVG de assets) con glow dorado/verde. */
function LaboryCoin({ width = 90, height = 84 }) {
  return (
    <img
      src={laborySvg}
      alt=""
      aria-hidden="true"
      style={{
        width,
        height,
        objectFit: "contain",
        display: "block",
        filter:
          "drop-shadow(0 0 18px rgba(255,224,102,.5)) drop-shadow(0 0 7px rgba(14,219,154,.4))",
      }}
    />
  );
}

/**
 * Moneda Labory que se va ENSAMBLANDO trazo a trazo con el scroll:
 * primero los círculos (naranja→verde), después la "L" se dibuja
 * (pathLength ligado a MotionValues) y al final las piezas negras se ensamblan.
 */
function LaboryCoinAssemble({ width = 300, height = 280, circleO, circleI, lBlack, lYellow, pieces }) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 224 208"
      aria-hidden="true"
      style={{
        overflow: "visible",
        filter:
          "drop-shadow(0 0 18px rgba(255,224,102,.5)) drop-shadow(0 0 7px rgba(14,219,154,.4))",
      }}
    >
      {/* Fondo de la moneda: círculo naranja, luego verde */}
      <motion.circle
        cx="112"
        cy="104"
        r="101"
        fill="#FF7A18"
        style={{ opacity: circleO, scale: circleO }}
      />
      <motion.circle
        cx="112"
        cy="104"
        r="89"
        fill="#0EDB9A"
        style={{ opacity: circleI, scale: circleI }}
      />

      {/* Triángulo negro invertido (apunta hacia abajo) DETRÁS de la L: se pinta antes */}
      <motion.path
        d="M46 58 L178 58 L112 155 Z"
        fill="#000000"
        style={{ opacity: pieces }}
      />

      {/* La "L": contorno negro se dibuja con el scroll (queda por encima del triángulo) */}
      <motion.path
        d="M91 60 C80 60 74 68 74 81 L74 119 C74 132 80 143 94 143 L143 143"
        fill="none"
        stroke="#000000"
        strokeWidth="29"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ pathLength: lBlack }}
      />
      {/* La "L" amarilla se dibuja encima */}
      <motion.path
        d="M91 60 C80 60 74 68 74 81 L74 119 C74 132 80 143 94 143 L143 143"
        fill="none"
        stroke="#FFF500"
        strokeWidth="17"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ pathLength: lYellow }}
      />

      {/* Dos cuadritos negros que tapan segmentos de la línea de la base de la L (encima de la L) */}
      <motion.g style={{ opacity: pieces }}>
        <motion.rect x="87" y="140" width="16" height="18" fill="#000000" style={{ opacity: pieces }} />
        <motion.rect x="113" y="140" width="16" height="18" fill="#000000" style={{ opacity: pieces }} />
      </motion.g>
    </svg>
  );
}
