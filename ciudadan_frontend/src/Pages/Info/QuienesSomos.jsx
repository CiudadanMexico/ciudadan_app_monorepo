import React from "react";
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
import ParkRoundedIcon from "@mui/icons-material/ParkRounded";
import BoltRoundedIcon from "@mui/icons-material/BoltRounded";
import PublicRoundedIcon from "@mui/icons-material/PublicRounded";
import SchoolRoundedIcon from "@mui/icons-material/SchoolRounded";
import StorefrontRoundedIcon from "@mui/icons-material/StorefrontRounded";
import DirectionsCarRoundedIcon from "@mui/icons-material/DirectionsCarRounded";
import TerminalRoundedIcon from "@mui/icons-material/TerminalRounded";
import TokenRoundedIcon from "@mui/icons-material/TokenRounded";
import MapRoundedIcon from "@mui/icons-material/MapRounded";
import HandshakeRoundedIcon from "@mui/icons-material/HandshakeRounded";
import AccountBalanceWalletRoundedIcon from "@mui/icons-material/AccountBalanceWalletRounded";
import SecurityRoundedIcon from "@mui/icons-material/SecurityRounded";
import WorkspacePremiumRoundedIcon from "@mui/icons-material/WorkspacePremiumRounded";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";

// Usamos las mismas imágenes ya existentes en el home.
import heroCommunityImage from "../../assets/heroCommunityImage.png";
import economyImage from "../../assets/economyImage.png";
import laboryImage from "../../assets/laboryImage.png";
import assemblyImage from "../../assets/assemblyImage.png";
import microfactoryImage from "../../assets/microfactoryImage.png";
import academyImage from "../../assets/academyImage.png";
import infrastructureImage from "../../assets/infrastructureImage.png";
import networkImage from "../../assets/networkImage.png";
import closingImage from "../../assets/closingImage.png";

const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  visible: { opacity: 1, y: 0 },
};

function Section({
  eyebrow,
  title,
  text,
  image,
  reverse = false,
  chips = [],
  bullets = [],
  ctaPrimary,
  ctaSecondary,
  imageAlt,
}) {
  const theme = useTheme();

  return (
    <Box sx={{ py: { xs: 7, md: 10 } }}>
      <Container maxWidth="xl">
        <Grid container spacing={4} alignItems="center" direction={reverse ? "row-reverse" : "row"}>
          <Grid item xs={12} md={6}>
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.25 }} variants={fadeUp}>
              <Stack spacing={2.1}>
                <Chip
                  label={eyebrow}
                  color="success"
                  variant="outlined"
                  sx={{ alignSelf: "flex-start", fontWeight: 800 }}
                />
                <Typography
                  variant="h3"
                  sx={{
                    fontWeight: 950,
                    lineHeight: 1.02,
                    letterSpacing: "-0.04em",
                    fontSize: { xs: "2rem", md: "3.2rem" },
                    maxWidth: 760,
                  }}
                >
                  {title}
                </Typography>
                <Typography
                  variant="h6"
                  sx={{
                    color: "text.secondary",
                    lineHeight: 1.68,
                    fontSize: { xs: "1rem", md: "1.12rem" },
                    maxWidth: 780,
                  }}
                >
                  {text}
                </Typography>

                {chips.length > 0 && (
                  <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                    {chips.map((chip) => (
                      <Chip key={chip} label={chip} sx={{ fontWeight: 700 }} />
                    ))}
                  </Stack>
                )}

                {bullets.length > 0 && (
                  <Stack spacing={1.4} sx={{ pt: 0.5 }}>
                    {bullets.map((bullet) => (
                      <Stack key={bullet.title} direction="row" spacing={1.5} alignItems="flex-start">
                        <Box
                          sx={{
                            width: 34,
                            height: 34,
                            borderRadius: 2,
                            bgcolor: "success.light",
                            color: "success.dark",
                            display: "grid",
                            placeItems: "center",
                            flex: "0 0 auto",
                            mt: 0.2,
                          }}
                        >
                          {bullet.icon}
                        </Box>
                        <Box>
                          <Typography sx={{ fontWeight: 800, lineHeight: 1.2 }}>{bullet.title}</Typography>
                          <Typography sx={{ color: "text.secondary", lineHeight: 1.55 }}>{bullet.text}</Typography>
                        </Box>
                      </Stack>
                    ))}
                  </Stack>
                )}

                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ pt: 0.5 }}>
                  {ctaPrimary && (
                    <Button
                      variant="contained"
                      size="large"
                      endIcon={<ArrowForwardRoundedIcon />}
                      sx={{ borderRadius: 999, fontWeight: 900, px: 2.8, py: 1.45 }}
                    >
                      {ctaPrimary}
                    </Button>
                  )}
                  {ctaSecondary && (
                    <Button
                      variant="outlined"
                      size="large"
                      sx={{ borderRadius: 999, fontWeight: 900, px: 2.8, py: 1.45 }}
                    >
                      {ctaSecondary}
                    </Button>
                  )}
                </Stack>
              </Stack>
            </motion.div>
          </Grid>

          <Grid item xs={12} md={6}>
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 18 }}
              whileInView={{ opacity: 1, scale: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            >
              <Box
                sx={{
                  position: "relative",
                  overflow: "hidden",
                  borderRadius: 6,
                  minHeight: { xs: 300, sm: 380, md: 500 },
                  boxShadow: theme.shadows[10],
                }}
              >
                <Box
                  component="img"
                  src={image}
                  alt={imageAlt}
                  sx={{
                    width: "100%",
                    height: "100%",
                    minHeight: { xs: 300, sm: 380, md: 500 },
                    objectFit: "cover",
                    display: "block",
                  }}
                />
                <Box
                  sx={{
                    position: "absolute",
                    inset: 0,
                    background:
                      "linear-gradient(180deg, rgba(6,10,8,0.06) 0%, rgba(6,10,8,0.16) 45%, rgba(6,10,8,0.58) 100%)",
                  }}
                />
              </Box>
            </motion.div>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}

function MetricCard({ icon, title, text }) {
  return (
    <Card elevation={0} sx={{ height: "100%", borderRadius: 4, border: "1px solid", borderColor: "divider" }}>
      <CardContent sx={{ p: 3 }}>
        <Stack spacing={1.4}>
          <Box sx={{ color: "success.main" }}>{icon}</Box>
          <Typography variant="h6" sx={{ fontWeight: 900, lineHeight: 1.15 }}>
            {title}
          </Typography>
          <Typography sx={{ color: "text.secondary", lineHeight: 1.65 }}>{text}</Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}

export default function QuienesSomos() {
  return (
    <Box sx={{ bgcolor: "#f7faf8", color: "text.primary", overflowX: "hidden" }}>
      {/* HERO */}
      <Box sx={{ position: "relative", minHeight: { xs: "92svh", md: "100svh" }, overflow: "hidden", bgcolor: "#07120f" }}>
        <Box
          component="img"
          src={heroCommunityImage}
          alt="Ciudadan en una comunidad ecofuturista cooperativa"
          sx={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center",
            filter: "saturate(1.05) contrast(1.05)",
          }}
        />
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(90deg, rgba(5,10,8,0.92) 0%, rgba(5,10,8,0.72) 35%, rgba(5,10,8,0.3) 70%, rgba(5,10,8,0.16) 100%)",
          }}
        />
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(circle at 18% 18%, rgba(0,255,170,0.2) 0%, rgba(0,255,170,0.06) 18%, transparent 38%), radial-gradient(circle at 78% 20%, rgba(85,255,201,0.14) 0%, transparent 28%)",
            pointerEvents: "none",
          }}
        />

        <Container maxWidth="xl" sx={{ position: "relative", zIndex: 1, py: { xs: 4, md: 6 } }}>
          <Grid container alignItems="center" sx={{ minHeight: { xs: "92svh", md: "100svh" } }}>
            <Grid item xs={12} md={7} lg={6}>
              <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.09 } } }}>
                <Stack spacing={2.5}>
                  <motion.div variants={fadeUp}>
                    <Chip
                      label="Quiénes somos"
                      icon={<PublicRoundedIcon />}
                      sx={{
                        alignSelf: "flex-start",
                        fontWeight: 900,
                        color: "#fff",
                        bgcolor: "rgba(255,255,255,0.12)",
                        border: "1px solid rgba(255,255,255,0.18)",
                        backdropFilter: "blur(10px)",
                      }}
                    />
                  </motion.div>
                  <motion.div variants={fadeUp}>
                    <Typography
                      variant="h1"
                      sx={{
                        color: "#fff",
                        fontWeight: 950,
                        lineHeight: 0.96,
                        letterSpacing: "-0.05em",
                        fontSize: { xs: "2.35rem", sm: "3.45rem", md: "4.8rem" },
                        maxWidth: 860,
                        textShadow: "0 3px 22px rgba(0,0,0,0.55)",
                      }}
                    >
                      Una red cooperativa para comunidad e inversión que construye economía real
                    </Typography>
                  </motion.div>
                  <motion.div variants={fadeUp}>
                    <Typography
                      variant="h6"
                      sx={{
                        color: "rgba(255,255,255,0.9)",
                        lineHeight: 1.68,
                        fontSize: { xs: "1rem", md: "1.16rem" },
                        maxWidth: 780,
                        textShadow: "0 2px 12px rgba(0,0,0,0.4)",
                      }}
                    >
                      CIUDADAN une a comunidades que quieren producir, comercializar, organizarse y avanzar juntas con inversionistas, socios, conductores y creadores que comparten una misma visión: un ecosistema más autónomo, sustentable y útil.
                    </Typography>
                  </motion.div>
                  <motion.div variants={fadeUp}>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                      <Button
                        variant="contained"
                        size="large"
                        endIcon={<ArrowForwardRoundedIcon />}
                        sx={{
                          borderRadius: 999,
                          fontWeight: 900,
                          px: 2.8,
                          py: 1.45,
                          bgcolor: "#19d79c",
                          color: "#072015",
                          boxShadow: "0 12px 30px rgba(25,215,156,0.26)",
                          "&:hover": { bgcolor: "#11c48c" },
                        }}
                      >
                        Conocer la propuesta
                      </Button>
                      <Button
                        variant="outlined"
                        size="large"
                        sx={{
                          borderRadius: 999,
                          fontWeight: 900,
                          px: 2.8,
                          py: 1.45,
                          color: "#fff",
                          borderColor: "rgba(255,255,255,0.4)",
                          bgcolor: "rgba(0,0,0,0.18)",
                          backdropFilter: "blur(8px)",
                        }}
                      >
                        Ver cómo participar
                      </Button>
                    </Stack>
                  </motion.div>
                  <motion.div variants={fadeUp}>
                    <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                      {[
                        "Comunidad",
                        "Autonomía",
                        "Cooperación",
                        "Descentralización",
                        "Ambientalismo",
                        "Economía",
                        "Inversión",
                      ].map((item) => (
                        <Chip
                          key={item}
                          label={item}
                          sx={{
                            fontWeight: 800,
                            color: "#fff",
                            bgcolor: "rgba(255,255,255,0.1)",
                            border: "1px solid rgba(255,255,255,0.16)",
                            backdropFilter: "blur(10px)",
                          }}
                        />
                      ))}
                    </Stack>
                  </motion.div>
                </Stack>
              </motion.div>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* IDENTIDAD */}
      <Section
        eyebrow="Nuestra identidad"
        title="No somos una idea aislada: somos infraestructura para comunidades productivas"
        text="Nacemos para conectar comunidades pequeñas pero productivas, compartir know-how, fortalecer economías locales y crear un ecosistema donde la tecnología no sustituya a la comunidad, sino que la potencie."
        image={networkImage}
        imageAlt="Red de comunidades conectadas"
        chips={["Cooperativismo 6.0", "Open source", "Tecnología humana", "Redes productivas"]}
        bullets={[
          {
            icon: <GroupsRoundedIcon fontSize="small" />,
            title: "Comunidad primero",
            text: "La red existe para organizar personas, no para aislar usuarios.",
          },
          {
            icon: <ParkRoundedIcon fontSize="small" />,
            title: "Sustentabilidad real",
            text: "Diseñamos para producir mejor, consumir menos y depender menos.",
          },
        ]}
        ctaPrimary="Explorar la visión"
        ctaSecondary="Leer el manifiesto"
      />

      {/* DOS LECTURAS: comunidad e inversión */}
      <Box sx={{ py: { xs: 5, md: 8 } }}>
        <Container maxWidth="xl">
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card sx={{ borderRadius: 4, height: "100%" }} elevation={0}>
                <CardContent sx={{ p: 4 }}>
                  <Stack spacing={2}>
                    <GroupsRoundedIcon color="success" />
                    <Typography variant="h4" sx={{ fontWeight: 950, lineHeight: 1.05 }}>
                      Para comunidad
                    </Typography>
                    <Typography sx={{ color: "text.secondary", lineHeight: 1.65 }}>
                      Si eres parte de una comunidad, cooperativa, colectivo o grupo organizado, aquí encuentras herramientas para producir, comercializar, aprender, coordinarte y crecer con autonomía.
                    </Typography>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card sx={{ borderRadius: 4, height: "100%" }} elevation={0}>
                <CardContent sx={{ p: 4 }}>
                  <Stack spacing={2}>
                    <TokenRoundedIcon color="success" />
                    <Typography variant="h4" sx={{ fontWeight: 950, lineHeight: 1.05 }}>
                      Para inversión
                    </Typography>
                    <Typography sx={{ color: "text.secondary", lineHeight: 1.65 }}>
                      Si te interesa respaldar un ecosistema con lógica cooperativa, aquí hay expansión, tokens, crecimiento de red y una propuesta con impacto social y económico claro.
                    </Typography>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* ECOSISTEMA */}
      <Box sx={{ py: { xs: 5, md: 8 } }}>
        <Container maxWidth="xl">
          <Stack spacing={1.2} sx={{ mb: 4 }}>
            <Chip label="Qué hacemos" color="success" variant="outlined" sx={{ alignSelf: "flex-start", fontWeight: 800 }} />
            <Typography variant="h3" sx={{ fontWeight: 950, letterSpacing: "-0.04em", lineHeight: 1.02, fontSize: { xs: "2rem", md: "3.1rem" }, maxWidth: 760 }}>
              Un ecosistema que convierte participación en valor
            </Typography>
            <Typography sx={{ color: "text.secondary", lineHeight: 1.65, maxWidth: 900 }}>
              CIUDADAN articula movilidad cooperativa, educación, comunidad, economía colaborativa, inversión con tokens, agencia digital y asambleas virtuales. La idea no vive sola; se convierte en sistema.
            </Typography>
          </Stack>

          <Grid container spacing={2.5}>
            <Grid item xs={12} sm={6} lg={3}>
              <MetricCard icon={<DirectionsCarRoundedIcon fontSize="large" />} title="Labory" text="Movilidad cooperativa con beneficios por participar y aceptar la red." />
            </Grid>
            <Grid item xs={12} sm={6} lg={3}>
              <MetricCard icon={<SchoolRoundedIcon fontSize="large" />} title="Academia / Master" text="Formación transdisciplinaria, IA, tecnología y construcción de capacidades." />
            </Grid>
            <Grid item xs={12} sm={6} lg={3}>
              <MetricCard icon={<StorefrontRoundedIcon fontSize="large" />} title="Economía colaborativa 6.0" text="Comercialización, recomendación y redes que generan valor compartido." />
            </Grid>
            <Grid item xs={12} sm={6} lg={3}>
              <MetricCard icon={<AccountBalanceWalletRoundedIcon fontSize="large" />} title="Tokens e inversión" text="Infraestructura económica para escalar sin perder el enfoque comunitario." />
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* LABORY */}
      <Section
        eyebrow="Labory"
        title="Usar Labory es participar en una economía que sí te regresa valor"
        text="Labory es una puerta de entrada al ecosistema: conductores, socios y usuarios se integran a una red donde la participación activa fortalece la comunidad y abre beneficios para quien adopta el modelo cooperativo."
        image={laboryImage}
        imageAlt="Labory como red de movilidad cooperativa"
        reverse
        chips={["Conductores", "Usuarios", "Beneficios", "Economía colaborativa 6.0"]}
        bullets={[
          {
            icon: <HandshakeRoundedIcon fontSize="small" />,
            title: "Más que uso",
            text: "La app conecta personas y también distribuye oportunidad económica.",
          },
          {
            icon: <AccountBalanceWalletRoundedIcon fontSize="small" />,
            title: "Beneficios por aceptar y recomendar",
            text: "La red crece mejor cuando participa más gente dentro del mismo sistema.",
          },
        ]}
        ctaPrimary="Conocer Labory"
        ctaSecondary="Ver beneficios"
      />

      {/* GOBERNANZA */}
      <Section
        eyebrow="Gobernanza"
        title="Asambleas virtuales, consejo y decisiones más transparentes"
        text="La citocracia y la coordinación digital permiten que las comunidades participen en decisiones importantes, compartan visión y mantengan procesos más abiertos, auditables y ordenados."
        image={assemblyImage}
        imageAlt="Asamblea virtual y gobernanza digital de CIUDADAN"
        chips={["Citocracia", "Asambleas virtuales", "Transparencia", "Coordinación"]}
        bullets={[
          {
            icon: <PublicRoundedIcon fontSize="small" />,
            title: "Decisión distribuida",
            text: "Las comunidades se organizan con más voz, voto y claridad.",
          },
          {
            icon: <SecurityRoundedIcon fontSize="small" />,
            title: "Procesos auditables",
            text: "Lo importante no se esconde: se coordina, se registra y se mejora.",
          },
        ]}
        ctaPrimary="Ver modelo de gobernanza"
        ctaSecondary="Entrar a asambleas"
      />

      {/* PRODUCCIÓN */}
      <Section
        eyebrow="Producción"
        title="Microfábricas, manufactura local y comunidad productiva"
        text="Queremos que las comunidades no dependan sólo de comprar afuera. La producción local, el know-how compartido y la fabricación distribuida abren la puerta a más empleo, más aprendizaje y más autonomía."
        image={microfactoryImage}
        imageAlt="Microfábrica cooperativa y producción distribuida"
        reverse
        chips={["Microfábricas", "Open source", "Manufactura local", "Empleo comunitario"]}
        bullets={[
          {
            icon: <TerminalRoundedIcon fontSize="small" />,
            title: "Tecnología accesible",
            text: "Herramientas y procesos que pueden replicarse en varias comunidades.",
          },
          {
            icon: <ParkRoundedIcon fontSize="small" />,
            title: "Menos dependencia",
            text: "Más capacidad local para resolver necesidades reales.",
          },
        ]}
        ctaPrimary="Conocer producción"
        ctaSecondary="Ver infraestructura"
      />

      {/* ACADEMIA */}
      <Section
        eyebrow="Academia / Master"
        title="Formación para quienes quieren hacer que las cosas pasen"
        text="La academia y el master están pensados para perfiles diversos: fundadores, líderes, conductores, creativos, técnicos, emprendedores, comunidades e inversionistas que necesitan entender, operar y escalar el ecosistema."
        image={academyImage}
        imageAlt="Academia de formación comunitaria con IA y colaboración transdisciplinaria"
        chips={["IA", "Formación", "Transdisciplina", "Capacidades"]}
        bullets={[
          {
            icon: <SchoolRoundedIcon fontSize="small" />,
            title: "Aprendizaje útil",
            text: "No es teoría vacía: es formación para resolver y producir.",
          },
          {
            icon: <WorkspacePremiumRoundedIcon fontSize="small" />,
            title: "Liderazgo preparado",
            text: "Quien entra al master puede orientar proyectos y formar a otros.",
          },
        ]}
        ctaPrimary="Explorar la academia"
        ctaSecondary="Ver el master"
      />

      {/* IMPACTO */}
      <Section
        eyebrow="Impacto"
        title="Sustentabilidad, energía y vida comunitaria en un mismo sistema"
        text="Ambientalismo no como adorno, sino como parte del diseño: energía, agua, reciclaje, arquitectura, agricultura y movilidad se integran para que la comunidad tenga más resiliencia."
        image={infrastructureImage}
        imageAlt="Infraestructura sustentable con energía limpia y vida comunitaria"
        reverse
        chips={["Ambientalismo", "Resiliencia", "Energía", "Agua"]}
        bullets={[
          {
            icon: <ParkRoundedIcon fontSize="small" />,
            title: "Vida más sostenible",
            text: "La infraestructura acompaña a la comunidad y no la agrede.",
          },
          {
            icon: <BoltRoundedIcon fontSize="small" />,
            title: "Energía y eficiencia",
            text: "Tecnología que reduce fricción y mejora la operación diaria.",
          },
        ]}
        ctaPrimary="Ver impacto"
        ctaSecondary="Conocer sostenibilidad"
      />

      {/* RED */}
      <Section
        eyebrow="Red de comunidades"
        title="Muchas comunidades, una sola arquitectura de colaboración"
        text="No queremos un centro que controle todo. Queremos una red de nodos que compartan herramientas, conocimiento, datos y oportunidades para crecer de forma distribuida."
        image={networkImage}
        imageAlt="Red global de comunidades conectadas"
        chips={["Descentralización", "Nodos", "Cooperación", "Escala"]}
        bullets={[
          {
            icon: <MapRoundedIcon fontSize="small" />,
            title: "Cada nodo cuenta",
            text: "Cada comunidad aporta capacidades concretas al ecosistema.",
          },
          {
            icon: <GroupsRoundedIcon fontSize="small" />,
            title: "Crecimiento en red",
            text: "Lo local se fortalece cuando se conecta con otros nodos.",
          },
        ]}
        ctaPrimary="Ver la red"
        ctaSecondary="Conectar comunidad"
      />

      {/* CIERRE */}
      <Box sx={{ py: { xs: 7, md: 10 } }}>
        <Container maxWidth="xl">
          <Card
            elevation={0}
            sx={{
              position: "relative",
              overflow: "hidden",
              minHeight: { xs: 420, md: 560 },
              borderRadius: 6,
              bgcolor: "#07120f",
              color: "#fff",
            }}
          >
            <Box
              component="img"
              src={closingImage}
              alt="Comunidad cooperativa mirando el futuro"
              sx={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.64 }}
            />
            <Box
              sx={{
                position: "absolute",
                inset: 0,
                background:
                  "linear-gradient(90deg, rgba(5,10,8,0.92) 0%, rgba(5,10,8,0.72) 44%, rgba(5,10,8,0.25) 100%)",
              }}
            />
            <CardContent sx={{ position: "relative", p: { xs: 4, md: 7 } }}>
              <Grid container spacing={4} alignItems="center">
                <Grid item xs={12} md={8} lg={7}>
                  <Stack spacing={2.4}>
                    <Chip
                      label="Construcción colectiva"
                      sx={{
                        alignSelf: "flex-start",
                        fontWeight: 900,
                        color: "#fff",
                        bgcolor: "rgba(255,255,255,0.12)",
                        border: "1px solid rgba(255,255,255,0.16)",
                      }}
                    />
                    <Typography variant="h2" sx={{ fontWeight: 950, lineHeight: 0.98, letterSpacing: "-0.05em", fontSize: { xs: "2.1rem", md: "4rem" } }}>
                      No vendemos una promesa abstracta.
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 800, lineHeight: 1.08, fontSize: { xs: "1.45rem", md: "2.15rem" }, maxWidth: 820 }}>
                      Estamos construyendo infraestructura real para comunidades e inversionistas que quieran producir, cooperar y avanzar.
                    </Typography>
                    <Typography sx={{ color: "rgba(255,255,255,0.88)", maxWidth: 760, lineHeight: 1.68 }}>
                      Si te sumas, no sólo consumes el sistema: ayudas a construirlo.
                    </Typography>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ pt: 1 }}>
                      <Button variant="contained" size="large" endIcon={<ArrowForwardRoundedIcon />} sx={{ borderRadius: 999, fontWeight: 900, px: 2.7, py: 1.45 }}>
                        Entrar al ecosistema
                      </Button>
                      <Button variant="outlined" size="large" sx={{ borderRadius: 999, fontWeight: 900, px: 2.7, py: 1.45, color: "#fff", borderColor: "rgba(255,255,255,0.42)" }}>
                        Crear una comunidad
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
