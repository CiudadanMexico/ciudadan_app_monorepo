// src/components/Rompecabezas.jsx
import React, { useEffect, useRef, useState } from "react";
import { motion, useAnimation } from "framer-motion";
import { Box, Button } from "@mui/material";
import { Link, useNavigate, useLocation } from 'react-router-dom';

// assets
import becarios from "../../assets/rompecabezas/becarios.png";
import programadores from "../../assets/rompecabezas/programadores.png";
import patrocinadores from "../../assets/rompecabezas/patrocinadores.png";
import agencias from "../../assets/rompecabezas/agencias.png";

const piezasMeta = [
  { img: becarios, link: "/becarios", esquina: "tl", z: 2, rol: "Becario" },
  { img: programadores, link: "/programadores", esquina: "tr", z: 4, rol: "Programador" },
  { img: patrocinadores, link: "/patrocinadores", esquina: "bl", z: 4, rol: "Patrocinador" },
  { img: agencias, link: "/agencias", esquina: "br", z: 2, rol: "Agencia" },
];

const getInitialOffset = (corner) => {
  switch (corner) {
    case "tl": return { x: "-120%", y: "-120%" };
    case "tr": return { x: "120%", y: "-120%" };
    case "bl": return { x: "-120%", y: "120%" };
    case "br": return { x: "120%", y: "120%" };
    default: return { x: 0, y: 0 };
  }
};

const LAYOUTS = [
  { minW: 0, container: 320 },
  { minW: 600, container: 420 },
  { minW: 900, container: 520 },
  { minW: 1400, container: 700 },
];

export default function Rompecabezas() {
  const navigate = useNavigate();
  const rootRef = useRef(null);
  const location = useLocation();

  const [containerSize, setContainerSize] = useState(() => {
    if (typeof window === "undefined") return LAYOUTS[2].container;
    const w = window.innerWidth;
    for (let i = LAYOUTS.length - 1; i >= 0; i--) {
      if (w >= LAYOUTS[i].minW) return LAYOUTS[i].container;
    }
    return LAYOUTS[0].container;
  });

  useEffect(() => {
    const onResize = () => {
      const w = window.innerWidth;
      for (let i = LAYOUTS.length - 1; i >= 0; i--) {
        if (w >= LAYOUTS[i].minW) {
          setContainerSize(LAYOUTS[i].container);
          return;
        }
      }
      setContainerSize(LAYOUTS[0].container);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const cellSize = Math.round(containerSize / 2);
  const imageSize = Math.round(cellSize * 1.06);
  const overlapHalf = Math.round((imageSize - cellSize) / 2);

  const basePositions = [
    { left: 0 + overlapHalf, top: 0 + overlapHalf },
    { left: cellSize + -overlapHalf, top: 0 + overlapHalf },
    { left: 0 + overlapHalf, top: cellSize + -overlapHalf },
    { left: cellSize + -overlapHalf, top: cellSize + -overlapHalf },
  ];

  const controls = [useAnimation(), useAnimation(), useAnimation(), useAnimation()];
  const [positions, setPositions] = useState(basePositions);
  const [snapped, setSnapped] = useState([false, false, false, false]);
  const draggingRef = useRef([false, false, false, false]);

  useEffect(() => {
    piezasMeta.forEach((_, i) => {
      const offset = getInitialOffset(piezasMeta[i].esquina);
      controls[i].set({ x: offset.x, y: offset.y, opacity: 0 });
      const delay = i * 0.12;
      controls[i]
        .start({
          x: 0, y: 0, opacity: 1, rotate: [0, 1.5, 0],
          transition: {
            x: { type: "spring", stiffness: 70, damping: 18, delay },
            y: { type: "spring", stiffness: 70, damping: 18, delay },
            opacity: { duration: 0.35, delay },
            rotate: { duration: 0.45, delay },
          },
        })
        .then(() => {
          controls[i].start({
            boxShadow: [
              "0 0 0px rgba(255,255,255,0)",
              "0 0 16px rgba(255,255,255,0.85)",
              "0 0 3px rgba(255,255,255,0.25)",
              "0 0 0px rgba(255,255,255,0)",
            ],
            transition: { duration: 0.55, times: [0, 0.25, 0.8, 1] },
          });
          setTimeout(() => {
            controls[i].start({ boxShadow: "0 0 0px rgba(255,255,255,0)", transition: { duration: 0.25 } });
          }, 550);
        });
    });
  }, []);

  const dist = (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1);
  const SNAP_THRESHOLD = Math.max(18, Math.round(cellSize * 0.14));

  const handleDragEnd = async (i, event, info) => {
    if (!rootRef.current) return;
    const rect = rootRef.current.getBoundingClientRect();
    const dropCenterX = info.point.x - rect.left;
    const dropCenterY = info.point.y - rect.top;
    const dropLeft = Math.round(dropCenterX - imageSize / 2);
    const dropTop = Math.round(dropCenterY - imageSize / 2);

    let foundTargetIndex = -1;
    for (let t = 0; t < basePositions.length; t++) {
      const occupiedByOther = snapped[t] && t !== i;
      if (occupiedByOther) continue;
      const tx = basePositions[t].left;
      const ty = basePositions[t].top;
      const d = dist(dropLeft, dropTop, tx, ty);
      if (d <= SNAP_THRESHOLD) {
        foundTargetIndex = t;
        break;
      }
    }

    if (foundTargetIndex !== -1) {
      const target = basePositions[foundTargetIndex];
      const currPos = positions[i];
      const animateTo = { x: target.left - currPos.left, y: target.top - currPos.top };
      await controls[i].start({
        x: animateTo.x,
        y: animateTo.y,
        transition: { type: "spring", stiffness: 120, damping: 18, duration: 0.35 },
      });
      setPositions((prev) => {
        const copy = [...prev];
        copy[i] = { left: target.left, top: target.top };
        return copy;
      });
      controls[i].set({ x: 0, y: 0 });
      setSnapped((prev) => {
        const copy = [...prev];
        copy[foundTargetIndex] = true;
        return copy;
      });
      draggingRef.current[i] = false;
      return;
    }

    await controls[i].start({
      x: 0, y: 0,
      transition: { type: "spring", stiffness: 90, damping: 16, duration: 0.45 },
    });
    setTimeout(() => (draggingRef.current[i] = false), 30);
  };

  const renderTargetHints = () =>
    basePositions.map((p, idx) => (
      <Box
        key={`hint-${idx}`}
        sx={{
          position: "absolute",
          left: `${p.left + Math.round(imageSize / 2) - 6}px`,
          top: `${p.top + Math.round(imageSize / 2) - 6}px`,
          width: 12,
          height: 12,
          borderRadius: "50%",
          pointerEvents: "none",
          background: snapped[idx] ? "rgba(0,200,50,0.9)" : "rgba(0,0,0,0.08)",
          boxShadow: snapped[idx] ? "0 0 8px rgba(0,200,50,0.8)" : "none",
          transition: "all 220ms",
        }}
      />
    ));

  return (
    <Box
      ref={rootRef}
      sx={{
        position: "relative",
        width: "100%",
        minHeight: `${containerSize + 8}px`,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#064e3b",
        flexDirection: "column",
        userSelect: "none",
      }}
    >
      {/* 🔹 Banner Superior */}
      <Box
        sx={{
          width: "95%",
          maxWidth: "1400px",
          background: "linear-gradient(90deg, #ffea00, #ffb300)",
          borderRadius: "0 0 14px 14px",
          textAlign: "center",
          padding: { xs: "8px 12px", md: "10px 20px" },
          margin: "6px 0 20px 0",
          boxShadow: "0 3px 8px rgba(0,0,0,0.25)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <Box
          sx={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: { xs: "1.5rem", md: "2rem" },
            color: "#212121",
            letterSpacing: "1px",
            textTransform: "uppercase",
            flex: 1,
            textAlign: "left",
            ml: { xs: 1.5, md: 2.5 },
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}
        >
          <span role="img" aria-label="graduation cap">🎓</span>
          MÁSTER EN DESARROLLO CON INTELIGENCIA ARTIFICIAL
        </Box>
        <Button
          href="#"
          sx={{
            background: "#212121",
            color: "#ffea00",
            fontWeight: 700,
            fontSize: "0.9rem",
            borderRadius: "8px",
            textTransform: "none",
            px: 2.5,
            py: 1,
            mr: { xs: 1.5, md: 2 },
            '&:hover': { background: "#333" },
          }}
        >
          Ver Programa
        </Button>
      </Box>

      {/* 🧩 Rompecabezas */}
      <Box
        sx={{
          position: "relative",
          width: `${containerSize}px`,
          height: `${containerSize}px`,
        }}
      >
        {renderTargetHints()}

        {piezasMeta.map((p, i) => {
          const pos = positions[i];
          return (
            <motion.div
              key={i}
              style={{
                position: "absolute",
                left: `${pos.left}px`,
                top: `${pos.top}px`,
                width: `${imageSize}px`,
                height: `${imageSize}px`,
                zIndex: p.z + (snapped[i] ? 50 : 0),
                cursor: snapped[i] ? "default" : "grab",
              }}
              drag={!snapped[i]}
              dragConstraints={rootRef}
              dragElastic={0.18}
              dragMomentum={false}
              onDragStart={() => {
                controls[i].set({ zIndex: 9999 });
                draggingRef.current[i] = true;
              }}
              onDragEnd={(event, info) => handleDragEnd(i, event, info)}
              animate={controls[i]}
              whileTap={{ cursor: "grabbing" }}
              whileHover={snapped[i] ? {} : { scale: 1.02 }}
            >
              <Box
                component="img"
                src={p.img}
                alt={p.link}
                sx={{
                  width: "100%",
                  height: "100%",
                  display: "block",
                  objectFit: "cover",
                  pointerEvents: "none",
                  userSelect: "none",
                }}
                draggable={false}
              />
              <Box
                sx={{
                  position: "absolute",
                  left: "50%",
                  top: "50%",
                  transform: "translate(-50%, -50%)",
                  zIndex: 99999,
                  pointerEvents: "auto",
                  width: "85%",
                  display: "flex",
                  justifyContent: "center",
                }}
              >
                <Link
                  to={p.link}
                  onClick={(e) => {
                    if (draggingRef.current[i]) e.preventDefault();
                  }}
                  style={{ width: "100%", textDecoration: "none" }}
                >
                  <Button
                    fullWidth
                    variant="contained"
                    size="small"
                    sx={{
                      textTransform: "none",
                      fontWeight: 600,
                      boxShadow: 3,
                      background:
                        "linear-gradient(90deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))",
                      color: "white",
                      backdropFilter: "blur(4px)",
                    }}
                  >
                    {`Registrarme como ${p.rol}`}
                  </Button>
                </Link>
              </Box>
            </motion.div>
          );
        })}
      </Box>
    </Box>
  );
}
