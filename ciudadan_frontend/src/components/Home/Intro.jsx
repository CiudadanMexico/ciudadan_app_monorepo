import React, { useEffect, useState } from "react";
import { Button, Typography } from "@mui/material";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";

import programadores from "../../assets/programadores.png";
import becarios from "../../assets/becarios.png";
import profesionales from "../../assets/profesionales.png";
import universitarios from "../../assets/universitarios.png";
import ciudadanCompleto from "../../assets/ciudadanCompleto.jpg";
import ciudadanMobile from "../../assets/ciudadanMobile.jpg";

export default function HomeRoute() {
  const characters = [
    { key: "programadores", img: programadores, title: "Programadores y Profesores" },
    { key: "becarios", img: becarios, title: "Becarios" },
    { key: "profesionales", img: profesionales, title: "Profesionales y Expertos" },
    { key: "universitarios", img: universitarios, title: "Universitarios" },
  ];

  const rotatingInner = ["La Economía", "El Software", "Las Ecociudades"];
  const [indexChar, setIndexChar] = useState(0);
  const [indexInner, setIndexInner] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 900);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setIndexChar((i) => (i + 1) % characters.length), 5000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setIndexInner((i) => (i + 1) % rotatingInner.length), 3500);
    return () => clearInterval(t);
  }, []);

  const backgroundImage = isMobile ? ciudadanMobile : ciudadanCompleto;

  return (
    <div
      style={{
        width: "100vw",
        minHeight: "100vh",
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        position: "relative",
        overflowX: "hidden",
        fontFamily: "Montserrat, Anton, sans-serif",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Anton&family=Montserrat:wght@300;600;800&display=swap');
        :root{
          --neon-pink: rgba(255,20,147,0.95);
          --neon-green: rgba(80,255,160,0.95);
          --glass: rgba(255,255,255,0.06);
        }
        .neon-title {
          font-family: 'Anton', sans-serif;
          color: white;
          text-shadow: 0 0 15px var(--neon-green), 0 0 35px var(--neon-pink);
        }
        .neon-sub {
          font-family: 'Montserrat', sans-serif;
          color: #e9fef4;
          text-shadow: 0 0 10px var(--neon-green);
        }
        .glow-card {
          background: linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02));
          backdrop-filter: blur(6px);
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,0.06);
          box-shadow: 0 8px 30px rgba(0,0,0,0.5), 0 0 40px var(--neon-pink);
        }
        .char-glow {
          filter: drop-shadow(0 0 18px var(--neon-pink)) drop-shadow(0 0 28px var(--neon-green));
        }
        .fade-in {
          opacity: 0;
          transform: translateY(10px);
          animation: fadeIn 0.6s forwards;
        }
        .fade-in.delayed {
          animation-delay: 0.5s;
        }
        @keyframes fadeIn {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

      {/* TOP RIGHT CARD */}
      <div style={{ padding: isMobile ? 12 : 24, display: "flex", justifyContent: "flex-end" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "flex-end" }}>
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="glow-card"
            style={{
              padding: isMobile ? 8 : 14,
              textAlign: "right",
              minWidth: isMobile ? 140 : 260,
            }}
          >
            <Typography
              sx={{
                fontFamily: "Anton",
                fontSize: isMobile ? 26 : 46,
                lineHeight: 1.1,
              }}
              className="neon-title"
            >
              Gana hasta 1,000 DLLS
            </Typography>
            <Typography sx={{ fontSize: isMobile ? 20 : 28, color: "#dfffe9", textShadow: "0 0 10px var(--neon-green)" }}>
              diarios
            </Typography>
          </motion.div>

          <Button
            component={Link}
            to="/interhackaton"
            sx={{
              background: "linear-gradient(90deg,var(--neon-pink),var(--neon-green))",
              color: "#04110a",
              fontWeight: 800,
              borderRadius: 12,
              padding: isMobile ? "8px 14px" : "12px 22px",
              boxShadow: "0 12px 30px rgba(0,0,0,0.45), 0 0 30px rgba(255,20,147,0.12)",
              fontSize: isMobile ? 16 : 20,
            }}
          >
            Bases / Registro
          </Button>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div
        style={{
          width: "100%",
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          justifyContent: "space-between",
          alignItems: isMobile ? "center" : "flex-end",
          padding: isMobile ? "8px 18px 40px" : "24px 48px 20px",
          boxSizing: "border-box",
          gap: 20,
        }}
      >
        {/* LEFT SIDE IMAGE + OVERLAY TITLE */}
        <div
          style={{
            flex: isMobile ? "0 0 90%" : "0 0 40%",
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-start",
            position: "relative",
            flexDirection: "column",
            marginTop: isMobile ? 0 : "0",
          }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={characters[indexChar].key}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8 }}
              style={{
                position: "relative",
                width: "100%",
                display: "flex",
                justifyContent: "center",
              }}
            >
              <img
                src={characters[indexChar].img}
                alt={characters[indexChar].title}
                className="char-glow fade-in"
                style={{
                  width: isMobile ? "100%" : "75%",
                  height: "auto",
                  objectFit: "contain",
                  borderRadius: 12,
                  marginTop: 0,
                }}
              />
              <Typography
                variant="h6"
                className="neon-title"
                sx={{
                  position: "absolute",
                  bottom: "8%",
                  left: "50%",
                  transform: "translateX(-50%)",
                  fontSize: isMobile ? 22 : 36,
                  background: "rgba(0,0,0,0.4)",
                  padding: "6px 14px",
                  borderRadius: "10px",
                }}
              >
                {characters[indexChar].title}
              </Typography>
            </motion.div>
          </AnimatePresence>

          {/* NAV BUTTONS BELOW IMAGE */}
            <div
            style={{
                display: "flex",
                justifyContent: "center", // centra horizontalmente
                gap: 20,
                marginTop: 6, // mantienes la separación vertical actual
                marginLeft: "50%",
            }}
            >
            <Button
                variant="contained"
                onClick={() => setIndexChar((i) => (i - 1 + characters.length) % characters.length)}
                sx={{
                background: "#0a0a0a",
                border: "2px solid var(--neon-green)",
                color: "var(--neon-green)",
                minWidth: 56,
                height: 56,
                borderRadius: "50%",
                "&:hover": {
                    background: "var(--neon-green)",
                    color: "#000",
                },
                }}
            >
                ◀
            </Button>
            <Button
                variant="contained"
                onClick={() => setIndexChar((i) => (i + 1) % characters.length)}
                sx={{
                background: "#0a0a0a",
                border: "2px solid var(--neon-green)",
                color: "var(--neon-green)",
                minWidth: 56,
                height: 56,
                borderRadius: "50%",
                "&:hover": {
                    background: "var(--neon-green)",
                    color: "#000",
                },
                }}
            >
                ▶
            </Button>
            </div>

          {/* MOVED TEXT BELOW IMAGE (MOBILE ONLY) */}
          {isMobile && (
            <div
              className="glow-card"
              style={{
                marginTop: 24,
                padding: 14,
                width: "94%",
                textAlign: "center",
              }}
            >
              <Typography
                sx={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: "#f1fff6",
                }}
                className="neon-sub"
              >
                GRAN HACKATON INTERUNIVERSITARIO !!
              </Typography>

              <div style={{ marginTop: 10 }}>
                <Typography
                  sx={{
                    fontSize: 22,
                    fontWeight: 800,
                    lineHeight: 1.1,
                  }}
                  className="neon-title"
                >
                  Construyendo Juntos &nbsp;
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={rotatingInner[indexInner]}
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      transition={{ duration: 0.45 }}
                      style={{
                        display: "inline-block",
                        padding: "0 8px",
                        minWidth: 120,
                        textAlign: "center",
                      }}
                    >
                      {rotatingInner[indexInner]}
                    </motion.span>
                  </AnimatePresence>
                  &nbsp;del futuro
                </Typography>
              </div>

              <Typography
                sx={{
                  color: "#e7ffee",
                  opacity: 0.9,
                  marginTop: 2,
                  fontSize: 17,
                }}
              >
                Colabora con la Inteligencia Artificial Open Source y construyamos juntos soluciones sostenibles y tecnológicas para la nueva era.
              </Typography>
            </div>
          )}
        </div>

        {/* RIGHT SIDE TEXT (DESKTOP ONLY) */}
        {!isMobile && (
          <div
            style={{
              flex: "0 0 44%",
              display: "flex",
              justifyContent: "flex-end",
              alignItems: "center",
            }}
          >
            <div
              className="glow-card"
              style={{
                padding: 28,
                maxWidth: 720,
                textAlign: "right",
              }}
            >
              <Typography
                sx={{
                  fontSize: 26,
                  fontWeight: 700,
                  color: "#f1fff6",
                }}
                className="neon-sub"
              >
                GRAN HACKATON INTERUNIVERSITARIO !!
              </Typography>

              <div style={{ marginTop: 10 }}>
                <Typography
                  sx={{
                    fontSize: 42,
                    fontWeight: 800,
                    lineHeight: 1.1,
                  }}
                  className="neon-title"
                >
                  Construyendo Juntos &nbsp;
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={rotatingInner[indexInner]}
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      transition={{ duration: 0.45 }}
                      style={{
                        display: "inline-block",
                        padding: "0 8px",
                        minWidth: 120,
                        textAlign: "center",
                      }}
                    >
                      {rotatingInner[indexInner]}
                    </motion.span>
                  </AnimatePresence>
                  &nbsp;del futuro
                </Typography>
              </div>

              <Typography
                sx={{
                  color: "#e7ffee",
                  opacity: 0.9,
                  marginTop: 1,
                  fontSize: 20,
                }}
              >
                Colabora con la Inteligencia Artificial Open Source y construyamos juntos soluciones sostenibles y tecnológicas para la nueva era.
              </Typography>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
