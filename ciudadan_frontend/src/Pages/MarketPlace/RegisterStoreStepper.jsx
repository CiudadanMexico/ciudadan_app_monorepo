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
  Typography,
  Autocomplete
} from "@mui/material";
import { useAuth0 } from "@auth0/auth0-react";
import { slugify } from "../../utils/slugify.jsx";
import { getBankByCLABE, validateCLABE, BANK_OPTIONS } from "../../utils/validacionesBanco.js";
import { GoogleMap, Marker, useLoadScript } from "@react-google-maps/api";
import usePlacesAutocomplete, { getGeocode, getLatLng } from "use-places-autocomplete";
import { useRoles } from "../../Contexts/RolesContext.jsx";

// Librerías de Google Maps declaradas como constante
const LIBRARIES = ["places"];

const steps = [
  "Nombre de la tienda",
  "Datos bancarios  ",
  "Agregar dirección",
  "Verificar datos"
];

export default function RegisterStoreStepper() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, loginWithRedirect } = useAuth0();
  const { updateExtraRole } = useRoles();

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

  const [beneficiaryName, setBeneficiaryName] = useState(user?.name ?? '');
  const [bankCLABE, setBankCLABE] = useState('');
  const [bank, setBank] = useState('');
  const [unknownBank, setUnknownBank] = useState(true);

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
          console.log("tienda:", tienda)
          setLaTienda(tienda);
          const pasoBD = tienda.attributes?.paso;
          setActiveStep(pasoBD != null ? pasoBD : 0);
          if (pasoBD === 4) {
            setTimeout(() => handleRedirectStore(tienda?.attributes?.slug), 1800);
          }
        } else {
          setActiveStep(0);
        }
      } catch (err) {
        console.error("Error fetching store:", err);
      }
    };
    init();
  }, [isAuthenticated, user]);

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
      setLaTienda({ id: nueva.data.id, attributes: { ...nueva.data?.attributes, paso: 1 } });
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
      const { data } = await createDireccion({
        data: {
          direccion: { address: direccion },
          coords: { lat, lng },
          cp,
          ciudad,
          estado,
          activa: true,
          user_email: user.email,
          store_id: laTienda.id
        }
      });
      await updateStore(laTienda.id, { paso: 3, direccion: data?.id });
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
      await updateStore(laTienda.id, { paso: 4 });
      await updateExtraRole('store', true);
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
    clearSuggestions,
    init
  } = usePlacesAutocomplete({ requestOptions: { componentRestrictions: { country: "mx" } }, debounce: 300 });

  const handleSelect = async (address) => {
    try {
      setValue(address, false);
      clearSuggestions();
      const results = await getGeocode({ address });
      const { lat, lng } = getLatLng(results[0]);
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
      await updateStore(laTienda.id, { paso: 2, clabe_bancaria: bankCLABE, nombre_bancario: beneficiaryName, banco: bank });
      setActiveStep(2);
      init();
    } catch (error) {
      console.error("Error al establecer datos bancarios", error);
      setError("Error al establecer datos bancarios");
    } finally {
      setLoading(false);
    }

  };

  const handleRedirectStore = (slug = '') => {
    navigate(`/market/store/${slug ?? laTienda?.attributes?.slug}`);
  }

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
            🎉 Tienda lista!
          </Typography>
          <Button variant="contained" onClick={() => handleRedirectStore(laTienda?.attributes?.slug)}>
            Ir a tu tienda
          </Button>
        </Box>
      )}
    </Box>
  );
}
