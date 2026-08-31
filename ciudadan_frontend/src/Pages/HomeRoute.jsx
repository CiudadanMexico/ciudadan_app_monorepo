import React, { useEffect } from "react";
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
import SectionBlock from "../components/Home/SectionBlock";
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

import HeroPrincipal from "../components/Home/HeroPrincipal.jsx";

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
      {/* HERO PRINCIPAL: imagen original a pantalla completa en desktop, tablet y mobile */}
      <HeroPrincipal />

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
        chips={[
          { label: "Beneficios por usar la red", title: "Beneficios reales por participar", subtitle: "Cada acción dentro de la red genera valor: descuentos, acceso a servicios y participación en los beneficios colectivos." },
          { label: "Comercialización", title: "Comercializa dentro de la red", subtitle: "Conecta productos, servicios y comunidades para vender con más alcance y sentido colectivo." },
          { label: "Redes productivas", title: "Redes productivas colaborativas", subtitle: "La producción se organiza en red: cada nodo aporta y recibe, fortaleciendo la autonomía de todos." },
          { label: "Economía local", title: "Economía local fortalecida", subtitle: "El intercambio local genera empleo, circulación de riqueza y comunidades más resilientes." },
        ]}
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
        chips={[
          { label: "Conductores", title: "Movilidad cooperativa para conductores", subtitle: "Una red para moverse, generar participación económica y obtener beneficios por cada viaje." },
          { label: "Socios líderes", title: "Socios líderes del ecosistema", subtitle: "Afiliación, expansión de red y participación operativa dentro del modelo Labory." },
          { label: "Beneficios", title: "Beneficios claros para quienes participan", subtitle: "Quienes aceptan la economía colaborativa 6.0 obtienen ventajas concretas por su participación." },
          { label: "Red cooperativa", title: "Una red cooperativa en movimiento", subtitle: "Conductores, usuarios y comunidades conectados para construir una economía más viva." },
        ]}
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
        chips={[
          { label: "Decisión colectiva", title: "Decisiones que se toman en comunidad", subtitle: "Cada grupo puede coordinarse, votar y decidir con más claridad dentro de sistemas digitales." },
          { label: "Transparencia", title: "Transparencia en cada acuerdo", subtitle: "Los acuerdos, roles y decisiones quedan registrados en sistemas abiertos y verificables." },
          { label: "Redes comunitarias", title: "Comunidades conectadas en red", subtitle: "La gobernanza digital conecta grupos y proyectos para coordinar acciones reales." },
          { label: "Participación", title: "Participación que aterriza en proyectos", subtitle: "La organización se traduce en acción: acuerdos que se convierten en proyectos concretos." },
        ]}
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
        chips={[
          { label: "CNC", title: "Fabricación CNC para la comunidad", subtitle: "Máquinas y herramientas accesibles para producir piezas y componentes sin depender de grandes corporaciones." },
          { label: "Impresión 3D", title: "Impresión 3D distribuida", subtitle: "Tecnología de fabricación aditiva al alcance de la comunidad para crear, reparar y producir." },
          { label: "Open source", title: "Tecnología abierta y libre", subtitle: "Herramientas open source que cualquiera puede usar, modificar y mejorar para su comunidad." },
          { label: "Producción local", title: "Producción local y distribuida", subtitle: "La autonomía se construye produciendo cerca: fabricación local con tecnología accesible." },
        ]}
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
        chips={[
          { label: "IA", title: "Inteligencia artificial para la comunidad", subtitle: "Herramientas de IA que ayudan a coordinar, aprender y escalar proyectos comunitarios." },
          { label: "Educación abierta", title: "Educación abierta y accesible", subtitle: "Contenido formativo abierto para que cada participante tenga más herramientas para crear." },
          { label: "Master", title: "Master transdisciplinario", subtitle: "Formación avanzada que conecta tecnología, economía y organización comunitaria." },
          { label: "Conocimiento útil", title: "Conocimiento que resuelve problemas", subtitle: "Aprender haciendo: contenido práctico para resolver problemas reales de la comunidad." },
        ]}
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
        chips={[
          { label: "Solar", title: "Energía solar comunitaria", subtitle: "Paneles solares y sistemas de energía limpia que reducen costos y dependencia externa." },
          { label: "Agua", title: "Gestión sustentable del agua", subtitle: "Captación, reciclaje y uso eficiente del agua para comunidades más resilientes." },
          { label: "Reciclaje", title: "Reciclaje y economía circular", subtitle: "Sistemas de reciclaje que convierten residuos en recursos para la comunidad." },
          { label: "Agricultura", title: "Agricultura urbana y local", subtitle: "Huertos y producción de alimentos cerca de la comunidad para mayor autonomía." },
        ]}
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
        chips={[
          { label: "Descentralización", title: "Un ecosistema descentralizado", subtitle: "CIUDADAN no depende de un solo centro: cada comunidad mantiene su autonomía dentro de la red." },
          { label: "Conexión", title: "Comunidades conectadas entre sí", subtitle: "Nodos, grupos y proyectos comparten conocimiento, producción, movilidad y economía." },
          { label: "Nodos", title: "Nodos que aportan y reciben", subtitle: "Cada comunidad es un nodo activo que contribuye y se beneficia dentro del ecosistema." },
          { label: "Colaboración", title: "Crecimiento compartido", subtitle: "Una red fuerte es una red que beneficia a todos: colaboración en lugar de competencia." },
        ]}
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
        chips={[
          { label: "Tokens", title: "Tokens para la economía del ecosistema", subtitle: "Participación económica digital que respalda el desarrollo de nuevas herramientas y servicios." },
          { label: "Participación", title: "Más formas de participar", subtitle: "Inversión, tokens y aportaciones que abren nuevas vías para expandir el proyecto." },
          { label: "Escala", title: "Escalar sin perder el enfoque comunitario", subtitle: "Crecimiento colectivo que amplía el alcance manteniendo la visión cooperativa." },
          { label: "Infraestructura", title: "Infraestructura económica para crecer", subtitle: "Respaldo financiero para desarrollar herramientas y ampliar el alcance de la red." },
        ]}
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
