// src/components/checkout/DireccionSelector.jsx
import React, { useEffect, useState } from "react";
import usePlacesAutocomplete, { getGeocode, getLatLng } from "use-places-autocomplete";
import { useAuth0 } from "@auth0/auth0-react";
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  FormControlLabel,
  Switch,
  Grid,
  TextField,
  Typography,
  Stack,
} from "@mui/material";
import {
  GoogleMap,
  Marker,
  useLoadScript,
} from "@react-google-maps/api";

const STRAPI = process.env.REACT_APP_STRAPI_URL || "";
const LIBRARIES = ["places"];

/**
 * DireccionSelector (sin mapa, sin columna de previsualización)
 * - Lista direcciones guardadas + toggle para ingresar nueva dirección + formulario
 * - Parsea formatted_address largos con heurística simple
 */
export default function DireccionSelector({ onConfirm }) {
  const { user, isAuthenticated } = useAuth0();

  const [direcciones, setDirecciones] = useState([]);
  const [loadingDirecciones, setLoadingDirecciones] = useState(false);
  const [creating, setCreating] = useState(false);
  const [predeterminada, setPredeterminada] = useState(false);
  const [ingresarNueva, setIngresarNueva] = useState(false);

  const [form, setForm] = useState({
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
    calle: "",
    numero: "",
    referencia: "",
    place_id: null
  });

  // 🔴 SELECCIÓN ACTIVA (NUEVO)
  const [selectedId, setSelectedId] = useState(null);

  const [modoDireccionManual, setModoDireccionManual] = useState(false);
  const [mapCenter, setMapCenter] = useState(null);
  const [obteniendoUbicacion, setObteniendoUbicacion] = useState(false);
  const [error, setError] = useState("");
  const [mostrarFormularioDireccion, setMostrarFormularioDireccion] = useState(false);

  const {
    ready,
    value,
    setValue,
    suggestions: { status, data },
    clearSuggestions,
  } = usePlacesAutocomplete({ debounce: 300, requestOptions: { componentRestrictions: { country: "mx" } } });

  const { isLoaded: isMapLoaded } = useLoadScript({
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
    libraries: LIBRARIES
  });

  useEffect(() => {
    if (isAuthenticated && user?.email) fetchSaved();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user?.email]);

  const fetchSaved = async () => {
    setLoadingDirecciones(true);
    try {
      if (!user?.email) return setDirecciones([]);
      const params = new URLSearchParams({
        "filters[usuario_email][$eq]": user.email,
        sort: "predeterminada:desc",
      });
      const res = await fetch(`${STRAPI}/api/direcciones?${params.toString()}`);
      if (!res.ok) return setDirecciones([]);
      const json = await res.json();
      const mapped = (json?.data ?? []).map((d) => ({ id: d.id, ...d.attributes }));
      setDirecciones(mapped);
    } catch (err) {
      console.error("fetchSaved:", err);
      setDirecciones([]);
    } finally {
      setLoadingDirecciones(false);
    }
  };

  // Heurística para separar un formatted_address largo en piezas.
  const parseFormattedAddress = (formatted = "") => {
    if (!formatted) return {};

    const cleaned = formatted.replace(/\s+&\s+/g, " & ").trim();
    const parts = cleaned.split(/\s*,\s*/).map((p) => p.trim()).filter(Boolean);

    const res = { street: "", number: "", neighborhood: "", city: "", state: "", country: "", rawParts: parts };

    if (parts.length === 1) {
      res.street = parts[0];
      return res;
    }

    // street = primera parte
    res.street = parts[0] || "";
    // colonia = segunda parte si existe
    if (parts.length >= 2) res.neighborhood = parts[1] || "";

    // heurística para city/state en las partes finales
    const tail = parts.slice(2).reverse();
    for (let i = 0; i < tail.length; i++) {
      const p = tail[i];
      if (/cdmx|ciudad de méxico|ciudad de mexico/i.test(p)) {
        res.city = "Ciudad de México";
        const maybeState = tail[i + 1];
        if (maybeState && !/mexico/i.test(maybeState)) res.state = maybeState;
        break;
      }
    }

    if (!res.city) {
      const last = parts[parts.length - 1] || "";
      const penultimate = parts[parts.length - 2] || "";
      if (/mexico/i.test(last) && penultimate) {
        res.city = penultimate;
        const antepenultimate = parts[parts.length - 3] || "";
        if (antepenultimate && !/mexico/i.test(antepenultimate)) res.state = antepenultimate;
      } else {
        if (parts.length >= 4) {
          res.state = last;
          res.city = parts[parts.length - 3] || "";
        } else {
          res.city = last;
        }
      }
    }

    if (res.state && /cdmx/i.test(res.state)) res.state = "Ciudad de México";
    if (res.city && /cdmx/i.test(res.city)) res.city = "Ciudad de México";

    return res;
  };

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
      calle: "",
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

      // Obtener calle designada
      // Prioridad street_address
      if (types.includes("street_address") && !address.calle)
        address.calle = long_name;

      // fallback con route
      if (types.includes("route") && !address.calle)
        address.calle = long_name;

      // Obtener número de calle
      if (types.includes("street_number"))
        address.numero = long_name;
    });
    return address;
  };

  // Función para validar dirección apta para envío
  const validarDireccionEnvio = (direccion) => {
    const camposRequeridos = [
      "formatted_address",
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

  const getFormDataByAddress = (d) => {
    const {
      direccion,
      coords,
      cp,
      ciudad,
      estado,
      estado_codigo,
      colonia,
      pais,
      pais_codigo,
      observaciones,
      place_id,
      route,
      numero,
    } = d;

    let address = {
      formatted_address: direccion?.formatted_address ?? [route, numero, ciudad].filter(Boolean).join(" "),
      lat: direccion?.lat ?? coords?.lat,
      lng: direccion?.lng ?? coords?.lng,
      cp: direccion?.postal_code ?? cp,
      ciudad: direccion?.city ?? ciudad,
      estado: direccion?.state ?? estado,
      pais: direccion?.country ?? pais,
      paisCodigo: direccion?.country_code ?? pais_codigo,
      estadoCodigo: direccion?.state_code ?? estado_codigo,
      colonia: direccion?.neighborhood ?? colonia,
      calle: direccion?.street ?? route,
      numero: direccion?.number ?? numero,
      referencia: observaciones,
      place_id,
    };
    return address;
  };

  const applySaved = (d) => {
    // 🔴 MARCAR SELECCIÓN (NUEVO)
    setSelectedId(d.id);
    const address = getFormDataByAddress(d);
    console.log("Address built to form:", address);

    setForm(address)

    const {
      coords,
      activa,
      user_email,
      usuario_email,
      predeterminada,
    } = d;

    setMapCenter({
      lat: address?.lat ?? coords.lat,
      lng: address?.lng ?? coords.lng,
    });

    const payload = {
      id: d?.id ?? null,
      direccion: {
        formatted_address: address.formatted_address,
        street: address.calle,
        number: address.numero,
        neighborhood: address.colonia,
        city: address.ciudad,
        state: address.estado,
        postal_code: address.cp,
        lat: address.lat,
        lng: address.lng,
        country: address.pais,
        country_code: address.paisCodigo,
        state_code: address.estadoCodigo,
      },
      coords: { lat: address.lat, lng: address.lng },
      cp: address.cp,
      ciudad: address.ciudad,
      estado: address.estado,
      observaciones: address.referencia || "",
      activa: activa ?? true,
      predeterminada: predeterminada ?? false,
      usuario_email,
      user_email,
    };

    onConfirm && onConfirm(payload);
  };

  const handleSelectSuggestion = async ({ description, place_id }) => {
    try {
      setValue(description, false);
      clearSuggestions();

      let results = await getGeocode({ placeId: place_id });

      if (!results || results.length === 0) {
        setError("No se encontró información para la dirección")
        return
      };

      let first = results[0];

      // Validar que exista el primer resultado de getGeocode
      if (!first) {
        console.warn("No se encontró información para la dirección");
        setError("No se encontró información para la dirección");
        return;
      }

      // Si address_components está vacío reintentar geocodificación solo con description
      if (!first.address_components?.length) {
        results = await getGeocode({ address: description });
        first = results[0];
        // Reintentar validación de existencia del primer resultado de getGeocode 
        if (!first) {
          console.warn("No se encontró información para la dirección");
          setError("No se encontró información para la dirección, ingrese una dirección valida.");
          return;
        }
      }

      // Si nuevamente address_components está vacío mostrar formulario de corrección
      if (first.address_components?.length === 0)
        setModoDireccionManual(true);

      const { lat, lng } = getLatLng(first);

      const parsed = parseAddressComponents(first.address_components);

      const address = {
        formatted_address: first.formatted_address,
        lat,
        lng,
        ...parsed,
        place_id,
      };
      console.log("Data dirección selected:", address);

      setForm(address);

      setMapCenter({
        lat,
        lng,
      });

      // Comprobar datos faltantes de dirección
      const camposEnvio = ["cp", "ciudad", "estado"];
      const faltantes = camposEnvio.filter((campo) => !address[campo]?.trim());

      if (faltantes.length > 0) {
        setError("La dirección está incompleta. Completa los datos necesarios para realizar envíos.");
        setModoDireccionManual(true);
      } else {
        setModoDireccionManual(false);
        setError("");
      }
    } catch (err) {
      console.error("handleSelectSuggestion:", err);
    }
  };

  const handleCreateAddress = async (e) => {
    e.preventDefault();

    const {
      formatted_address,
      lat,
      lng,
      cp,
      ciudad,
      estado,
      estadoCodigo,
      pais,
      paisCodigo,
      colonia,
      calle,
      numero,
      referencia,
      place_id
    } = form;

    if (!formatted_address) {
      setError("Ingrese una dirección.");
      return;
    }

    if (lat === null || lat === undefined || lng === null || lng === undefined) {
      setError("No se pudo determinar la ubicación exacta de la dirección.");
      return;
    }

    if (!validarDireccionEnvio(form)) {
      const faltantes = [];
      if (!cp) faltantes.push("código postal");
      if (!ciudad) faltantes.push("ciudad");
      if (!estado) faltantes.push("estado");

      if (faltantes.length > 0)
        setError(`La dirección está incompleta. Falta: ${faltantes.join(", ")}.`);

      return;
    }


    setCreating(true);
    setError("");

    try {
      if (!user?.email) throw new Error("Usuario no autenticado");

      if (predeterminada) {
        try {
          const resPrev = await fetch(`${STRAPI}/api/direcciones?filters[usuario_email][$eq]=${encodeURIComponent(user.email)}&filters[predeterminada][$eq]=true`);
          if (resPrev.ok) {
            const jsonPrev = await resPrev.json();
            const prev = jsonPrev?.data?.[0];
            if (prev) {
              await fetch(`${STRAPI}/api/direcciones/${prev.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ data: { predeterminada: false } }),
              });
            }
          }
        } catch (err) {
          console.warn("no se pudo desmarcar previa predeterminada", err);
        }
      }

      const payload = {
        data: {
          direccion: {
            formatted_address: formatted_address || [calle, numero].filter(Boolean).join(" "),
            street: calle,
            number: numero,
            neighborhood: colonia,
            city: ciudad,
            state: estado,
            postal_code: cp,
            lat: lat,
            lng: lng,
            country: pais,
            country_code: paisCodigo,
            state_code: estadoCodigo,
          },
          coords: { lat, lng },
          cp: cp,
          ciudad: ciudad,
          estado: estado,
          estado_codigo: estadoCodigo,
          colonia,
          pais,
          pais_codigo: paisCodigo || "MX",
          observaciones: referencia,
          activa: true,
          user_email: user.email,
          usuario_email: user.email,
          place_id,
          route: calle,
          numero,
          predeterminada,
        },
      };

      const res = await fetch(`${STRAPI}/api/direcciones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Error guardando dirección");
      await fetchSaved();
      setIngresarNueva(false);
    } catch (err) {
      console.error(err);
      alert("Error guardando dirección");
    } finally {
      setCreating(false);
    }
  };

  const handleUseWithoutSaving = () => {
    const {
      direccion,
      lat,
      lng,
      cp,
      ciudad,
      estado,
      colonia,
      paisCodigo,
      pais,
      formatted_address,
      estadoCodigo,
      calle,
      numero,
      place_id,
      referencia
    } = form;

    // Validación básica
    if (!formatted_address || !direccion) {
      setError("Ingrese una dirección.");
      return;
    }

    // Validar ubicación geográfica
    if (lat === null || lat === undefined || lng === null || lng === undefined) {
      setError("No pudimos determinar la ubicación exacta de la dirección.");
      return;
    }

    // Validación específica para envíos
    if (!validarDireccionEnvio(form)) {
      const faltantes = [];
      if (!cp) faltantes.push("código postal");
      if (!ciudad) faltantes.push("ciudad");
      if (!estado) faltantes.push("estado");

      if (faltantes.length > 0)
        setError(`La dirección está incompleta. Falta: ${faltantes.join(", ")}.`);

      return;
    }

    const dirObj = {
      id: null,
      direccion: {
        formatted_address: formatted_address || [calle, numero, colonia, ciudad, estado].filter(Boolean).join(", "),
        street: calle,
        number: numero,
        neighborhood: colonia || "",
        city: ciudad || "",
        state: estado || "",
        postal_code: cp || "",
        country: pais,
        country_code: paisCodigo,
        lat: Number(lat),
        lng: Number(lng),
      },
      coords: {
        lat: Number(lat),
        lng: Number(lng),
      },
      cp,
      ciudad,
      estado,
      estado_codigo: estadoCodigo,
      colonia,
      pais,
      pais_codigo: paisCodigo,
      observaciones: referencia,
      activa: true,
      user_email: user.email,
      usuario_email: user.email,
      place_id,
      route: calle,
      numero,
      predeterminada,
    };

    onConfirm && onConfirm(dirObj);
  };

  const obtenerUbicacionInicial = () => {
    if (!navigator.geolocation) {
      return;
    }

    setObteniendoUbicacion(true);

    navigator.geolocation.getCurrentPosition((position) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;

      setForm((prev) => ({
        ...prev,
        lat,
        lng,
      }));

      setMapCenter({
        lat,
        lng,
      });

      setObteniendoUbicacion(false);
    }, (error) => {
      console.warn("No fue posible obtener ubicación:", error);
      setObteniendoUbicacion(false);
    }, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    });
  };

  const handleMarkerDragEnd = (event) => {
    const lat =
      event.latLng.lat();

    const lng =
      event.latLng.lng();

    setForm((prev) => ({
      ...prev,
      lat,
      lng,
    }));

    setMapCenter({
      lat,
      lng,
    });
  };

  const activarModoManual = () => {
    setModoDireccionManual(true);
    clearSuggestions();
    setValue("");

    setForm({
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
      calle: "",
      numero: "",
      referencia: "",
      place_id: null
    });

    obtenerUbicacionInicial();
  };

  return (
    <Box>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Typography variant="h6">Direcciones guardadas</Typography>

          <Box mt={1} mb={2}>
            {loadingDirecciones ? (
              <CircularProgress size={20} />
            ) : direcciones.length === 0 ? (
              <Typography variant="body2">No hay direcciones guardadas.</Typography>
            ) : (
              <Stack spacing={1}>
                {direcciones.map((d) => {
                  const norm = d?.direccion ?? {};
                  const selected = selectedId === d.id;

                  return (
                    <Card
                      key={d.id}
                      variant="outlined"
                      sx={{
                        borderColor: selected ? "primary.main" : "divider",
                        backgroundColor: selected ? "action.selected" : "background.paper",
                      }}
                    >
                      <CardContent sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                        <Box display="flex" justifyContent="space-between" alignItems="center">
                          <Typography variant="subtitle2">{norm.city ? `${norm.city}, ${norm.state || ""}` : "Dirección"}</Typography>
                          {d.predeterminada && (
                            <Typography variant="caption" sx={{ color: "success.main" }}>Predeterminada</Typography>
                          )}
                        </Box>

                        <Typography variant="body1" sx={{ fontWeight: 600 }}>{norm.street}</Typography>

                        <Typography variant="body2" sx={{ color: "text.secondary" }}>
                          {norm.neighborhood ? `${norm.neighborhood} · ` : ""}{norm.state ? `${norm.state}` : ""}{norm.postal_code ? ` · CP ${norm.postal_code}` : ""}
                        </Typography>

                        <Box display="flex" gap={1} mt={1}>
                          <Button
                            size="small"
                            variant="contained"
                            disabled={selected}
                            onClick={() => applySaved(d)}
                          >
                            Usar
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => {
                              const auxAddressForm = getFormDataByAddress(d);
                              setForm((p) => ({
                                ...p,
                                ...auxAddressForm,
                              }));
                            }}
                          >
                            Rellenar
                          </Button>
                        </Box>
                      </CardContent>
                    </Card>
                  );
                })}
              </Stack>
            )}
          </Box>

          <Divider sx={{ my: 1 }} />

          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Typography variant="subtitle1">Ingresar nueva dirección</Typography>
            <FormControlLabel
              control={<Switch checked={ingresarNueva} onChange={(e) => setIngresarNueva(e.target.checked)} />}
              label={ingresarNueva ? "ON" : "OFF"}
            />
          </Box>

          {ingresarNueva && (
            <Box component="form" onSubmit={handleCreateAddress} sx={{ display: "flex", flexDirection: "column", gap: 1, mt: 1 }}>
              <TextField
                placeholder="Buscar dirección..."
                value={value}
                onChange={(e) => setValue(e.target.value)}
                disabled={!ready}
                size="small"
                fullWidth
              />

              {ready && status === "OK" && data.length > 0 && (
                <Box sx={{ maxHeight: 180, overflowY: "auto" }}>
                  {data.map((s) => (
                    <Card key={s.place_id} variant="outlined" sx={{ mb: 1 }}>
                      <CardContent sx={{ p: 1 }}>
                        <Button fullWidth onClick={() => handleSelectSuggestion(s)}>
                          {s.description}
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              )}
              <Box
                sx={{
                  mt: 2,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 2,
                  flexWrap: "wrap",
                }}
              >
                <Typography
                  variant="body2"
                  color="text.secondary"
                >
                  ¿No puedes encontrar tu dirección?
                </Typography>

                <Button
                  variant="outlined"
                  onClick={activarModoManual}
                >
                  Ingresar dirección manualmente
                </Button>
              </Box>

              {/* <TextField label="Calle" value={form.calle} onChange={(e) => setForm((p) => ({ ...p, calle: e.target.value }))} required />

              <Grid container spacing={1}>
                <Grid item xs={6}>
                  <TextField label="Número" value={form.numero} onChange={(e) => setForm((p) => ({ ...p, numero: e.target.value }))} />
                </Grid>
                <Grid item xs={6}>
                  <TextField label="Colonia" value={form.colonia} onChange={(e) => setForm((p) => ({ ...p, colonia: e.target.value }))} />
                </Grid>
              </Grid>

              <Grid container spacing={1}>
                <Grid item xs={6}>
                  <TextField label="Ciudad" value={form.ciudad} onChange={(e) => setForm((p) => ({ ...p, ciudad: e.target.value }))} />
                </Grid>
                <Grid item xs={6}>
                  <TextField label="Estado" value={form.estado} onChange={(e) => setForm((p) => ({ ...p, estado: e.target.value }))} />
                </Grid>
              </Grid>

              <TextField label="Código Postal" value={form.cp} onChange={(e) => setForm((p) => ({ ...p, cp: e.target.value }))} />
              <TextField label="Referencia / Observaciones" value={form.referencia} onChange={(e) => setForm((p) => ({ ...p, referencia: e.target.value }))} /> */}
              {modoDireccionManual && (
                <Box
                  sx={{
                    mt: 2,
                    p: 2,
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 2,
                  }}
                >
                  <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }} >
                    Dirección manual
                  </Typography>

                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={8}>
                      <TextField
                        fullWidth
                        label="Calle"
                        value={form.calle}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            calle: e.target.value,
                          }))
                        }
                      />
                    </Grid>

                    <Grid item xs={12} sm={4}>
                      <TextField
                        fullWidth
                        label="Número"
                        value={form.numero}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            numero: e.target.value,
                          }))
                        }
                      />
                    </Grid>

                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Colonia"
                        value={form.colonia}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            colonia: e.target.value,
                          }))
                        }
                      />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Ciudad"
                        value={form.ciudad}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            ciudad: e.target.value,
                          }))
                        }
                      />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Estado"
                        value={form.estado}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            estado: e.target.value,
                          }))
                        }
                      />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Código postal"
                        value={form.cp}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            cp: e.target.value,
                          }))
                        }
                      />
                    </Grid>

                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Referencia"
                        value={form.referencia}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            referencia: e.target.value,
                          }))
                        }
                      />
                    </Grid>
                  </Grid>
                </Box>
              )}
              {isMapLoaded && Number.isFinite(Number(form.lat)) && Number.isFinite(Number(form.lng)) && (
                <Box sx={{ mt: 3 }}>
                  <Typography
                    variant="subtitle1"
                    fontWeight={700}
                    sx={{ mb: 1 }}
                  >
                    Ubicación de entrega
                  </Typography>

                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 2 }}
                  >
                    Arrastra el marcador si necesitas ajustar
                    la ubicación exacta.
                  </Typography>

                  <GoogleMap
                    mapContainerStyle={{
                      width: "100%",
                      height: "350px",
                      borderRadius: 12,
                    }}
                    zoom={15}
                    center={{
                      lat: Number(form.lat),
                      lng: Number(form.lng),
                    }}
                  >
                    <Marker
                      position={{
                        lat: Number(form.lat),
                        lng: Number(form.lng),
                      }}
                      draggable
                      onDragEnd={handleMarkerDragEnd}
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
                    {Number(form.lat).toFixed(6)},{" "}
                    {Number(form.lng).toFixed(6)}
                  </Typography>
                </Box>
              )}

              <FormControlLabel control={<Switch checked={predeterminada} onChange={(e) => setPredeterminada(e.target.checked)} />} label="Marcar como predeterminada" />

              <Box display="flex" justifyContent="space-between" alignItems="center" mt={1}>
                <Button type="submit" variant="contained" disabled={creating}>
                  {creating ? "Guardando..." : "Guardar dirección"}
                </Button>

                <Button variant="outlined" onClick={handleUseWithoutSaving}>
                  Usar sin guardar
                </Button>
              </Box>
            </Box>
          )}
        </Grid>
      </Grid>
    </Box>
  );
}
