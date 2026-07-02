// src/pages/VendePage.jsx

import React from "react";
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Chip,
} from "@mui/material";

import HubIcon from "@mui/icons-material/Hub";
import GroupsIcon from "@mui/icons-material/Groups";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import InsightsIcon from "@mui/icons-material/Insights";
import PublicIcon from "@mui/icons-material/Public";
import BoltIcon from "@mui/icons-material/Bolt";

import { useNavigate } from "react-router-dom";
import ciudadanBanner from "../../assets/ciudadan-banner.gif";

export default function VendePage() {
  const navigate = useNavigate();

  const beneficios = [
    {
      icon: <VerifiedUserIcon fontSize="large" sx={{ color: "#00e5ff" }} />,
      title: "Identidad y Confianza",
      description:
        "Construye reputación dentro del ecosistema Ciudadan mediante perfiles verificados, transparencia y participación comunitaria.",
    },
    {
      icon: <InsightsIcon fontSize="large" sx={{ color: "#00ffd0" }} />,
      title: "Herramientas Productivas",
      description:
        "Gestiona servicios, productos, membresías, automatizaciones y métricas desde un solo dashboard.",
    },
    {
      icon: <GroupsIcon fontSize="large" sx={{ color: "#8b5cff" }} />,
      title: "Economía Cooperativa",
      description:
        "Conecta con comunidades autónomas, proyectos open source y redes colaborativas de producción y servicios.",
    },
  ];

  return (
    <Box
      sx={{
        p: 4,
        minHeight: "100vh",
        background: `
          linear-gradient(
            135deg,
            rgba(3,8,20,1),
            rgba(10,20,40,0.95),
            rgba(20,30,60,0.9),
            rgba(0,229,255,0.08)
          )
        `,
        backgroundSize: "400% 400%",
        animation: "neonBreath 12s ease infinite",

        "@keyframes neonBreath": {
          "0%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
          "100%": { backgroundPosition: "0% 50%" },
        },

        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
      }}
    >
      <Box
        sx={{
          backgroundColor: "rgba(255,255,255,0.96)",
          borderRadius: 4,
          p: 4,
          mt: "-20px",
          boxShadow: "0 0 35px rgba(0,229,255,0.25)",
          width: "100%",
          maxWidth: 1280,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Glow decorativo */}
        <Box
          sx={{
            position: "absolute",
            width: 300,
            height: 300,
            borderRadius: "50%",
            background: "rgba(0,229,255,0.12)",
            filter: "blur(80px)",
            top: -120,
            right: -120,
            zIndex: 0,
          }}
        />

        <Grid container spacing={5} alignItems="center">
          {/* IZQUIERDA */}
          <Grid item xs={12} md={7} sx={{ position: "relative", zIndex: 2 }}>
            <Chip
              icon={<BoltIcon />}
              label="Cooperativismo 6.0"
              sx={{
                mb: 2,
                background:
                  "linear-gradient(90deg,#00e5ff,#8b5cff)",
                color: "#fff",
                fontWeight: "bold",
              }}
            />

            <Typography
              variant="h3"
              fontWeight="900"
              sx={{
                mb: 2,
                lineHeight: 1.1,
                background:
                  "linear-gradient(90deg,#00e5ff,#0077ff,#8b5cff)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Construye y monetiza dentro de Ciudadan.org
            </Typography>

            <Typography
              variant="h6"
              sx={{
                mb: 3,
                color: "#334",
                fontWeight: 400,
                lineHeight: 1.6,
              }}
            >
              Ciudadan conecta comunidades autónomas,
              economías colaborativas y herramientas digitales
              para crear una nueva infraestructura social y productiva.
            </Typography>

            <Box
              sx={{
                display: "flex",
                flexWrap: "wrap",
                gap: 1,
                mb: 4,
              }}
            >
              {[
                "IA",
                "Open Source",
                "Comercio Autónomo",
                "Blockchain",
                "Apps Comunitarias",
                "Gobernanza Digital",
                "Educación",
                "Infraestructura Colaborativa",
              ].map((item) => (
                <Chip
                  key={item}
                  label={item}
                  sx={{
                    background: "rgba(0,229,255,0.08)",
                    color: "#003344",
                    border: "1px solid rgba(0,229,255,0.15)",
                    fontWeight: 600,
                  }}
                />
              ))}
            </Box>

            {/* BLOQUE PRINCIPAL */}
            <Box
              sx={{
                background:
                  "linear-gradient(135deg, rgba(0,229,255,0.08), rgba(139,92,255,0.08))",
                border: "1px solid rgba(0,229,255,0.15)",
                borderRadius: 3,
                p: 3,
                mb: 4,
              }}
            >
              <Typography
                variant="h6"
                fontWeight="bold"
                sx={{
                  mb: 2,
                  color: "#001d33",
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                }}
              >
                <HubIcon />
                Ecosistema Productivo Descentralizado
              </Typography>

              <Typography
                variant="body1"
                sx={{
                  color: "#223",
                  mb: 2,
                  lineHeight: 1.8,
                }}
              >
                Publica productos, servicios, proyectos,
                automatizaciones, cursos, herramientas digitales,
                iniciativas comunitarias o soluciones open source.
              </Typography>

              <Typography
                variant="body1"
                sx={{
                  color: "#223",
                  mb: 2,
                  lineHeight: 1.8,
                }}
              >
                Ciudadan no busca centralizar la economía:
                busca conectar redes autónomas capaces de
                producir, colaborar y compartir conocimiento.
              </Typography>

              <Typography
                variant="body1"
                sx={{
                  color: "#223",
                  lineHeight: 1.8,
                }}
              >
                Puedes operar mediante pagos directos,
                integraciones externas, criptomonedas o
                sistemas híbridos según el modelo de tu comunidad.
              </Typography>
            </Box>

            {/* BLOQUE LEGAL/FISCAL */}
            <Box
              sx={{
                background: "rgba(0,0,0,0.03)",
                borderLeft: "5px solid #00e5ff",
                borderRadius: 2,
                p: 2.5,
                mb: 4,
              }}
            >
              <Typography
                variant="subtitle1"
                fontWeight="bold"
                sx={{ mb: 1 }}
              >
                📌 Transparencia y operación
              </Typography>

              <Typography
                variant="body2"
                sx={{
                  color: "#334",
                  lineHeight: 1.8,
                }}
              >
                Cada comunidad, vendedor o proveedor es responsable
                de cumplir las regulaciones y obligaciones fiscales
                aplicables según su actividad y país.
                Ciudadan funciona como infraestructura tecnológica,
                de coordinación y colaboración digital.
              </Typography>

              <Typography
                variant="body2"
                sx={{
                  color: "#334",
                  lineHeight: 1.8,
                  mt: 2,
                }}
              >
                Algunas modalidades pueden operar con pagos directos
                entre usuarios y otras mediante procesadores externos
                o sistemas descentralizados según la configuración
                del proyecto.
              </Typography>
            </Box>

            <Box
              sx={{
                display: "flex",
                gap: 2,
                flexWrap: "wrap",
              }}
            >
              <Button
                variant="contained"
                size="large"
                onClick={() => navigate("/registro-vendedor")}
                sx={{
                  background:
                    "linear-gradient(90deg,#00e5ff,#0077ff)",
                  color: "#fff",
                  fontWeight: "bold",
                  px: 4,
                  py: 1.5,
                  borderRadius: 3,
                  boxShadow:
                    "0 0 20px rgba(0,229,255,0.35)",

                  "&:hover": {
                    filter: "brightness(1.08)",
                    transform: "translateY(-2px)",
                  },
                }}
              >
                Crear Perfil Productivo
              </Button>

              <Button
                variant="outlined"
                size="large"
                onClick={() => navigate("/comunidades")}
                sx={{
                  borderColor: "#00bcd4",
                  color: "#0077aa",
                  fontWeight: "bold",
                  borderRadius: 3,
                }}
              >
                Explorar Comunidades
              </Button>
            </Box>
          </Grid>

          {/* DERECHA */}
          <Grid item xs={12} md={5} textAlign="center">
            <Box
              component="img"
              src={ciudadanBanner}
              alt="Ciudadan Ecosistema"
              sx={{
                width: { xs: "80%", md: "95%" },
                maxWidth: 560,
                borderRadius: 4,
                boxShadow:
                  "0 0 40px rgba(0,229,255,0.25)",
                border:
                  "1px solid rgba(0,229,255,0.15)",
              }}
            />
          </Grid>
        </Grid>

        {/* BENEFICIOS */}
        <Box sx={{ mt: 9 }}>
          <Typography
            variant="h4"
            textAlign="center"
            fontWeight="bold"
            sx={{
              mb: 5,
              color: "#001d33",
            }}
          >
            ¿Qué puedes hacer en Ciudadan?
          </Typography>

          <Grid container spacing={4} justifyContent="center">
            {beneficios.map((b, i) => (
              <Grid item xs={12} sm={6} md={4} key={i}>
                <Card
                  sx={{
                    height: "100%",
                    p: 2,
                    textAlign: "center",
                    borderRadius: 4,

                    background:
                      "linear-gradient(180deg, rgba(10,20,40,1), rgba(0,229,255,0.08))",

                    color: "#fff",

                    boxShadow:
                      "0 0 18px rgba(0,229,255,0.12)",

                    transition: "0.3s",

                    "&:hover": {
                      transform: "translateY(-6px)",
                      boxShadow:
                        "0 0 30px rgba(0,229,255,0.25)",
                    },
                  }}
                >
                  <Box sx={{ mb: 2 }}>{b.icon}</Box>

                  <CardContent>
                    <Typography
                      variant="h6"
                      fontWeight="bold"
                      gutterBottom
                      sx={{
                        color: "#00e5ff",
                      }}
                    >
                      {b.title}
                    </Typography>

                    <Typography
                      variant="body2"
                      sx={{
                        color: "rgba(255,255,255,0.82)",
                        lineHeight: 1.8,
                      }}
                    >
                      {b.description}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* FOOTER */}
        <Box
          sx={{
            mt: 10,
            pt: 4,
            borderTop: "1px solid rgba(0,0,0,0.08)",
            textAlign: "center",
          }}
        >
          <PublicIcon
            sx={{
              fontSize: 42,
              color: "#00bcd4",
              mb: 1,
            }}
          />

          <Typography
            variant="body1"
            sx={{
              color: "#445",
              maxWidth: 800,
              margin: "0 auto",
              lineHeight: 1.8,
            }}
          >
            Ciudadan.org impulsa redes colaborativas,
            soberanía tecnológica y comunidades productivas
            conectadas mediante herramientas digitales abiertas.
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}