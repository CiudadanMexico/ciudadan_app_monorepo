// src/components/AnunciosPorDefecto.jsx
import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
  Chip,
  Tooltip,
  Slider,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";

const STRAPI_URL = process.env.REACT_APP_STRAPI_URL || "";

const clamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));

/* Helpers (sin cambios importantes) */
const normalizeTo100 = (arr) => {
  const total = arr.reduce((a, b) => a + b, 0);
  if (total === 0) return arr.map(() => 0);
  return arr.map((v) => (v / total) * 100);
};

const percentagesToPositions = (percentages = []) => {
  const normalized = normalizeTo100(percentages);
  const positions = [];
  let acc = 0;
  for (let i = 0; i < normalized.length - 1; i++) {
    acc += normalized[i];
    positions.push(Number(acc.toFixed(2)));
  }
  return positions;
};

const positionsToPercentages = (positions = [], count = 0) => {
  if (!count || count <= 0) return [];
  if (count === 1) return [100];
  const pos = positions.slice().map((p) => clamp(Number(p), 0, 100)).sort((a, b) => a - b);
  const res = [];
  let prev = 0;
  for (let i = 0; i < pos.length; i++) {
    res.push(Number((pos[i] - prev).toFixed(2)));
    prev = pos[i];
  }
  res.push(Number((100 - prev).toFixed(2)));
  return res;
};

/**
 * MultiHandleSlider mejorado:
 * - evita solapamientos mediante `minGapPercent`
 * - notifica cambios al padre con debounce (`debounceMs`)
 */
function MultiHandleSlider({
  count = 0,
  initialPercentages = null,
  onChangePercentages,
  minGapPercent = 0.5, // mínimo 0.5% entre handles
  debounceMs = 120, // ms para debouncing
}) {
  const [positions, setPositions] = useState([]);
  const debounceRef = useRef(null);

  // Inicializar posiciones desde percentages o reparto equitativo
  useEffect(() => {
    if (!count || count <= 0) {
      setPositions([]);
      return;
    }

    if (count === 1) {
      setPositions([]); // no handles
      return;
    }

    if (Array.isArray(initialPercentages) && initialPercentages.length === count) {
      setPositions(percentagesToPositions(initialPercentages));
      return;
    }

    const step = 100 / count;
    const pos = [];
    for (let i = 1; i < count; i++) pos.push(Number((step * i).toFixed(2)));
    setPositions(pos);
  }, [count, JSON.stringify(initialPercentages)]); // stringify para dependencia estable

  // Función para aplicar minGap y sanear posiciones (evita rebotes)
  const sanitizePositions = (arr) => {
    if (!Array.isArray(arr)) return [];
    const n = arr.length;
    const minGap = Number(minGapPercent) || 0;
    // Ordenamos y aplicamos límites
    const sorted = arr.slice().map((p) => Number(clamp(p, 0, 100))).sort((a, b) => a - b);
    // Primer pase: forzar gaps
    for (let i = 0; i < n; i++) {
      const prevLimit = i === 0 ? minGap : sorted[i - 1] + minGap;
      const nextLimit = i === n - 1 ? 100 - minGap : sorted[i + 1] - minGap;
      if (sorted[i] < prevLimit) sorted[i] = prevLimit;
      if (sorted[i] > nextLimit) sorted[i] = nextLimit;
    }
    // Segundo pase: asegurar monotonicidad estricta
    for (let i = 1; i < n; i++) {
      const want = sorted[i - 1] + minGap;
      if (sorted[i] < want) sorted[i] = want;
    }
    // Clamp final y formatear
    return sorted.map((v) => Number(Math.max(0, Math.min(100, v)).toFixed(2)));
  };

  // Debounced notification to parent: cuando cambian positions avisamos (con debounce)
  useEffect(() => {
    // cases: no ads or 1 ad -> notify immediately appropriate values
    if (!count || count <= 0) {
      onChangePercentages && onChangePercentages([]);
      return;
    }
    if (count === 1) {
      onChangePercentages && onChangePercentages([100]);
      return;
    }

    // limpiar posible timer anterior
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      const pct = positionsToPercentages(positions, count);
      onChangePercentages && onChangePercentages(pct);
      debounceRef.current = null;
    }, debounceMs);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    };
  }, [positions, count, debounceMs, onChangePercentages]);

  const handleChange = (e, newVal) => {
    // newVal puede ser número o array; garantizamos array
    const arr = Array.isArray(newVal) ? newVal : [newVal];
    const sanitized = sanitizePositions(arr);
    setPositions(sanitized);
  };

  if (!count || count <= 0) return null;

  if (count === 1) {
    return (
      <Box sx={{ mt: 2 }}>
        <Typography>Solo 1 anuncio — recibe 100%</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="subtitle1" sx={{ mb: 1 }}>
        Distribución (siempre suma 100%)
      </Typography>

      <Slider
        value={positions}
        min={0}
        max={100}
        step={0.1}
        onChange={handleChange}
        disableSwap
        valueLabelDisplay="off"
      />

      <Box sx={{ mt: 2 }}>
        {positionsToPercentages(positions, count).map((p, i) => (
          <Typography key={i}>
            Anuncio {i + 1}: {Number(p).toFixed(2)}%
          </Typography>
        ))}
      </Box>
    </Box>
  );
}

export default function AnunciosPorDefecto() {
  const { user, isLoading: authLoading } = useAuth0();
  const userEmail = user?.email;

  const [loading, setLoading] = useState(true);
  const [ads, setAds] = useState([]); // [{id, tipo, cuerpo, link, porcentaje, archivo}]
  const [error, setError] = useState(null);

  // form new ad
  const [formTipo, setFormTipo] = useState("texto");
  const [formCuerpo, setFormCuerpo] = useState("");
  const [formLink, setFormLink] = useState("");
  const [formFile, setFormFile] = useState(null);

  // slider state: percentages (length = ads.length)
  const [localPercentages, setLocalPercentages] = useState([]);
  const [savingPercentages, setSavingPercentages] = useState(false);
  const [creatingAd, setCreatingAd] = useState(false);
  const [deletingAdId, setDeletingAdId] = useState(null);
  const [updatingAdId, setUpdatingAdId] = useState(null);

  // fetchAds returns the items for reuse
  const fetchAds = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (!userEmail) {
        setAds([]);
        setLocalPercentages([]);
        setLoading(false);
        return [];
      }
      const url = `${STRAPI_URL}/api/ads?filters[usuario][email][$eq]=${encodeURIComponent(
        userEmail
      )}&populate=archivo`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Fetch failed");
      const json = await res.json();
      const items = (json.data || []).map((d) => ({ id: d.id, ...d.attributes }));
      const normalizedItems = items.map((it) => ({
        ...it,
        porcentaje: typeof it.porcentaje === "number" ? Number(it.porcentaje) : Number(it.porcentaje ?? 0),
      }));

      setAds(normalizedItems);

      // init percentages
      if (normalizedItems.length > 0) {
        const vals = normalizedItems.map((a) => a.porcentaje ?? 0);
        const sum = vals.reduce((a, b) => a + b, 0);
        if (sum < 0.0001) {
          const equal = Number((100 / normalizedItems.length).toFixed(2));
          const arr = Array(normalizedItems.length).fill(equal);
          setLocalPercentages(arr);
        } else {
          setLocalPercentages(normalizeTo100(vals));
        }
      } else {
        setLocalPercentages([]);
      }

      return normalizedItems;
    } catch (e) {
      console.error(e);
      setError("No se pudieron cargar tus anuncios");
      return [];
    } finally {
      setLoading(false);
    }
  }, [userEmail]);

  useEffect(() => {
    if (!authLoading) fetchAds();
  }, [authLoading, fetchAds]);

  // save percentages in batch
  const savePercentages = async () => {
    if (!ads.length || !localPercentages.length) return;
    setSavingPercentages(true);
    setError(null);
    try {
      const patches = ads.map((ad, idx) => {
        const pct = Number(Number(localPercentages[idx] ?? 0).toFixed(2));
        return fetch(`${STRAPI_URL}/api/ads/${ad.id}`, {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: { porcentaje: pct } }),
        }).then(async (r) => {
          if (!r.ok) {
            const txt = await r.text();
            throw new Error(`Error actualizando ad ${ad.id}: ${txt}`);
          }
          return r.json();
        });
      });

      await Promise.all(patches);
      await fetchAds();
    } catch (e) {
      console.error(e);
      setError("Error guardando porcentajes. Intenta de nuevo.");
    } finally {
      setSavingPercentages(false);
    }
  };

  // create ad
  const handleCreateAd = async () => {
    setCreatingAd(true);
    setError(null);
    try {
      if (formTipo === "texto" && !formCuerpo) {
        setError("Escribe el mensaje del anuncio");
        setCreatingAd(false);
        return;
      }

      let archivoId = null;
      if (formFile) {
        const fd = new FormData();
        fd.append("files", formFile);
        const up = await fetch(`${STRAPI_URL}/api/upload`, {
          method: "POST",
          credentials: "include",
          body: fd,
        });
        if (!up.ok) throw new Error("Error subiendo archivo");
        const upJson = await up.json();
        archivoId = upJson?.[0]?.id ?? null;
      }

      const payload = {
        data: {
          tipo: formTipo,
          cuerpo: formCuerpo,
          link: formLink,
          activo: true,
          status: "activo",
          usuario: { email: userEmail },
          porcentaje: 0,
          ...(archivoId ? { archivo: archivoId } : {}),
        },
      };

      const res = await fetch(`${STRAPI_URL}/api/ads`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Error creando anuncio");
      await res.json();

      // refrescar y repartir equitativamente
      const latest = await fetchAds();
      const newCount = latest.length;
      if (newCount > 0) {
        const equal = Number((100 / newCount).toFixed(2));
        const vals = Array(newCount).fill(equal);
        setLocalPercentages(vals);

        // guardar inmediatamente
        setSavingPercentages(true);
        try {
          await Promise.all(
            latest.map((it, i) =>
              fetch(`${STRAPI_URL}/api/ads/${it.id}`, {
                method: "PUT",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ data: { porcentaje: vals[i] } }),
              })
            )
          );
        } catch (e) {
          console.warn("Redistribute failed", e);
        } finally {
          setSavingPercentages(false);
          await fetchAds();
        }
      }

      // limpiar form
      setFormCuerpo("");
      setFormFile(null);
      setFormLink("");
      setFormTipo("texto");
    } catch (e) {
      console.error(e);
      setError("No se pudo crear el anuncio");
    } finally {
      setCreatingAd(false);
    }
  };

  // delete ad
  const handleDeleteAd = async (adId) => {
    const ok = window.confirm("¿Eliminar este anuncio?");
    if (!ok) return;
    setDeletingAdId(adId);
    setError(null);
    try {
      const res = await fetch(`${STRAPI_URL}/api/ads/${adId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Delete failed");
      // refresh
      const latest = await fetchAds();
      const newCount = latest.length;
      if (newCount > 0) {
        const vals = Array(newCount).fill(Number((100 / newCount).toFixed(2)));
        setLocalPercentages(vals);
        setSavingPercentages(true);
        try {
          await Promise.all(
            latest.map((it, i) =>
              fetch(`${STRAPI_URL}/api/ads/${it.id}`, {
                method: "PUT",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ data: { porcentaje: vals[i] } }),
              })
            )
          );
        } catch (e) {
          console.warn("Redistribute failed", e);
        } finally {
          setSavingPercentages(false);
          await fetchAds();
        }
      } else {
        setLocalPercentages([]);
      }
    } catch (e) {
      console.error(e);
      setError("No se pudo eliminar el anuncio");
    } finally {
      setDeletingAdId(null);
    }
  };

  // upload file for existing ad
  const handleFileChangeForAd = async (adId, file) => {
    try {
      setUpdatingAdId(adId);
      const fd = new FormData();
      fd.append("files", file);
      const up = await fetch(`${STRAPI_URL}/api/upload`, {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      if (!up.ok) throw new Error("upload failed");
      const upJson = await up.json();
      const archivoId = upJson?.[0]?.id;
      if (!archivoId) throw new Error("No file id");

      const patch = await fetch(`${STRAPI_URL}/api/ads/${adId}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: { archivo: archivoId } }),
      });
      if (!patch.ok) throw new Error("patch failed");
      await patch.json();
      await fetchAds();
    } catch (e) {
      console.error(e);
      setError("Error subiendo archivo para este anuncio");
    } finally {
      setUpdatingAdId(null);
    }
  };

  if (authLoading || loading) {
    return (
      <Card sx={{ p: 3, maxWidth: 920, mx: "auto" }}>
        <CardContent sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={{ maxWidth: 920, mx: "auto", p: 2 }}>
      <CardContent>
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="h5">Anuncios y distribución</Typography>
          <Chip label="Ads" size="small" />
        </Stack>

        <Typography sx={{ mt: 1 }} color="text.secondary">
          Estos anuncios se enviarán según tu cuota diaria (controlado por backend). Aquí defines qué porcentaje de envíos recibe cada anuncio.
        </Typography>

        <Divider sx={{ my: 2 }} />

        {error && (
          <Typography color="error" sx={{ mb: 2 }}>
            {error}
          </Typography>
        )}

        {/* Lista de anuncios */}
        <Box sx={{ width: "100%" }}>
          {ads.length === 0 ? (
            <Box sx={{ py: 3, textAlign: "center" }}>
              <Typography>No tienes anuncios aún. Crea uno abajo.</Typography>
            </Box>
          ) : (
            <>
              <Grid container spacing={2}>
                {ads.map((ad, idx) => (
                  <Grid item xs={12} md={6} key={ad.id}>
                    <Card variant="outlined" sx={{ p: 1 }}>
                      <CardContent sx={{ p: 1 }}>
                        <Stack direction="row" alignItems="center" justifyContent="space-between">
                          <Typography fontWeight="600" noWrap>
                            {ad.tipo ?? "texto"} {ad.archivo ? "· Con archivo" : ""}
                          </Typography>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Chip label={`${(ad.porcentaje ?? 0).toFixed(2)}%`} size="small" />
                            <Tooltip title="Eliminar anuncio">
                              <IconButton
                                size="small"
                                onClick={() => handleDeleteAd(ad.id)}
                                disabled={deletingAdId === ad.id}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </Stack>

                        <Typography variant="body2" sx={{ mt: 1, whiteSpace: "pre-wrap" }}>
                          {ad.cuerpo}
                        </Typography>

                        {ad.archivo?.data?.attributes?.url && (
                          <Box sx={{ mt: 1 }}>
                            <Typography variant="caption">Archivo:</Typography>
                            <Box>
                              <a
                                href={`${STRAPI_URL}${ad.archivo.data.attributes.url}`}
                                target="_blank"
                                rel="noreferrer"
                              >
                                Ver archivo
                              </a>
                            </Box>
                          </Box>
                        )}

                        <Stack direction="row" spacing={1} sx={{ mt: 1 }} alignItems="center">
                          <label>
                            <input
                              hidden
                              type="file"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) handleFileChangeForAd(ad.id, f);
                              }}
                            />
                            <Button startIcon={<CloudUploadIcon />} size="small" variant="outlined">
                              Subir archivo
                            </Button>
                          </label>
                          <Button
                            size="small"
                            variant="contained"
                            onClick={() => {
                              alert("Editar completo aún no implementado — pero puedes subir archivo o eliminar.");
                            }}
                          >
                            <EditIcon fontSize="small" sx={{ mr: 1 }} />
                            Editar
                          </Button>
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>

              {/* Multi-handle slider */}
              <Box sx={{ mt: 3 }}>
                <MultiHandleSlider
                  count={ads.length}
                  initialPercentages={localPercentages}
                  onChangePercentages={(vals) => setLocalPercentages(vals)}
                  minGapPercent={0.5}
                  debounceMs={120}
                />

                <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                  <Button
                    variant="contained"
                    onClick={savePercentages}
                    disabled={savingPercentages}
                    sx={{ bgcolor: "#1976d2" }}
                  >
                    {savingPercentages ? "Guardando..." : "Guardar porcentajes"}
                  </Button>

                  <Button
                    variant="outlined"
                    onClick={() => {
                      if (!ads.length) return;
                      const equal = Number((100 / ads.length).toFixed(2));
                      setLocalPercentages(Array(ads.length).fill(equal));
                    }}
                  >
                    Repartir equitativamente
                  </Button>
                </Stack>
              </Box>
            </>
          )}
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* Crear nuevo anuncio */}
        <Box component="form" noValidate onSubmit={(e) => e.preventDefault()}>
          <Typography variant="h6">Crear nuevo anuncio</Typography>

          <Box sx={{ display: "flex", gap: 2, flexDirection: { xs: "column", sm: "row" }, mt: 2 }}>
            <TextField
              label="Mensaje"
              multiline
              minRows={3}
              fullWidth
              value={formCuerpo}
              onChange={(e) => setFormCuerpo(e.target.value)}
              placeholder="Escribe el mensaje (Markdown simple permitido)"
            />

            <Box sx={{ width: 220 }}>
              <InputLabel id="tipo-label">Tipo</InputLabel>
              <Select
                labelId="tipo-label"
                value={formTipo}
                onChange={(e) => setFormTipo(e.target.value)}
                fullWidth
                sx={{ mt: 1 }}
              >
                <MenuItem value="texto">Texto</MenuItem>
                <MenuItem value="imagen">Imagen</MenuItem>
                <MenuItem value="texto con imagen">Texto + Imagen</MenuItem>
                <MenuItem value="audio">Audio</MenuItem>
                <MenuItem value="video">Video</MenuItem>
              </Select>

              <TextField
                label="Link (opcional)"
                value={formLink}
                onChange={(e) => setFormLink(e.target.value)}
                fullWidth
                sx={{ mt: 2 }}
              />

              <label>
                <input
                  hidden
                  type="file"
                  onChange={(e) => setFormFile(e.target.files?.[0] ?? null)}
                />
                <Button startIcon={<CloudUploadIcon />} sx={{ mt: 2 }} variant="outlined" fullWidth>
                  {formFile ? formFile.name : "Subir archivo (opcional)"}
                </Button>
              </label>
            </Box>
          </Box>

          <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
            <Button
              variant="contained"
              onClick={handleCreateAd}
              disabled={creatingAd}
              sx={{ bgcolor: "#388e3c" }}
            >
              {creatingAd ? "Creando..." : "Crear anuncio"}
            </Button>

            <Button
              variant="outlined"
              onClick={() => {
                setFormCuerpo("");
                setFormFile(null);
                setFormLink("");
                setFormTipo("texto");
              }}
            >
              Limpiar
            </Button>
          </Stack>
        </Box>
      </CardContent>
    </Card>
  );
}
