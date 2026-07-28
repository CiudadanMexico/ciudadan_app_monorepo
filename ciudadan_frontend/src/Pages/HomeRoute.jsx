import React, { useEffect } from "react";
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
  useTheme,
} from "@mui/material";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import HandshakeRoundedIcon from "@mui/icons-material/HandshakeRounded";
import BoltRoundedIcon from "@mui/icons-material/BoltRounded";
import ParkRoundedIcon from "@mui/icons-material/ParkRounded";
import TravelExploreRoundedIcon from "@mui/icons-material/TravelExploreRounded";
import SchoolRoundedIcon from "@mui/icons-material/SchoolRounded";
import AccountBalanceWalletRoundedIcon from "@mui/icons-material/AccountBalanceWalletRounded";
import DirectionsCarRoundedIcon from "@mui/icons-material/DirectionsCarRounded";
import StorefrontRoundedIcon from "@mui/icons-material/StorefrontRounded";
import TerminalRoundedIcon from "@mui/icons-material/TerminalRounded";
import MapRoundedIcon from "@mui/icons-material/MapRounded";
import TokenRoundedIcon from "@mui/icons-material/TokenRounded";
import ForumRoundedIcon from "@mui/icons-material/ForumRounded";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";

// Renombra tus imágenes así en /src/assets para que este archivo quede limpio:
// heroOriginalImage.png
// heroCommunityImage.png
// economyImage.png
// laboryImage.png
// assemblyImage.png
// microfactoryImage.png
// academyImage.png
// infrastructureImage.png
// networkImage.png
// closingImage.png
// tokensImage.png

// La imagen original que te encanta debe ser esta: la del estilo eco-village/robots/personas.
// hero principal manejado desde CSS (.home background-image)
import ciudadanCompleto from '../assets/ciudadanCompleto.jpg';
import heroCommunityImage from "../assets/heroCommunityImage.png";
import economyImage from "../assets/economyImage.png";
import laboryImage from "../assets/laboryImage.png";
import assemblyImage from "../assets/assemblyImage.png";
import microfactoryImage from "../assets/microfactoryImage.png";
import academyImage from "../assets/academyImage.png";
import infrastructureImage from "../assets/infrastructureImage.png";
import networkImage from "../assets/networkImage.png";
import closingImage from "../assets/closingImage.png";
import tokensImage from "../assets/tokensImage.png";

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

function SectionBlock({
  eyebrow,
  title,
  subtitle,
  image,
  reverse = false,
  chips = [],
  cards = [],
  primaryAction,
  secondaryAction,
  imageAlt,
}) {
  const theme = useTheme();

  return (
    <Box sx={{ py: { xs: 7, md: 10 } }}>
      <Container maxWidth="xl">
        <Grid
          container
          spacing={4}
          alignItems="center"
          direction={reverse ? "row-reverse" : "row"}
        >
          <Grid item xs={12} md={6}>
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.25 }} variants={fadeUp}>
              <Stack spacing={2.25}>
                <Chip
                  label={eyebrow}
                  sx={{ alignSelf: "flex-start", fontWeight: 700 }}
                  color="success"
                  variant="outlined"
                />
                <Typography
                  variant="h3"
                  sx={{
                    fontWeight: 900,
                    lineHeight: 1.03,
                    letterSpacing: "-0.03em",
                    fontSize: { xs: "2rem", md: "3.1rem" },
                  }}
                >
                  {title}
                </Typography>
                <Typography
                  variant="h6"
                  sx={{
                    color: "text.secondary",
                    lineHeight: 1.55,
                    fontSize: { xs: "1rem", md: "1.15rem" },
                    maxWidth: 640,
                  }}
                >
                  {subtitle}
                </Typography>

                {chips.length > 0 && (
                  <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                    {chips.map((c) => (
                      <Chip key={c} label={c} sx={{ fontWeight: 600 }} />
                    ))}
                  </Stack>
                )}

                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ pt: 0.5 }}>
                  {primaryAction && (
                    <Button
                      variant="contained"
                      size="large"
                      endIcon={<ArrowForwardRoundedIcon />}
                      sx={{ px: 2.4, py: 1.3, borderRadius: 999, fontWeight: 800 }}
                    >
                      {primaryAction}
                    </Button>
                  )}
                  {secondaryAction && (
                    <Button
                      variant="outlined"
                      size="large"
                      sx={{ px: 2.4, py: 1.3, borderRadius: 999, fontWeight: 800 }}
                    >
                      {secondaryAction}
                    </Button>
                  )}
                </Stack>
              </Stack>
            </motion.div>
          </Grid>

          <Grid item xs={12} md={6}>
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 24 }}
              whileInView={{ opacity: 1, scale: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            >
              <Box
                sx={{
                  position: "relative",
                  borderRadius: 6,
                  overflow: "hidden",
                  minHeight: { xs: 300, sm: 380, md: 520 },
                  boxShadow: theme.shadows[10],
                  background: "linear-gradient(180deg, rgba(0,0,0,0.08), rgba(0,0,0,0.22))",
                }}
              >
                <Box
                  component="img"
                  src={image}
                  alt={imageAlt}
                  sx={{
                    width: "100%",
                    height: "100%",
                    minHeight: { xs: 300, sm: 380, md: 520 },
                    objectFit: "cover",
                    display: "block",
                  }}
                />
                <Box
                  sx={{
                    position: "absolute",
                    inset: 0,
                    background:
                      "linear-gradient(180deg, rgba(5,10,16,0.05) 0%, rgba(5,10,16,0.18) 55%, rgba(5,10,16,0.56) 100%)",
                  }}
                />
                {cards.length > 0 && (
                  <Stack
                    spacing={1.25}
                    sx={{
                      position: "absolute",
                      left: { xs: 14, md: 18 },
                      right: { xs: 14, md: 18 },
                      bottom: { xs: 14, md: 18 },
                    }}
                  >
                    {cards.map((card) => (
                      <Card
                        key={card.title}
                        sx={{
                          background: "rgba(10, 15, 20, 0.62)",
                          backdropFilter: "blur(10px)",
                          color: "#fff",
                          borderRadius: 4,
                          border: "1px solid rgba(255,255,255,0.12)",
                        }}
                        elevation={0}
                      >
                        <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
                          <Stack direction="row" spacing={1.25} alignItems="center">
                            <Box
                              sx={{
                                width: 40,
                                height: 40,
                                borderRadius: 2,
                                bgcolor: "rgba(255,255,255,0.12)",
                                display: "grid",
                                placeItems: "center",
                                flex: "0 0 auto",
                              }}
                            >
                              {card.icon}
                            </Box>
                            <Box>
                              <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.15 }}>
                                {card.title}
                              </Typography>
                              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                                {card.text}
                              </Typography>
                            </Box>
                          </Stack>
                        </CardContent>
                      </Card>
                    ))}
                  </Stack>
                )}
              </Box>
            </motion.div>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}

function SmallCard({ icon, title, text }) {
  return (
    <Card
      elevation={0}
      sx={{
        height: "100%",
        borderRadius: 4,
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Stack spacing={1.4}>
          <Box sx={{ color: "success.main" }}>{icon}</Box>
          <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.15 }}>
            {title}
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.6 }}>
            {text}
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}

export default function HomeRoute() {
  useEffect(() => {
    window.dispatchEvent(new Event("closeTopBar"));
  }, []);

  return (
    <Box className="home" sx={{ bgcolor: "#f7faf8", minHeight: "100vh", color: "text.primary", overflowX: "hidden", overflowY: "auto", height: "auto" }}>
      {/* HERO PRINCIPAL: ahora usa la imagen original a pantalla completa en desktop, tablet y mobile */}
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
          src={ciudadanCompleto}
          alt="Comunidad ecofuturista original para el hero principal"
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
                    <Chip
                      icon={<ParkRoundedIcon />}
                      label="Cooperativismo 6.0"
                      variant="outlined"
                      sx={{
                        alignSelf: "flex-start",
                        fontWeight: 900,
                        color: "#eafff5",
                        borderColor: "rgba(255,255,255,0.35)",
                        bgcolor: "rgba(0,0,0,0.24)",
                        backdropFilter: "blur(10px)",
                      }}
                    />
                  </motion.div>

                  <motion.div variants={fadeUp}>
                    <Typography
                      variant="h1"
                      sx={{
                        fontWeight: 950,
                        lineHeight: 0.96,
                        letterSpacing: "-0.05em",
                        fontSize: { xs: "2.35rem", sm: "3.45rem", md: "4.7rem" },
                        maxWidth: 760,
                        color: "#fff",
                        textShadow: "0 3px 24px rgba(0,0,0,0.55)",
                      }}
                    >
                      Gestiona o sé parte de comunidades sustentables que producen, comercializan y avanzan cooperativamente
                    </Typography>
                  </motion.div>

                  <motion.div variants={fadeUp}>
                    <Typography
                      variant="h6"
                      sx={{
                        color: "rgba(255,255,255,0.9)",
                        lineHeight: 1.6,
                        fontSize: { xs: "1rem", md: "1.18rem" },
                        maxWidth: 720,
                        textShadow: "0 2px 12px rgba(0,0,0,0.42)",
                      }}
                    >
                      Tecnología abierta, Labory, economía colaborativa 6.0, asambleas virtuales y redes productivas para que socios, conductores, fundadores e inversionistas construyan autonomía real.
                    </Typography>
                  </motion.div>

                  <motion.div variants={fadeUp}>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                      <Button
                        variant="contained"
                        size="large"
                        endIcon={<ArrowForwardRoundedIcon />}
                        sx={{
                          px: 2.8,
                          py: 1.45,
                          borderRadius: 999,
                          fontWeight: 900,
                          bgcolor: "#19d79c",
                          color: "#072015",
                          boxShadow: "0 12px 30px rgba(25,215,156,0.28)",
                          "&:hover": { bgcolor: "#15c98f" },
                        }}
                      >
                        Explorar el ecosistema
                      </Button>
                      <Button
                        variant="outlined"
                        size="large"
                        sx={{
                          px: 2.8,
                          py: 1.45,
                          borderRadius: 999,
                          fontWeight: 900,
                          color: "#fff",
                          borderColor: "rgba(255,255,255,0.4)",
                          bgcolor: "rgba(0,0,0,0.18)",
                          backdropFilter: "blur(8px)",
                          "&:hover": { borderColor: "rgba(255,255,255,0.7)", bgcolor: "rgba(0,0,0,0.28)" },
                        }}
                      >
                        Usar Labory
                      </Button>
                    </Stack>
                  </motion.div>

                  <motion.div variants={fadeUp}>
                    <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ pt: 0.5 }}>
                      {[
                        "Comunidades autónomas",
                        "Economía colaborativa 6.0",
                        "Movilidad cooperativa",
                        "Asambleas virtuales",
                      ].map((item) => (
                        <Chip
                          key={item}
                          label={item}
                          sx={{
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
                      Un ecosistema vivo
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
                        src={heroCommunityImage}
                        alt="Imagen secundaria del ecosistema CIUDADAN"
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

      {/* BLOQUE BREVE: imagen desplazada + 2 cuadros de texto */}
      <Box sx={{ py: { xs: 5, md: 7 } }}>
        <Container maxWidth="xl">
          <Grid container spacing={2.5} alignItems="stretch">
            <Grid item xs={12} md={4}>
              <SmallCard
                icon={<StorefrontRoundedIcon fontSize="large" />}
                title="Comercializa dentro de la red"
                text="Haz que productos, servicios y comunidades se conecten mejor para vender con más alcance y sentido colectivo."
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <Box
                sx={{
                  position: "relative",
                  height: "100%",
                  minHeight: { xs: 300, md: 360 },
                  borderRadius: 4,
                  overflow: "hidden",
                  boxShadow: 8,
                }}
              >
                <Box
                  component="img"
                  src={heroCommunityImage}
                  alt="Imagen de apoyo del home"
                  sx={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                />
                <Box sx={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,0.1), rgba(0,0,0,0.42))" }} />
                <Box sx={{ position: "absolute", left: 16, right: 16, bottom: 16 }}>
                  <Chip label="Ecosistema activo" sx={{ mb: 1.2, fontWeight: 800, bgcolor: "rgba(255,255,255,0.92)" }} />
                  <Typography variant="h6" sx={{ color: "#fff", fontWeight: 900, lineHeight: 1.05 }}>
                    Participa, crea, comparte y fortalece la red
                  </Typography>
                </Box>
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <SmallCard
                icon={<DirectionsCarRoundedIcon fontSize="large" />}
                title="Usa Labory y obtén beneficios"
                text="Conductores, socios y usuarios participan en una plataforma cooperativa con economía colaborativa 6.0."
              />
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* BLOQUE CONTEXTO / PROBLEMA */}
      <Box sx={{ py: { xs: 5, md: 8 } }}>
        <Container maxWidth="lg">
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card sx={{ borderRadius: 4, bgcolor: "#0e1613", color: "#fff", height: "100%" }} elevation={0}>
                <CardContent sx={{ p: 4 }}>
                  <Stack spacing={2}>
                    <Box sx={{ color: "#8ee6b2" }}><TravelExploreRoundedIcon fontSize="large" /></Box>
                    <Typography variant="h4" sx={{ fontWeight: 900, lineHeight: 1.05 }}>
                      Aquí la gente no sólo mira una idea.
                    </Typography>
                    <Typography sx={{ color: "rgba(255,255,255,0.82)", lineHeight: 1.65 }}>
                      Entra a una red donde puede organizarse mejor, vender, moverse, aprender, colaborar y obtener beneficios por participar.
                    </Typography>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card sx={{ borderRadius: 4, bgcolor: "background.paper", height: "100%" }} elevation={0}>
                <CardContent sx={{ p: 4 }}>
                  <Stack spacing={2}>
                    <Box sx={{ color: "success.main" }}><HandshakeRoundedIcon fontSize="large" /></Box>
                    <Typography variant="h4" sx={{ fontWeight: 900, lineHeight: 1.05 }}>
                      Cooperación real, no discurso vacío.
                    </Typography>
                    <Typography sx={{ color: "text.secondary", lineHeight: 1.65 }}>
                      CIUDADAN conecta comunidad, tecnología y economía colaborativa 6.0 para construir soluciones concretas y escalables.
                    </Typography>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* ECONOMÍA COLABORATIVA 6.0 */}
      <SectionBlock
        eyebrow="Economía colaborativa 6.0"
        title="La economía debe beneficiar a quienes participan"
        subtitle="Usa Labory, conecta con tu red, comparte servicios y haz que la participación genere valor para conductores, socios, comunidades e inversionistas."
        image={economyImage}
        imageAlt="Mercado cooperativo tecnológico con personas intercambiando y colaborando"
        reverse={false}
        chips={["Beneficios por usar la red", "Comercialización", "Redes productivas", "Economía local"]}
        cards={[
          { icon: <StorefrontRoundedIcon />, title: "Comercializa mejor", text: "Vende y conecta productos o servicios dentro de la red." },
          { icon: <ForumRoundedIcon />, title: "Recomienda y crece", text: "La colaboración fortalece a toda la comunidad." },
        ]}
        primaryAction="Usar Labory"
        secondaryAction="Ver cómo funciona"
      />

      {/* LABORY */}
      <SectionBlock
        eyebrow="Labory"
        title="Movilidad cooperativa para una economía más viva"
        subtitle="Labory se presenta como parte del ecosistema: una herramienta para conectar conductores, usuarios y redes locales con beneficios claros para quienes participan y aceptan la economía colaborativa 6.0."
        image={laboryImage}
        imageAlt="Movilidad cooperativa futurista con conductores y rutas digitales"
        reverse
        chips={["Conductores", "Socios líderes", "Beneficios", "Red cooperativa"]}
        cards={[
          { icon: <DirectionsCarRoundedIcon />, title: "Conductores", text: "Una red para moverse y generar participación económica." },
          { icon: <MapRoundedIcon />, title: "Rutas inteligentes", text: "Mapas y coordinación digital para operar mejor." },
        ]}
        primaryAction="Aceptar Labory"
        secondaryAction="Conocer beneficios"
      />

      {/* FORMAS DE PARTICIPAR */}
      <Box sx={{ py: { xs: 7, md: 10 } }}>
        <Container maxWidth="xl">
          <Stack spacing={2.5} sx={{ mb: 4 }}>
            <Chip label="Formas de participar" color="success" variant="outlined" sx={{ alignSelf: "flex-start", fontWeight: 700 }} />
            <Typography variant="h3" sx={{ fontWeight: 900, letterSpacing: "-0.03em", lineHeight: 1.05, fontSize: { xs: "2rem", md: "3rem" } }}>
              Distintos roles dentro del ecosistema
            </Typography>
            <Typography sx={{ color: "text.secondary", maxWidth: 900, lineHeight: 1.65 }}>
              El home debe mostrar desde el primer vistazo que aquí hay caminos distintos para entrar, crecer y aportar: socios líderes conductores, socios fundadores, comunidad en asambleas, inversionistas, agencia y usuarios de la app.
            </Typography>
          </Stack>

          <Grid container spacing={2.5}>
            <Grid item xs={12} sm={6} lg={3}>
              <SmallCard
                icon={<DirectionsCarRoundedIcon fontSize="large" />}
                title="Socios líderes conductores"
                text="Afiliación, expansión de red y participación operativa dentro del modelo Labory."
              />
            </Grid>
            <Grid item xs={12} sm={6} lg={3}>
              <SmallCard
                icon={<GroupsRoundedIcon fontSize="large" />}
                title="Socios fundadores"
                text="Visión transdisciplinaria, consejo federal y formación dentro del master."
              />
            </Grid>
            <Grid item xs={12} sm={6} lg={3}>
              <SmallCard
                icon={<ForumRoundedIcon fontSize="large" />}
                title="Asambleas virtuales"
                text="Coordinación, votación, colaboración y gobernanza digital de las comunidades."
              />
            </Grid>
            <Grid item xs={12} sm={6} lg={3}>
              <SmallCard
                icon={<TokenRoundedIcon fontSize="large" />}
                title="Inversionistas y tokens"
                text="Infraestructura económica para crecer, descentralizar y escalar el ecosistema."
              />
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* ASAMBLEAS */}
      <SectionBlock
        eyebrow="Gobernanza digital"
        title="Asambleas virtuales para coordinar comunidades reales"
        subtitle="La organización no se queda en la idea: se traduce en participación, acuerdos, roles y decisiones dentro de sistemas transparentes y más descentralizados."
        image={assemblyImage}
        imageAlt="Asamblea digital con pantallas holográficas y participación comunitaria"
        reverse={false}
        chips={["Decisión colectiva", "Transparencia", "Redes comunitarias", "Participación"]}
        cards={[
          { icon: <GroupsRoundedIcon />, title: "Comunidad organizada", text: "Cada grupo puede coordinarse y crecer con más claridad." },
          { icon: <BoltRoundedIcon />, title: "Acción inmediata", text: "La gobernanza digital aterriza acuerdos en proyectos." },
        ]}
        primaryAction="Participar en la comunidad"
        secondaryAction="Ver asambleas"
      />

      {/* MICROFÁBRICAS */}
      <SectionBlock
        eyebrow="Producción local"
        title="Microfábricas y producción distribuida"
        subtitle="La autonomía también se construye produciendo: fabricación local, herramientas open source, tecnología accesible y espacios donde aprender haciendo."
        image={microfactoryImage}
        imageAlt="Microfábrica cooperativa con impresoras 3D y herramientas open source"
        reverse
        chips={["CNC", "Impresión 3D", "Open source", "Producción local"]}
        cards={[
          { icon: <TerminalRoundedIcon />, title: "Tecnología abierta", text: "Herramientas para producir sin depender de grandes corporaciones." },
          { icon: <TrendingUpRoundedIcon />, title: "Capacidad colectiva", text: "Más producción, más aprendizaje, más autonomía." },
        ]}
        primaryAction="Crear infraestructura"
        secondaryAction="Conocer producción"
      />

      {/* EDUCACIÓN */}
      <SectionBlock
        eyebrow="Academia / Master"
        title="Aprender para construir, no sólo para mirar"
        subtitle="Educación transdisciplinaria, inteligencia artificial y formación comunitaria para que cada participante tenga más herramientas para crear, coordinar y escalar proyectos."
        image={academyImage}
        imageAlt="Espacio educativo futurista con IA y aprendizaje comunitario"
        reverse={false}
        chips={["IA", "Educación abierta", "Master", "Conocimiento útil"]}
        cards={[
          { icon: <SchoolRoundedIcon />, title: "Aprendizaje útil", text: "Contenido para resolver problemas reales de la comunidad." },
          { icon: <TravelExploreRoundedIcon />, title: "Visión transdisciplinaria", text: "Formación para conectar tecnología, economía y organización." },
        ]}
        primaryAction="Explorar la academia"
        secondaryAction="Ver programas"
      />

      {/* INFRAESTRUCTURA SUSTENTABLE */}
      <SectionBlock
        eyebrow="Sustentabilidad"
        title="Infraestructura verde para comunidades más fuertes"
        subtitle="Energía solar, agricultura urbana, reciclaje, arquitectura ecofuturista y sistemas que acompañan la vida comunitaria en vez de frenarla."
        image={infrastructureImage}
        imageAlt="Infraestructura sustentable con paneles solares, vegetación y arquitectura ecofuturista"
        reverse
        chips={["Solar", "Agua", "Reciclaje", "Agricultura"]}
        cards={[
          { icon: <ParkRoundedIcon />, title: "Menos dependencia", text: "Más capacidad local para sostener la vida cotidiana." },
          { icon: <BoltRoundedIcon />, title: "Eficiencia real", text: "Tecnología que reduce costos y mejora la operación." },
        ]}
        primaryAction="Ver sustentabilidad"
        secondaryAction="Conocer el modelo"
      />

      {/* RED DE COMUNIDADES */}
      <SectionBlock
        eyebrow="Red"
        title="Muchas comunidades, un mismo ecosistema"
        subtitle="CIUDADAN no es una isla: conecta nodos, grupos y proyectos para compartir conocimiento, producción, movilidad, educación y economía."
        image={networkImage}
        imageAlt="Mapa de comunidades conectadas por líneas luminosas"
        reverse={false}
        chips={["Descentralización", "Conexión", "Nodos", "Colaboración"]}
        cards={[
          { icon: <MapRoundedIcon />, title: "Nodos conectados", text: "Cada comunidad aporta y recibe dentro de la red." },
          { icon: <HandshakeRoundedIcon />, title: "Crecimiento compartido", text: "Una red fuerte es una red que beneficia a todos." },
        ]}
        primaryAction="Sumarme a la red"
        secondaryAction="Ver mapa del ecosistema"
      />

      {/* TOKENS / INVERSIÓN */}
      <SectionBlock
        eyebrow="Tokens / inversión"
        title="Participación económica para escalar el ecosistema"
        subtitle="La infraestructura también necesita respaldo económico. Tokens, inversión y participación ayudan a desarrollar nuevas herramientas y ampliar el alcance de la red."
        image={tokensImage}
        imageAlt="Representación futurista de tokens y economía descentralizada cooperativa"
        reverse
        chips={["Tokens", "Participación", "Escala", "Infraestructura"]}
        cards={[
          { icon: <AccountBalanceWalletRoundedIcon />, title: "Entrada económica", text: "Más formas de participar en la expansión del proyecto." },
          { icon: <TrendingUpRoundedIcon />, title: "Crecimiento colectivo", text: "Escalar sin perder el enfoque comunitario." },
        ]}
        primaryAction="Conocer inversión"
        secondaryAction="Ver economía descentralizada"
      />

      {/* CTA FINAL */}
      <Box sx={{ py: { xs: 7, md: 10 } }}>
        <Container maxWidth="xl">
          <Card
            sx={{
              position: "relative",
              overflow: "hidden",
              borderRadius: 6,
              minHeight: { xs: 420, md: 560 },
              bgcolor: "#08110e",
              color: "#fff",
            }}
            elevation={0}
          >
            <Box
              component="img"
              src={closingImage}
              alt="Personas mirando una comunidad futura sustentable"
              sx={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.62 }}
            />
            <Box
              sx={{
                position: "absolute",
                inset: 0,
                background:
                  "linear-gradient(90deg, rgba(5,10,8,0.92) 0%, rgba(5,10,8,0.74) 42%, rgba(5,10,8,0.25) 100%)",
              }}
            />
            <CardContent sx={{ position: "relative", p: { xs: 4, md: 7 } }}>
              <Grid container spacing={4} alignItems="center">
                <Grid item xs={12} md={7}>
                  <Stack spacing={2.5}>
                    <Chip
                      icon={<GroupsRoundedIcon />}
                      label="Construcción colectiva"
                      sx={{ alignSelf: "flex-start", bgcolor: "rgba(255,255,255,0.12)", color: "#fff", fontWeight: 800 }}
                    />
                    <Typography variant="h2" sx={{ fontWeight: 950, lineHeight: 0.98, letterSpacing: "-0.05em", fontSize: { xs: "2.2rem", md: "4rem" } }}>
                      No consumas solamente plataformas.
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 800, lineHeight: 1.08, fontSize: { xs: "1.5rem", md: "2.2rem" }, maxWidth: 820 }}>
                      Construye redes que también te beneficien.
                    </Typography>
                    <Typography sx={{ color: "rgba(255,255,255,0.88)", maxWidth: 760, lineHeight: 1.7, fontSize: { xs: "0.98rem", md: "1.05rem" } }}>
                      CIUDADAN conecta tecnología, comunidad, producción y economía colaborativa para crear autonomía colectiva con herramientas reales.
                    </Typography>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ pt: 1 }}>
                      <Button variant="contained" size="large" endIcon={<ArrowForwardRoundedIcon />} sx={{ px: 2.7, py: 1.4, borderRadius: 999, fontWeight: 900 }}>
                        Entrar al ecosistema
                      </Button>
                      <Button variant="outlined" size="large" sx={{ px: 2.7, py: 1.4, borderRadius: 999, fontWeight: 900, color: "#fff", borderColor: "rgba(255,255,255,0.4)" }}>
                        Crear comunidad
                      </Button>
                    </Stack>
                  </Stack>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Container>
      </Box>
    </Box>
  );
}
