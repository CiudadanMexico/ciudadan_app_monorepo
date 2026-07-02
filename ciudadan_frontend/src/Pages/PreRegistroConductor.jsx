import { useState } from "react";
import { Box, Container, Paper, Typography, Button } from "@mui/material";
import { motion } from "framer-motion";
import { Link } from "react-router-dom"; // Importamos Link para la navegación
import { useNavigate } from 'react-router-dom';
import registratutaxi from "../assets/registratutaxi.png";
import RequisitosConductor from "../components/Taxiz/RequisitosConductor.jsx";
//

const CiudadanTaxiLanding = () => {
  const navigate = useNavigate();

  const handleOpenModal = () => {
    setModalOpen(true);
  };
  

  const [modalOpen, setModalOpen] = useState(false);

  return (
    <Box
      sx={{
        pt: 0,
        mt: 0,
        minHeight: "100vh",
        background: "linear-gradient(180deg, #FFC107 0%, #E91E63 50%, #8BC34A 100%)",
      }}
    >
      <Container maxWidth="md" sx={{ p: 0, mt: 0 }}>
        <Paper
          elevation={6}
          sx={{
            borderRadius: 0,
            overflow: "hidden",
          }}
        >
          {/* Header en 2 columnas */}
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", md: "row" },
            }}
          >
            {/* Columna izquierda: Título y breve descripción */}
            <Box
              sx={{
                flex: 1,
                p: { xs: 3, md: 5 },
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
              }}
            >
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8 }}
              >
                <Typography
                  variant="h3"
                  gutterBottom
                  sx={{
                    fontWeight: "bold",
                    color: "#333",
                    mb: 2,
                    lineHeight: 1.2,
                  }}
                >
                  ¡Dale un giro a tu Taxi en la CDMX!
                </Typography>
                <Typography
                  variant="h6"
                  sx={{
                    color: "#555",
                    mb: 2,
                  }}
                >
                  Con Ciudadan Taxi, transforma tu concesión en un motor de oportunidades.
                </Typography>
              </motion.div>
            </Box>

            {/* Columna derecha: Imagen */}
            <Box
              sx={{
                flex: 1,
                p: { xs: 3, md: 5 },
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <motion.img
                src={registratutaxi}
                alt="Registra tu Taxi"
                style={{
                  width: "80%",
                  maxWidth: "350px",
                  height: "auto",
                  borderRadius: "8px",
                  boxShadow: "0 4px 14px rgba(0,0,0,0.2)",
                }}
                initial={{ opacity: 0, x: 50, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                whileHover={{ scale: 1.05 }}
              />
            </Box>
          </Box>

          {/* Sección completa de contenido */}
          <Box sx={{ p: { xs: 3, md: 5 } }}>
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <Typography
                variant="h5"
                sx={{
                  color: "#555",
                  mb: 3,
                }}
              >
                Moderniza tu servicio con tecnología justa y sé parte de una comunidad que impulsa a los taxistas capitalinos sin comisiones abusivas.
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  color: "#666",
                  mb: 4,
                }}
              >
                <em>¡Porque la tradición del taxi chilango merece un futuro más brillante!</em>
              </Typography>

              {/* Beneficios en ancho completo */}
              <Box sx={{ width: "100%", mt: 4 }}>
                <Typography variant="h5" sx={{ fontWeight: "bold", mb: 2, color: "#222" }}>
                  ¿Por qué unirte a nosotros?
                </Typography>
                {[
                  {
                    text: (
                      <>
                        <strong>Gana el 90% en efectivo</strong> y el 10% en nuestra cripto <em>Labory</em>.
                      </>
                    ),
                  },
                  {
                    text: (
                      <>
                        Recibe <strong>30 Laborys extra</strong> por cada viaje con descuento y potencia tus ingresos.
                      </>
                    ),
                  },
                  {
                    text: (
                      <>
                        <strong>Cooperativismo 6.0</strong>: sé parte de una comunidad de taxistas que se apoya y crece unida.
                      </>
                    ),
                  },
                  {
                    text: (
                      <>
                        Mantén el control con <strong>tarifas justas</strong> y sin abusos.
                      </>
                    ),
                  },
                ].map((item, idx) => (
                  <Box key={idx} sx={{ display: "flex", alignItems: "flex-start", mb: 2 }}>
                    <span
                      className="material-icons"
                      style={{
                        color: "green",
                        marginRight: 8,
                        marginTop: 2,
                        fontSize: "28px",
                      }}
                    >
                      check_circle
                    </span>
                    <Typography variant="body1">{item.text}</Typography>
                  </Box>
                ))}
              </Box>

              {/* Botón animado centrado */}
              <Box sx={{ display: "flex", justifyContent: "center", mt: 5 }}>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <Button
                    component={Link}
                    
                    onClick={handleOpenModal}
                    variant="contained"
                    sx={{
                      backgroundColor: "#E91E63",
                      color: "#fff",
                      fontWeight: "bold",
                      px: 4,
                      py: 1.5,
                      borderRadius: 2,
                      boxShadow: "0 4px 14px rgba(0,0,0,0.2)",
                      "&:hover": {
                        backgroundColor: "#d81b60",
                      },
                    }}
                  >
                    ¡Regístrate Ahora!
                  </Button>
                </motion.div>

                <RequisitosConductor modalOpen={modalOpen} setModalOpen={setModalOpen} />

              </Box>
            </motion.div>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default CiudadanTaxiLanding;
