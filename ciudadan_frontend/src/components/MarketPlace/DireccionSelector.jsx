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

const STRAPI = process.env.REACT_APP_STRAPI_URL || "";

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
    calle: "",
    numero: "",
    colonia: "",
    ciudad: "",
    estado: "",
    cp: "",
    referencia: "",
    lat: null,
    lng: null,
    formatted_address: "",
  });

  // 🔴 SELECCIÓN ACTIVA (NUEVO)
  const [selectedId, setSelectedId] = useState(null);

  const {
    ready,
    value,
    setValue,
    suggestions: { status, data },
    clearSuggestions,
  } = usePlacesAutocomplete({ debounce: 300, requestOptions: { componentRestrictions: { country: "mx" } } });

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
      const mapped = (json?.data || []).map((d) => ({ id: d.id, ...d.attributes }));
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

  // Normalizar una dirección proveniente de Strapi (o raw)
  const normalizeDireccion = (raw) => {
    const direccion = raw?.direccion || raw;
    if (!direccion) return null;

    // Si ya trae campos estructurados
    if (direccion.street || direccion.number || direccion.neighborhood || direccion.city) {
      return {
        formatted_address: direccion.formatted_address || [direccion.street, direccion.number].filter(Boolean).join(" ") || "",
        street: direccion.street || "",
        number: direccion.number || "",
        neighborhood: direccion.neighborhood || "",
        city: direccion.city || raw?.ciudad || "",
        state: direccion.state || raw?.estado || "",
        postal_code: direccion.postal_code || raw?.cp || "",
        lat: direccion.lat || raw?.coords?.lat || null,
        lng: direccion.lng || raw?.coords?.lng || null,
      };
    }

    // Si viene solo formatted_address (cadena larga)
    if (direccion.formatted_address || typeof direccion === "string") {
      const formatted = direccion.formatted_address || direccion;
      const parsed = parseFormattedAddress(formatted);
      return {
        formatted_address: formatted,
        street: parsed.street || "",
        number: parsed.number || "",
        neighborhood: parsed.neighborhood || "",
        city: parsed.city || raw?.ciudad || "",
        state: parsed.state || raw?.estado || "",
        postal_code: raw?.cp || "",
        lat: raw?.coords?.lat || null,
        lng: raw?.coords?.lng || null,
      };
    }

    return null;
  };

  const applySaved = (d) => {
    const norm = normalizeDireccion(d) || {};
    // 🔴 MARCAR SELECCIÓN (NUEVO)
    setSelectedId(d.id);

    setForm((p) => ({
      ...p,
      calle: norm.street || "",
      numero: norm.number || "",
      colonia: norm.neighborhood || "",
      ciudad: norm.city || "",
      estado: norm.state || "",
      cp: norm.postal_code || "",
      lat: norm.lat || null,
      lng: norm.lng || null,
      formatted_address: norm.formatted_address || "",
    }));

    const payload = {
      id: d.id || null,
      direccion: {
        formatted_address: norm.formatted_address,
        street: norm.street,
        number: norm.number,
        neighborhood: norm.neighborhood,
        city: norm.city,
        state: norm.state,
        postal_code: norm.postal_code,
        lat: norm.lat,
        lng: norm.lng,
      },
      coords: { lat: norm.lat, lng: norm.lng },
      cp: norm.postal_code,
      ciudad: norm.city,
      estado: norm.state,
      observaciones: d.observaciones || "",
      activa: d.activa ?? true,
      predeterminada: d.predeterminada ?? false,
    };

    onConfirm && onConfirm(payload);
  };

  const handleSelectSuggestion = async (description) => {
    try {
      setValue(description, false);
      clearSuggestions();
      const results = await getGeocode({ address: description });
      if (!results || results.length === 0) return;
      const first = results[0];
      const parsed = parseFormattedAddress(first.formatted_address || description);
      const { lat, lng } = await getLatLng(first);
      setForm((p) => ({
        ...p,
        calle: parsed.street,
        numero: parsed.number,
        colonia: parsed.neighborhood,
        ciudad: parsed.city,
        estado: parsed.state,
        cp: parsed.postal_code || "",
        lat,
        lng,
        formatted_address: first.formatted_address || description,
      }));
    } catch (err) {
      console.error("handleSelectSuggestion:", err);
    }
  };

  const handleCreateAddress = async (e) => {
    e.preventDefault();
    setCreating(true);
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
            formatted_address: form.formatted_address || [form.calle, form.numero].filter(Boolean).join(" "),
            street: form.calle,
            number: form.numero,
            neighborhood: form.colonia,
            city: form.ciudad,
            state: form.estado,
            postal_code: form.cp,
            lat: form.lat,
            lng: form.lng,
          },
          coords: { lat: form.lat, lng: form.lng },
          cp: form.cp,
          ciudad: form.ciudad,
          estado: form.estado,
          observaciones: form.referencia,
          usuario_email: user.email,
          activa: true,
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
    const dirObj = {
      id: null,
      direccion: {
        formatted_address: form.formatted_address || [form.calle, form.numero, form.colonia, form.ciudad, form.estado].filter(Boolean).join(", "),
        street: form.calle,
        number: form.numero,
        neighborhood: form.colonia,
        city: form.ciudad,
        state: form.estado,
        postal_code: form.cp,
        lat: form.lat,
        lng: form.lng,
      },
      coords: { lat: form.lat, lng: form.lng },
      cp: form.cp,
      ciudad: form.ciudad,
      estado: form.estado,
      observaciones: form.referencia,
      activa: true,
      predeterminada,
    };

    onConfirm && onConfirm(dirObj);
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
                  const norm = normalizeDireccion(d) || {};
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
                              const norm2 = normalizeDireccion(d) || {};
                              setForm((p) => ({
                                ...p,
                                calle: norm2.street || "",
                                numero: norm2.number || "",
                                colonia: norm2.neighborhood || "",
                                ciudad: norm2.city || "",
                                estado: norm2.state || "",
                                cp: norm2.postal_code || "",
                                lat: norm2.lat || null,
                                lng: norm2.lng || null,
                                formatted_address: norm2.formatted_address || "",
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

              {status === "OK" && (
                <Box sx={{ maxHeight: 180, overflowY: "auto" }}>
                  {data.map((s) => (
                    <Card key={s.place_id} variant="outlined" sx={{ mb: 1 }}>
                      <CardContent sx={{ p: 1 }}>
                        <Button fullWidth onClick={() => handleSelectSuggestion(s.description)}>
                          {s.description}
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              )}

              <TextField label="Calle" value={form.calle} onChange={(e) => setForm((p) => ({ ...p, calle: e.target.value }))} required />

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
              <TextField label="Referencia / Observaciones" value={form.referencia} onChange={(e) => setForm((p) => ({ ...p, referencia: e.target.value }))} />

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
