// src/Pages/CrearComunidad.jsx
// Página "Crear comunidad": del socio-becario al nodo autónomo o ecoaldea.
// Estilo consistente con el home: hero oscuro, Space Grotesk, acentos
// verde/turquesa/amarillo/morado y revelados con scroll-trigger.
import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
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
import DnsRoundedIcon from "@mui/icons-material/DnsRounded";
import SupportAgentRoundedIcon from "@mui/icons-material/SupportAgentRounded";
import TerminalRoundedIcon from "@mui/icons-material/TerminalRounded";
import MovieFilterRoundedIcon from "@mui/icons-material/MovieFilterRounded";
import DirectionsCarRoundedIcon from "@mui/icons-material/DirectionsCarRounded";
import StorefrontRoundedIcon from "@mui/icons-material/StorefrontRounded";
import SchoolRoundedIcon from "@mui/icons-material/SchoolRounded";
import heroCreaComunidad from "../assets/hero_crea_comunidad_ciudadan.png";

const HERO_FONT = '"Space Grotesk", "Poppins", system-ui, sans-serif';
const VERDE = "#19d79c";
const TURQUESA = "#2ee6c8";
const AMARILLO = "#ffe066";
const MORADO = "#8A5CF5";
const OSCURO = "#07120f";

const bodySx = {
  fontSize: { xs: "1rem", md: "1.08rem" },
  lineHeight: 1.7,
  color: "text.secondary",
};

// Revelado con scroll-trigger (mismo patrón que el resto del home)
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

// Paso numerado de "El camino"
function Paso({ n, titulo, children }) {
  return (
    <Reveal>
      <Grid container spacing={2}>
        <Grid item xs={12} md={2}>
          <Typography
            sx={{
              fontFamily: HERO_FONT,
              fontWeight: 700,
              fontSize: { xs: "2.6rem", md: "3.2rem" },
              lineHeight: 1,
              color: VERDE,
            }}
          >
            {n}
          </Typography>
        </Grid>
        <Grid item xs={12} md={10}>
          <Stack spacing={1.5}>
            <Typography
              variant="h4"
              sx={{
                fontFamily: HERO_FONT,
                fontWeight: 700,
                fontSize: { xs: "1.35rem", md: "1.7rem" },
                lineHeight: 1.15,
              }}
            >
              {titulo}
            </Typography>
            {children}
          </Stack>
        </Grid>
      </Grid>
    </Reveal>
  );
}

// Nodo del roadmap visual (preparado para reuso)

export default function CrearComunidad() {
  const navigate = useNavigate();

  useEffect(() => {
    window.dispatchEvent(new Event("closeTopBar"));
  }, []);

  return (
    <Box sx={{ bgcolor: "#f7faf8", minHeight: "100vh", color: "text.primary", overflowX: "clip" }}>
      {/* HERO */}
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
          src={heroCreaComunidad}
          alt="Comunidad Ciudadan: talento colaborando en su agencia"
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
              "radial-gradient(circle at 15% 20%, rgba(46,230,200,0.14) 0%, rgba(0,0,0,0) 42%), radial-gradient(circle at 85% 12%, rgba(138,92,245,0.16) 0%, rgba(0,0,0,0) 38%), linear-gradient(90deg, rgba(5,10,8,0.92) 0%, rgba(5,10,8,0.78) 42%, rgba(5,10,8,0.45) 70%, rgba(5,10,8,0.22) 100%), linear-gradient(180deg, rgba(5,10,8,0.2) 0%, rgba(5,10,8,0.55) 100%)",
          }}
        />
        <Container maxWidth="lg" sx={{ position: "relative" }}>
          <Stack spacing={2.5} sx={{ maxWidth: 880 }}>
            <Reveal>
              <Chip
                label="Socio-becario → Nodo Ciudadan"
                sx={{
                  alignSelf: "flex-start",
                  fontFamily: HERO_FONT,
                  fontWeight: 700,
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
                  lineHeight: 1.02,
                  fontSize: { xs: "2.4rem", sm: "3.2rem", md: "4.2rem" },
                }}
              >
                Crea tu propia comunidad Ciudadan
              </Typography>
            </Reveal>
            <Reveal delay={0.1}>
              <Typography sx={{ fontSize: { xs: "1.05rem", md: "1.25rem" }, lineHeight: 1.65, color: "rgba(255,255,255,0.88)" }}>
                Conviértete en socio-becario, forma tu agencia, consigue tus primeros clientes y construye un nodo autónomo dentro de la red Ciudadan.
              </Typography>
            </Reveal>
            <Reveal delay={0.15}>
              <Typography sx={{ fontSize: { xs: "1rem", md: "1.12rem" }, lineHeight: 1.65, color: "rgba(255,255,255,0.72)" }}>
                No necesitas empezar con una gran inversión ni construirlo todo por tu cuenta.
              </Typography>
            </Reveal>
            <Reveal delay={0.2}>
              <Typography sx={{ fontSize: { xs: "1rem", md: "1.12rem" }, lineHeight: 1.7, color: "rgba(255,255,255,0.8)" }}>
                Ciudadan pone a tu alcance formación, tecnología, profesionales, metodología, herramientas y una red de comunidades para que puedas desarrollar una agencia productiva que después pueda convertirse en tu propio nodo Ciudadan o integrarse en la creación de una ecoaldea.
              </Typography>
            </Reveal>
            <Reveal delay={0.25}>
              <Button
                variant="contained"
                onClick={() => navigate("/academia")}
                endIcon={<ArrowForwardRoundedIcon />}
                sx={{
                  alignSelf: "flex-start",
                  px: 3,
                  py: 1.5,
                  borderRadius: 999,
                  fontFamily: HERO_FONT,
                  fontWeight: 700,
                  bgcolor: VERDE,
                  color: "#072015",
                  boxShadow: "0 12px 30px rgba(25,215,156,0.3)",
                  "&:hover": { bgcolor: "#15c98f" },
                }}
              >
                Quiero crear mi comunidad
              </Button>
            </Reveal>
          </Stack>
        </Container>
      </Box>


      {/* DE SOCIO-BECARIO A COMUNIDAD AUTÓNOMA */}
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
              De socio-becario a comunidad autónoma
            </Typography>
            <Stack spacing={2}>
              <Typography sx={bodySx}>
                Crear una comunidad Ciudadan no significa simplemente registrarte en una plataforma.
              </Typography>
              <Typography sx={bodySx}>
                Es un proceso mediante el cual aprendes, formas un equipo, desarrollas una actividad económica real, consigues clientes y construyes la infraestructura necesaria para que tu comunidad pueda sostenerse por sí misma.
              </Typography>
            </Stack>
          </Reveal>
        </Container>
      </Box>

      {/* EL CAMINO */}
      <Box sx={{ bgcolor: "#ffffff", py: { xs: 7, md: 10 }, borderTop: "1px solid", borderColor: "divider" }}>
        <Container maxWidth="lg">
          <Reveal>
            <Chip label="El camino" color="success" variant="outlined" sx={{ fontWeight: 700, mb: 2 }} />
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
              Siete pasos para construir tu comunidad
            </Typography>
          </Reveal>
          <Stack spacing={6} sx={{ mt: 6 }}>
            <Paso n="01" titulo="Entra como socio-becario">
              <Typography sx={bodySx}>Tu primer paso es incorporarte al Master Ciudadan.</Typography>
              <Typography sx={bodySx}>
                El Master tiene una duración de un año, pero durante los primeros 3 meses comienzas simultáneamente la preparación de tu futura agencia.
              </Typography>
              <Typography sx={bodySx}>
                Durante este periodo desarrollas tus capacidades, conoces la metodología Ciudadan y comienzas a construir la estructura humana y tecnológica que necesitarás para operar.
              </Typography>
            </Paso>

            <Paso n="02" titulo="Forma tu equipo fundador">
              <Typography sx={bodySx}>Para iniciar la agencia necesitas reunir un equipo mínimo:</Typography>
              <Stack spacing={1.2} sx={{ pl: { xs: 1, md: 2 } }}>
                <Typography sx={bodySx}>
                  <Box component="span" sx={{ fontWeight: 800, color: "text.primary" }}>2 profesores developers</Box> — programadores capaces de participar en formación, desarrollo y operación tecnológica.
                </Typography>
                <Typography sx={bodySx}>
                  <Box component="span" sx={{ fontWeight: 800, color: "text.primary" }}>1 profesor multimedia</Box> — profesional especializado en producción multimedia y herramientas de IA.
                </Typography>
                <Typography sx={bodySx}>
                  <Box component="span" sx={{ fontWeight: 800, color: "text.primary" }}>2 administradores</Box> — personas responsables de operación, organización, clientes, administración, ventas y gestión de la comunidad.
                </Typography>
              </Stack>
              <Typography sx={bodySx}>Los perfiles de desarrollo y multimedia pueden encontrarse dentro de la propia red Ciudadan.</Typography>
              <Typography sx={bodySx}>Los administradores los reclutas y organizas tú.</Typography>
              <Typography sx={bodySx}>
                Los profesores se incorporan después de realizar el propedéutico correspondiente, que les permite trabajar con el sistema educativo y metodológico de Ciudadan.
              </Typography>
              <Box
                sx={{
                  mt: 2,
                  borderRadius: 4,
                  bgcolor: OSCURO,
                  color: "#fff",
                  p: { xs: 3, md: 4 },
                  border: "1px solid rgba(46,230,200,0.25)",
                }}
              >
                <Typography
                  sx={{
                    fontFamily: HERO_FONT,
                    fontWeight: 700,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    fontSize: 12,
                    color: AMARILLO,
                    mb: 1,
                  }}
                >
                  Equipo mínimo para comenzar
                </Typography>
                <Typography
                  sx={{
                    fontFamily: HERO_FONT,
                    fontWeight: 700,
                    fontSize: { xs: "2.2rem", md: "3rem" },
                    lineHeight: 1.05,
                  }}
                >
                  5 personas
                </Typography>
                <Typography sx={{ color: "rgba(255,255,255,0.85)", mt: 0.5 }}>
                  2 Developers + 1 Multimedia + 2 Administradores
                </Typography>
              </Box>
            </Paso>


            <Paso n="03" titulo="Construye tu primera infraestructura">
              <Typography sx={bodySx}>Una agencia necesita infraestructura propia.</Typography>
              <Typography sx={bodySx}>Por eso tienes dos caminos para poner en marcha tu capacidad productiva:</Typography>
              <Grid container spacing={2.5} sx={{ mt: 1 }}>
                <Grid item xs={12} md={6}>
                  <Card elevation={0} sx={{ height: "100%", borderRadius: 4, border: "1px solid", borderColor: "divider" }}>
                    <CardContent sx={{ p: 3 }}>
                      <Stack spacing={1.5}>
                        <Box sx={{ color: VERDE }}><DnsRoundedIcon fontSize="large" /></Box>
                        <Typography variant="h6" sx={{ fontWeight: 800 }}>Invierte en tu propio servidor</Typography>
                        <Typography sx={bodySx}>
                          Puedes adquirir un servidor físico Linux con GPU y convertirlo en parte de la infraestructura productiva de tu agencia.
                        </Typography>
                        <Typography sx={bodySx}>Esto te permite ofrecer servicios de:</Typography>
                        <Stack direction="row" spacing={0.8} useFlexGap flexWrap="wrap">
                          {["IA", "cómputo", "procesamiento", "desarrollo", "multimedia", "hosting", "automatización"].map((s) => (
                            <Chip key={s} label={s} size="small" variant="outlined" color="success" sx={{ fontWeight: 700 }} />
                          ))}
                        </Stack>
                        <Typography sx={bodySx}>y ampliar progresivamente la capacidad de tu nodo.</Typography>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Card
                    elevation={0}
                    sx={{
                      height: "100%",
                      borderRadius: 4,
                      border: `1px solid ${AMARILLO}`,
                      bgcolor: "rgba(255,224,102,0.08)",
                    }}
                  >
                    <CardContent sx={{ p: 3 }}>
                      <Stack spacing={1.5}>
                        <Box sx={{ color: "#c79a00" }}><SupportAgentRoundedIcon fontSize="large" /></Box>
                        <Stack direction="row" spacing={1} alignItems="center" useFlexGap flexWrap="wrap">
                          <Typography variant="h6" sx={{ fontWeight: 800 }}>O consigue tu primer cliente de housing</Typography>
                          <Chip label="Camino privilegiado" size="small" sx={{ bgcolor: AMARILLO, fontWeight: 800, color: "#3a2c00" }} />
                        </Stack>
                        <Typography sx={bodySx}>
                          En lugar de comenzar poniendo todo el capital tú mismo, puedes conseguir un primer cliente que contrate housing/cómputo para IA.
                        </Typography>
                        <Typography sx={bodySx}>
                          Ese cliente permite justificar y financiar la puesta en marcha de la infraestructura.
                        </Typography>
                        <Typography sx={{ ...bodySx, fontWeight: 800, color: "text.primary" }}>
                          Tu primer cliente puede convertirse en el primer motor económico de tu agencia.
                        </Typography>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Paso>

            <Paso n="04" titulo="Después de 3 meses: empieza tu agencia">
              <Typography sx={bodySx}>Aquí sucede algo importante.</Typography>
              <Typography sx={bodySx}>Los 3 meses no terminan el proyecto. Lo ponen en marcha.</Typography>
              <Typography sx={bodySx}>
                Una vez que ya cuentas con tu formación inicial, el equipo fundador y la infraestructura o el primer cliente, empiezas a desarrollar tu propia cartera de clientes.
              </Typography>
              <Typography sx={bodySx}>Desde ese momento:</Typography>
              <Typography sx={{ ...bodySx, fontWeight: 800, color: "text.primary" }}>
                los clientes que consigas pasan a formar parte de tu red.
              </Typography>
              <Typography sx={bodySx}>
                La agencia comienza a operar dentro del ecosistema Ciudadan y puede ofrecer los distintos servicios disponibles en la red.
              </Typography>
              <Typography sx={bodySx}>No tienes que inventar un negocio desde cero.</Typography>
              <Typography sx={bodySx}>
                Construyes sobre una infraestructura económica, tecnológica y humana que ya existe.
              </Typography>
            </Paso>


            <Paso n="05" titulo="Haz crecer tu red">
              <Typography sx={bodySx}>
                Durante el resto del Master tu objetivo es convertir la agencia inicial en una organización productiva.
              </Typography>
              <Typography sx={bodySx}>Puedes desarrollar clientes y actividad alrededor de:</Typography>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                {[
                  {
                    icon: <TerminalRoundedIcon />,
                    title: "Servicios digitales",
                    text: "Desarrollo, sitios web, comercio electrónico, automatización, marketing, IA, chatbots y software.",
                  },
                  {
                    icon: <MovieFilterRoundedIcon />,
                    title: "Multimedia",
                    text: "Producción audiovisual, edición, generación de contenido, diseño y producción con IA.",
                  },
                  {
                    icon: <DnsRoundedIcon />,
                    title: "Infraestructura",
                    text: "Housing, servidores, cómputo, servicios de IA y otras capacidades tecnológicas.",
                  },
                  {
                    icon: <DirectionsCarRoundedIcon />,
                    title: "Movilidad",
                    text: "Servicios y membresías para conductores y usuarios.",
                  },
                  {
                    icon: <StorefrontRoundedIcon />,
                    title: "Comercio y negocios",
                    text: "Herramientas, membresías y servicios para establecimientos y empresas.",
                  },
                  {
                    icon: <SchoolRoundedIcon />,
                    title: "Educación",
                    text: "Formación, profesores, cursos y actividades de la Academia Ciudadan.",
                  },
                ].map((area) => (
                  <Grid item xs={12} sm={6} md={4} key={area.title}>
                    <Card elevation={0} sx={{ height: "100%", borderRadius: 4, border: "1px solid", borderColor: "divider" }}>
                      <CardContent sx={{ p: 3 }}>
                        <Stack spacing={1.2}>
                          <Box sx={{ color: VERDE }}>{area.icon}</Box>
                          <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>{area.title}</Typography>
                          <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.6 }}>{area.text}</Typography>
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
              <Typography sx={bodySx}>Y conforme el ecosistema crece, pueden incorporarse nuevas actividades y servicios.</Typography>
            </Paso>

            <Paso n="06" titulo="Termina el Master con una agencia autónoma">
              <Typography sx={bodySx}>El Master tiene una duración de un año.</Typography>
              <Typography sx={bodySx}>Durante ese año no estás esperando para poder empezar.</Typography>
              <Typography sx={bodySx}>Estás construyendo.</Typography>
              <Typography sx={bodySx}>Al terminar, puedes consolidarte como una agencia autónoma, con:</Typography>
              <Stack direction="row" spacing={0.8} useFlexGap flexWrap="wrap" sx={{ mt: 1 }}>
                {["tu propio equipo", "tus propios clientes", "tu infraestructura", "tus servicios", "tus ingresos", "y tu propio nodo dentro de la red Ciudadan"].map((item) => (
                  <Chip key={item} label={item} sx={{ bgcolor: OSCURO, color: "#fff", fontWeight: 700 }} />
                ))}
              </Stack>
              <Typography sx={{ ...bodySx, fontWeight: 800, color: "text.primary", mt: 2 }}>
                La autonomía económica no llega porque alguien te entrega una comunidad.
              </Typography>
              <Typography sx={{ ...bodySx, fontWeight: 800, color: VERDE }}>
                La construyes tú.
              </Typography>
            </Paso>


            <Paso n="07" titulo="El siguiente paso: tu propia ecoaldea">
              <Typography sx={bodySx}>Existe además otra posibilidad.</Typography>
              <Typography sx={bodySx}>
                Cuando aproximadamente 25 socios deciden organizarse para construir una comunidad física, pueden avanzar hacia la constitución de una ecoaldea Ciudadan.
              </Typography>
              <Typography sx={bodySx}>La agencia aporta una parte fundamental del motor productivo:</Typography>
              <Stack direction="row" spacing={0.8} useFlexGap flexWrap="wrap" sx={{ mt: 1 }}>
                {["trabajo", "tecnología", "clientes", "infraestructura", "conocimiento"].map((item) => (
                  <Chip key={item} label={item} variant="outlined" sx={{ fontWeight: 700, borderColor: MORADO, color: "#5e35b1" }} />
                ))}
              </Stack>
              <Typography sx={bodySx}>
                y la comunidad puede desarrollar alrededor de ello otras actividades económicas, habitacionales, educativas y productivas.
              </Typography>
              <Typography sx={{ ...bodySx, fontWeight: 800, color: "text.primary" }}>
                Así, una agencia puede ser el punto de partida para algo mucho más grande.
              </Typography>
            </Paso>
          </Stack>
        </Container>
      </Box>


      {/* ¿QUÉ SIGNIFICA REALMENTE CREAR UNA COMUNIDAD? */}
      <Box sx={{ bgcolor: OSCURO, color: "#fff", py: { xs: 7, md: 10 } }}>
        <Container maxWidth="md">
          <Reveal>
            <Chip label="La clave" sx={{ mb: 2, bgcolor: MORADO, color: "#fff", fontWeight: 700 }} />
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
              ¿Qué significa realmente crear una comunidad?
            </Typography>
            <Typography sx={{ fontSize: { xs: "1.05rem", md: "1.15rem" }, lineHeight: 1.7, color: "rgba(255,255,255,0.9)" }}>
              No significa abrir una sucursal de Ciudadan.
            </Typography>
            <Typography sx={{ fontSize: { xs: "1.05rem", md: "1.15rem" }, lineHeight: 1.7, color: "rgba(255,255,255,0.9)", mb: 3 }}>
              Significa desarrollar una unidad autónoma dentro de la red.
            </Typography>
            <Typography sx={{ fontSize: { xs: "1rem", md: "1.08rem" }, lineHeight: 1.7, color: "rgba(255,255,255,0.75)" }}>
              Tu nodo puede generar ingresos a través de diferentes actividades y membresías, por ejemplo:
            </Typography>
            <Stack direction="row" spacing={0.8} useFlexGap flexWrap="wrap" sx={{ mt: 1.5, mb: 3 }}>
              {["conductores", "negocios", "usuarios", "servicios digitales", "IA", "multimedia", "desarrollo", "educación", "infraestructura", "comercio"].map((item) => (
                <Chip key={item} label={item} size="small" sx={{ bgcolor: "rgba(255,255,255,0.1)", color: "#fff", fontWeight: 700 }} />
              ))}
            </Stack>
            <Typography sx={{ fontSize: { xs: "1rem", md: "1.08rem" }, lineHeight: 1.7, color: "rgba(255,255,255,0.75)" }}>
              La red Ciudadan permite compartir:
            </Typography>
            <Typography sx={{ fontFamily: HERO_FONT, fontWeight: 700, fontSize: { xs: "1.15rem", md: "1.4rem" }, color: TURQUESA, mt: 1, mb: 4 }}>
              software + conocimiento + infraestructura + profesionales + clientes + metodología
            </Typography>
            <Typography sx={{ fontFamily: HERO_FONT, fontWeight: 700, fontSize: { xs: "1.5rem", md: "2.1rem" }, lineHeight: 1.2 }}>
              Ciudadan te da la red.{" "}
              <Box component="span" sx={{ color: AMARILLO }}>Tú construyes la autonomía.</Box>
            </Typography>
          </Reveal>

          <Reveal delay={0.1}>
            <Stack spacing={1} sx={{ mt: 6 }}>
              <Typography sx={{ color: "rgba(255,255,255,0.75)" }}>No necesitas comenzar teniendo una gran organización.</Typography>
              {["Comienzas como socio-becario", "Aprendes", "Formas un equipo", "Consigues infraestructura", "Consigues clientes", "Construyes una agencia", "Desarrollas tu red"].map((paso) => (
                <Stack key={paso} direction="row" spacing={1.2} alignItems="center">
                  <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: VERDE, flex: "0 0 auto" }} />
                  <Typography sx={{ fontFamily: HERO_FONT, fontWeight: 700, fontSize: { xs: "1.15rem", md: "1.45rem" } }}>{paso}</Typography>
                </Stack>
              ))}
            </Stack>
            <Typography sx={{ mt: 4, fontSize: { xs: "1rem", md: "1.08rem" }, lineHeight: 1.7, color: "rgba(255,255,255,0.85)" }}>
              Y finalmente puedes convertir esa agencia en un nodo autónomo Ciudadan. O puedes dar el siguiente paso: unirte con otros socios y construir una ecoaldea.
            </Typography>
          </Reveal>
        </Container>
      </Box>


      {/* ROADMAP VISUAL */}
      <Box sx={{ bgcolor: "#ffffff", py: { xs: 7, md: 10 }, borderTop: "1px solid", borderColor: "divider" }}>
        <Container maxWidth="sm">
          <Reveal>
            <Chip label="Roadmap visual" color="success" variant="outlined" sx={{ fontWeight: 700, mb: 2 }} />
            <Typography
              variant="h3"
              sx={{
                fontFamily: HERO_FONT,
                fontWeight: 700,
                lineHeight: 1.12,
                letterSpacing: "-0.02em",
                fontSize: { xs: "1.9rem", md: "2.6rem" },
                mb: 4,
              }}
            >
              El camino completo, de un vistazo
            </Typography>
          </Reveal>
          <Stack alignItems="center">
            {[
              { titulo: "SOCIO-BECARIO", detalle: null },
              { titulo: "MASTER — mínimo 3 meses", detalle: null },
              { titulo: "EQUIPO FUNDADOR", detalle: "2 Devs + 1 Multimedia + 2 Admins" },
              { titulo: "INFRAESTRUCTURA", detalle: "Servidor físico GPU o primer cliente de housing" },
              { titulo: "PRIMEROS CLIENTES", detalle: null },
              { titulo: "AGENCIA EN OPERACIÓN", detalle: null },
              { titulo: "RED DE CLIENTES + SERVICIOS + MEMBRESÍAS", detalle: null },
              { titulo: "MASTER — 1 AÑO", detalle: null },
            ].map((nodo) => (
              <Reveal key={nodo.titulo}>
                <Box
                  sx={{
                    width: "100%",
                    maxWidth: 480,
                    mx: "auto",
                    textAlign: "center",
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 3,
                    px: 2.5,
                    py: 1.75,
                    bgcolor: "#f7faf8",
                  }}
                >
                  <Typography sx={{ fontFamily: HERO_FONT, fontWeight: 700, fontSize: { xs: "0.95rem", md: "1.05rem" }, letterSpacing: "0.02em" }}>
                    {nodo.titulo}
                  </Typography>
                  {nodo.detalle && (
                    <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>{nodo.detalle}</Typography>
                  )}
                </Box>
                <Typography sx={{ fontFamily: HERO_FONT, fontWeight: 700, color: VERDE, fontSize: "1.4rem", lineHeight: 1.2, my: 0.4 }}>↓</Typography>
              </Reveal>
            ))}


            <Reveal>
              <Box
                sx={{
                  width: "100%",
                  maxWidth: 480,
                  mx: "auto",
                  textAlign: "center",
                  borderRadius: 3,
                  px: 2.5,
                  py: 2.25,
                  bgcolor: OSCURO,
                  color: "#fff",
                  border: `1px solid ${VERDE}`,
                  boxShadow: "0 12px 30px rgba(7,18,15,0.35)",
                }}
              >
                <Typography sx={{ fontFamily: HERO_FONT, fontWeight: 700, fontSize: { xs: "1.2rem", md: "1.45rem" } }}>
                  AGENCIA / NODO AUTÓNOMO
                </Typography>
              </Box>
              <Typography sx={{ fontFamily: HERO_FONT, fontWeight: 700, color: "text.secondary", fontSize: "1.4rem", my: 0.6, textAlign: "center" }}>
                ↙︎&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;↘︎
              </Typography>
            </Reveal>

            <Grid container spacing={2} sx={{ width: "100%", maxWidth: 620, mt: 0.5, mx: "auto" }}>
              <Grid item xs={12} sm={6}>
                <Reveal fullHeight>
                  <Box sx={{ height: "100%", border: "1px solid", borderColor: "divider", borderRadius: 3, px: 2.5, py: 2.5, bgcolor: "#f7faf8", textAlign: "center" }}>
                    <Typography sx={{ fontFamily: HERO_FONT, fontWeight: 700, fontSize: "1.05rem" }}>Seguir como agencia</Typography>
                    <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.75 }}>
                      Crecer dentro de la red ofreciendo servicios y membresías.
                    </Typography>
                  </Box>
                </Reveal>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Reveal fullHeight delay={0.08}>
                  <Box sx={{ height: "100%", border: `1px solid ${MORADO}`, borderRadius: 3, px: 2.5, py: 2.5, bgcolor: "rgba(138,92,245,0.06)", textAlign: "center" }}>
                    <Typography sx={{ fontFamily: HERO_FONT, fontWeight: 700, fontSize: "1.05rem" }}>Unirse con ~25 socios</Typography>
                    <Typography sx={{ fontFamily: HERO_FONT, fontWeight: 700, color: "#5e35b1", mt: 0.75 }}>↓</Typography>
                    <Typography sx={{ fontFamily: HERO_FONT, fontWeight: 700, fontSize: "1.3rem", color: "#5e35b1" }}>ECOALDEA</Typography>
                  </Box>
                </Reveal>
              </Grid>
            </Grid>
          </Stack>
        </Container>
      </Box>

      {/* CTA FINAL */}
      <Box id="sumarse" sx={{ bgcolor: OSCURO, color: "#fff", py: { xs: 8, md: 11 }, textAlign: "center" }}>
        <Container maxWidth="sm">
          <Reveal>
            <Typography
              sx={{
                fontFamily: HERO_FONT,
                fontWeight: 700,
                letterSpacing: "-0.02em",
                fontSize: { xs: "2rem", md: "3rem" },
                lineHeight: 1.1,
              }}
            >
              ¿Listo para comenzar?
            </Typography>
            <Typography sx={{ mt: 2, fontSize: { xs: "1rem", md: "1.15rem" }, lineHeight: 1.7, color: "rgba(255,255,255,0.8)" }}>
              Entra al Master Ciudadan como socio-becario y empieza a construir tu agencia desde el primer mes.
            </Typography>
            <Button
              variant="contained"
              size="large"
              endIcon={<ArrowForwardRoundedIcon />}
              onClick={() => navigate("/academia")}
              sx={{
                mt: 4,
                px: 3.5,
                py: 1.6,
                borderRadius: 999,
                fontFamily: HERO_FONT,
                fontWeight: 700,
                bgcolor: VERDE,
                color: "#072015",
                boxShadow: "0 12px 30px rgba(25,215,156,0.3)",
                "&:hover": { bgcolor: "#15c98f" },
              }}
            >
              Quiero crear mi comunidad
            </Button>
          </Reveal>
        </Container>
      </Box>
    </Box>
  );
}

