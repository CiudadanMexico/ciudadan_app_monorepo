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
  CircularProgress,
} from "@mui/material";
import dayjs from "dayjs";
import "dayjs/locale/es";
import mapa from "../assets/mapa.png";
import paises from "../assets/paises.json";
import PasajeroTermsModal from "../components/Taxiz/PasajeroTermsModal.jsx";
import { useAuth0 } from "@auth0/auth0-react";

const RegistroPasajero = ({ onRegister = () => {} }) => {
  const { isAuthenticated, loginWithRedirect, user, getAccessTokenSilently } =
    useAuth0();
  const isMobile = useMediaQuery("(max-width:600px)");
  const [modalOpen, setModalOpen] = useState(false);
  const [aceptaTerminos, setAceptaTerminos] = useState(false);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    nombres: "",
    apellidoPaterno: "",
    apellidoMaterno: "",
    telefono: "",
    codigoPais: "+52",
    fechaNacimiento: "",
  });

  const [errors, setErrors] = useState({});

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
    setErrors({ ...errors, [field]: "" });
  };

  const validarFormulario = () => {
    let newErrors = {};
    if (!formData.nombres.trim()) newErrors.nombres = "El nombre es obligatorio";
    if (!formData.apellidoPaterno.trim())
      newErrors.apellidoPaterno = "El apellido paterno es obligatorio";
    const telefonoDigits = formData.telefono.replace(/\D/g, "");
    if (!telefonoDigits.match(/^\d{7,15}$/))
      newErrors.telefono = "Número inválido (7-15 dígitos sin espacios ni símbolos)";
    if (!formData.fechaNacimiento) {
      newErrors.fechaNacimiento = "Selecciona tu fecha de nacimiento";
    } else if (dayjs().diff(dayjs(formData.fechaNacimiento), "year") < 18) {
      newErrors.fechaNacimiento = "Debes ser mayor de 18 años";
    }
    if (!aceptaTerminos) newErrors.aceptaTerminos = "Debes aceptar los términos";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Construye nombre_completo: nombre,segundonombre,apellidopaterno,apellidomaterno
  const construirNombreCompleto = () => {
    const nombresTrim = formData.nombres.trim();
    const tokens = nombresTrim ? nombresTrim.split(/\s+/) : [];
    const nombre = tokens.length > 0 ? tokens[0] : "";
    const segundoNombre = tokens.length > 1 ? tokens.slice(1).join(" ") : "";
    const apellidoP = formData.apellidoPaterno.trim() || "";
    const apellidoM = formData.apellidoMaterno.trim() || "";
    return `${nombre},${segundoNombre},${apellidoP},${apellidoM}`;
  };

  const construirTelefonoCompleto = () => {
    const codigo = formData.codigoPais ? formData.codigoPais.trim() : "";
    const digits = formData.telefono.replace(/\D/g, "");
    const codigoNormal = codigo.startsWith("+") ? codigo : `+${codigo.replace(/\D/g, "")}`;
    return `${codigoNormal}${digits}`;
  };

  /**
   * Normaliza y calcula el objeto roles que enviaremos a Strapi.
   * - Acepta varias formas de entrada en foundUser (roles directo, attributes.roles, roles.extra, etc).
   * - Asegura que exista la clave "extra" como array y que contenga "pasajero".
   */
  const calcularRolesParaEnviar = (foundUser) => {
    // forma por defecto si no existe nada
    let rolesObj = { extra: ["pasajero"] };

    try {
      if (!foundUser) return rolesObj;

      // posibles ubicaciones:
      // foundUser.roles
      // foundUser.attributes.roles
      // foundUser.attributes?.roles?.extra
      // foundUser.roles?.extra
      let existing = null;

      if (foundUser.attributes && foundUser.attributes.roles) {
        existing = foundUser.attributes.roles;
      } else if (foundUser.roles) {
        existing = foundUser.roles;
      } else if (foundUser.attributes && foundUser.attributes.role) {
        existing = foundUser.attributes.role;
      }

      // Si existing es un objeto con extra (array)
      if (existing && typeof existing === "object") {
        if (Array.isArray(existing.extra)) {
          const extras = Array.from(new Set([...existing.extra, "pasajero"]));
          rolesObj = { extra: extras };
        } else {
          // si existing es array plana o tiene otras propiedades
          // intentar extraer strings
          const arr = Array.isArray(existing)
            ? existing
            : Object.values(existing).flat().filter(Boolean);
          const extras = Array.from(new Set([...(arr || []), "pasajero"]));
          rolesObj = { extra: extras };
        }
      } else if (Array.isArray(existing)) {
        const extras = Array.from(new Set([...existing, "pasajero"]));
        rolesObj = { extra: extras };
      } else {
        // fallback: crear con pasajero
        rolesObj = { extra: ["pasajero"] };
      }
    } catch (err) {
      rolesObj = { extra: ["pasajero"] };
    }

    return rolesObj;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validarFormulario()) return;

    onRegister(formData);

    setLoading(true);
    try {
      const STRAPI_BASE = (process.env.REACT_APP_STRAPI_URL || "").replace(
        /\/+$/,
        ""
      );
      if (!STRAPI_BASE) {
        throw new Error(
          "No está definida la variable de entorno REACT_APP_STRAPI_URL"
        );
      }

      const nombre_completo = construirNombreCompleto();
      const telefono_completo = construirTelefonoCompleto();

      const payloadBase = {
        nombre_completo: nombre_completo,
        telefono: telefono_completo,
        fecha_nacimiento: formData.fechaNacimiento || null,
        confirmed: false,
      };

      const headers = {
        "Content-Type": "application/json",
      };

      const strapiJwt = localStorage.getItem("strapi_jwt");
      if (strapiJwt) headers["Authorization"] = `Bearer ${strapiJwt}`;
      else {
        try {
          const accessToken = await getAccessTokenSilently({
            authorizationParams: { audience: "" },
          });
          if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;
        } catch (err) {
          // no pasa nada si Auth0 no devuelve token
        }
      }

      // 1) Buscar por email
      const buscarUrl = `${STRAPI_BASE}/api/users?filters[email][$eq]=${encodeURIComponent(
        (user && user.email) || ""
      )}`;

      const buscarResp = await fetch(buscarUrl, {
        method: "GET",
        headers,
      });

      let foundUser = null;
      if (buscarResp.ok) {
        const buscarJson = await buscarResp.json();
        if (buscarJson && Array.isArray(buscarJson.data) && buscarJson.data.length) {
          foundUser = buscarJson.data[0];
        } else if (buscarJson && buscarJson.length) {
          foundUser = buscarJson[0];
        } else if (buscarJson && buscarJson.data && buscarJson.data.attributes) {
          // por si la estructura es diferente
          foundUser = buscarJson.data;
        }
      } else {
        // si no está autorizado o hay error 4xx/5xx, no abortamos inmediatamente:
        // por ejemplo si la API pública no permite buscar, intentaremos crear.
        console.warn("Respuesta buscando usuario:", buscarResp.status);
      }

      // calcular roles a enviar (si existe foundUser leemos estructura)
      const rolesParaEnviar = calcularRolesParaEnviar(foundUser && (foundUser.attributes ? foundUser.attributes : foundUser));

      if (foundUser && (foundUser.id || (foundUser.attributes && foundUser.attributes.id))) {
        const id = foundUser.id || foundUser.attributes.id;
        const updateUrl = `${STRAPI_BASE}/api/users/${id}`;
        const updateBody = { data: { ...payloadBase, roles: rolesParaEnviar } };

        const updateResp = await fetch(updateUrl, {
          method: "PUT",
          headers,
          body: JSON.stringify(updateBody),
        });

        if (!updateResp.ok) {
          const errTxt = await updateResp.text().catch(() => "");
          throw new Error(
            `Error actualizando usuario en Strapi: ${updateResp.status} ${errTxt}`
          );
        }
      } else {
        // crear nuevo usuario con email y roles
        const createUrl = `${STRAPI_BASE}/api/users`;
        const createBody = {
          data: { email: (user && user.email) || "", ...payloadBase, roles: rolesParaEnviar },
        };

        const createResp = await fetch(createUrl, {
          method: "POST",
          headers,
          body: JSON.stringify(createBody),
        });

        if (!createResp.ok) {
          const errTxt = await createResp.text().catch(() => "");
          throw new Error(
            `Error creando usuario en Strapi: ${createResp.status} ${errTxt}`
          );
        }
      }

      // éxito: recargar /taxis
      window.location.assign("/taxis");
    } catch (err) {
      console.error("Error al guardar pasajero en Strapi:", err);
      alert(
        "Ocurrió un error guardando tu información. Revisa la consola y la configuración de STRAPI_URL/tokens."
      );
      setLoading(false);
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
              Para registrarte como pasajero, primero accede con tu cuenta de Google.
            </Typography>
            <Button
              variant="contained"
              color="primary"
              onClick={() => loginWithRedirect()}
            >
              Iniciar sesión
            </Button>
          </>
        ) : (
          <>
            <Typography variant="h4" fontWeight="bold" color="white" mb={3}>
              🚖 Registro de Pasajero
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
                    onChange={(e) =>
                      handleChange("apellidoPaterno", e.target.value)
                    }
                    error={!!errors.apellidoPaterno}
                    helperText={errors.apellidoPaterno}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    label="Apellido Materno (Opcional)"
                    fullWidth
                    value={formData.apellidoMaterno}
                    onChange={(e) =>
                      handleChange("apellidoMaterno", e.target.value)
                    }
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

              <Box sx={{ mt: 2 }}>
                <TextField
                  type="date"
                  label="Fecha de Nacimiento"
                  fullWidth
                  margin="dense"
                  value={formData.fechaNacimiento}
                  onChange={(e) =>
                    handleChange("fechaNacimiento", e.target.value)
                  }
                  error={!!errors.fechaNacimiento}
                  helperText={errors.fechaNacimiento}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <i className="material-icons">calendar_today</i>
                      </InputAdornment>
                    ),
                  }}
                  InputLabelProps={{
                    shrink: true,
                  }}
                />
              </Box>

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
                disabled={loading}
              >
                {loading ? (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                    <CircularProgress size={18} />
                    Guardando...
                  </span>
                ) : (
                  "Registrarme"
                )}
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
            <PasajeroTermsModal
              modalOpen={modalOpen}
              setModalOpen={setModalOpen}
            />
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
