import React from "react";
import { Box, List, ListItem, ListItemIcon, ListItemText, Paper, Stack, Typography } from "@mui/material";
import { FaCircleCheck, FaClock, FaFileLines } from "react-icons/fa6";
import PersonIcon from "@mui/icons-material/Person";
import SecurityIcon from "@mui/icons-material/Security";

const introItems = [
  "Cuenta o acceso existente",
  "Datos personales y contacto de emergencia",
  "Documentos oficiales y fotos del vehiculo",
  "Programacion de cita presencial",
];

const requiredDocs = [
  "INE frente y reverso",
  "Selfie de verificacion",
  "Licencia frente y reverso",
  "Comprobante de domicilio",
  "Fotos del vehiculo y documentos de circulacion",
];

const OnboardingIntro = () => (
  <Paper
    elevation={0}
    sx={{
      p: { xs: 2, md: 3 },
      borderRadius: 3,
      border: "1px solid rgba(15,23,42,0.12)",
      backgroundColor: "#fff",
    }}
  >
    <Stack spacing={2}>
      <Box>
        <Typography variant="h5" fontWeight={800} sx={{ color: "#0f172a" }}>
          Bienvenido al preregistro de conductor
        </Typography>
        <Typography sx={{ color: "#475569", mt: 0.5 }}>
          Hoy pedimos datos básicos, validación de identidad y los archivos iniciales.
        </Typography>
      </Box>

      <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
        <Paper elevation={0} sx={{ flex: 1, p: 2, borderRadius: 2, bgcolor: "#f8fafc", border: "1px solid #e2e8f0" }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
            <FaCircleCheck color="#16a34a" />
            <Typography fontWeight={700}>Que te pediremos</Typography>
          </Stack>
          <List dense disablePadding>
            {introItems.map((item) => (
              <ListItem key={item} disableGutters sx={{ py: 0.2 }}>
                <ListItemIcon sx={{ minWidth: 28, color: "green" }}>
                  <PersonIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText variant="body2" primary={item} />
              </ListItem>
            ))}
          </List>
        </Paper>

        <Paper elevation={0} sx={{ flex: 1, p: 2, borderRadius: 2, bgcolor: "#f8fafc", border: "1px solid #e2e8f0" }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
            <FaFileLines color="#1d4ed8" />
            <Typography fontWeight={700}>Documentos sugeridos a la mano</Typography>
          </Stack>
          <List dense disablePadding>
            {requiredDocs.map((item) => (
              <ListItem key={item} disableGutters sx={{ py: 0.2 }}>
                <ListItemIcon sx={{ minWidth: 28, color: "blue" }}>
                  <SecurityIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText variant="body2" primary={item} />
              </ListItem>
            ))}
          </List>
        </Paper>
      </Stack>

      <Stack direction="row" spacing={1} alignItems="center">
        <FaClock color="#ca8a04" />
        <Typography variant="body2" sx={{ color: "#475569" }}>
          Al finalizar, dejaremos tu preregistro en estado pendiente de validacion para revision del equipo.
        </Typography>
      </Stack>
    </Stack>
  </Paper>
);

export default OnboardingIntro;
