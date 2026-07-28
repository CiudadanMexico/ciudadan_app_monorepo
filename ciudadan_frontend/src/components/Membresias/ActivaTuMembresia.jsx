import React from "react";
import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

import activGif from "../../assets/membresias/activatumembresia.gif";

/*
  NUEVA VERSIÓN CIUDADAN
  - Estética tecnológica / energética amarilla
  - Glow + partículas + líneas digitales
  - Inspiración: dashboard futurista / red comunitaria
*/

const Wrapper = styled(Box)(() => `
  position: relative;
  width: 100%;
  height: 100vh;
  overflow: hidden;
  background:
    radial-gradient(circle at top, rgba(255,242,0,0.18), transparent 30%),
    radial-gradient(circle at bottom right, rgba(255,242,0,0.12), transparent 35%),
    linear-gradient(180deg, #050505 0%, #101010 100%);
  display: flex;
  justify-content: center;
  align-items: center;
  isolation: isolate;
`);

/* GRID TECNOLÓGICO */

const GridBackground = styled(Box)(() => `
  position: absolute;
  inset: 0;
  z-index: 1;
  opacity: 0.16;
  background-image:
    linear-gradient(rgba(255,242,0,0.22) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,242,0,0.22) 1px, transparent 1px);
  background-size: 48px 48px;
`);

const GlowCircle = styled(motion.div)(({ size, top, left, delay }) => `
  position: absolute;
  width: ${size}px;
  height: ${size}px;
  border-radius: 50%;
  top: ${top};
  left: ${left};
  background: radial-gradient(circle, rgba(255,242,0,0.28), transparent 70%);
  filter: blur(18px);
  z-index: 2;
  pointer-events: none;
  animation: pulseGlow 6s ease-in-out infinite;
  animation-delay: ${delay}s;
`);

const FloatingLine = styled(motion.div)(({ top, width, delay }) => `
  position: absolute;
  top: ${top};
  left: -20%;
  width: ${width}px;
  height: 2px;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255,242,0,0.9),
    transparent
  );
  filter: blur(1px);
  z-index: 3;
  opacity: 0.7;
  animation: moveLine 8s linear infinite;
  animation-delay: ${delay}s;
`);

const GifContainer = styled(motion.div)(() => `
  position: relative;
  z-index: 20;
  display: flex;
  justify-content: center;
  align-items: center;
`);

const Gif = styled("img")(() => `
  width: auto;
  height: 82vh;
  max-width: 92vw;
  object-fit: contain;
  filter:
    drop-shadow(0 0 18px rgba(255,242,0,0.25))
    brightness(1.02)
    contrast(1.06);
  pointer-events: none;
  user-select: none;
`);

const NeonFrame = styled(Box)(() => `
  position: absolute;
  inset: -24px;
  border-radius: 36px;
  border: 2px solid rgba(255,242,0,0.35);
  box-shadow:
    0 0 25px rgba(255,242,0,0.22),
    inset 0 0 18px rgba(255,242,0,0.12);
  z-index: 19;
`);

const Overlay = styled(Box)(() => `
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at center, transparent 35%, rgba(0,0,0,0.72) 100%);
  z-index: 10;
  pointer-events: none;
`);

const Particle = styled(motion.div)(({ top, left, size, delay }) => `
  position: absolute;
  top: ${top};
  left: ${left};
  width: ${size}px;
  height: ${size}px;
  border-radius: 50%;
  background: #fff200;
  box-shadow: 0 0 12px rgba(255,242,0,0.9);
  z-index: 4;
  opacity: 0.85;
  animation: particleFloat 7s ease-in-out infinite;
  animation-delay: ${delay}s;
`);

const ButtonStyled = styled(motion.button)(() => `
  position: absolute;
  right: 3%;
  bottom: 6%;
  border: none;
  cursor: pointer;
  z-index: 100;

  background: linear-gradient(
    135deg,
    #fff200 0%,
    #ffd500 100%
  );

  color: #000;

  padding: 20px 52px;

  border-radius: 22px;

  font-size: clamp(18px, 2.2vw, 34px);
  font-weight: 900;

  text-transform: uppercase;
  letter-spacing: 2px;

  box-shadow:
    0 0 25px rgba(255,242,0,0.45),
    0 10px 40px rgba(255,242,0,0.25);

  transition: all 0.3s ease;

  font-family: "Inter", sans-serif;
`);

const FloatingBadge = styled(motion.div)(() => `
  position: absolute;
  top: 5%;
  left: 5%;
  z-index: 30;

  background: rgba(255,242,0,0.12);

  border: 1px solid rgba(255,242,0,0.4);

  color: #fff200;

  padding: 12px 22px;

  border-radius: 999px;

  backdrop-filter: blur(10px);

  font-weight: 800;
  font-size: 15px;
  letter-spacing: 1px;

  box-shadow:
    0 0 18px rgba(255,242,0,0.16);
`);

const GlobalStyles = styled("style")(() => ({
  children: `
  
    @keyframes pulseGlow {
      0% {
        transform: scale(1);
        opacity: 0.5;
      }
      50% {
        transform: scale(1.15);
        opacity: 1;
      }
      100% {
        transform: scale(1);
        opacity: 0.5;
      }
    }

    @keyframes moveLine {
      0% {
        transform: translateX(0);
        opacity: 0;
      }
      15% {
        opacity: 1;
      }
      85% {
        opacity: 1;
      }
      100% {
        transform: translateX(140vw);
        opacity: 0;
      }
    }

    @keyframes particleFloat {
      0% {
        transform: translateY(0px);
        opacity: 0.4;
      }
      50% {
        transform: translateY(-24px);
        opacity: 1;
      }
      100% {
        transform: translateY(0px);
        opacity: 0.4;
      }
    }

  `
}));

export default function ActivaTuMembresia() {

  const navigate = useNavigate();

  return (
    <Wrapper>

      <GlobalStyles />

      <GridBackground />

      <Overlay />

      {/* Glow circles */}
      <GlowCircle size={420} top="-8%" left="-5%" delay={0} />
      <GlowCircle size={320} top="60%" left="78%" delay={2} />
      <GlowCircle size={260} top="18%" left="82%" delay={4} />

      {/* Líneas digitales */}
      <FloatingLine top="18%" width={420} delay={0} />
      <FloatingLine top="38%" width={280} delay={2} />
      <FloatingLine top="72%" width={500} delay={4} />

      {/* Partículas */}
      <Particle top="22%" left="16%" size={8} delay={0} />
      <Particle top="66%" left="22%" size={10} delay={2} />
      <Particle top="32%" left="80%" size={7} delay={4} />
      <Particle top="78%" left="72%" size={12} delay={1} />
      <Particle top="12%" left="56%" size={6} delay={3} />

      <FloatingBadge
        animate={{
          y: [0, -8, 0]
        }}
        transition={{
          duration: 4,
          repeat: Infinity
        }}
      >
        ✨ RED COOPERATIVA DIGITAL
      </FloatingBadge>

      {/* GIF principal */}
      <GifContainer
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{
          duration: 0.9
        }}
      >

        <NeonFrame />

        <Gif
          src={activGif}
          alt="Activa tu membresía"
        />

      </GifContainer>

      {/* BOTÓN */}
      <ButtonStyled
        whileHover={{
          scale: 1.06,
          rotate: -2
        }}
        whileTap={{
          scale: 0.96
        }}
        onClick={() => navigate("/membresias")}
      >
        ACTIVAR AHORA
      </ButtonStyled>

    </Wrapper>
  );
}