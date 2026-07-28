import React from "react";
import { Box, Typography, Button } from "@mui/material";
import { motion } from "framer-motion";
import ecoaldea from "../../assets/ecoaldea.png"; // ✅ Importando la imagen correctamente

export default function Comunidad() {
  return (
    <Box
      sx={{
        position: "relative",
        width: "100%",
        minHeight: "100vh",
        backgroundImage: `url(${ecoaldea})`, // ✅ usando la importación
        backgroundSize: "cover",
        backgroundPosition: "center",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        color: "white",
      }}
    >
      {/* 🔸 Barra superior */}
      <Box
        sx={{
          position: "absolute",
          top: 0,
          width: "100%",
          background:
            "linear-gradient(90deg, rgba(0,0,0,0.85), rgba(40,40,40,0.9), rgba(0,0,0,0.85))",
          boxShadow: "0 0 20px rgba(255,255,255,0.15)",
          padding: { xs: "10px 16px", md: "12px 32px" },
          backdropFilter: "blur(6px)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          fontFamily: "'Roboto', sans-serif",
          fontSize: { xs: "0.9rem", md: "1rem" },
          fontWeight: 500,
          zIndex: 10,
        }}
      >
        💡 Tienes que iniciar sesión para ver las herramientas de asamblea...
      </Box>

      {/* 🔹 Contenedor del contenido */}
      <Box
        sx={{
          position: "relative",
          zIndex: 5,
          maxWidth: "900px",
          px: { xs: 3, md: 6 },
          py: { xs: 10, md: 20 },
          background: "rgba(0,0,0,0.4)",
          borderRadius: "20px",
          boxShadow: "0 0 40px rgba(0,0,0,0.4)",
          backdropFilter: "blur(5px)",
          mt: { xs: 8, md: "64px" }, // 🔧 antes era más alto — ahora 5-6px de separación real
        }}
      >
        {/* ✨ Título */}
        <Typography
          variant="h3"
          sx={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: { xs: "2rem", md: "3rem" },
            mb: 2,
            textShadow: "0 3px 6px rgba(0,0,0,0.5)",
            letterSpacing: "1px",
          }}
        >
          ÚNETE DESDE TU COMUNIDAD A LA RED CIUDADAN
        </Typography>

        {/* 💬 Descripción principal */}
        <Typography
          sx={{
            fontSize: { xs: "1rem", md: "1.2rem" },
            lineHeight: 1.6,
            mb: 3,
            color: "#e0e0e0",
            textShadow: "0 2px 4px rgba(0,0,0,0.6)",
          }}
        >
          Participa en el futuro hoy con <strong>Ciudadan</strong>, el{" "}
          <strong>Cooperativismo 6.0</strong> y la <strong>Citocracia</strong>.
          Conoce a más personas y los diversos programas uniéndote a la comunidad
          de WhatsApp, desde donde además podrás participar en las{" "}
          <strong>Asambleas Interuniversitarias</strong> que se realizan
          diariamente por <strong>Zoom</strong> de 10 a 12 hrs y de 20 a 22 hrs (MEX),
          de lunes a viernes.  
          <br />
          Además, disfruta de las <strong>Asambleas Generales</strong> los sábados y
          domingos a las 14:00 hrs (MEX).
        </Typography>

        {/* 🤝 Segunda parte */}
        <Typography
          sx={{
            fontSize: { xs: "1rem", md: "1.1rem" },
            lineHeight: 1.6,
            mb: 4,
            color: "#f1f1f1",
            textShadow: "0 2px 4px rgba(0,0,0,0.7)",
          }}
        >
          En las Asambleas podrás encontrarte y organizarte con personas de tu
          comunidad, así como por áreas de conocimiento.  
          Incorpórate como socio de la red, aporta proyectos, encuentra colaboración y mucho más.
        </Typography>

        {/* 🔘 Botón principal */}
        <motion.div whileHover={{ scale: 1.05 }}>
          <Button
            variant="contained"
            href="#"
            sx={{
              background:
                "linear-gradient(90deg, #00c853, #64dd17, #aeea00)",
              color: "#111",
              fontWeight: 700,
              fontSize: { xs: "1rem", md: "1.1rem" },
              borderRadius: "12px",
              px: { xs: 3, md: 5 },
              py: { xs: 1.2, md: 1.5 },
              boxShadow: "0 0 20px rgba(0,255,100,0.3)",
              textTransform: "none",
              "&:hover": {
                background:
                  "linear-gradient(90deg, #76ff03, #b2ff59, #eeff41)",
                boxShadow: "0 0 30px rgba(180,255,100,0.6)",
              },
            }}
          >
            Únete por WhatsApp
          </Button>
        </motion.div>
      </Box>
    </Box>
  );
}
