// src/components/Home/HeroPrincipal.jsx
// Hero principal del home — restaurado idéntico a como se veía antes en
// HomeRoute.jsx, ahora como componente aparte (mismo patrón que HeroIntroGlow).
import React from "react";
import { motion } from "framer-motion";
import {
  Box,
  Button,
  Card,
  Chip,
  Container,
  Grid,
  Stack,
  Typography,
} from "@mui/material";
import { keyframes } from "@mui/system";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import ParkRoundedIcon from "@mui/icons-material/ParkRounded";
import ciudadanCompleto from "../../assets/ciudadanCompleto.jpg";
import heroCommunityImage from "../../assets/heroCommunityImage.png";

// Tipografía del hero: Space Grotesk — geométrica-humanista con carácter técnico,
// va con el mensaje eco-futurista y cooperativo del ecosistema (y convive bien
// con las fuentes tech ya cargadas como Orbitron).
const HERO_FONT = '"Space Grotesk", "Poppins", system-ui, sans-serif';

// La imagen original que te encanta debe ser esta: la del estilo eco-village/robots/personas.


const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0 },
};

const sectionVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

// ----- Efecto neón: luces amarilla y turquesa que atraviesan las letras -----
// El gradiente DIAGONAL (base blanca con bandas neón) se desplaza en diagonal
// sobre el texto recortado (background-clip: text). Los recorridos en X e Y son
// múltiplos exactos del tamaño del patrón (backgroundSize 200% 200% + repeat),
// así el barrido diagonal es continuo y sin salto al reiniciar el ciclo.
const neonSweep = keyframes`
  0% { background-position: 200% 0%; }
  100% { background-position: -200% 200%; }
`;

// Brillo neón pulsante alrededor de las letras (drop-shadow usa los píxeles
// ya recortados por el texto, a diferencia de text-shadow que se vería como
// una mancha detrás del relleno transparente).
const neonPulse = keyframes`
  0%, 100% {
    filter: drop-shadow(0 0 5px rgba(255,224,102,0.16)) drop-shadow(0 0 12px rgba(45,230,200,0.1));
  }
  50% {
    filter: drop-shadow(0 0 7px rgba(255,224,102,0.3)) drop-shadow(0 0 18px rgba(45,230,200,0.2));
  }
`;

/**
 * HeroPrincipal — hero a pantalla completa del home.
 * Imagen original a pantalla completa en desktop, tablet y mobile.
 */
export default function HeroPrincipal({
  eyebrow = "Cooperativismo 6.0",
  title = "Gestiona o sé parte de comunidades sustentables que producen, comercializan y avanzan cooperativamente",
  subtitle = "Tecnología abierta, Labory, economía colaborativa 6.0, asambleas virtuales y redes productivas para que socios, conductores, fundadores e inversionistas construyan autonomía real.",
  primaryAction = "Crear una Comunidad",
  secondaryAction = "Integrarme a una Comunidad",
  tertiaryAction = "Usar Labory",
  tags = [
    "Comunidades autónomas",
    "Economía colaborativa 6.0",
    "Movilidad cooperativa",
    "Asambleas virtuales",
  ],
  heroImage = ciudadanCompleto,
  heroImageAlt = "Comunidad ecofuturista original para el hero principal",
  cardImage = heroCommunityImage,
  cardImageAlt = "Imagen secundaria del ecosistema CIUDADAN",
}) {
  return (
    <Box
      sx={{
        position: "relative",
        overflow: "hidden",
        minHeight: { xs: "auto", md: "100svh" },
        display: "flex",
        alignItems: "stretch",
        bgcolor: "#07120f",
      }}
    >
      <Box
        component="img"
        src={heroImage}
        alt={heroImageAlt}
        sx={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: { xs: "center center", md: "center center" },
          filter: "saturate(1.04) contrast(1.05)",
        }}
      />

      <Box
        sx={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(90deg, rgba(5,10,8,0.92) 0%, rgba(5,10,8,0.78) 34%, rgba(5,10,8,0.48) 60%, rgba(5,10,8,0.2) 100%)",
        }}
      />

      <Box
        sx={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 20% 18%, rgba(0,255,170,0.22) 0%, rgba(0,255,170,0.06) 18%, rgba(0,0,0,0) 42%), radial-gradient(circle at 78% 22%, rgba(77,255,196,0.16) 0%, rgba(0,0,0,0) 30%), linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(0,0,0,0.18) 100%)",
          mixBlendMode: "screen",
          pointerEvents: "none",
        }}
      />

      <Container maxWidth="xl" sx={{ position: "relative", zIndex: 1, py: { xs: 3, md: 5 } }}>
        <Grid container spacing={3} alignItems="center" sx={{ minHeight: { xs: "auto", md: "100svh" } }}>
          <Grid item xs={12} md={7} lg={6}>
            <motion.div initial="hidden" animate="visible" variants={sectionVariants}>
              <Stack spacing={2.3}>
                <motion.div variants={fadeUp}>
                 
                </motion.div>

                <motion.div variants={fadeUp}>
                  <Typography
                    variant="h1"
                    sx={{
                      fontFamily: HERO_FONT,
                      fontWeight: 700,
                      lineHeight: 0.96,
                      letterSpacing: "-0.03em",
                      fontSize: { xs: "2.35rem", sm: "3.45rem", md: "4.7rem" },
                      maxWidth: 760,
                      background:
                        "linear-gradient(135deg, #ffffff 0%, rgba(255,232,160,0.5) 15%, #ffffff 25%, rgba(150,238,222,0.45) 46%, #ffffff 55%, rgba(255,232,160,0.4) 80%, #ffffff 100%)",
                      backgroundSize: "200% 200%",
                      WebkitBackgroundClip: "text",
                      backgroundClip: "text",
                      color: "transparent",
                      WebkitTextFillColor: "transparent",
                      animation: `${neonSweep} 18s linear infinite, ${neonPulse} 5s ease-in-out infinite`,
                      "@media (prefers-reduced-motion: reduce)": {
                        animation: "none",
                        color: "#ffffff",
                        WebkitTextFillColor: "#ffffff",
                      },
                    }}
                  >
                    {title}
                  </Typography>
                </motion.div>

                <motion.div variants={fadeUp}>
                  <Typography
                    variant="h6"
                    sx={{
                      fontFamily: HERO_FONT,
                      fontWeight: 400,
                      lineHeight: 1.6,
                      fontSize: { xs: "1rem", md: "1.18rem" },
                      maxWidth: 720,
                      background:
                        "linear-gradient(135deg, rgba(241,255,250,0.92) 0%, rgba(255,236,180,0.5) 20%, rgba(241,255,250,0.92) 32%, rgba(170,240,225,0.45) 54%, rgba(241,255,250,0.92) 70%, rgba(255,236,180,0.4) 90%, rgba(241,255,250,0.92) 100%)",
                      backgroundSize: "200% 200%",
                      WebkitBackgroundClip: "text",
                      backgroundClip: "text",
                      color: "transparent",
                      WebkitTextFillColor: "transparent",
                      animation: `${neonSweep} 26s linear infinite, ${neonPulse} 7s ease-in-out infinite`,
                      "@media (prefers-reduced-motion: reduce)": {
                        animation: "none",
                        color: "rgba(255,255,255,0.9)",
                        WebkitTextFillColor: "rgba(255,255,255,0.9)",
                      },
                    }}
                  >
                    {subtitle}
                  </Typography>
                </motion.div>

                <motion.div variants={fadeUp}>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} useFlexGap flexWrap="wrap">
                    <Button
                      variant="contained"
                      size="large"
                      endIcon={<ArrowForwardRoundedIcon />}
                      sx={{
                        px: 2.8,
                        py: 1.45,
                        borderRadius: 999,
                        fontFamily: HERO_FONT,
                        fontWeight: 700,
                        bgcolor: "#19d79c",
                        color: "#072015",
                        boxShadow: "0 12px 30px rgba(25,215,156,0.28)",
                        "&:hover": { bgcolor: "#15c98f" },
                      }}
                    >
                      {primaryAction}
                    </Button>
                    <Button
                      variant="contained"
                      size="large"
                      sx={{
                        px: 2.8,
                        py: 1.45,
                        borderRadius: 999,
                        fontFamily: HERO_FONT,
                        fontWeight: 700,
                        color: "#fff",
                        bgcolor: "#0d120f",
                        border: "1px solid rgba(255,255,255,0.22)",
                        boxShadow: "0 12px 30px rgba(0,0,0,0.35)",
                        "&:hover": { bgcolor: "#000000", borderColor: "rgba(255,255,255,0.4)" },
                      }}
                    >
                      {secondaryAction}
                    </Button>
                    <Button
                      variant="contained"
                      size="large"
                      sx={{
                        px: 2.8,
                        py: 1.45,
                        borderRadius: 999,
                        fontFamily: HERO_FONT,
                        fontWeight: 700,
                        color: "#fff",
                        bgcolor: "#8A5CF5",
                        boxShadow: "0 12px 30px rgba(138,92,245,0.35)",
                        "&:hover": { bgcolor: "#6A3FCB" },
                      }}
                    >
                      {tertiaryAction}
                    </Button>
                  </Stack>
                </motion.div>

                <motion.div variants={fadeUp}>
                  <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ pt: 0.5 }}>
                    {tags.map((item) => (
                      <Chip
                        key={item}
                        label={item}
                        sx={{
                          fontFamily: HERO_FONT,
                          fontWeight: 700,
                          bgcolor: "rgba(255,255,255,0.12)",
                          color: "#fff",
                          border: "1px solid rgba(255,255,255,0.18)",
                          backdropFilter: "blur(10px)",
                        }}
                      />
                    ))}
                  </Stack>
                </motion.div>
              </Stack>
            </motion.div>
          </Grid>

          <Grid item xs={12} md={5} lg={6}>
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.7, ease: "easeOut" }}
            >
              <Card
                sx={{
                  borderRadius: 6,
                  overflow: "hidden",
                  bgcolor: "rgba(255,255,255,0.08)",
                  backdropFilter: "blur(12px)",
                  border: "1px solid rgba(255,255,255,0.14)",
                  boxShadow: "0 22px 60px rgba(0,0,0,0.28)",
                }}
                elevation={0}
              >
                <Box sx={{ p: { xs: 1.6, md: 2.2 } }}>
                  <Typography sx={{ color: "rgba(255,255,255,0.88)", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", fontSize: 12, mb: 1.6 }}>
                    Cooperativismo 6.0
                  </Typography>
                  <Box
                    sx={{
                      position: "relative",
                      borderRadius: 5,
                      overflow: "hidden",
                      minHeight: { xs: 230, sm: 320, md: 430 },
                    }}
                  >
                    <Box
                      component="img"
                      src={cardImage}
                      alt={cardImageAlt}
                      sx={{ width: "100%", height: "100%", minHeight: { xs: 230, sm: 320, md: 430 }, objectFit: "cover", display: "block" }}
                    />
                    <Box
                      sx={{
                        position: "absolute",
                        inset: 0,
                        background:
                          "linear-gradient(180deg, rgba(0,0,0,0.02) 0%, rgba(0,0,0,0.06) 45%, rgba(0,0,0,0.52) 100%)",
                      }}
                    />
                    <Box sx={{ position: "absolute", left: 16, right: 16, bottom: 16 }}>
                      <Typography variant="h6" sx={{ color: "#fff", fontWeight: 900, lineHeight: 1.05, textShadow: "0 2px 16px rgba(0,0,0,0.45)" }}>
                        Comunidad + producción + comercialización + tecnología
                      </Typography>
                      <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.9)", mt: 0.8, textShadow: "0 2px 12px rgba(0,0,0,0.4)" }}>
                        Esta imagen va después del hero, dentro del bloque visual con tarjetas breves.
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </Card>
            </motion.div>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
