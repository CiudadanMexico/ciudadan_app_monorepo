import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useFoodRestaurants } from "../../hooks/food/useFoodRestaurants.jsx";
import {
  Stepper,
  Step,
  StepLabel,
  Button,
  TextField,
  CircularProgress,
  Box,
  Typography,
  Autocomplete,
  useTheme,
  useMediaQuery
} from "@mui/material";
import { useAuth0 } from "@auth0/auth0-react";
import { slugify } from "../../utils/slugify.jsx";
import { GoogleMap, Marker, useLoadScript } from "@react-google-maps/api";
import usePlacesAutocomplete, { getGeocode, getLatLng } from "use-places-autocomplete";
import { getBankByCLABE, validateCLABE, BANK_OPTIONS } from "../../utils/validacionesBanco.js";

// 🔐 Contexto de roles / membresía
import { useRoles } from "../../Contexts/RolesContext.jsx";

const LIBRARIES = ["places"];
const steps = ["Información", "Datos bancarios", "Agregar dirección", "Verificar datos"];

export default function RegistroRestaurante() {
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { user, isAuthenticated, loginWithRedirect } = useAuth0();
  const { isActivaMembresia, updateExtraRole } = useRoles();

  const [activeStep, setActiveStep] = useState(0);
  const [restaurantName, setRestaurantName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [restaurant, setRestaurant] = useState(null);
  const [direccionData, setDireccionData] = useState({
    direccion: "",
    lat: null,
    lng: null,
    cp: "",
    ciudad: "",
    estado: ""
  });

  const [beneficiaryName, setBeneficiaryName] = useState(user?.name ?? '');
  const [bankCLABE, setBankCLABE] = useState('');
  const [bank, setBank] = useState('');
  const [unknownBank, setUnknownBank] = useState(true);

  const {
    createRestaurant,
    getRestaurantsBySlug,
    getRestaurantsByEmail,
    updateRestaurant,
    createDireccion,
  } = useFoodRestaurants();

  // Inicializar paso según registro existente
  useEffect(() => {
    if (!isAuthenticated || !user) return;
    const initEffect = async () => {
      try {
        const tiendas = await getRestaurantsByEmail(user.email);
        if (tiendas.length) {
          const tienda = tiendas[0];
          setRestaurant(tienda);
          const pasoBD = tienda.attributes?.paso;
          setActiveStep(pasoBD != null ? pasoBD : 0);
        } else {
          setActiveStep(0);
        }
      } catch (err) {
        console.error("Error fetching store:", err);
      }
    };
    initEffect();
  }, [isAuthenticated, user]);

  // Mapa y autocomplete
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
    libraries: LIBRARIES
  });

  const {
    ready,
    value,
    setValue,
    suggestions: { status, data },
    clearSuggestions,
    init
  } = usePlacesAutocomplete({
    requestOptions: { componentRestrictions: { country: "mx" } },
    debounce: 300
  });

  const handleCheckAndCreate = async () => {
    if (!user?.email) return loginWithRedirect();
    setLoading(true);
    setError("");
    try {
      const slug = slugify(restaurantName);
      const tiendas = await getRestaurantsBySlug(slug);
      if (tiendas.length) return setError("Ese nombre ya está registrado");
      const nueva = await createRestaurant({ name: restaurantName, email: user.email });
      setRestaurant(nueva.data);
      setActiveStep(1);
    } catch (err) {
      console.error("Error al crear tienda", err);
      setError("Error al crear tienda");
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = async (address) => {
    try {
      setValue(address, false);
      clearSuggestions();
      const results = await getGeocode({ address });
      const { lat, lng } = await getLatLng(results[0]);
      const components = results[0].address_components;
      const comp = { cp: "", ciudad: "", estado: "" };
      components.forEach((c) => {
        if (c.types.includes("postal_code")) comp.cp = c.long_name;
        if (c.types.includes("administrative_area_level_1"))
          comp.estado = c.long_name;
        if (c.types.includes("locality") || c.types.includes("administrative_area_level_2"))
          comp.ciudad = c.long_name;
      });
      setDireccionData({ direccion: address, lat, lng, ...comp });
    } catch (err) {
      console.error("Error en autocomplete:", err);
    }
  };

  const handleChangeCLABE = (value) => {
    setError(val => val ? '' : val); // Limpiar error en cambio
    setBankCLABE(value);
    if (!/^\d{18}$/.test(value)) {
      setError("La CLABE debe tener exactamente 18 dígitos");
    }
  };

  const handleChangeBank = (value) => {
    setError(val => val ? '' : val); // Limpiar error en cambio
    setBank(value)
  };

  const handleVerifyCLABE = () => {
    setError("");
    const auxBank = getBankByCLABE(bankCLABE);
    setUnknownBank(auxBank === "Banco desconocido");
    setBank(auxBank);
    if (!validateCLABE(bankCLABE)) {
      setError("Ingrese una CLABE válida");
    }
  };

  const handleUpdateBankData = async () => {
    if (!beneficiaryName) {
      setError("Ingrese el nombre del beneficiario");
      return;
    }
    if (!bankCLABE) {
      setError("Ingrese una CLABE válida");
      return;
    }

    if (!bank || bank === "Banco desconocido") {
      setError("Ingrese un banco válido");
      return;
    }

    setLoading(true);
    setError('');
    try {
      const updatedRestaurant = await updateRestaurant(restaurant.id, { paso: 2, clabe_bancaria: bankCLABE, nombre_bancario: beneficiaryName, banco: bank });
      setActiveStep(2);
      setRestaurant(updatedRestaurant.data);
      init();
    } catch (error) {
      console.error("Error al establecer datos bancarios", error);
      setError("Error al establecer datos bancarios");
    } finally {
      setLoading(false);
    }

  };

  const handleSaveDireccion = async () => {
    const { direccion, lat, lng, cp, ciudad, estado } = direccionData;
    if (!direccion || !lat || !lng) return setError("Selecciona una dirección válida");
    setLoading(true);
    setError("");
    try {
      const {data} = await createDireccion({
        data: {
          direccion: JSON.stringify({ address: direccion }),
          coords: JSON.stringify({ lat, lng }),
          cp,
          ciudad,
          estado,
          activa: true,
          user_email: user.email,
          restaurant_id: restaurant.id
        }
      });
      const updatedRestaurant = await updateRestaurant(restaurant.id, { paso: 3, direccion: data?.id });
      setRestaurant(updatedRestaurant?.data ?? {});
      setActiveStep(3);
    } catch (err) {
      console.error("Error al guardar dirección", err);
      setError("Error al guardar dirección");
    } finally {
      setLoading(false);
    }
  };

  const handleFinishSetup = async () => {
    setLoading(true);
    setError("");
    try {
      const updatedRestaurant = await updateRestaurant(restaurant.id, { paso: 4 });
      setRestaurant(updatedRestaurant.data);
      await updateExtraRole('restaurant', true);
      setActiveStep(4);
    } catch (err) {
      console.error("Error al verificar datos", err);
      setError("Error al verificar datos");
    } finally {
      setLoading(false);
    }
  };

  const handleRedirect = () => {
    console.log("Restaurant slug:", restaurant?.attributes?.slug);
    restaurant?.attributes?.slug ? navigate(`/comida/restaurante/${restaurant?.attributes?.slug}`) : console.log("Slug not detected, restaurant info:", restaurant)
  }

  // 🔐 Si no está autenticado, muestra login (IGUAL QUE ANTES)
  if (!isAuthenticated || !user) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)",
          backgroundImage: "url(/fondo-cannabis.png)",
          backgroundBlendMode: "overlay",
          backgroundSize: "cover",
          backgroundPosition: "center",
          p: 3
        }}
      >
        <Box
          sx={{
            backdropFilter: "blur(10px)",
            backgroundColor: "rgba(255, 255, 255, 0.85)",
            borderRadius: 5,
            boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
            p: 5,
            textAlign: "center",
            maxWidth: 420,
            width: "100%"
          }}
        >
          <Typography variant="h4" fontWeight="bold" sx={{ color: "#1b5e20", mb: 2 }}>
            Bienvenido a Ciudadan.org
          </Typography>

          <Typography variant="body1" sx={{ mb: 3, color: "#2e7d32", lineHeight: 1.6 }}>
            Inicia sesión para registrar tu tienda y formar parte del mercado
            cooperativo consciente. Comparte tus productos y crece junto a la
            comunidad.
          </Typography>

          <Button
            variant="contained"
            size="large"
            sx={{
              backgroundColor: "#4caf50",
              "&:hover": {
                backgroundColor: "#388e3c",
                transform: "scale(1.05)",
                boxShadow: "0 4px 15px rgba(76, 175, 80, 0.4)"
              },
              transition: "all 0.3s ease",
              borderRadius: 3,
              px: 4,
              py: 1.5,
              fontWeight: "bold"
            }}
            onClick={() => loginWithRedirect()}
          >
            Iniciar Sesión
          </Button>

          <Box sx={{ mt: 4 }}>
            <Typography variant="body2" sx={{ color: "#388e3c", mb: 1 }}>
              ¿Necesitas ayuda para registrar tu tienda?
            </Typography>

            <Box
              component="a"
              href="https://ciudadan.org/miqr"
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                display: "inline-block",
                transition: "transform 0.3s ease",
                "&:hover": { transform: "scale(1.1)" }
              }}
            >
              <img
                src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://ciudadan.org/miqr"
                alt="QR Ciudadan.Org"
                style={{
                  width: 120,
                  height: 120,
                  borderRadius: 10,
                  boxShadow: "0 4px 10px rgba(0,0,0,0.2)"
                }}
              />
            </Box>

            <Typography variant="caption" sx={{ display: "block", mt: 1, color: "#2e7d32" }}>
              Escanéalo para ir a Ciudadan.org
            </Typography>
          </Box>
        </Box>
      </Box>
    );
  }

  // 🚫 Autenticado PERO sin membresía → SOLO ActivaTuMembresia
  if (!isActivaMembresia()) {
    //return <ActivaTuMembresia />;
  }

  // Autenticado + membresía activa → flujo normal
  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Afiliar Restaurante
      </Typography>
      <Stepper activeStep={activeStep} alternativeLabel>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{isMobile ? '' : label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {activeStep === 0 && (
        <Box mt={2}>
          <TextField
            label="Nombre del restaurante"
            value={restaurantName}
            onChange={(e) => setRestaurantName(e.target.value)}
            fullWidth
            disabled={loading}
          />
          {error && <Typography color="error">{error}</Typography>}
          <Button onClick={handleCheckAndCreate} disabled={!restaurantName || loading} variant="contained" sx={{ mt: 2 }}>
            {loading ? <CircularProgress size={24} /> : "Siguiente"}
          </Button>
        </Box>
      )}

      {activeStep === 1 && (
        <Box mt={2}>
          <TextField
            label="Nombre beneficiario"
            value={beneficiaryName}
            onChange={(e) => setBeneficiaryName(e.target.value)}
            fullWidth
            disabled={loading}
            margin="normal"
          />
          <TextField
            label="CLABE"
            value={bankCLABE}
            onChange={(e) => handleChangeCLABE(e.target.value)}
            onBlur={() => handleVerifyCLABE()}
            fullWidth
            inputMode="numeric"
            disabled={loading}
            margin="normal"
          />
          <Autocomplete
            options={BANK_OPTIONS}
            value={bank}
            onChange={(_, newValue) => handleChangeBank(newValue ?? "")}
            onInputChange={(_, newInputValue) => handleChangeBank(newInputValue)}
            readOnly={!unknownBank}
            disabled={bankCLABE === ""}
            fullWidth
            freeSolo
            renderInput={(params) => (
              <TextField
                {...params}
                label="Banco"
                margin="normal"
                fullWidth
              />
            )}
          />
          {error && <Typography color="error">{error}</Typography>}
          <Button onClick={handleUpdateBankData} disabled={loading} variant="contained" sx={{ mt: 2 }}>
            {loading ? <CircularProgress size={24} /> : "Siguiente"}
          </Button>
        </Box>
      )}

      {activeStep === 2 &&
        (!isLoaded ? (
          <CircularProgress />
        ) : (
          <Box mt={2}>
            <Box mb={2} p={2} sx={{ backgroundColor: "error.main", color: "yellow" }}>
              <Typography>
                <strong>Nota:</strong> Tu dirección de remitente es privada y solo se usa para fines de envío.
              </Typography>
            </Box>
            <TextField
              label="Buscar dirección"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              fullWidth
              margin="normal"
            />
            {ready && status === "OK" && (
              <Box sx={{ maxHeight: 200, overflowY: "auto", bgcolor: "background.paper", mb: 2, borderRadius: 1, boxShadow: 1 }}>
                {data.map(({ place_id, description }) => (
                  <Box key={place_id} onClick={() => handleSelect(description)} sx={{ p: 1, cursor: "pointer", "&:hover": { backgroundColor: "#f0f0f0" } }}>
                    <Typography>{description}</Typography>
                  </Box>
                ))}
              </Box>
            )}
            {direccionData.lat && (
              <GoogleMap mapContainerStyle={{ width: "100%", height: "300px" }} zoom={15} center={{ lat: direccionData.lat, lng: direccionData.lng }}>
                <Marker position={{ lat: direccionData.lat, lng: direccionData.lng }} />
              </GoogleMap>
            )}
            <Button onClick={handleSaveDireccion} disabled={loading} variant="contained" sx={{ mt: 2 }}>
              {loading ? <CircularProgress size={24} /> : "Guardar Dirección"}
            </Button>
          </Box>
        ))}

      {activeStep === 3 && (
        <Box mt={2}>
          <Typography>Verificar datos</Typography>
          {error && <Typography color="error">{error}</Typography>}
          <Button onClick={handleFinishSetup} disabled={loading} variant="contained" color="success" sx={{ mt: 2 }}>
            {loading ? <CircularProgress size={24} /> : "Finalizar Registro"}
          </Button>
        </Box>
      )}

      {activeStep === 4 && (
        <Box textAlign="center" mt={4}>
          <Typography variant="h5" gutterBottom>
            🎉 Restaurante afiliado! 🎉
          </Typography>
          <Button variant="contained" onClick={handleRedirect}>
            Ir a tu restaurante
          </Button>
        </Box>
      )}
    </Box>
  );
}
