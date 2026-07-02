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
import RegisterStoreStepper from "./RegisterStoreStepper.jsx";

// 🔐 Contexto de roles / membresía
import { useRoles } from "../../Contexts/RolesContext";
import ActivaTuMembresia from "../../components/Membresias/ActivaTuMembresia.jsx";

const LIBRARIES = ["places"];
const steps = ["Nombre de la tienda", "Conectar Stripe", "Agregar dirección", "Verificar datos"];

export default function RegistroTienda() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, loginWithRedirect } = useAuth0();
  const { isActivaMembresia } = useRoles();

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

  // Inicializar paso según registro existente
  useEffect(() => {
    if (!isAuthenticated || !user) return;
    const init = async () => {
      try {
        const tiendas = await getStoreByEmail(user.email);
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
    clearSuggestions
  } = usePlacesAutocomplete({
    requestOptions: { componentRestrictions: { country: "mx" } },
    debounce: 300
  });

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

  // ✅ Autenticado + membresía activa → flujo normal
  return <RegisterStoreStepper />;
}
