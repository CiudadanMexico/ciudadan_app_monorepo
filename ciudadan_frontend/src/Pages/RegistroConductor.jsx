import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  TextField,
  Button,
  Paper,
  Typography,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  useMediaQuery,
  Grid,
  Box,
  Checkbox,
  FormControlLabel,
  Modal,
  InputAdornment,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers";
import dayjs from "dayjs";
import "dayjs/locale/es";
import mapa from "../assets/mapa.png";
import paises from "../assets/paises.json";
import PasajeroTermsModal from "../components/Taxiz/PasajeroTermsModal.jsx";
import { useAuth0 } from "@auth0/auth0-react";

const RegistroPasajero = ({ onRegister }) => {
  const { isAuthenticated, loginWithRedirect } = useAuth0();
  const isMobile = useMediaQuery("(max-width:600px)");
  const [modalOpen, setModalOpen] = useState(false);
  const [aceptaTerminos, setAceptaTerminos] = useState(false);

  const [formData, setFormData] = useState({
    nombres: "",
    apellidoPaterno: "",
    apellidoMaterno: "",
    telefono: "",
    codigoPais: "+52",
    fechaNacimiento: null,
    // Se eliminaron email y dirección
  });

  const [errors, setErrors] = useState({});

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
    setErrors({ ...errors, [field]: "" });
  };

  const validarFormulario = () => {
    let newErrors = {};
    if (!formData.nombres.trim())
      newErrors.nombres = "El nombre es obligatorio";
    if (!formData.apellidoPaterno.trim())
      newErrors.apellidoPaterno = "El apellido paterno es obligatorio";
    if (!formData.telefono.match(/^\d{10}$/))
      newErrors.telefono = "Número inválido (10 dígitos)";
    if (!formData.fechaNacimiento) {
      newErrors.fechaNacimiento = "Selecciona tu fecha de nacimiento";
    } else if (dayjs().diff(dayjs(formData.fechaNacimiento), "year") < 18) {
      newErrors.fechaNacimiento = "Debes ser mayor de 18 años";
    }
    if (!aceptaTerminos) newErrors.aceptaTerminos = "Debes aceptar los términos";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validarFormulario()) {
      onRegister(formData);
    }
  };

  return (
    <motion.div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "auto",
        backgroundColor: "#afcf20",
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
    >
      <Paper
        elevation={10}
        sx={{
          width: isMobile ? "95%" : "73%",
          minHeight: "80vh",
          background: `linear-gradient(rgba(232, 50, 201, 0.7), rgba(255, 255, 255, 0.85)), url(${mapa})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backdropFilter: "blur(6px)",
          borderRadius: "12px",
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          p: 4,
          position: "relative",
        }}
        component={motion.div}
        initial={{ y: 30 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {!isAuthenticated ? (
          <>
            <Typography variant="h5" color="white" mb={2}>
              Para registrarte como conductor, primero accede con tu cuenta de Google.
            </Typography>
            <Button variant="contained" color="primary" onClick={() => loginWithRedirect()}>
              Iniciar sesión
            </Button>
          </>
        ) : (
          <>
            <Typography variant="h4" fontWeight="bold" color="white" mb={3}>
              🚖 Registro de Conductor
            </Typography>

            <form onSubmit={handleSubmit}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <TextField
                    label="Nombre(s)"
                    fullWidth
                    value={formData.nombres}
                    onChange={(e) => handleChange("nombres", e.target.value)}
                    error={!!errors.nombres}
                    helperText={errors.nombres}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    label="Apellido Paterno"
                    fullWidth
                    value={formData.apellidoPaterno}
                    onChange={(e) => handleChange("apellidoPaterno", e.target.value)}
                    error={!!errors.apellidoPaterno}
                    helperText={errors.apellidoPaterno}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    label="Apellido Materno (Opcional)"
                    fullWidth
                    value={formData.apellidoMaterno}
                    onChange={(e) => handleChange("apellidoMaterno", e.target.value)}
                  />
                </Grid>
              </Grid>

              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={4} sm={3}>
                  <FormControl fullWidth margin="dense">
                    <InputLabel sx={{ position: "relative", top: "-14px" }}>
                      Código
                    </InputLabel>
                    <Select
                      sx={{ position: "relative", top: "-30px" }}
                      value={formData.codigoPais}
                      onChange={(e) => handleChange("codigoPais", e.target.value)}
                    >
                      {paises.map((option) => (
                        <MenuItem key={option.code} value={option.code}>
                          <Box display="flex" alignItems="center">
                            <img
                              src={option.flag}
                              alt={option.code}
                              style={{ width: 24, height: 16, marginRight: 8 }}
                            />
                            {option.label}
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={8} sm={9}>
                  <TextField
                    label="Teléfono"
                    fullWidth
                    value={formData.telefono}
                    onChange={(e) => handleChange("telefono", e.target.value)}
                    error={!!errors.telefono}
                    helperText={errors.telefono}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <i className="material-icons">phone</i>
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
              </Grid>

              <DatePicker
                openTo="year"
                views={["year", "month", "day"]}
                label="Fecha de Nacimiento"
                value={formData.fechaNacimiento}
                onChange={(newValue) => handleChange("fechaNacimiento", newValue)}
                disableFuture
                slots={{
                  textField: (props) => (
                    <TextField
                      {...props}
                      fullWidth
                      margin="dense"
                      error={!!errors.fechaNacimiento}
                      helperText={errors.fechaNacimiento}
                      sx={{ mt: 2 }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <i className="material-icons">calendar_today</i>
                          </InputAdornment>
                        ),
                      }}
                    />
                  ),
                }}
              />

              <Box sx={{ mt: 2 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={aceptaTerminos}
                      onChange={(e) => setAceptaTerminos(e.target.checked)}
                    />
                  }
                  label={
                    <span>
                      Acepto los{" "}
                      <span
                        style={{ color: "blue", cursor: "pointer" }}
                        onClick={() => setModalOpen(true)}
                      >
                        términos y condiciones
                      </span>
                    </span>
                  }
                />
                {errors.aceptaTerminos && (
                  <Typography color="error" variant="caption">
                    {errors.aceptaTerminos}
                  </Typography>
                )}
              </Box>

              <Button
                type="submit"
                variant="contained"
                fullWidth
                sx={{ mt: 3, bgcolor: "#ff4081", color: "white" }}
              >
                Registrarme
              </Button>
            </form>
          </>
        )}
      </Paper>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)}>
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 400,
            bgcolor: "white",
            boxShadow: 24,
            p: 4,
            borderRadius: "10px",
            zIndex: 999999999,
          }}
        >
          <Typography variant="h4">Términos y Condiciones</Typography>
          <Typography variant="body1">
            <PasajeroTermsModal modalOpen={modalOpen} setModalOpen={setModalOpen} />
          </Typography>
          <Button onClick={() => setModalOpen(false)} sx={{ mt: 2 }}>
            Cerrar
          </Button>
        </Box>
      </Modal>
    </motion.div>
  );
};

export default RegistroPasajero;
