// src/components/Comunidad/Comunidad.jsx
// Bienvenida real de /comunidad — 4 escenas con las imágenes oficiales
// (comunidad_asamblea.png y comunidad_soberania.png) recuperadas de la rama
// de pictures. Mismo lenguaje de diseño que las páginas hermanas del funnel
// de comunidad (CrearComunidad.jsx / IntegrarmeComunidad.jsx): Space Grotesk,
// acentos verde/turquesa/amarillo/morado, revelados con framer-motion,
// CTAs pill y patrón closeTopBar. Español primero.
import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Box,
  Button,
  Chip,
  Container,
  Grid,
  Stack,
  Typography,
} from "@mui/material";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import HubRoundedIcon from "@mui/icons-material/HubRounded";
import CampaignRoundedIcon from "@mui/icons-material/CampaignRounded";
import asambleaImg from "../../assets/comunidad_asamblea.png";
import soberaniaImg from "../../assets/comunidad_soberania.png";
import { WHATSAPP_COMUNIDAD } from "../../services/prelanzamientoService";

const HERO_FONT = '"Space Grotesk", "Poppins", system-ui, sans-serif';
const VERDE = "#19d79c";
const VERDE_HOVER = "#15c98f";
const TURQUESA = "#2ee6c8";
const AMARILLO = "#ffe066";
const MORADO = "#8A5CF5";
const OSCURO = "#07120f";
const WHATSAPP_VERDE = "#25D366";

const sxBody = {
  fontSize: { xs: "1rem", md: "1.12rem" },
  lineHeight: 1.7,
};

// Revelado con scroll-trigger (mismo patrón que el resto del funnel)
function Reveal({ children, delay = 0, fullHeight = false }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.6, delay, ease: "easeOut" }}
      style={fullHeight ? { height: "100%" } : undefined}
    >
      {children}
    </motion.div>
  );
}

// Escena 2 — cómo vive la comunidad día a día
const VIDA_COMUNIDAD = [
  {
    icon: <GroupsRoundedIcon fontSize="large" />,
    color: TURQUESA,
    title: "Asambleas por áreas",
    text: "Reúnete y organízate con personas de tu comunidad y de tu área de conocimiento: Interuniversitarias diarias y Generales los fines de semana.",
  },
  {
    icon: <HubRoundedIcon fontSize="large" />,
    color: AMARILLO,
    title: "Proyectos y colaboración",
    text: "Aporta proyectos, encuentra colaboración e incorpórate como socio de la red para trabajar en el CoWork con laborys.",
  },
  {
    icon: <CampaignRoundedIcon fontSize="large" />,
    color: MORADO,
    title: "Avisos y difusión",
    text: "Entérate de convocatorias, cursos y programas, y difunde lo que tu comunidad está construyendo.",
  },
];

// Escena 4 — los tres caminos de participación
const CAMINOS = [
  {
    icon: <WhatsAppIcon fontSize="large" />,
    color: TURQUESA,
    title: "Únete por WhatsApp",
    text: "Entra hoy mismo a la comunidad: asambleas, avisos y programas de la red.",
    href: WHATSAPP_COMUNIDAD,
    cta: "Entrar al grupo",
  },
  {
    icon: <GroupsRoundedIcon fontSize="large" />,
    color: VERDE,
    title: "Integrarme a una agencia",
    text: "Súmate como socio-becario a una comunidad que ya está construyendo.",
    to: "/integrarme-comunidad",
    cta: "Integrarme",
  },
  {
    icon: <HubRoundedIcon fontSize="large" />,
    color: MORADO,
    title: "Crear mi comunidad",
    text: "Construye tu propia agencia o nodo autónomo dentro de la red Ciudadan.",
    to: "/crear-comunidad",
    cta: "Crear comunidad",
  },
];

export default function Comunidad() {
  const navigate = useNavigate();

  useEffect(() => {
    // Patrón de las páginas hermanas del funnel: cierra la barra superior.
    window.dispatchEvent(new Event("closeTopBar"));
  }, []);

  const irAIntegrarme = () => navigate("/integrarme-comunidad");
  const irAlMural = () => navigate("/comunidad/feed");

  return (
    <Box sx={{ bgcolor: "#f7faf8", color: "text.primary", overflowX: "clip" }}>
      {/* ================= ESCENA 1 — Hero / Asamblea ================= */}
      <Box
        sx={{
          position: "relative",
          overflow: "hidden",
          bgcolor: OSCURO,
          color: "#fff",
          px: { xs: 2.5, md: 6 },
          py: { xs: 8, md: 12 },
        }}
      >
        <Box
          component="img"
          src={asambleaImg}
          alt="Asamblea de la red Ciudadan: la comunidad reunida"
          sx={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center",
            filter: "saturate(1.05) contrast(1.04)",
          }}
        />
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(circle at 18% 22%, rgba(46,230,200,0.14) 0%, rgba(0,0,0,0) 42%), linear-gradient(90deg, rgba(5,10,8,0.94) 0%, rgba(5,10,8,0.8) 40%, rgba(5,10,8,0.5) 68%, rgba(5,10,8,0.28) 100%), linear-gradient(180deg, rgba(5,10,8,0.25) 0%, rgba(5,10,8,0.6) 100%)",
          }}
        />
        <Container maxWidth="lg" sx={{ position: "relative" }}>
          <Stack spacing={2.5} sx={{ maxWidth: 860 }}>
            <Reveal>
              <Chip
                label="Cooperativismo 6.0 · Citocracia"
                variant="outlined"
                sx={{
                  alignSelf: "flex-start",
                  fontFamily: HERO_FONT,
                  fontWeight: 700,
                  color: "#eafff5",
                  borderColor: "rgba(255,255,255,0.35)",
                  bgcolor: "rgba(0,0,0,0.24)",
                }}
              />
            </Reveal>
            <Reveal delay={0.05}>
              <Typography
                variant="h1"
                sx={{
                  fontFamily: HERO_FONT,
                  fontWeight: 700,
                  letterSpacing: "-0.03em",
                  lineHeight: 1.02,
                  fontSize: { xs: "2.3rem", sm: "3rem", md: "4rem" },
                }}
              >
                Únete desde tu comunidad a la Red Ciudadan
              </Typography>
            </Reveal>
            <Reveal delay={0.1}>
              <Typography
                sx={{
                  ...sxBody,
                  fontSize: { xs: "1.05rem", md: "1.22rem" },
                  lineHeight: 1.65,
                  color: "rgba(255,255,255,0.9)",
                }}
              >
                Participa en el futuro hoy con{" "}
                <Box component="span" sx={{ fontWeight: 800, color: VERDE }}>
                  Ciudadan
                </Box>
                , el{" "}
                <Box component="span" sx={{ fontWeight: 800, color: VERDE }}>
                  Cooperativismo 6.0
                </Box>{" "}
                y la{" "}
                <Box component="span" sx={{ fontWeight: 800, color: VERDE }}>
                  Citocracia
                </Box>
                . Conoce a más personas y los diversos programas uniéndote a la
                comunidad de WhatsApp, desde donde además podrás participar en
                las{" "}
                <Box component="span" sx={{ fontWeight: 800, color: AMARILLO }}>
                  Asambleas Interuniversitarias
                </Box>{" "}
                que se realizan diariamente por Zoom de 10 a 12 hrs y de 20 a 22
                hrs (MEX), de lunes a viernes.
              </Typography>
            </Reveal>
            <Reveal delay={0.15}>
              <Typography sx={{ ...sxBody, color: "rgba(255,255,255,0.78)" }}>
                Además, disfruta de las{" "}
                <Box component="span" sx={{ fontWeight: 800, color: TURQUESA }}>
                  Asambleas Generales
                </Box>{" "}
                los sábados y domingos a las 14:00 hrs (MEX).
              </Typography>
            </Reveal>
            <Reveal delay={0.2}>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ pt: 1.5 }}>
                <Button
                  variant="contained"
                  size="large"
                  href={WHATSAPP_COMUNIDAD}
                  target="_blank"
                  rel="noopener noreferrer"
                  startIcon={<WhatsAppIcon />}
                  sx={{
                    px: 3.5,
                    py: 1.6,
                    borderRadius: 999,
                    fontFamily: HERO_FONT,
                    fontWeight: 700,
                    bgcolor: VERDE,
                    color: "#072015",
                    boxShadow: "0 12px 30px rgba(25,215,156,0.3)",
                    "&:hover": { bgcolor: VERDE_HOVER },
                  }}
                >
                  Únete por WhatsApp
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  onClick={irAIntegrarme}
                  endIcon={<ArrowForwardRoundedIcon />}
                  sx={{
                    px: 3.5,
                    py: 1.6,
                    borderRadius: 999,
                    fontFamily: HERO_FONT,
                    fontWeight: 700,
                    color: "#fff",
                    borderColor: "rgba(255,255,255,0.5)",
                    bgcolor: "rgba(0,0,0,0.25)",
                    "&:hover": {
                      borderColor: VERDE,
                      color: VERDE,
                      bgcolor: "rgba(0,0,0,0.35)",
                    },
                  }}
                >
                  Integrarme a una agencia
                </Button>
              </Stack>
            </Reveal>
          </Stack>
        </Container>
      </Box>

      {/* ================= ESCENA 2 — La vida en la comunidad ================= */}
      <Box
        sx={{
          bgcolor: "#ffffff",
          py: { xs: 7, md: 10 },
          borderTop: "1px solid",
          borderColor: "divider",
        }}
      >
        <Container maxWidth="lg">
          <Reveal>
            <Chip
              label="La vida en comunidad"
              color="success"
              variant="outlined"
              sx={{ fontWeight: 700, mb: 2 }}
            />
            <Typography
              variant="h3"
              sx={{
                fontFamily: HERO_FONT,
                fontWeight: 700,
                lineHeight: 1.12,
                letterSpacing: "-0.02em",
                fontSize: { xs: "1.9rem", md: "2.6rem" },
                maxWidth: 780,
              }}
            >
              Una comunidad que trabaja, aprende y decide junta
            </Typography>
            <Typography
              sx={{ mt: 2, ...sxBody, color: "text.secondary", maxWidth: 760 }}
            >
              La comunidad de WhatsApp es el punto de encuentro diario de la
              red: ahí se comparten los programas, los avisos y la organización
              de las asambleas. Así vive la comunidad todos los días.
            </Typography>
          </Reveal>
          <Grid container spacing={2.5} sx={{ mt: 5 }}>
            {VIDA_COMUNIDAD.map((item) => (
              <Grid item xs={12} sm={4} key={item.title}>
                <Reveal fullHeight delay={0.05}>
                  <Box
                    sx={{
                      height: "100%",
                      border: "1px solid",
                      borderColor: "divider",
                      borderRadius: 3,
                      px: 2.5,
                      py: 3,
                      bgcolor: "#f7faf8",
                    }}
                  >
                    <Stack
                      direction="row"
                      spacing={1.5}
                      alignItems="center"
                      sx={{ mb: 1.5 }}
                    >
                      <Box sx={{ color: item.color }}>{item.icon}</Box>
                      <Typography
                        sx={{ fontFamily: HERO_FONT, fontWeight: 700, fontSize: "1.05rem" }}
                      >
                        {item.title}
                      </Typography>
                    </Stack>
                    <Typography
                      variant="body2"
                      sx={{ color: "text.secondary", lineHeight: 1.7 }}
                    >
                      {item.text}
                    </Typography>
                  </Box>
                </Reveal>
              </Grid>
            ))}
          </Grid>
          <Reveal delay={0.1}>
            <Stack alignItems="center" sx={{ mt: 5 }}>
              <Button
                variant="contained"
                size="large"
                href={WHATSAPP_COMUNIDAD}
                target="_blank"
                rel="noopener noreferrer"
                startIcon={<WhatsAppIcon />}
                sx={{
                  px: 3.5,
                  py: 1.6,
                  borderRadius: 999,
                  fontFamily: HERO_FONT,
                  fontWeight: 700,
                  bgcolor: WHATSAPP_VERDE,
                  color: "#06210f",
                  boxShadow: "0 12px 30px rgba(37,211,102,0.32)",
                  "&:hover": { bgcolor: "#1fbf5b" },
                }}
              >
                Entrar al grupo de WhatsApp
              </Button>
            </Stack>
          </Reveal>
        </Container>
      </Box>

      {/* ================= ESCENA 3 — Soberanía ================= */}
      <Box sx={{ bgcolor: OSCURO, color: "#fff", py: { xs: 7, md: 10 } }}>
        <Container maxWidth="lg">
          <Grid container spacing={6} alignItems="center">
            <Grid item xs={12} md={6}>
              <Reveal>
                <Chip
                  label="Soberanía comunitaria"
                  variant="outlined"
                  sx={{
                    fontWeight: 700,
                    color: "#eafff5",
                    borderColor: "rgba(46,230,200,0.45)",
                    bgcolor: "rgba(0,0,0,0.24)",
                    mb: 2,
                  }}
                />
                <Typography
                  variant="h3"
                  sx={{
                    fontFamily: HERO_FONT,
                    fontWeight: 700,
                    lineHeight: 1.12,
                    letterSpacing: "-0.02em",
                    fontSize: { xs: "1.9rem", md: "2.6rem" },
                  }}
                >
                  Las decisiones se toman en asamblea
                </Typography>
                <Typography
                  sx={{ mt: 2.5, ...sxBody, color: "rgba(255,255,255,0.82)" }}
                >
                  En las Asambleas podrás encontrarte y organizarte con
                  personas de tu comunidad, así como por áreas de conocimiento.
                </Typography>
                <Typography
                  sx={{ mt: 1.5, ...sxBody, color: "rgba(255,255,255,0.72)" }}
                >
                  La soberanía de la red no vive en un servidor: vive en la
                  gente. Incorpórate como socio, aporta proyectos, encuentra
                  colaboración y mucho más.
                </Typography>
              </Reveal>
            </Grid>
            <Grid item xs={12} md={6}>
              <Reveal delay={0.1}>
                <Box
                  component="img"
                  src={soberaniaImg}
                  alt="Soberanía comunitaria: la red Ciudadan decide en asamblea"
                  sx={{
                    width: "100%",
                    height: "auto",
                    borderRadius: 4,
                    border: "1px solid rgba(46,230,200,0.25)",
                    boxShadow: "0 24px 60px rgba(0,0,0,0.45)",
                  }}
                />
              </Reveal>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* ============ ESCENA 4 — ¿Cómo quieres participar? ============ */}
      <Box
        sx={{
          position: "relative",
          overflow: "hidden",
          bgcolor: OSCURO,
          color: "#fff",
          py: { xs: 8, md: 11 },
          textAlign: "center",
        }}
      >
        <Box
          component="img"
          src={soberaniaImg}
          alt=""
          aria-hidden="true"
          sx={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center",
            filter: "blur(2px)",
          }}
        />
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(180deg, rgba(5,10,8,0.9) 0%, rgba(5,10,8,0.82) 55%, rgba(5,10,8,0.94) 100%)",
          }}
        />
        <Container maxWidth="md" sx={{ position: "relative" }}>
          <Reveal>
            <Typography
              variant="h3"
              sx={{
                fontFamily: HERO_FONT,
                fontWeight: 700,
                letterSpacing: "-0.02em",
                lineHeight: 1.1,
                fontSize: { xs: "2rem", md: "3rem" },
              }}
            >
              ¿Cómo quieres participar?
            </Typography>
            <Typography
              sx={{
                mt: 2,
                mx: "auto",
                maxWidth: 560,
                fontSize: { xs: "1rem", md: "1.15rem" },
                lineHeight: 1.7,
                color: "rgba(255,255,255,0.8)",
              }}
            >
              Hay lugar para quienes quieren sumarse hoy y para quienes quieren
              construir su propia comunidad.
            </Typography>
          </Reveal>
          <Grid container spacing={2.5} sx={{ mt: 5 }}>
            {CAMINOS.map((camino) => (
              <Grid item xs={12} sm={4} key={camino.title}>
                <Reveal fullHeight delay={0.05}>
                  <Box
                    sx={{
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      border: `1px solid ${camino.color}55`,
                      borderRadius: 3,
                      px: 2.5,
                      py: 3,
                      bgcolor: "rgba(0,0,0,0.35)",
                    }}
                  >
                    <Box sx={{ color: camino.color, mb: 1 }}>{camino.icon}</Box>
                    <Typography
                      sx={{ fontFamily: HERO_FONT, fontWeight: 700, fontSize: "1.05rem" }}
                    >
                      {camino.title}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        mt: 1,
                        color: "rgba(255,255,255,0.75)",
                        lineHeight: 1.65,
                        flexGrow: 1,
                      }}
                    >
                      {camino.text}
                    </Typography>
                    <Button
                      variant="outlined"
                      sx={{
                        mt: 2.5,
                        borderRadius: 999,
                        fontFamily: HERO_FONT,
                        fontWeight: 700,
                        color: camino.color,
                        borderColor: `${camino.color}88`,
                        "&:hover": {
                          borderColor: camino.color,
                          bgcolor: "rgba(0,0,0,0.45)",
                        },
                      }}
                      {...(camino.href
                        ? {
                            href: camino.href,
                            target: "_blank",
                            rel: "noopener noreferrer",
                          }
                        : { onClick: () => navigate(camino.to) })}
                    >
                      {camino.cta}
                    </Button>
                  </Box>
                </Reveal>
              </Grid>
            ))}
          </Grid>
          <Reveal delay={0.15}>
            <Button
              variant="text"
              onClick={irAlMural}
              sx={{
                mt: 5,
                color: "rgba(255,255,255,0.66)",
                fontFamily: HERO_FONT,
                fontWeight: 700,
                "&:hover": { color: VERDE, bgcolor: "transparent" },
              }}
            >
              ¿Ya eres socio? Entra al mural de la comunidad →
            </Button>
          </Reveal>
        </Container>
      </Box>
    </Box>
  );
}
