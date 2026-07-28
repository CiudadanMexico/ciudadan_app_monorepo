import React from 'react';
import { TextField, Button, Container, Typography, Box, Paper, Grid } from '@mui/material';
import { motion } from 'framer-motion';
import bannerImage from '../../assets/banner.jpg'; // Asegúrate de tener esta imagen en tu carpeta de assets
import scholarshipImage from '../../assets/scholarship.jpg'; // Asegúrate de tener esta imagen en tu carpeta de assets

class Academia extends React.Component {
  render() {
    return (
      <Container>
        <Box my={4}>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1 }}
          >
            <img src={bannerImage} alt="Academia Banner" style={{ width: '100%', borderRadius: '10px' }} />
          </motion.div>
        </Box>

        <Typography variant="h1" component="h1" gutterBottom align="center">
          Academia
        </Typography>
        <Typography variant="h2" component="h2" gutterBottom align="center">
          Sistema de Becarios
        </Typography>

        <Box my={4}>
          <Grid container spacing={4}>
            <Grid item xs={12} md={6}>
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
              >
                <Typography variant="body1" paragraph>
                  El sistema de becarios te permite estudiar gratis y con validez oficial el master de inteligencia artificial ecomaker cooperativista 6.0.
                </Typography>
                <Typography variant="body1" paragraph>
                  Nuestro sistema es tu mejor aliado, trabajas y estudias al mismo tiempo.
                </Typography>
                <Typography variant="body1" paragraph>
                  Para postularte por una beca llena el siguiente formulario.
                </Typography>
              </motion.div>
            </Grid>
            <Grid item xs={12} md={6}>
              <motion.div
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
              >
                <img src={scholarshipImage} alt="Scholarship" style={{ width: '100%', borderRadius: '10px' }} />
              </motion.div>
            </Grid>
          </Grid>
        </Box>

        <Box my={4}>
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Paper elevation={3} style={{ padding: '20px', borderRadius: '10px' }}>
              <Typography variant="h2" component="h2" gutterBottom>
                Formulario de Postulación
              </Typography>
              <form action="/submit" method="post">
                <TextField
                  fullWidth
                  margin="normal"
                  label="Nombre"
                  id="nombre"
                  name="nombre"
                  required
                />
                <TextField
                  fullWidth
                  margin="normal"
                  label="Email"
                  id="email"
                  name="email"
                  type="email"
                  required
                />
                <TextField
                  fullWidth
                  margin="normal"
                  label="Teléfono"
                  id="telefono"
                  name="telefono"
                  type="tel"
                  required
                />
                <TextField
                  fullWidth
                  margin="normal"
                  label="Carrera"
                  id="carrera"
                  name="carrera"
                  required
                />
                <TextField
                  fullWidth
                  margin="normal"
                  label="Universidad"
                  id="universidad"
                  name="universidad"
                  required
                />
                <TextField
                  fullWidth
                  margin="normal"
                  label="Semestre"
                  id="semestre"
                  name="semestre"
                  required
                />
                <TextField
                  fullWidth
                  margin="normal"
                  label="Ciclo"
                  id="ciclo"
                  name="ciclo"
                  required
                />
                <Box mt={2}>
                  <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    fullWidth
                    component={motion.button}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Enviar
                  </Button>
                </Box>
              </form>
            </Paper>
          </motion.div>
        </Box>
      </Container>
    );
  }
}

export default Academia;
