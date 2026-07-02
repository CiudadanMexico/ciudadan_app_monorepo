import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useStores } from "../../hooks/useStores.jsx";
import {
  Stepper,
  Step,
  StepLabel,
  Button,
  TextField,
  CircularProgress,
  Box,
  Typography
} from "@mui/material";
import { useAuth0 } from "@auth0/auth0-react";
import { slugify } from "../../utils/slugify.jsx";
import { GoogleMap, Marker, useLoadScript } from "@react-google-maps/api";
import usePlacesAutocomplete, { getGeocode, getLatLng } from "use-places-autocomplete";

// Librerías de Google Maps declaradas como constante
const LIBRARIES = ["places"];

const steps = [
  "Nombre de la tienda",
  "Conectar Stripe",
  "Agregar dirección",
  "Verificar datos"
];

export default function RegisterStoreStepper() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, loginWithRedirect } = useAuth0();

  const [activeStep, setActiveStep] = useState(0);
  const [storeName, setStoreName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [laTienda, setLaTienda] = useState(null);
  const [direccionData, setDireccionData] = useState({
    direccion: "",
    lat: null,
    lng: null,
    cp: "",
    ciudad: "",
    estado: ""
  });

  const {
    createStore,
    getStoreBySlug,
    getStoreByEmail,
    updateStore,
    onboardingStripe,
    createDireccion,
    finishStoreSetup
  } = useStores();

  // Inicializa step si el usuario ya tiene tienda
  useEffect(() => {
    if (!isAuthenticated) return;
    const init = async () => {
      try {
        const tiendas = await getStoreByEmail(user?.email || "");
        if (tiendas.length) {
          const tienda = tiendas[0];
          setLaTienda(tienda);
          const pasoBD = tienda.attributes?.paso;
          setActiveStep(pasoBD != null ? pasoBD : 0);
        } else {
          setActiveStep(0);
        }
      } catch (err) {
        console.error("Error fetching store:", err);
      }
    };
    init();
  }, [isAuthenticated, getStoreByEmail, user]);

  // Handlers de cada step
  const handleCheckAndCreate = async () => {
    if (!user?.email) return loginWithRedirect();
    setLoading(true);
    setError("");
    try {
      const slug = slugify(storeName);
      const tiendas = await getStoreBySlug(slug);
      if (tiendas.length) return setError("Ese nombre ya está registrado");
      const nueva = await createStore({ name: storeName, email: user.email });
      await updateStore(nueva.data.id, { paso: 1 });
      setLaTienda({ id: nueva.data.id, attributes: { ...nueva.data, paso: 1 } });
      setActiveStep(1);
    } catch (err) {
      console.error("Error al crear tienda", err);
      setError("Error al crear tienda");
    } finally {
      setLoading(false);
    }
  };

  const handleStripeConnect = async () => {
    if (!laTienda) return;
    setLoading(true);
    setError("");
    try {
      await updateStore(laTienda.id, { paso: 2 });
      const url = await onboardingStripe(storeName, user.email);
      window.location.href = `${url}?returnTo=${encodeURIComponent(window.location.href)}`;
    } catch (err) {
      console.error("Error al conectar con Stripe", err);
      setError("Error al conectar con Stripe");
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
      await createDireccion({
        data: {
          direccion: JSON.stringify({ address: direccion }),
          coords: JSON.stringify({ lat, lng }),
          cp,
          ciudad,
          estado,
          activa: true,
          user_email: user.email,
          store_id: laTienda.id
        }
      });
      await updateStore(laTienda.id, { paso: 3 });
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
      await finishStoreSetup(laTienda.id, slugify(storeName));
      await updateStore(laTienda.id, { paso: 4 });
      setActiveStep(4);
    } catch (err) {
      console.error("Error al verificar datos", err);
      setError("Error al verificar datos");
    } finally {
      setLoading(false);
    }
  };

  // Google Maps & Autocomplete
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
    libraries: LIBRARIES
  });

  const {
    ready,
    value,
    setValue,
    suggestions: { status, data },
    clearSuggestions
  } = usePlacesAutocomplete({ requestOptions: { componentRestrictions: { country: "mx" } }, debounce: 300 });

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
        if (c.types.includes("administrative_area_level_1")) comp.estado = c.long_name;
        if (c.types.includes("locality") || c.types.includes("administrative_area_level_2"))
          comp.ciudad = c.long_name;
      });
      setDireccionData({ direccion: address, lat, lng, ...comp });
    } catch (err) {
      console.error("Error en autocomplete:", err);
    }
  };

  if (!isAuthenticated)
    return (
      <Button variant="contained" onClick={loginWithRedirect}>
        Inicia sesión
      </Button>
    );

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Registrar Tienda
      </Typography>
      <Stepper activeStep={activeStep} alternativeLabel>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {activeStep === 0 && (
        <Box mt={2}>
          <TextField
            label="Nombre de tu tienda"
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
            fullWidth
            disabled={loading}
          />
          {error && <Typography color="error">{error}</Typography>}
          <Button onClick={handleCheckAndCreate} disabled={!storeName || loading} variant="contained" sx={{ mt: 2 }}>
            {loading ? <CircularProgress size={24} /> : "Siguiente"}
          </Button>
        </Box>
      )}

      {activeStep === 1 && (
        <Box mt={2}>
          <Typography>Conectar Stripe</Typography>
          {error && <Typography color="error">{error}</Typography>}
          <Button onClick={handleStripeConnect} disabled={loading} variant="contained" color="secondary" sx={{ mt: 2 }}>
            {loading ? <CircularProgress size={24} /> : "Conectar con Stripe"}
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
            🎉 Tienda lista!
          </Typography>
          <Button variant="contained" onClick={() => navigate(`/market/store/${slugify(storeName)}`)}>
            Ir a tu tienda
          </Button>
        </Box>
      )}
    </Box>
  );
}
