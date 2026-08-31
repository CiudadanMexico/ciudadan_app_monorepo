// src/Pages/IntegrarmeComunidad.jsx
// Landing "Integrate a una comunidad Ciudadan": el usuario se incorpora como
// socio-becario de una agencia existente. Todos los CTAs principales llevan a
// /comunidades (página que consultará las comunidades disponibles).
import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Grid,
  Stack,
  Typography,
} from "@mui/material";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import CodeRoundedIcon from "@mui/icons-material/CodeRounded";
import PaletteRoundedIcon from "@mui/icons-material/PaletteRounded";
import MovieRoundedIcon from "@mui/icons-material/MovieRounded";
import SmartToyRoundedIcon from "@mui/icons-material/SmartToyRounded";
import CampaignRoundedIcon from "@mui/icons-material/CampaignRounded";
import ShoppingCartRoundedIcon from "@mui/icons-material/ShoppingCartRounded";
import ForumRoundedIcon from "@mui/icons-material/ForumRounded";
import StorefrontRoundedIcon from "@mui/icons-material/StorefrontRounded";
import AdminPanelSettingsRoundedIcon from "@mui/icons-material/AdminPanelSettingsRounded";
import SchoolRoundedIcon from "@mui/icons-material/SchoolRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import WorkRoundedIcon from "@mui/icons-material/WorkRounded";
import HandymanRoundedIcon from "@mui/icons-material/HandymanRounded";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import HubRoundedIcon from "@mui/icons-material/HubRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import heroCommunityImage from "../assets/heroCommunityImage.png";

const HERO_FONT = '"Space Grotesk", "Poppins", system-ui, sans-serif';
const VERDE = "#19d79c";
const VERDE_HOVER = "#15c98f";
const MORADO = "#8A5CF5";
const TURQUESA = "#2ee6c8";
const AMARILLO = "#ffe066";
const OSCURO = "#0b1512";

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0 },
};


// Reveal genérico: anima al entrar en viewport (scroll trigger)
function Reveal({ children, delay = 0, style }) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      variants={fadeUp}
      transition={{ duration: 0.6, delay }}
      style={style}
    >
      {children}
    </motion.div>
  );
}

const bodySx = {
  color: "text.secondary",
  lineHeight: 1.7,
  fontSize: { xs: "1rem", md: "1.08rem" },
};

function navigateTo(navigate, path) {
  return () => navigate(path);
}

// Botón principal (verde neón)
function CtaVerde({ children, onClick, sx = {} }) {
  return (
    <Button
      variant="contained"
      onClick={onClick}
      endIcon={<ArrowForwardRoundedIcon />}
      sx={{
        px: 3,
        py: 1.4,
        borderRadius: 999,
        fontFamily: HERO_FONT,
        fontWeight: 700,
        bgcolor: VERDE,
        color: "#072015",
        boxShadow: "0 12px 30px rgba(25,215,156,0.28)",
        "&:hover": { bgcolor: VERDE_HOVER },
        ...sx,
      }}
    >
      {children}
    </Button>
  );
}

// Áreas donde puedes aportar (sección 4)
const AREAS = [
  { icon: <CodeRoundedIcon fontSize="large" />, title: "Programación", text: "Web, aplicaciones, APIs, automatización y software." },
  { icon: <PaletteRoundedIcon fontSize="large" />, title: "Diseño", text: "Diseño gráfico, UI/UX, identidad y comunicación visual." },
  { icon: <MovieRoundedIcon fontSize="large" />, title: "Multimedia", text: "Video, edición, audio, animación y producción audiovisual." },
  { icon: <SmartToyRoundedIcon fontSize="large" />, title: "Inteligencia artificial", text: "Generación de contenido, automatización, agentes y herramientas de IA." },
  { icon: <CampaignRoundedIcon fontSize="large" />, title: "Marketing", text: "Redes sociales, campañas, SEO, publicidad y estrategia digital." },
  { icon: <ShoppingCartRoundedIcon fontSize="large" />, title: "E-commerce", text: "Tiendas digitales, catálogos y soluciones para negocios." },
  { icon: <ForumRoundedIcon fontSize="large" />, title: "Chatbots", text: "Automatización de atención y comunicación con clientes." },
  { icon: <StorefrontRoundedIcon fontSize="large" />, title: "Ventas", text: "Comercialización de servicios y membresías de la agencia." },
  { icon: <AdminPanelSettingsRoundedIcon fontSize="large" />, title: "Administración", text: "Organización, operación, proyectos y atención a clientes." },
  { icon: <SchoolRoundedIcon fontSize="large" />, title: "Educación", text: "Formación, cursos, mentoría y acompañamiento." },
];


// Pasos para integrarte (sección 7)
const PASOS = [
  { n: "01", title: "Elige una comunidad", text: "Explora las comunidades disponibles y encuentra una agencia que tenga proyectos, actividades o intereses compatibles contigo.", cta: true },
  { n: "02", title: "Solicita integrarte", text: "Envía tu solicitud a la comunidad que hayas elegido. La comunidad conocerá tu perfil, tus capacidades y aquello en lo que te gustaría participar." },
  { n: "03", title: "Conoce al equipo", text: "Una vez aceptado, conocerás a las personas con las que vas a colaborar y las actividades en las que puedes participar." },
  { n: "04", title: "Comienza a colaborar", text: "Te incorporas a los proyectos y comienzas tu proceso de formación y participación productiva." },
];

// Progresión de crecimiento (sección 8) — representación visual, no cargos oficiales
const NIVELES = [
  { title: "SOCIO-BECARIO", text: "Conoces la comunidad y comienzas a aprender.", color: TURQUESA },
  { title: "COLABORADOR", text: "Participas regularmente en proyectos.", color: TURQUESA },
  { title: "PRODUCTOR", text: "Desarrollas servicios y proyectos.", color: AMARILLO },
  { title: "RESPONSABLE", text: "Puedes coordinar proyectos o áreas.", color: AMARILLO },
  { title: "LÍDER", text: "Puedes dirigir equipos y nuevas iniciativas.", color: MORADO },
];

// Qué recibes (sección 11)
const BENEFICIOS = [
  { icon: <SchoolRoundedIcon fontSize="large" />, title: "Formación", text: "Aprende mediante proyectos, acompañamiento y colaboración." },
  { icon: <GroupsRoundedIcon fontSize="large" />, title: "Comunidad", text: "Trabaja junto a personas con diferentes capacidades." },
  { icon: <WorkRoundedIcon fontSize="large" />, title: "Proyectos", text: "Participa en trabajos y actividades reales." },
  { icon: <HandymanRoundedIcon fontSize="large" />, title: "Herramientas", text: "Utiliza las herramientas disponibles dentro del ecosistema de la comunidad." },
  { icon: <TrendingUpRoundedIcon fontSize="large" />, title: "Oportunidades", text: "Encuentra proyectos, clientes y nuevas formas de participar." },
  { icon: <HubRoundedIcon fontSize="large" />, title: "Red", text: "Conecta con otras personas y comunidades de Ciudadan." },
];

// Perfiles (sección 13)
const PERFILES = [
  { icon: <SchoolRoundedIcon fontSize="large" />, title: "ESTUDIANTE", text: "Quieres aprender haciendo y adquirir experiencia real." },
  { icon: <WorkRoundedIcon fontSize="large" />, title: "PROFESIONAL", text: "Quieres aportar tus conocimientos a proyectos y equipos colaborativos." },
  { icon: <StorefrontRoundedIcon fontSize="large" />, title: "INDEPENDIENTE", text: "Quieres ampliar tus servicios, clientes y oportunidades." },
  { icon: <TrendingUpRoundedIcon fontSize="large" />, title: "EMPRENDEDOR", text: "Quieres conocer personas, desarrollar proyectos y eventualmente construir nuevas iniciativas." },
];

// FAQ (sección 14)
const FAQS = [
  { q: "¿Necesito experiencia para integrarme?", a: "No necesariamente. Cada comunidad puede establecer sus propios criterios de incorporación y existen actividades adecuadas para diferentes niveles de experiencia." },
  { q: "¿Tengo que saber programar?", a: "No. Las comunidades necesitan perfiles muy diferentes: programación, diseño, multimedia, ventas, administración, marketing, educación y muchas otras áreas." },
  { q: "¿Tengo que pagar para integrarme?", a: "Cada comunidad define sus propias modalidades de incorporación. Al explorar las comunidades disponibles verás los requisitos y condiciones de cada una." },
  { q: "¿Tengo que comprar equipo o infraestructura?", a: "No para integrarte a una comunidad existente. La infraestructura necesaria para las actividades depende de la comunidad y de los proyectos en los que participes." },
  { q: "¿Puedo vender servicios?", a: "Sí. Los integrantes pueden participar en la comercialización de los servicios y membresías disponibles en su agencia, de acuerdo con la organización de cada comunidad." },
  { q: "¿Puedo trabajar en diferentes áreas?", a: "Sí. Puedes participar en diferentes actividades conforme desarrollas capacidades y encuentras proyectos compatibles con tu perfil." },
  { q: "¿Puedo cambiar de comunidad?", a: "Las reglas de participación y transición entre comunidades se muestran en cada comunidad dentro de la plataforma, conforme se definan." },
  { q: "¿Puedo crear posteriormente mi propia comunidad?", a: "Sí. Algunos integrantes desarrollan después su propia agencia dentro de la red. Cuando quieras dar ese paso, existe un camino definido para construir tu propia comunidad.", cta: "/crear-comunidad" },
];


export default function IntegrarmeComunidad() {
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState(null);
  const irAComunidades = navigateTo(navigate, "/comunidades");
  const irACrear = navigateTo(navigate, "/crear-comunidad");
  const irAHome = navigateTo(navigate, "/");

  const irAComoFunciona = () => {
    const el = document.getElementById("como-funciona");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  useEffect(() => {
    window.dispatchEvent(new Event("closeTopBar"));
  }, []);

  return (
    <Box sx={{ bgcolor: "#f7faf8", minHeight: "100vh", color: "text.primary", overflowX: "clip" }}>
      {/* 1. HERO */}
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
          sx={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(circle at 80% 15%, rgba(46,230,200,0.16) 0%, rgba(0,0,0,0) 42%), radial-gradient(circle at 12% 80%, rgba(138,92,245,0.16) 0%, rgba(0,0,0,0) 40%), radial-gradient(circle at 55% 100%, rgba(255,224,102,0.08) 0%, rgba(0,0,0,0) 45%)",
          }}
        />
        <Container maxWidth="lg" sx={{ position: "relative" }}>
          <Grid container spacing={5} alignItems="center">
            <Grid item xs={12} md={7}>
              <Stack spacing={2.5}>
                <Reveal>
                  <Chip
                    label="ÚNETE A UNA COMUNIDAD CIUDADAN"
                    sx={{
                      alignSelf: "flex-start",
                      fontFamily: HERO_FONT,
                      fontWeight: 700,
                      letterSpacing: "0.1em",
                      color: "#eafff5",
                      borderColor: "rgba(255,255,255,0.35)",
                      bgcolor: "rgba(0,0,0,0.24)",
                    }}
                    variant="outlined"
                  />
                </Reveal>
                <Reveal delay={0.05}>
                  <Typography
                    variant="h1"
                    sx={{
                      fontFamily: HERO_FONT,
                      fontWeight: 700,
                      letterSpacing: "-0.03em",
                      lineHeight: 1.04,
                      fontSize: { xs: "2.3rem", sm: "3rem", md: "3.9rem" },
                    }}
                  >
                    Integra tu talento a una comunidad que ya está construyendo.
                  </Typography>
                </Reveal>
                <Reveal delay={0.1}>
                  <Typography sx={{ fontSize: { xs: "1.05rem", md: "1.2rem" }, lineHeight: 1.65, color: "rgba(255,255,255,0.88)" }}>
                    No necesitas crear una agencia ni empezar desde cero.
                  </Typography>
                </Reveal>
                <Reveal delay={0.15}>
                  <Typography sx={{ fontSize: { xs: "1rem", md: "1.12rem" }, lineHeight: 1.7, color: "rgba(255,255,255,0.75)" }}>
                    Únete como <Box component="span" sx={{ fontWeight: 800, color: AMARILLO }}>socio-becario</Box> a una comunidad Ciudadan, intégrate a su agencia y participa en proyectos reales mientras desarrollas nuevas capacidades.
                  </Typography>
                </Reveal>
                <Reveal delay={0.2}>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} useFlexGap flexWrap="wrap">
                    <CtaVerde onClick={irAComunidades}>Encontrar una comunidad</CtaVerde>
                    <Button
                      variant="outlined"
                      onClick={irAComoFunciona}
                      sx={{
                        px: 3,
                        py: 1.4,
                        borderRadius: 999,
                        fontFamily: HERO_FONT,
                        fontWeight: 700,
                        color: "#fff",
                        borderColor: "rgba(255,255,255,0.4)",
                        bgcolor: "rgba(0,0,0,0.18)",
                        "&:hover": { borderColor: "rgba(255,255,255,0.75)", bgcolor: "rgba(0,0,0,0.3)" },
                      }}
                    >
                      ¿Cómo funciona?
                    </Button>
                  </Stack>
                </Reveal>
              </Stack>
            </Grid>
            <Grid item xs={12} md={5}>
              <Reveal delay={0.15}>
                <Box
                  sx={{
                    position: "relative",
                    borderRadius: 6,
                    overflow: "hidden",
                    border: "1px solid rgba(255,255,255,0.14)",
                    boxShadow: "0 24px 70px rgba(0,0,0,0.35)",
                  }}
                >
                  <Box
                    component="img"
                    src={heroCommunityImage}
                    alt="Personas colaborando en proyectos digitales dentro de una comunidad"
                    sx={{ width: "100%", height: { xs: 260, md: 420 }, objectFit: "cover", display: "block" }}
                  />
                  <Box
                    sx={{
                      position: "absolute",
                      inset: 0,
                      background:
                        "linear-gradient(180deg, rgba(0,0,0,0.02) 0%, rgba(0,0,0,0.08) 50%, rgba(0,0,0,0.55) 100%)",
                    }}
                  />
                  <Box sx={{ position: "absolute", left: 18, right: 18, bottom: 18 }}>
                    <Typography sx={{ fontFamily: HERO_FONT, fontWeight: 700, color: "#fff", lineHeight: 1.15 }}>
                      Pertenencia + colaboración + producción
                    </Typography>
                  </Box>
                </Box>
              </Reveal>
            </Grid>
          </Grid>
        </Container>
      </Box>


      {/* 2. MENSAJE PRINCIPAL */}
      <Box sx={{ py: { xs: 7, md: 10 } }}>
        <Container maxWidth="md">
          <Reveal>
            <Typography
              variant="h3"
              sx={{
                fontFamily: HERO_FONT,
                fontWeight: 700,
                lineHeight: 1.12,
                letterSpacing: "-0.02em",
                fontSize: { xs: "1.9rem", md: "2.6rem" },
                mb: 3,
              }}
            >
              No vienes solamente a estudiar. Vienes a formar parte.
            </Typography>
            <Stack spacing={2}>
              <Typography sx={bodySx}>
                En una comunidad Ciudadan puedes aprender mientras participas en la actividad productiva de una agencia.
              </Typography>
              <Typography sx={bodySx}>
                Tu formación ocurre dentro de un entorno donde existen proyectos, clientes, herramientas y personas con diferentes capacidades.
              </Typography>
              <Typography sx={bodySx}>
                Puedes comenzar con lo que sabes y desarrollar nuevas habilidades mientras colaboras con los demás integrantes.
              </Typography>
            </Stack>
            <Typography
              sx={{
                fontFamily: HERO_FONT,
                fontWeight: 700,
                fontSize: { xs: "1.5rem", md: "2rem" },
                color: VERDE,
                mt: 4,
              }}
            >
              Aprende. Colabora. Produce. Crece.
            </Typography>
          </Reveal>
        </Container>
      </Box>

      {/* 3. ¿QUÉ SIGNIFICA INTEGRARTE? */}
      <Box sx={{ bgcolor: "#ffffff", py: { xs: 7, md: 10 }, borderTop: "1px solid", borderBottom: "1px solid", borderColor: "divider" }}>
        <Container maxWidth="md">
          <Reveal>
            <Typography
              variant="h3"
              sx={{
                fontFamily: HERO_FONT,
                fontWeight: 700,
                lineHeight: 1.12,
                letterSpacing: "-0.02em",
                fontSize: { xs: "1.9rem", md: "2.6rem" },
                mb: 3,
              }}
            >
              Te conviertes en socio-becario de una agencia
            </Typography>
            <Stack spacing={2} sx={{ mb: 3 }}>
              <Typography sx={bodySx}>
                Una comunidad Ciudadan puede contar con una agencia que desarrolla diferentes servicios y proyectos.
              </Typography>
              <Typography sx={bodySx}>Al integrarte, formas parte de esa organización como socio-becario.</Typography>
              <Typography sx={bodySx}>Esto significa que puedes:</Typography>
            </Stack>
            <Stack direction="row" spacing={0.8} useFlexGap flexWrap="wrap">
              {[
                "participar en proyectos",
                "aprender nuevas habilidades",
                "colaborar con otros integrantes",
                "desarrollar servicios",
                "participar en ventas",
                "atender clientes",
                "producir contenidos",
                "programar",
                "diseñar",
                "desarrollar soluciones",
                "asumir nuevas responsabilidades conforme creces",
              ].map((item) => (
                <Chip key={item} label={item} variant="outlined" color="success" sx={{ fontWeight: 700 }} />
              ))}
            </Stack>
            <Typography
              sx={{
                fontFamily: HERO_FONT,
                fontWeight: 700,
                fontSize: { xs: "1.35rem", md: "1.7rem" },
                color: "text.primary",
                mt: 4,
              }}
            >
              Tu participación no está limitada a una sola profesión.
            </Typography>
          </Reveal>
        </Container>
      </Box>


      {/* 4. ¿QUÉ PUEDES HACER? — GRID DE ÁREAS */}
      <Box sx={{ py: { xs: 7, md: 10 } }}>
        <Container maxWidth="lg">
          <Reveal>
            <Chip label="Áreas de participación" color="success" variant="outlined" sx={{ fontWeight: 700, mb: 2 }} />
            <Typography
              variant="h3"
              sx={{
                fontFamily: HERO_FONT,
                fontWeight: 700,
                lineHeight: 1.12,
                letterSpacing: "-0.02em",
                fontSize: { xs: "1.9rem", md: "2.6rem" },
                mb: 2,
              }}
            >
              Encuentra dónde puedes aportar
            </Typography>
            <Typography sx={{ ...bodySx, maxWidth: 720, mb: 5 }}>
              Cada comunidad tiene diferentes necesidades y proyectos. Puedes integrarte de acuerdo con tus conocimientos, intereses y capacidades.
            </Typography>
          </Reveal>
          <Grid container spacing={2.5}>
            {AREAS.map((area, i) => (
              <Grid item xs={12} sm={6} md={4} lg={2.4} key={area.title}>
                <Reveal delay={Math.min(i * 0.04, 0.3)}>
                  <Card
                    elevation={0}
                    sx={{
                      height: "100%",
                      borderRadius: 4,
                      border: "1px solid",
                      borderColor: "divider",
                      bgcolor: "background.paper",
                      transition: "transform .2s ease, box-shadow .2s ease",
                      "&:hover": { transform: "translateY(-4px)", boxShadow: 8 },
                    }}
                  >
                    <CardContent sx={{ p: 2.5 }}>
                      <Stack spacing={1.2}>
                        <Box sx={{ color: VERDE }}>{area.icon}</Box>
                        <Typography sx={{ fontWeight: 800, lineHeight: 1.2 }}>{area.title}</Typography>
                        <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.55 }}>
                          {area.text}
                        </Typography>
                      </Stack>
                    </CardContent>
                  </Card>
                </Reveal>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* 5. PUEDES EMPEZAR CON LO QUE YA SABES */}
      <Box sx={{ bgcolor: "#ffffff", py: { xs: 7, md: 10 }, borderTop: "1px solid", borderBottom: "1px solid", borderColor: "divider" }}>
        <Container maxWidth="md">
          <Reveal>
            <Typography
              variant="h3"
              sx={{
                fontFamily: HERO_FONT,
                fontWeight: 700,
                lineHeight: 1.12,
                letterSpacing: "-0.02em",
                fontSize: { xs: "1.9rem", md: "2.6rem" },
                mb: 3,
              }}
            >
              No necesitas saber hacerlo todo
            </Typography>
            <Stack spacing={1.5}>
              <Typography sx={bodySx}>Las comunidades reúnen personas con diferentes conocimientos.</Typography>
              <Typography sx={bodySx}>Quizá sabes programar.</Typography>
              <Typography sx={bodySx}>Quizá eres diseñador.</Typography>
              <Typography sx={bodySx}>Quizá sabes editar videos.</Typography>
              <Typography sx={bodySx}>Quizá eres bueno vendiendo.</Typography>
              <Typography sx={bodySx}>Quizá apenas estás comenzando.</Typography>
              <Typography sx={bodySx}>
                La idea es que puedas encontrar un espacio donde tus capacidades sean útiles y, al mismo tiempo, puedas aprender de las demás personas.
              </Typography>
            </Stack>
            <Typography
              sx={{
                fontFamily: HERO_FONT,
                fontWeight: 700,
                fontSize: { xs: "1.35rem", md: "1.7rem" },
                color: VERDE,
                mt: 4,
              }}
            >
              Tu conocimiento puede ser el punto de partida para desarrollar mucho más.
            </Typography>
          </Reveal>
        </Container>
      </Box>


      {/* 6. VENDE SERVICIOS Y MEMBRESÍAS */}
      <Box sx={{ py: { xs: 7, md: 10 } }}>
        <Container maxWidth="md">
          <Reveal>
            <Chip label="Actividad comercial" color="primary" variant="outlined" sx={{ fontWeight: 700, mb: 2 }} />
            <Typography
              variant="h3"
              sx={{
                fontFamily: HERO_FONT,
                fontWeight: 700,
                lineHeight: 1.12,
                letterSpacing: "-0.02em",
                fontSize: { xs: "1.9rem", md: "2.6rem" },
                mb: 3,
              }}
            >
              También puedes convertirte en parte de la actividad comercial
            </Typography>
            <Stack spacing={2} sx={{ mb: 3 }}>
              <Typography sx={bodySx}>No tienes que limitarte a ejecutar tareas.</Typography>
              <Typography sx={bodySx}>
                Los integrantes de una comunidad pueden participar en la comercialización de los servicios y productos de la agencia.
              </Typography>
              <Typography sx={bodySx}>
                Puedes aprender a identificar necesidades, contactar clientes, presentar soluciones y vender:
              </Typography>
            </Stack>
            <Stack direction="row" spacing={0.8} useFlexGap flexWrap="wrap" sx={{ mb: 4 }}>
              {[
                "servicios digitales",
                "desarrollo",
                "diseño",
                "multimedia",
                "IA",
                "marketing",
                "e-commerce",
                "chatbots",
                "automatizaciones",
                "membresías",
              ].map((item) => (
                <Chip key={item} label={item} variant="outlined" color="primary" sx={{ fontWeight: 700 }} />
              ))}
            </Stack>
            <Box
              sx={{
                borderRadius: 4,
                bgcolor: OSCURO,
                color: "#fff",
                p: { xs: 3, md: 4 },
                border: "1px solid rgba(138,92,245,0.35)",
              }}
            >
              <Typography sx={{ fontFamily: HERO_FONT, fontWeight: 700, fontSize: { xs: "1.4rem", md: "1.8rem" }, lineHeight: 1.25 }}>
                Aprender a producir también significa aprender a generar oportunidades.
              </Typography>
            </Box>
          </Reveal>
        </Container>
      </Box>

      {/* 7. ¿CÓMO FUNCIONA? — 4 PASOS */}
      <Box id="como-funciona" sx={{ bgcolor: "#ffffff", py: { xs: 7, md: 10 }, borderTop: "1px solid", borderBottom: "1px solid", borderColor: "divider" }}>
        <Container maxWidth="lg">
          <Reveal>
            <Chip label="¿Cómo funciona?" color="success" variant="outlined" sx={{ fontWeight: 700, mb: 2 }} />
            <Typography
              variant="h3"
              sx={{
                fontFamily: HERO_FONT,
                fontWeight: 700,
                lineHeight: 1.12,
                letterSpacing: "-0.02em",
                fontSize: { xs: "1.9rem", md: "2.6rem" },
                mb: 5,
              }}
            >
              Integrarte es sencillo
            </Typography>
          </Reveal>
          <Grid container spacing={3}>
            {PASOS.map((paso, i) => (
              <Grid item xs={12} sm={6} md={3} key={paso.n}>
                <Reveal delay={i * 0.08}>
                  <Stack spacing={1.5} sx={{ height: "100%" }}>
                    <Typography
                      sx={{
                        fontFamily: HERO_FONT,
                        fontWeight: 700,
                        fontSize: "2.2rem",
                        color: VERDE,
                        opacity: 0.85,
                        lineHeight: 1,
                      }}
                    >
                      {paso.n}
                    </Typography>
                    <Typography sx={{ fontWeight: 800, fontSize: "1.1rem" }}>{paso.title}</Typography>
                    <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.65 }}>
                      {paso.text}
                    </Typography>
                    {paso.cta && (
                      <Button
                        onClick={irAComunidades}
                        endIcon={<ArrowForwardRoundedIcon />}
                        sx={{ alignSelf: "flex-start", fontWeight: 800, color: VERDE, px: 0 }}
                      >
                        Ver comunidades
                      </Button>
                    )}
                  </Stack>
                </Reveal>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>


      {/* 8. TU CRECIMIENTO DENTRO DE LA COMUNIDAD */}
      <Box sx={{ py: { xs: 7, md: 10 } }}>
        <Container maxWidth="md">
          <Reveal>
            <Chip label="Tu crecimiento" color="success" variant="outlined" sx={{ fontWeight: 700, mb: 2 }} />
            <Typography
              variant="h3"
              sx={{ fontFamily: HERO_FONT, fontWeight: 700, lineHeight: 1.12, letterSpacing: "-0.02em", fontSize: { xs: "1.9rem", md: "2.6rem" }, mb: 2 }}
            >
              Empiezas como becario. Puedes llegar mucho más lejos.
            </Typography>
            <Typography sx={bodySx}>
              Tu incorporación no determina el lugar que ocuparás para siempre. Conforme adquieres experiencia puedes asumir proyectos, clientes y responsabilidades cada vez mayores.
            </Typography>
          </Reveal>
          <Stack spacing={0} sx={{ mt: 5 }}>
            {NIVELES.map((nivel, i) => (
              <Reveal key={nivel.title} delay={i * 0.07}>
                <Stack direction="row" spacing={2.5} alignItems="stretch">
                  <Stack alignItems="center" sx={{ width: 46, flex: "0 0 auto" }}>
                    <Box sx={{ width: 14, height: 14, borderRadius: "50%", bgcolor: VERDE, boxShadow: `0 0 12px ${VERDE}`, mt: 2.2 }} />
                    {i < NIVELES.length - 1 && <Box sx={{ width: 2, flex: 1, minHeight: 34, bgcolor: "rgba(25,215,156,0.35)", my: 0.5 }} />}
                  </Stack>
                  <Box sx={{ pb: 3 }}>
                    <Typography sx={{ fontFamily: HERO_FONT, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", fontSize: "1rem" }}>
                      {nivel.title}
                    </Typography>
                    <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.65, mt: 0.5 }}>
                      {nivel.text}
                    </Typography>
                  </Box>
                </Stack>
              </Reveal>
            ))}
          </Stack>
          <Reveal>
            <Typography variant="body2" sx={{ color: "text.secondary", fontStyle: "italic", mt: 1 }}>
              Estos niveles son una representación visual del posible crecimiento dentro de una comunidad; no son cargos oficiales obligatorios.
            </Typography>
          </Reveal>
        </Container>
      </Box>

      {/* 9. TU RED TAMBIÉN CRECE */}
      <Box sx={{ bgcolor: OSCURO, color: "#fff", py: { xs: 7, md: 10 } }}>
        <Container maxWidth="md">
          <Reveal>
            <Chip label="Tu red" variant="outlined" sx={{ fontWeight: 700, mb: 2, color: AMARILLO, borderColor: "rgba(255,224,102,0.4)" }} />
            <Typography
              variant="h3"
              sx={{ fontFamily: HERO_FONT, fontWeight: 700, lineHeight: 1.12, letterSpacing: "-0.02em", fontSize: { xs: "1.9rem", md: "2.6rem" }, mb: 2 }}
            >
              Mientras colaboras, construyes tu propia red
            </Typography>
            <Typography sx={{ ...bodySx, color: "rgba(255,255,255,0.82)" }}>
              Cada proyecto te permite conocer personas, clientes y otros profesionales. Las relaciones que desarrollas dentro de la comunidad pueden convertirse en nuevas oportunidades de colaboración y producción.
            </Typography>
            <Typography sx={{ ...bodySx, fontWeight: 800, color: "#fff", mt: 1 }}>
              Tu comunidad no es solamente el lugar donde trabajas. Es una red de personas con las que puedes seguir construyendo.
            </Typography>
          </Reveal>
          <Reveal delay={0.15}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems="center" useFlexGap flexWrap="wrap" sx={{ mt: 4 }}>
              {RED_CADENA.map((eslabon, i) => (
                <React.Fragment key={eslabon}>
                  <Chip
                    label={eslabon}
                    sx={{ fontFamily: HERO_FONT, fontWeight: 700, bgcolor: "rgba(255,255,255,0.1)", color: "#fff", border: "1px solid rgba(255,255,255,0.2)" }}
                  />
                  {i < RED_CADENA.length - 1 && <ArrowForwardRoundedIcon sx={{ color: AMARILLO, transform: { xs: "rotate(90deg)", sm: "none" }, fontSize: 18 }} />}
                </React.Fragment>
              ))}
            </Stack>
          </Reveal>
        </Container>
      </Box>


      {/* 10. UNA COMUNIDAD NO ES UNA OFICINA */}
      <Box sx={{ py: { xs: 7, md: 10 } }}>
        <Container maxWidth="md">
          <Reveal>
            <Chip label="Colaboración flexible" color="success" variant="outlined" sx={{ fontWeight: 700, mb: 2 }} />
            <Typography
              variant="h3"
              sx={{ fontFamily: HERO_FONT, fontWeight: 700, lineHeight: 1.12, letterSpacing: "-0.02em", fontSize: { xs: "1.9rem", md: "2.6rem" }, mb: 2 }}
            >
              La comunidad es una red de colaboración
            </Typography>
            <Typography sx={bodySx}>
              Una comunidad Ciudadan no tiene que funcionar como una empresa tradicional donde cada persona ocupa un puesto fijo. Personas con diferentes capacidades pueden colaborar en distintos proyectos.
            </Typography>
          </Reveal>
          <Grid container spacing={1.5} sx={{ mt: 3 }}>
            {EJEMPLOS_FLEX.map((ej, i) => (
              <Grid item xs={12} sm={6} key={ej}>
                <Reveal delay={i * 0.06}>
                  <Box sx={{ display: "flex", gap: 1.2, alignItems: "flex-start" }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: VERDE, mt: 1, flex: "0 0 auto" }} />
                    <Typography sx={{ color: "text.secondary", lineHeight: 1.6 }}>{ej}</Typography>
                  </Box>
                </Reveal>
              </Grid>
            ))}
          </Grid>
          <Reveal>
            <Typography sx={{ fontFamily: HERO_FONT, fontWeight: 700, fontSize: { xs: "1.25rem", md: "1.55rem" }, mt: 4, color: "text.primary" }}>
              Las capacidades se conectan. Los proyectos también.
            </Typography>
          </Reveal>
        </Container>
      </Box>

      {/* 11. ¿QUÉ RECIBES AL INTEGRARTE? */}
      <Box sx={{ bgcolor: "#ffffff", py: { xs: 7, md: 10 }, borderTop: "1px solid", borderBottom: "1px solid", borderColor: "divider" }}>
        <Container maxWidth="lg">
          <Reveal>
            <Chip label="Lo que recibes" color="success" variant="outlined" sx={{ fontWeight: 700, mb: 2 }} />
            <Typography
              variant="h3"
              sx={{ fontFamily: HERO_FONT, fontWeight: 700, lineHeight: 1.12, letterSpacing: "-0.02em", fontSize: { xs: "1.9rem", md: "2.6rem" }, mb: 5 }}
            >
              Formas parte de algo que ya está funcionando
            </Typography>
          </Reveal>
          <Grid container spacing={2.5}>
            {BENEFICIOS.map((item, i) => (
              <Grid item xs={12} sm={6} md={4} key={item.title}>
                <Reveal delay={i * 0.06} style={{ height: "100%" }}>
                  <Card elevation={0} sx={{ height: "100%", borderRadius: 4, border: "1px solid", borderColor: "divider" }}>
                    <CardContent sx={{ p: 3 }}>
                      <Stack spacing={1.4}>
                        <Box sx={{ color: VERDE }}>{item.icon}</Box>
                        <Typography sx={{ fontWeight: 800, fontSize: "1.05rem" }}>{item.title}</Typography>
                        <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.65 }}>
                          {item.text}
                        </Typography>
                      </Stack>
                    </CardContent>
                  </Card>
                </Reveal>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* 12. NO NECESITAS EMPEZAR CON UNA GRAN INVERSIÓN */}
      <Box sx={{ py: { xs: 7, md: 9 } }}>
        <Container maxWidth="md">
          <Reveal>
            <Typography
              variant="h3"
              sx={{ fontFamily: HERO_FONT, fontWeight: 700, lineHeight: 1.12, letterSpacing: "-0.02em", fontSize: { xs: "1.7rem", md: "2.2rem" }, mb: 2 }}
            >
              Tu primer paso no requiere montar una infraestructura
            </Typography>
            <Typography sx={bodySx}>
              Para integrarte a una comunidad existente no necesitas crear un servidor, montar una oficina ni construir una agencia. La comunidad ya tiene una estructura sobre la cual puedes comenzar a participar.
            </Typography>
            <Typography sx={{ fontFamily: HERO_FONT, fontWeight: 700, fontSize: { xs: "1.2rem", md: "1.45rem" }, mt: 3, color: VERDE }}>
              Primero encuentra dónde puedes aportar.
            </Typography>
            <Typography sx={bodySx}>
              Después puedes decidir hasta dónde quieres crecer dentro del ecosistema.
            </Typography>
          </Reveal>
        </Container>
      </Box>


      {/* 13. ¿PARA QUIÉN ES? */}
      <Box sx={{ bgcolor: "#ffffff", py: { xs: 7, md: 10 }, borderTop: "1px solid", borderBottom: "1px solid", borderColor: "divider" }}>
        <Container maxWidth="lg">
          <Reveal>
            <Chip label="¿Para quién es?" color="success" variant="outlined" sx={{ fontWeight: 700, mb: 2 }} />
            <Typography
              variant="h3"
              sx={{ fontFamily: HERO_FONT, fontWeight: 700, lineHeight: 1.12, letterSpacing: "-0.02em", fontSize: { xs: "1.9rem", md: "2.6rem" }, mb: 5 }}
            >
              Hay un lugar para diferentes perfiles
            </Typography>
          </Reveal>
          <Grid container spacing={2.5}>
            {PERFILES.map((p, i) => (
              <Grid item xs={12} sm={6} md={3} key={p.title}>
                <Reveal delay={i * 0.07} style={{ height: "100%" }}>
                  <Card elevation={0} sx={{ height: "100%", borderRadius: 4, bgcolor: OSCURO, color: "#fff" }}>
                    <CardContent sx={{ p: 3 }}>
                      <Stack spacing={1.4}>
                        <Box sx={{ color: AMARILLO }}>{p.icon}</Box>
                        <Typography sx={{ fontFamily: HERO_FONT, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", fontSize: "0.95rem" }}>
                          {p.title}
                        </Typography>
                        <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.78)", lineHeight: 1.65 }}>
                          {p.text}
                        </Typography>
                      </Stack>
                    </CardContent>
                  </Card>
                </Reveal>
              </Grid>
            ))}
          </Grid>
          <Reveal>
            <Stack spacing={0.5} sx={{ mt: 5, alignItems: "center", textAlign: "center" }}>
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                No necesitas llegar con un perfil perfecto.
              </Typography>
              <Typography sx={{ fontFamily: HERO_FONT, fontWeight: 700, fontSize: { xs: "1.2rem", md: "1.45rem" }, color: "text.primary" }}>
                Necesitas tener algo que aportar y disposición para aprender.
              </Typography>
            </Stack>
          </Reveal>
        </Container>
      </Box>

      {/* 14. FAQ */}
      <Box sx={{ py: { xs: 7, md: 10 } }}>
        <Container maxWidth="md">
          <Reveal>
            <Chip label="FAQ" color="success" variant="outlined" sx={{ fontWeight: 700, mb: 2 }} />
            <Typography
              variant="h3"
              sx={{ fontFamily: HERO_FONT, fontWeight: 700, lineHeight: 1.12, letterSpacing: "-0.02em", fontSize: { xs: "1.9rem", md: "2.6rem" }, mb: 4 }}
            >
              Preguntas frecuentes
            </Typography>
          </Reveal>
          {FAQS.map((faq, i) => (
            <Reveal key={faq.q} delay={Math.min(i * 0.04, 0.2)}>
              <Accordion
                elevation={0}
                sx={{
                  mb: 1.2,
                  borderRadius: "14px !important",
                  border: "1px solid",
                  borderColor: "divider",
                  bgcolor: "#ffffff",
                  "&:before": { display: "none" },
                }}
              >
                <AccordionSummary expandIcon={<ExpandMoreRoundedIcon />}>
                  <Typography sx={{ fontWeight: 800, fontSize: "1rem" }}>{faq.q}</Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ pt: 0 }}>
                  <Typography sx={{ color: "text.secondary", lineHeight: 1.7 }}>{faq.a}</Typography>
                  {faq.cta && (
                    <Button onClick={() => navigate(faq.cta)} endIcon={<ArrowForwardRoundedIcon />} sx={{ mt: 1.5, fontWeight: 800, color: VERDE, px: 0 }}>
                      Conocer cómo crear una comunidad
                    </Button>
                  )}
                </AccordionDetails>
              </Accordion>
            </Reveal>
          ))}
        </Container>
      </Box>


      {/* 15. CTA FINAL */}
      <Box sx={{ position: "relative", overflow: "hidden", bgcolor: OSCURO, color: "#fff", py: { xs: 9, md: 12 }, textAlign: "center" }}>
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(circle at 25% 25%, rgba(46,230,200,0.18) 0%, rgba(0,0,0,0) 45%), radial-gradient(circle at 78% 75%, rgba(138,92,245,0.2) 0%, rgba(0,0,0,0) 42%), radial-gradient(circle at 60% 20%, rgba(255,224,102,0.1) 0%, rgba(0,0,0,0) 40%)",
          }}
        />
        <Container maxWidth="md" sx={{ position: "relative" }}>
          <Reveal>
            <Typography
              variant="h2"
              sx={{ fontFamily: HERO_FONT, fontWeight: 700, lineHeight: 1.06, letterSpacing: "-0.03em", fontSize: { xs: "2.1rem", md: "3.3rem" }, mb: 2.5 }}
            >
              Tu lugar dentro de Ciudadan puede empezar hoy.
            </Typography>
            <Typography sx={{ fontSize: { xs: "1.02rem", md: "1.15rem" }, color: "rgba(255,255,255,0.82)", lineHeight: 1.7, maxWidth: 640, mx: "auto" }}>
              Encuentra una comunidad, conoce a su equipo y descubre dónde puedes aportar. No necesitas empezar creando algo nuevo.
            </Typography>
            <Typography sx={{ fontFamily: HERO_FONT, fontWeight: 700, fontSize: { xs: "1.25rem", md: "1.6rem" }, mt: 1.5, color: AMARILLO }}>
              Empieza formando parte.
            </Typography>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} justifyContent="center" sx={{ mt: 4 }} useFlexGap flexWrap="wrap">
              <Button
                onClick={irAComunidades}
                variant="contained"
                endIcon={<ArrowForwardRoundedIcon />}
                sx={{ px: 3.2, py: 1.5, borderRadius: 999, fontFamily: HERO_FONT, fontWeight: 700, bgcolor: VERDE, color: "#072015", boxShadow: "0 12px 30px rgba(25,215,156,0.3)", "&:hover": { bgcolor: VERDE_HOVER } }}
              >
                Encontrar una comunidad
              </Button>
              <Button
                onClick={irAHome}
                variant="outlined"
                sx={{ px: 3.2, py: 1.5, borderRadius: 999, fontFamily: HERO_FONT, fontWeight: 700, color: "#fff", borderColor: "rgba(255,255,255,0.4)", bgcolor: "rgba(0,0,0,0.18)", "&:hover": { borderColor: "rgba(255,255,255,0.7)", bgcolor: "rgba(0,0,0,0.28)" } }}
              >
                Conocer Ciudadan
              </Button>
            </Stack>
          </Reveal>
        </Container>
      </Box>

      {/* 16. FOOTER CTA */}
      <Box sx={{ bgcolor: "#ffffff", py: { xs: 6, md: 8 }, borderBottom: "1px solid", borderColor: "divider" }}>
        <Container maxWidth="md" sx={{ textAlign: "center" }}>
          <Reveal>
            <Typography variant="h4" sx={{ fontFamily: HERO_FONT, fontWeight: 700, fontSize: { xs: "1.5rem", md: "2rem" }, mb: 1.5 }}>
              ¿Ya sabes qué quieres aportar?
            </Typography>
            <Typography sx={{ color: "text.secondary", lineHeight: 1.8, mb: 3 }}>
              Programación · Diseño · Multimedia · IA · Marketing · Ventas · Educación · Administración
            </Typography>
            <Button
              onClick={irAComunidades}
              variant="contained"
              endIcon={<ArrowForwardRoundedIcon />}
              sx={{ px: 3.2, py: 1.5, borderRadius: 999, fontFamily: HERO_FONT, fontWeight: 700, bgcolor: VERDE, color: "#072015", boxShadow: "0 12px 30px rgba(25,215,156,0.3)", "&:hover": { bgcolor: VERDE_HOVER } }}
            >
              Encuentra tu comunidad
            </Button>
          </Reveal>
        </Container>
      </Box>
    </Box>
  );
}
