// src/Pages/Multimedia/MultimediaRoute.jsx
/**
 * Centro Multimedia (Bloque 5C): primer centro multimedia funcional de
 * Ciudadan/Publia.
 *
 * - Nuevo trabajo: capabilities dinámicas del backend (no hardcodeadas) +
 *   formulario por tipo (mediaJobDefinitions) + upload con estado real
 *   (sin porcentaje simulado).
 * - Mis trabajos: lista responsive con estados, cancel/retry, warnings.
 * - Realtime: Socket.IO (una conexión por sesión) actualiza solo el job
 *   afectado; REST refetch al (re)conectar. REST = fuente autoritativa.
 * - Artifacts: preview (imagen/audio/video/texto) y descarga SOLO por el
 *   backend (el navegador nunca habla con la Media API).
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import CancelRoundedIcon from "@mui/icons-material/CancelRounded";
import ReplayRoundedIcon from "@mui/icons-material/ReplayRounded";
import PlayCircleRoundedIcon from "@mui/icons-material/PlayCircleRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import { useAuth0 } from "@auth0/auth0-react";
import {
  getMediaCapabilities,
  uploadMediaFile,
  createMediaJob,
  listMediaJobs,
  cancelMediaJob,
  retryMediaJob,
  getMediaArtifacts,
  getMediaArtifactDownloadUrl,
} from "../../services/mediaService";
import { getDefinition, UPLOAD_KIND_BY_PARAM } from "../../services/mediaJobDefinitions";
import {
  MediaSocketProvider,
  useMediaSocket,
  MEDIA_EVENTS,
} from "../../Contexts/MediaSocketContext";

// ---------- helpers ----------
const STATE_COLORS = {
  queued: "default",
  running: "info",
  succeeded: "success",
  failed: "error",
  cancelled: "warning",
  interrupted: "warning",
};

const ERROR_MESSAGES = {
  MEDIA_POLICY_CONFLICT: "Esta operación no está permitida para este uso (restricción comercial).",
  MEDIA_HEAVY_LIMIT: "Ya tienes un trabajo de procesamiento intensivo activo. Espera o cancela antes de crear otro.",
  MEDIA_LIMIT: "Alcanzaste un límite de uso (trabajos activos o diarios).",
  MEDIA_SERVICE_UNAVAILABLE: "El servicio multimedia no está disponible por ahora. Intenta más tarde.",
  MEDIA_SERVICE_TIMEOUT: "El servicio tardó demasiado en responder. Intenta de nuevo.",
  MEDIA_INVALID_REQUEST: "Revisa los datos del formulario.",
  MEDIA_NOT_FOUND: "No encontrado.",
  MEDIA_BACKEND_AUTH_ERROR: "Error de credencial del servicio. Reporta a soporte.",
};

function errorToMessage(err) {
  if (!err) return "Error desconocido";
  return ERROR_MESSAGES[err.code] || err.message || "Error del servicio multimedia";
}

function fmtDate(s) {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleString();
  } catch (e) {
    return s;
  }
}

function fmtSize(b) {
  if (!b && b !== 0) return "—";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

/** Obtiene el token: Auth0 o JWT local (pruebas/usuarios de servicio). */
function useMediaToken() {
  const { isAuthenticated, getAccessTokenSilently } = useAuth0();
  return useCallback(async () => {
    if (isAuthenticated && typeof getAccessTokenSilently === "function") {
      try {
        return await getAccessTokenSilently();
      } catch (e) {
        /* fallback a token local */
      }
    }
    try {
      return localStorage.getItem("media_local_token") || null;
    } catch (e) {
      return null;
    }
  }, [isAuthenticated, getAccessTokenSilently]);
}

// ---------- chip de estado (legible, no solo color) ----------
function StateChip({ status }) {
  return (
    <Chip
      size="small"
      label={status || "desconocido"}
      color={STATE_COLORS[status] || "default"}
      icon={status === "running" ? <CircularProgress size={12} color="inherit" /> : undefined}
    />
  );
}

// ---------- panel de artifacts ----------
function ArtifactPanel({ token, jobId, open, onClose }) {
  const [arts, setArts] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [preview, setPreview] = useState(null); // {art, url, text}

  useEffect(() => {
    if (!open || !jobId || !token) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setArts(null);
    setPreview(null);
    getMediaArtifacts(token, jobId)
      .then((data) => { if (!cancelled) setArts((data && data.artifacts) || []); })
      .catch((e) => { if (!cancelled) setError(errorToMessage(e)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open, jobId, token]);

  const doPreview = async (art) => {
    setError(null);
    const url = getMediaArtifactDownloadUrl(jobId, art.id);
    const mime = art.mime || "";
    if (/^image\/(jpeg|png|webp|gif)/.test(mime)) {
      setPreview({ art, url, kind: "image" });
    } else if (/^audio\//.test(mime)) {
      setPreview({ art, url, kind: "audio" });
    } else if (/^video\//.test(mime)) {
      setPreview({ art, url, kind: "video" });
    } else if (/^(text\/plain|text\/vtt|application\/json)/.test(mime) && (art.sizeBytes || 0) < 256 * 1024) {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error("No se pudo cargar la vista previa");
        const text = await res.text();
        setPreview({ art, url, kind: "text", text });
      } catch (e) {
        setError(e.message || "No se pudo cargar la vista previa");
      }
    } else {
      setError("Vista previa no disponible para este formato; usa descarga.");
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Artifacts del trabajo {jobId}</DialogTitle>
      <DialogContent>
        {loading && <Stack direction="row" spacing={1} alignItems="center"><CircularProgress size={16} /> <Typography variant="body2">Cargando…</Typography></Stack>}
        {error && <Alert severity="warning" sx={{ mb: 1 }}>{error}</Alert>}
        {arts && arts.length === 0 && <Typography variant="body2">Sin artifacts.</Typography>}
        {arts && arts.length > 0 && (
          <Stack spacing={1}>
            {arts.map((a) => (
              <Stack key={a.id} direction="row" spacing={1} alignItems="center" sx={{ flexWrap: "wrap" }}>
                <Typography variant="body2" sx={{ fontWeight: 600, minWidth: 160 }}>{a.name}</Typography>
                <Typography variant="caption" color="text.secondary">{a.mime || "—"} · {fmtSize(a.sizeBytes)}</Typography>
                <Box sx={{ flexGrow: 1 }} />
                <Tooltip title="Vista previa"><IconButton size="small" onClick={() => doPreview(a)} aria-label={`Vista previa de ${a.name}`}><PlayCircleRoundedIcon /></IconButton></Tooltip>
                <Tooltip title="Descargar">
                  <IconButton size="small" href={getMediaArtifactDownloadUrl(jobId, a.id)} aria-label={`Descargar ${a.name}`}
                    onClick={(e) => { e.preventDefault(); const el = document.createElement("a"); el.href = getMediaArtifactDownloadUrl(jobId, a.id); el.setAttribute("download", a.name); document.body.appendChild(el); el.click(); el.remove(); }}>
                    <DownloadRoundedIcon />
                  </IconButton>
                </Tooltip>
              </Stack>
            ))}
          </Stack>
        )}
        {preview && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>Vista previa: {preview.art.name}</Typography>
            {preview.kind === "image" && <Box component="img" src={preview.url} alt={preview.art.name} sx={{ maxWidth: "100%", borderRadius: 1 }} />}
            {preview.kind === "audio" && <Box component="audio" controls src={preview.url} sx={{ width: "100%" }} />}
            {preview.kind === "video" && <Box component="video" controls src={preview.url} sx={{ width: "100%", maxWidth: "100%", borderRadius: 1 }} />}
            {preview.kind === "text" && (
              <Box component="pre" sx={{ maxWidth: "100%", overflow: "auto", background: "#f5f5f5", padding: 1, borderRadius: 1, fontSize: 13, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                {preview.text}
              </Box>
            )}
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ---------- formulario por tipo ----------
function NewJobPanel({ token, capabilities, onCreated }) {
  const types = Object.keys(capabilities || {}).filter((t) => getDefinition(t));
  const [type, setType] = useState("");
  const [values, setValues] = useState({});
  const [uploads, setUploads] = useState({}); // paramKey -> {id, name, sizeBytes, uploading, error}
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const def = type ? getDefinition(type) : null;
  const cap = type ? capabilities[type] : null;

  useEffect(() => {
    if (def && def.defaults) setValues((v) => ({ ...def.defaults, ...v }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  useEffect(() => {
    setValues({});
    setUploads({});
    setError(null);
  }, [type]);

  const canSubmit = useMemo(() => {
    if (!def || submitting) return false;
    for (const f of def.fields) {
      if (f.type === "file") {
        if (f.required && !(uploads[f.key] && uploads[f.key].id)) return false;
      } else if (f.required) {
        const v = values[f.key];
        if (v === undefined || v === null || v === "") return false;
      }
    }
    if (def.validate) {
      const err = def.validate({ ...values, ...Object.fromEntries(Object.entries(uploads).map(([k, u]) => [k, u && u.id])) });
      if (err) return false;
    }
    return true;
  }, [def, values, uploads, submitting]);

  const commercialBlocked = cap && cap.commercialStatus && cap.commercialStatus !== "approved";

  const handleFile = async (paramKey, file) => {
    if (!file) return;
    setUploads((u) => ({ ...u, [paramKey]: { name: file.name, sizeBytes: file.size, uploading: true, error: null } }));
    try {
      const res = await uploadMediaFile(token, file);
      setUploads((u) => ({ ...u, [paramKey]: { id: res.id, name: res.name || file.name, sizeBytes: res.sizeBytes || file.size, uploading: false, error: null } }));
    } catch (e) {
      setUploads((u) => ({ ...u, [paramKey]: { name: file.name, sizeBytes: file.size, uploading: false, error: errorToMessage(e) } }));
    }
  };

  const submit = async () => {
    if (!def) return;
    setSubmitting(true);
    setError(null);
    const params = {};
    for (const f of def.fields) {
      if (f.type === "file") {
        const up = uploads[f.key];
        if (up && up.id) params[f.key] = up.id; // reutiliza el upload (no duplica)
      } else {
        const v = values[f.key];
        if (v !== undefined && v !== null && v !== "") params[f.key] = v;
      }
    }
    if (def.defaults) {
      for (const [k, v] of Object.entries(def.defaults)) {
        if (params[k] === undefined) params[k] = v;
      }
    }
    try {
      const job = await createMediaJob(token, { type, params });
      onCreated(job);
      setValues({});
      setUploads({});
    } catch (e) {
      setError(e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>Nuevo trabajo</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel id="media-op-label">Operación</InputLabel>
              <Select labelId="media-op-label" label="Operación" value={type}
                onChange={(e) => setType(e.target.value)}>
                {types.length === 0 && <MenuItem value="" disabled><em>Cargando capabilities…</em></MenuItem>}
                {types.map((t) => {
                  const c = capabilities[t];
                  const d = getDefinition(t);
                  const suffix = c && c.commercialStatus && c.commercialStatus !== "approved" ? " (uso interno)" : "";
                  return <MenuItem key={t} value={t}>{(d && d.label) || t}{suffix}</MenuItem>;
                })}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
        {def && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary" paragraph>{def.description}</Typography>
            {cap && cap.warning && <Alert severity="info" sx={{ mb: 1 }}>{cap.warning}</Alert>}
            {commercialBlocked && (
              <Alert severity="warning" sx={{ mb: 1 }}>
                Uso comercial no aprobado para esta operación ({cap.commercialStatus}). Solo uso interno.
              </Alert>
            )}
            {def.heavyHint && <Alert severity="info" sx={{ mb: 1 }}>Procesamiento intensivo: puede tardar considerablemente.</Alert>}
            <Grid container spacing={2}>
              {def.fields.map((f) => (
                <Grid item xs={12} sm={6} key={f.key}>
                  <Box>
                    <Typography variant="caption" component="label" htmlFor={`f-${f.key}`} display="block" gutterBottom>
                      {f.label}{f.required ? " *" : ""}
                    </Typography>
                    {f.type === "file" ? (
                      <Stack spacing={0.5}>
                        <input
                          id={`f-${f.key}`}
                          type="file"
                          accept={(UPLOAD_KIND_BY_PARAM[f.key] || []).map((k) => ({ audio: "audio/*", video: "video/*", image: "image/*" }[k])).join(",")}
                          onChange={(e) => handleFile(f.key, e.target.files && e.target.files[0])}
                          disabled={submitting || Boolean(commercialBlocked)}
                        />
                        {uploads[f.key] && (
                          <Typography variant="caption" color={uploads[f.key].error ? "error" : "text.secondary"}>
                            {uploads[f.key].uploading
                              ? "Subiendo… (sin progreso disponible)"
                              : uploads[f.key].error
                                ? uploads[f.key].error
                                : `${uploads[f.key].name} · ${fmtSize(uploads[f.key].sizeBytes)} · listo`}
                          </Typography>
                        )}
                      </Stack>
                    ) : f.type === "select" ? (
                      <FormControl fullWidth size="small">
                        <InputLabel id={`sel-${f.key}`}>{f.label}</InputLabel>
                        <Select labelId={`sel-${f.key}`} label={f.label} value={values[f.key] || ""}
                          onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}>
                          {(f.options || []).map((o) => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                        </Select>
                      </FormControl>
                    ) : f.type === "multiselect" ? (
                      <FormControl fullWidth size="small">
                        <InputLabel id={`msel-${f.key}`}>{f.label}</InputLabel>
                        <Select labelId={`msel-${f.key}`} multiple label={f.label}
                          value={values[f.key] || f.defaultSelected || []}
                          onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                          renderValue={(sel) => (sel || []).join(", ")}>
                          {(f.options || []).map((o) => (
                            <MenuItem key={o} value={o}>
                              {(values[f.key] || f.defaultSelected || []).includes(o) ? "✓ " : ""}{o}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    ) : f.type === "textarea" ? (
                      <TextField id={`f-${f.key}`} fullWidth size="small" multiline minRows={2}
                        value={values[f.key] || ""} label={f.label}
                        onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))} />
                    ) : (
                      <TextField id={`f-${f.key}`} fullWidth size="small" type={f.type === "number" ? "number" : "text"}
                        inputProps={f.type === "number" ? { min: f.min, max: f.max, step: "any" } : {}}
                        value={values[f.key] || ""} label={f.label}
                        onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))} />
                    )}
                  </Box>
                </Grid>
              ))}
            </Grid>
            {def.uploadHint && <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>Formatos: {def.uploadHint}</Typography>}
            {error && <Alert severity="error" sx={{ mt: 2 }}>{errorToMessage(error)}</Alert>}
            <Box sx={{ mt: 2 }}>
              <Button variant="contained" onClick={submit} disabled={!canSubmit}>
                {submitting ? <CircularProgress size={18} color="inherit" /> : "Crear trabajo"}
              </Button>
            </Box>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

// ---------- card de job ----------
function JobCard({ token, job, onUpdated, onOpenArtifacts }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const def = getDefinition(job.type);

  const cancelable = ["queued", "running"].includes(job.status);
  const retryable = ["failed", "cancelled", "interrupted"].includes(job.status);

  const doCancel = async () => {
    setBusy(true);
    setError(null);
    try {
      await cancelMediaJob(token, job.id);
      // el estado llega por socket; refetch por robustez
      onUpdated();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };

  const doRetry = async () => {
    setBusy(true);
    setError(null);
    try {
      await retryMediaJob(token, job.id);
      onUpdated(); // el retry crea un NUEVO job; refetch
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card sx={{ mb: 1.5 }} data-job-id={job.id}>
      <CardContent>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: "wrap" }}>
          <StateChip status={job.status} />
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{(def && def.label) || job.type}</Typography>
          <Typography variant="caption" color="text.secondary">#{job.id}</Typography>
          {job.resourceClass && <Chip size="small" variant="outlined" label={job.resourceClass} />}
          <Box sx={{ flexGrow: 1 }} />
          <Typography variant="caption" color="text.secondary">{fmtDate(job.createdAt)}</Typography>
        </Stack>
        {job.status === "running" && (
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
            {job.estimatedTime || "En proceso…"} {job.progress === null ? "(sin progreso estructurado)" : `${Math.round(job.progress)}%`}
          </Typography>
        )}
        {(job.warnings || []).map((w, i) => (
          <Alert key={i} severity="info" sx={{ mt: 1 }}>{typeof w === "string" ? w : JSON.stringify(w)}</Alert>
        ))}
        {job.error && (
          <Alert severity="error" sx={{ mt: 1 }}>
            {errorToMessage({ code: job.error.code, message: job.error.message })}
          </Alert>
        )}
        {error && <Alert severity="error" sx={{ mt: 1 }}>{errorToMessage(error)}</Alert>}
        <Stack direction="row" spacing={1} sx={{ mt: 1.5, flexWrap: "wrap" }}>
          {job.status === "succeeded" && (
            <Button size="small" startIcon={<PlayCircleRoundedIcon />} onClick={() => onOpenArtifacts(job.id)}>
              Ver artifacts
            </Button>
          )}
          {cancelable && (
            <Button size="small" color="warning" startIcon={<CancelRoundedIcon />} onClick={doCancel} disabled={busy}>
              {busy ? "Cancelando…" : "Cancelar"}
            </Button>
          )}
          {retryable && (
            <Button size="small" startIcon={<ReplayRoundedIcon />} onClick={doRetry} disabled={busy}>
              {busy ? "Reintentando…" : "Reintentar"}
            </Button>
          )}
          {job.parentJob && <Typography variant="caption" color="text.secondary" sx={{ alignSelf: "center" }}>reintento de #{job.parentJob}</Typography>}
        </Stack>
      </CardContent>
    </Card>
  );
}

// ---------- página principal ----------
function CentroMultimedia() {
  const getToken = useMediaToken();
  const { subscribe, connected } = useMediaSocket();
  const [token, setToken] = useState(null);
  const [capabilities, setCapabilities] = useState(null);
  const [jobs, setJobs] = useState(null);
  const [error, setError] = useState(null);
  const [artifactsJob, setArtifactsJob] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);
  const jobsRef = useRef([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const t = await getToken();
      if (!cancelled) setToken(t);
    })();
    return () => { cancelled = true; };
  }, [getToken]);

  const refreshJobs = useCallback(async () => {
    if (!token) return;
    try {
      const data = await listMediaJobs(token, { limit: 50 });
      const list = (data && data.jobs) || [];
      jobsRef.current = list;
      setJobs(list);
      setLastRefresh(new Date());
      setError(null);
    } catch (e) {
      setError(e);
    }
  }, [token]);

  useEffect(() => { refreshJobs(); }, [refreshJobs]);

  // cargar capabilities dinámicas (una vez con token)
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    getMediaCapabilities(token)
      .then((data) => { if (!cancelled) setCapabilities((data && data.capabilities) || {}); })
      .catch((e) => { if (!cancelled) setError(e); });
    return () => { cancelled = true; };
  }, [token]);

  // realtime: actualizar SOLO el job afectado; REST refetch al (re)conectar
  useEffect(() => {
    if (!token) return undefined;
    const unsubs = MEDIA_EVENTS.map((ev) =>
      subscribe(ev, (payload) => {
        if (!payload || !payload.id) return;
        setJobs((list) => {
          const current = list || jobsRef.current || [];
          const idx = current.findIndex((j) => String(j.id) === String(payload.id));
          if (idx === -1) return current;
          const next = current.slice();
          next[idx] = { ...next[idx], status: payload.status, warnings: payload.warnings || next[idx].warnings, errorCode: payload.errorCode || next[idx].errorCode };
          return next;
        });
      })
    );
    return () => unsubs.forEach((u) => u && u());
  }, [token, subscribe]);

  useEffect(() => {
    if (!token) return undefined;
    const unsub = subscribe("media:job:created", () => refreshJobs());
    return () => unsub && unsub();
  }, [token, subscribe, refreshJobs]);

  const prevConnected = useRef(null);
  useEffect(() => {
    if (prevConnected.current === null) { prevConnected.current = connected; return; }
    if (connected && prevConnected.current === false && token) {
      refreshJobs(); // reconexión: REST refetch (no reconstruir desde eventos perdidos)
    }
    prevConnected.current = connected;
  }, [connected, token, refreshJobs]);

  const activeCount = useMemo(() => (jobs || []).filter((j) => ["queued", "running"].includes(j.status)).length, [jobs]);

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2, flexWrap: "wrap" }}>
        <Typography variant="h5" component="h1" sx={{ fontWeight: 700 }}>Centro Multimedia</Typography>
        <Chip size="small" label={connected ? "tiempo real conectado" : "sin tiempo real (REST)"} color={connected ? "success" : "default"} variant={connected ? "filled" : "outlined"} />
        <Box sx={{ flexGrow: 1 }} />
        <Button size="small" startIcon={<RefreshRoundedIcon />} onClick={refreshJobs} disabled={!token}>Refrescar</Button>
      </Stack>
      {lastRefresh && <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>Última actualización: {fmtDate(lastRefresh)}{activeCount > 0 ? ` · ${activeCount} activo(s)` : ""}</Typography>}
      {error && <Alert severity="warning" sx={{ mb: 2 }} onClose={() => setError(null)}>{errorToMessage(error)}</Alert>}
      {!token && <Alert severity="info" sx={{ mb: 2 }}>Inicia sesión para usar el Centro Multimedia.</Alert>}
      <NewJobPanel token={token} capabilities={capabilities || {}} onCreated={refreshJobs} />
      <Typography variant="h6" gutterBottom>Mis trabajos</Typography>
      {!jobs && <Stack direction="row" spacing={1} alignItems="center"><CircularProgress size={16} /> <Typography variant="body2">Cargando…</Typography></Stack>}
      {jobs && jobs.length === 0 && <Typography variant="body2" color="text.secondary">Aún no tienes trabajos.</Typography>}
      {jobs && jobs.map((j) => (
        <JobCard key={j.id} token={token} job={j} onUpdated={refreshJobs} onOpenArtifacts={setArtifactsJob} />
      ))}
      <ArtifactPanel token={token} jobId={artifactsJob} open={Boolean(artifactsJob)} onClose={() => setArtifactsJob(null)} />
    </Container>
  );
}

export default function MultimediaRoute() {
  const getToken = useMediaToken();
  return (
    <MediaSocketProvider getToken={getToken}>
      <CentroMultimedia />
    </MediaSocketProvider>
  );
}
