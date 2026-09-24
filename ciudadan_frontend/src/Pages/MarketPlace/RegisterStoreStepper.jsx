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
  Autocomplete,
  Grid
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
  const { updateExtraRole, userData } = useRoles();

  const [activeStep, setActiveStep] = useState(0);
  const [storeName, setStoreName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [laTienda, setLaTienda] = useState(null);
  const [direccionData, setDireccionData] = useState({
    direccion: "",
    formatted_address: "",
    lat: null,
    lng: null,
    cp: "",
    ciudad: "",
    estado: "",
    pais: "",
    paisCodigo: "",
    estadoCodigo: "",
    colonia: "",
    route: "",
    numero: "",
    referencia: "",
    place_id: null,
  });
  const [mostrarFormularioDireccion, setMostrarFormularioDireccion] = useState(false);

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

  // Función para construir dirección
  const parseAddressComponents = (components = []) => {
    const address = {
      cp: "",
      pais: "",
      paisCodigo: "",
      ciudad: "",
      estado: "",
      estadoCodigo: "",
      colonia: "",
      route: "",
      numero: "",
    };
    components.forEach((component) => {
      const {
        long_name = "",
        short_name = "",
        types = []
      } = component;
      // Obtener código postal
      if (types.includes("postal_code"))
        address.cp = long_name;

      // Obtener país
      if (types.includes("country")) {
        address.pais = long_name;
        address.paisCodigo = short_name;
      }

      // Obtener estado
      if (types.includes("administrative_area_level_1")) {
        address.estado = long_name;
        address.estadoCodigo = short_name;
      }

      // Preferimos locality como ciudad. 
      if (types.includes("locality") && !address.ciudad)
        address.ciudad = long_name;

      // Fallback para lugares donde no existe locality. 
      if (types.includes("administrative_area_level_2") && !address.ciudad)
        address.ciudad = long_name;

      // Preferimos neighborhood como colonia. 
      if (types.includes("neighborhood") && !address.colonia)
        address.colonia = long_name;

      // Fallback para direcciones que utilizan sublocality. 
      if (types.includes("sublocality_level_1") && !address.colonia)
        address.colonia = long_name;

      // Obtener ruta designada
      if (types.includes("route"))
        address.route = long_name;

      // Obtener número de calle
      if (types.includes("street_number"))
        address.numero = long_name;
    });
    return address;
  };

  // Función para validar dirección apta para envío
  const validarDireccionEnvio = (direccion) => {
    const camposRequeridos = [
      "direccion",
      "cp",
      "ciudad",
      "estado",
    ];

    return camposRequeridos.every((campo) =>
      direccion[campo] !== null &&
      direccion[campo] !== undefined &&
      String(direccion[campo]).trim() !== ""
    );
  };

  const handleSelect = async ({ description, place_id }) => {
    try {
      setValue(description, false);
      clearSuggestions();

      let results = await getGeocode({ placeId: place_id, });
      let firstResult = results[0];

      // Validar que exista el primer resultado de getGeocode
      if (!firstResult) {
        console.warn("No se encontró información para la dirección");
        setError("No se encontró información para la dirección");
        return;
      }

      // Si address_components está vacío reintentar geocodificación solo con description
      if (!firstResult.address_components?.length) {
        results = await getGeocode({ address: description });
        firstResult = results[0];
        // Reintentar validación de existencia del primer resultado de getGeocode 
        if (!firstResult) {
          console.warn("No se encontró información para la dirección");
          setError("No se encontró información para la dirección, ingrese una dirección válida.");
          return;
        }
      }
      // Si nuevamente address_components está vacío mostrar formulario de corrección
      if (firstResult.address_components?.length === 0)
        setMostrarFormularioDireccion(true);

      // Obtener latitud y longitud del resultado
      const { lat, lng } = getLatLng(firstResult);

      // Obtener componentes de dirección transformados
      const parsedAddress = parseAddressComponents(firstResult.address_components);

      const address = {
        place_id,
        formatted_address: firstResult.formatted_address,
        direccion: description,
        lat,
        lng,
        ...parsedAddress
      };
      console.log("Data dirección selected:", address);

      setDireccionData(address);

      // Comprobar datos faltantes de dirección
      const camposEnvio = ["cp", "ciudad", "estado"];
      const faltantes = camposEnvio.filter((campo) => !address[campo]?.trim());

      if (faltantes.length > 0) {
        setError("La dirección está incompleta. Completa los datos necesarios para realizar envíos.");
        setMostrarFormularioDireccion(true);
      }else{
        setMostrarFormularioDireccion(false);
      }
    } catch (err) {
      console.error("Error obteniendo información de la dirección:", err);
    }
  };

  // Handlers de cada step
  const handleCheckAndCreate = async () => {
    if (!user?.email) return loginWithRedirect();
    setLoading(true);
    setError("");
    try {
      const slug = slugify(storeName);
      const tiendas = await getStoreBySlug(slug);
      if (tiendas.length) return setError("Ese nombre ya está registrado");
      const nueva = await createStore({ name: storeName, email: user.email, userId: userData?.id });
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
    const {
      direccion,
      lat,
      lng,
      cp,
      ciudad,
      estado,
      colonia,
      paisCodigo,
      formatted_address,
      estadoCodigo,
      route,
      numero,
      pais,
      place_id,
      referencia,
    } = direccionData;

    // Validación básica
    if (!direccion) {
      setError("Ingrese una dirección.");
      return;
    }

    // Validar ubicación geográfica
    if (lat === null || lat === undefined || lng === null || lng === undefined) {
      setError("No pudimos determinar la ubicación exacta de la dirección.");
      return;
    }

    // Validación específica para envíos
    if (!validarDireccionEnvio(direccionData)) {
      const faltantes = [];
      if (!cp) faltantes.push("código postal");
      if (!ciudad) faltantes.push("ciudad");
      if (!estado) faltantes.push("estado");

      // setError("Completa la dirección, código postal, ciudad y estado para poder utilizarla en envíos.");
      if (faltantes.length > 0)
        setError(`La dirección está incompleta. Falta: ${faltantes.join(", ")}.`);

      return;
    }

    setLoading(true);
    setError("");

    try {
      const addressData = {
        data: {
          direccion: {
            formatted_address: formatted_address || direccion,
            street: route,
            number: numero,
            neighborhood: colonia,
            city: ciudad,
            state: estado,
            state_code: estadoCodigo,
            postal_code: cp,
            country: pais,
            country_code: paisCodigo,
            lat,
            lng
          },
          coords: {
            lat,
            lng
          },
          cp,
          ciudad,
          estado,
          estado_codigo: estadoCodigo,
          colonia,
          pais,
          pais_codigo: paisCodigo || "MX",
          observaciones: referencia,
          activa: true,
          user_email: user.email,
          usuario_email: user.email,
          store_id: laTienda.id,
          place_id,
          numero,
          route
        }
      };

      const { data } = await createDireccion(addressData);

      await updateStore(laTienda.id, { paso: 3, direccion: data?.id, cp, localidad: ciudad });

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
      await updateStore(laTienda.id, { paso: 4, terminado: true });
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
          <Box
            mt={4}
            display="flex"
            justifyContent="center"
            alignItems="center"
          >
            <CircularProgress />
          </Box>
        ) : (
          <Box mt={2}>
            {/* AVISO DE PRIVACIDAD */}
            <Box
              mb={2}
              p={2}
              sx={{
                backgroundColor: "error.main",
                color: "white",
                borderRadius: 2,
              }}
            >
              <Typography>
                <strong>Nota:</strong> La dirección de tu tienda es privada y
                solo se utilizará para fines de envío.
              </Typography>
            </Box>

            {/* BUSCADOR GOOGLE  */}
            <Typography variant="h6" gutterBottom>
              Ubicación de tu tienda
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }} >
              Busca la dirección de tu tienda y selecciona una de las sugerencias proporcionadas por Google.
            </Typography>

            <TextField
              label="Buscar dirección"
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                // Si el usuario vuelve a modificar la búsqueda, 
                // ocultamos el formulario de corrección hasta seleccionar nuevamente una dirección.
                if (mostrarFormularioDireccion) {
                  setMostrarFormularioDireccion(false);
                }
              }}
              fullWidth
              margin="normal"
              disabled={loading}
              placeholder="Ej. Av. 20 de Noviembre 123, Xalapa..."
            />
            {/* SUGERENCIAS */}
            {ready && status === "OK" && data.length > 0 && (
              <Box
                sx={{
                  maxHeight: 250,
                  overflowY: "auto",
                  bgcolor: "background.paper",
                  mb: 2,
                  borderRadius: 1,
                  boxShadow: 2,
                  border: "1px solid",
                  borderColor: "divider",
                }}
              >
                {data.map((suggestion) => {
                  const { place_id, description, } = suggestion;

                  return (
                    <Box
                      key={place_id}
                      onClick={() =>
                        handleSelect({ description, place_id, })
                      }
                      sx={{
                        p: 1.5,
                        cursor: "pointer",
                        borderBottom: "1px solid",
                        borderColor: "divider",
                        "&:hover": {
                          backgroundColor: "action.hover",
                        },
                      }}
                    >
                      <Typography variant="body2">
                        {description}
                      </Typography>
                    </Box>
                  );
                })}
              </Box>
            )}
            {/* MENSAJE DE DIRECCIÓN INCOMPLETA */}
            {mostrarFormularioDireccion && (
              <Box
                sx={{
                  mt: 2,
                  mb: 2,
                  p: 2,
                  borderRadius: 2,
                  border: "1px solid",
                  borderColor: "warning.main",
                  backgroundColor: "warning.lighter",
                }}
              >
                <Typography variant="subtitle1" fontWeight={700} color="warning.dark" gutterBottom>
                  Necesitamos algunos datos adicionales
                </Typography>

                <Typography variant="body2" color="text.secondary">
                  Google no pudo identificar todos los componentes de la
                  dirección. Revisa y completa los datos siguientes para
                  poder utilizar esta dirección como dirección de envío.
                </Typography>
              </Box>
            )}
            {/* FORMULARIO DE CORRECCIÓN: Se muestra únicamente cuando la dirección necesita datos adicionales. */}
            {mostrarFormularioDireccion && (
              <Box
                sx={{
                  mt: 2,
                  p: 2,
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 2,
                  backgroundColor: "background.paper",
                }}
              >
                <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
                  Datos de la dirección
                </Typography>

                <Grid container spacing={2}>
                  {/* Calle */}
                  <Grid item xs={12} sm={8}>
                    <TextField
                      fullWidth
                      label="Calle"
                      value={direccionData.route}
                      onChange={(e) =>
                        setDireccionData((prev) => ({
                          ...prev,
                          route: e.target.value,
                        }))
                      }
                      disabled={loading}
                      required
                    />
                  </Grid>

                  {/* Número */}
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      label="Número"
                      value={direccionData.numero}
                      onChange={(e) =>
                        setDireccionData((prev) => ({
                          ...prev,
                          numero: e.target.value,
                        }))
                      }
                      disabled={loading}
                    />
                  </Grid>

                  {/* Colonia */}
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Colonia"
                      value={direccionData.colonia}
                      onChange={(e) =>
                        setDireccionData((prev) => ({
                          ...prev,
                          colonia: e.target.value,
                        }))
                      }
                      disabled={loading}
                      required
                    />
                  </Grid>

                  {/* Ciudad */}
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Ciudad / Municipio"
                      value={direccionData.ciudad}
                      onChange={(e) =>
                        setDireccionData((prev) => ({
                          ...prev,
                          ciudad: e.target.value,
                        }))
                      }
                      disabled={loading}
                      required
                    />
                  </Grid>

                  {/* Estado */}
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Estado"
                      value={direccionData.estado}
                      onChange={(e) =>
                        setDireccionData((prev) => ({
                          ...prev,
                          estado: e.target.value,
                        }))
                      }
                      disabled={loading}
                      required
                    />
                  </Grid>

                  {/* Código postal */}
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Código postal"
                      value={direccionData.cp}
                      onChange={(e) =>
                        setDireccionData((prev) => ({
                          ...prev,
                          cp: e.target.value,
                        }))
                      }
                      disabled={loading}
                      inputMode="numeric"
                      required
                    />
                  </Grid>

                  {/* País */}
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="País"
                      value={direccionData.pais}
                      onChange={(e) =>
                        setDireccionData((prev) => ({
                          ...prev,
                          pais: e.target.value,
                        }))
                      }
                      disabled={loading}
                    />
                  </Grid>
                </Grid>
              </Box>
            )}

            {/* DIRECCIÓN ENCONTRADA POR GOOGLE: Si ya tenemos coordenadas, mostramos mapa. */}
            {Number.isFinite(Number(direccionData.lat)) && Number.isFinite(Number(direccionData.lng)) && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }} >
                  Ubicación de la tienda
                </Typography>

                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }} >
                  Verifica que el marcador corresponda con la ubicación
                  de tu tienda. Puedes arrastrarlo para ajustar la
                  posición exacta.
                </Typography>

                <GoogleMap
                  mapContainerStyle={{
                    width: "100%",
                    height: "350px",
                    borderRadius: 12,
                  }}
                  zoom={15}
                  center={{
                    lat: Number(direccionData.lat),
                    lng: Number(direccionData.lng),
                  }}
                >
                  <Marker
                    position={{
                      lat: Number(direccionData.lat),
                      lng: Number(direccionData.lng),
                    }}
                    draggable
                    onDragEnd={(event) => {
                      const lat = event.latLng.lat();
                      const lng = event.latLng.lng();

                      setDireccionData((prev) => ({
                        ...prev,
                        lat,
                        lng,
                      }));
                    }}
                  />
                </GoogleMap>

                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    display: "block",
                    mt: 1,
                  }}
                >
                  Coordenadas:{" "}
                  {Number(direccionData.lat).toFixed(6)},{" "}
                  {Number(direccionData.lng).toFixed(6)}
                </Typography>
              </Box>
            )}

            {/* RESUMEN DE DATOS DETECTADOS: Se muestra cuando tenemos información de dirección. */}
            {direccionData.direccion && (
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12}>
                  <Box
                    sx={{
                      mt: 3,
                      p: 2,
                      borderRadius: 2,
                      backgroundColor: "action.hover",
                    }}
                  >
                    <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }} >
                      Dirección seleccionada
                    </Typography>

                    <Typography variant="body2">
                      {direccionData.direccion}
                    </Typography>

                    {(direccionData.route || direccionData.numero || direccionData.colonia || direccionData.ciudad || direccionData.estado || direccionData.cp) && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }} >
                        {[
                          direccionData.route && `${direccionData.route}${direccionData.numero ? ` ${direccionData.numero}` : ""}`,
                          direccionData.colonia,
                          direccionData.ciudad,
                          direccionData.estado,
                          direccionData.cp &&
                          `CP ${direccionData.cp}`,
                        ]
                          .filter(Boolean)
                          .join(", ")}
                      </Typography>
                    )}
                  </Box>
                </Grid>
                <Grid item xs={12} sx={{ mt: 1 }}>
                  <TextField
                    fullWidth
                    label="Referencia"
                    placeholder="Ej. Casa de portón negro, frente al parque"
                    value={direccionData.referencia || ""}
                    onChange={(e) =>
                      setDireccionData((prev) => ({
                        ...prev,
                        referencia: e.target.value,
                      }))
                    }
                    helperText="Puedes agregar una referencia para facilitar la ubicación."
                  />
                </Grid>
              </Grid>
            )}

            {/* ERROR */}
            {error && (
              <Typography color="error" sx={{ mt: 2 }} >
                {error}
              </Typography>
            )}

            {/* GUARDAR */}
            <Box
              display="flex"
              justifyContent="flex-end"
              mt={3}
            >
              <Button
                onClick={handleSaveDireccion}
                disabled={loading || !direccionData.direccion || direccionData.lat === null || direccionData.lng === null}
                variant="contained"
              >
                {loading ? (
                  <CircularProgress size={24} />
                ) : (
                  "Guardar dirección"
                )}
              </Button>
            </Box>
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
