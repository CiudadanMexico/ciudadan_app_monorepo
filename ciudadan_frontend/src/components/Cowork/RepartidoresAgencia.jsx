import React, { useCallback, useEffect, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import {
  Alert, Box, Button, Card, CardContent, Chip, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, Divider, Grid2 as Grid, IconButton, MenuItem, Stack, TextField, Typography,
  useMediaQuery, useTheme,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { useRoles } from '../../Contexts/RolesContext';
import { useNotifications } from '../../Contexts/NotificationsContext';
import revisionService, { federalService } from '../../services/Repartidor/revisionService';
import { ChipEstado, ETIQUETAS_SLOT, ETIQUETAS_ESTADO } from '../Repartidor/helpers';

const audience = process.env.REACT_APP_AUTH0_AUDIENCE ?? 'https://api.ciudadan.org';

const CHECK_TYPES = [
  { id: 'officially_checked', label: 'Consulta oficial (con fuente y URL)' },
  { id: 'visually_reviewed', label: 'Revisión visual documentada' },
  { id: 'unavailable', label: 'Fuente oficial no disponible (con motivo)' },
  { id: 'not_applicable', label: 'No aplica para este documento' },
];

const RESULTADOS = ['verified', 'not_found', 'mismatch', 'reported', 'unavailable', 'error'];

const ESTADOS_FILTRO = [
  { id: '', label: 'Todos' },
  { id: 'pending_review', label: 'En revisión' },
  { id: 'corrections_required', label: 'Correcciones' },
  { id: 'eligible_for_video_review', label: 'Elegibles para video' },
  { id: 'pending_federal_audit', label: 'Bloqueados (federal)' },
  { id: 'approved', label: 'Aprobados' },
  { id: 'suspended', label: 'Suspendidos' },
  { id: 'rejected', label: 'Rechazados' },
];

const etiquetaAccion = (action) =>
  ({
    application_started: 'Expediente iniciado',
    profile_updated: 'Expediente actualizado',
    vehicle_registered: 'Vehículo registrado',
    vehicle_classified: 'Vehículo clasificado normativamente',
    evidence_attached: 'Evidencia adjuntada',
    identity_reused_from_user: 'Identidad reutilizada (INE del usuario)',
    submitted: 'Enviado a revisión',
    document_check_registered: 'Cotejo documental registrado',
    corrections_requested: 'Correcciones solicitadas',
    marked_video_eligible: 'Marcado elegible para video',
    video_validation_registered: 'Validación por video registrada',
    approved: 'Aprobado',
    rejected: 'Rechazado',
    suspended: 'Suspendido',
    revalidated: 'Revalidado',
    role_granted: 'Rol repartidor otorgado',
    role_grant_skipped_idempotent: 'Rol ya presente (idempotente)',
    role_grant_failed: 'Fallo el otorgamiento del rol',
    risk_signal_raised: 'Señal de riesgo registrada',
    federal_block_activated: 'Bloqueo federal activado',
    federal_resolved: 'Resolución federal',
    reopened: 'Reabierto',
  }[action] || action);

/** Visor de evidencia: blob efímero autenticado (nunca URL pública). */
const VisorEvidencia = ({ token, expedienteId, slot, fileId, onClose }) => {
  const [url, setUrl] = useState(null);
  const [error, setError] = useState(null);
  // QA Fase E: en pantallas chicas el visor ocupa la pantalla completa.
  const esMovil = useMediaQuery(useTheme().breakpoints.down('sm'));

  useEffect(() => {
    let vivo = true;
    let creado = null;
    revisionService
      .abrirEvidencia(token, expedienteId, fileId)
      .then((blobUrl) => {
        creado = blobUrl;
        if (vivo) setUrl(blobUrl);
      })
      .catch((e) => vivo && setError(e.message));
    return () => {
      vivo = false;
      if (creado) URL.revokeObjectURL(creado);
    };
  }, [token, expedienteId, fileId]);

  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth fullScreen={esMovil}>
      <DialogTitle sx={{ color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {ETIQUETAS_SLOT[slot] || 'Evidencia'}
        <IconButton onClick={onClose} sx={{ color: '#fff' }}><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ bgcolor: '#111', textAlign: 'center' }}>
        {error && <Alert severity="error">{error}</Alert>}
        {!url && !error && <CircularProgress sx={{ color: '#8A5CF5' }} />}
        {url && slot === 'video_presentation' ? (
          <video src={url} controls style={{ maxWidth: '100%' }} />
        ) : (
          url && <img src={url} alt="evidencia" style={{ maxWidth: '100%' }} />
        )}
      </DialogContent>
    </Dialog>
  );
};

/** Formulario de cotejo por documento (spec §12B). */
const FormularioCotejo = ({ onGuardar, cargando }) => {
  const [documentId, setDocumentId] = useState('');
  const [checkType, setCheckType] = useState('officially_checked');
  const [result, setResult] = useState('verified');
  const [sourceName, setSourceName] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [notes, setNotes] = useState('');

  const oficial = checkType === 'officially_checked';

  return (
    <Stack spacing={2}>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField select fullWidth size="small" label="Documento a cotejar" value={documentId} onChange={(e) => setDocumentId(e.target.value)}>
            <MenuItem value=""><em>Elige el documento…</em></MenuItem>
          </TextField>
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField select fullWidth size="small" label="Tipo de cotejo REAL" value={checkType} onChange={(e) => setCheckType(e.target.value)}>
            {CHECK_TYPES.map((t) => <MenuItem key={t.id} value={t.id}>{t.label}</MenuItem>)}
          </TextField>
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField select fullWidth size="small" label="Resultado" value={result} onChange={(e) => setResult(e.target.value)}>
            {RESULTADOS.map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
          </TextField>
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            fullWidth size="small" label="Fuente consultada (INE, SEMOVI, aseguradora…)"
            value={sourceName} onChange={(e) => setSourceName(e.target.value)}
            required={oficial} error={oficial && !sourceName}
          />
        </Grid>
        <Grid size={12}>
          <TextField
            fullWidth size="small" label="URL oficial o método concreto"
            value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)}
            required={oficial} error={oficial && !sourceUrl}
            helperText={oficial ? 'Obligatorio: un cotejo sin fuente es una marcación falsa y NO habilita la aprobación.' : ''}
          />
        </Grid>
        <Grid size={12}>
          <TextField fullWidth size="small" multiline minRows={2} label="Notas / datos contrastados (sin CURP ni CLABE completas)" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Grid>
      </Grid>
      <Button
        variant="contained" size="small" disabled={cargando || !documentId || (oficial && (!sourceName || !sourceUrl))}
        onClick={() => onGuardar({ document_id: documentId, check_type: checkType, result, source_name: sourceName || null, official_source_url: sourceUrl || null, notes: notes || null })}
        sx={{ alignSelf: 'flex-end', bgcolor: '#8A5CF5' }}
      >
        Registrar cotejo
      </Button>
    </Stack>
  );
};

/** Detalle completo del expediente con acciones del revisor. */
const DetalleExpediente = ({ token, id, onClose, onRefresco }) => {
  const { toast } = useNotifications() || {};
  const [detalle, setDetalle] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [visor, setVisor] = useState(null);
  const [motivo, setMotivo] = useState('');
  const [zoomUrl, setZoomUrl] = useState('');
  const [zoomResult, setZoomResult] = useState('validado');
  const [clasificacion, setClasificacion] = useState('bicicleta_asistida');
  const [baseClasificacion, setBaseClasificacion] = useState('');

  const cargar = useCallback(async () => {
    try {
      const resp = await revisionService.detalle(token, id);
      setDetalle(resp);
      setZoomUrl(resp.profile?.zoom?.session_url || '');
    } catch (e) {
      toast?.error(e.message);
    } finally {
      setCargando(false);
    }
  }, [token, id, toast]);

  useEffect(() => { cargar(); }, [cargar]);

  const accion = async (fn, exito) => {
    setGuardando(true);
    try {
      await fn();
      toast?.success(exito);
      await cargar();
      onRefresco();
    } catch (e) {
      toast?.error(e.message);
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) return <Box sx={{ py: 6, textAlign: 'center' }}><CircularProgress sx={{ color: '#8A5CF5' }} /></Box>;
  if (!detalle) return <Alert severity="error">No se pudo cargar el expediente.</Alert>;

  const { profile, vehicle, documentos_requeridos, eventos, senales } = detalle;
  const status = profile.status;
  const enRevision = ['pending_review', 'corrections_required', 'eligible_for_video_review'].includes(status);
  const cotejosPrevios = eventos.filter((e) => e.action === 'document_check_registered');
  const slotsConArchivo = [
    ...Object.entries(profile.identity?.slots || {}).map(([s, f]) => ({ slot: s, fileId: f })),
    ...Object.entries(vehicle?.slots || {}).map(([s, f]) => ({ slot: s, fileId: f })),
  ].filter((x) => x.fileId);

  return (
    <Stack spacing={3}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        <ChipEstado status={status} />
        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
          {profile.user?.email} · {profile.territory_ref} · Agencia #{profile.agency?.id ?? profile.agency}
        </Typography>
      </Box>

      {senales?.some((s) => s.level === 'alta' && s.status === 'activa') && (
        <Alert severity="error">
          ⚠️ Señal de riesgo ALTA activa: la aprobación está bloqueada hasta resolución federal.
        </Alert>
      )}

      {/* Datos */}
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <Card variant="outlined" sx={{ p: 2, borderColor: 'rgba(255,255,255,0.12)' }}>
            <Typography variant="subtitle2" sx={{ color: '#8A5CF5' }}>Identidad</Typography>
            <Typography variant="body2" sx={{ color: '#fff' }}>Tel: {profile.identity?.phone || '—'}</Typography>
            <Typography variant="body2" sx={{ color: '#fff' }}>Nacimiento: {profile.identity?.birthdate || '—'}</Typography>
            <Typography variant="body2" sx={{ color: '#fff' }}>CURP: {profile.identity?.curp_masked || '—'}</Typography>
            <Typography variant="body2" sx={{ color: '#fff' }}>
              INE reutilizada: {profile.identity?.ine_reutilizada ? 'sí' : 'no'}
            </Typography>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <Card variant="outlined" sx={{ p: 2, borderColor: 'rgba(255,255,255,0.12)' }}>
            <Typography variant="subtitle2" sx={{ color: '#8A5CF5' }}>Pago y capacitación</Typography>
            <Typography variant="body2" sx={{ color: '#fff' }}>CLABE: {profile.payout?.clabe_masked || 'pendiente'}</Typography>
            <Typography variant="body2" sx={{ color: '#fff' }}>Titular: {profile.payout?.account_holder_name || '—'}</Typography>
            <Typography variant="body2" sx={{ color: '#fff' }}>
              Examen: {profile.training?.status} {profile.training?.score ? `(${profile.training.score}/10)` : ''}
            </Typography>
            <Typography variant="body2" sx={{ color: '#fff' }}>
              Zoom: {profile.zoom?.attendance_result || 'pendiente'}
            </Typography>
          </Card>
        </Grid>
        {vehicle && (
          <Grid size={12}>
            <Card variant="outlined" sx={{ p: 2, borderColor: 'rgba(255,255,255,0.12)' }}>
              <Typography variant="subtitle2" sx={{ color: '#8A5CF5' }}>
                Vehículo: {vehicle.type} · {vehicle.brand} {vehicle.model} {vehicle.color}
                {vehicle.plate ? ` · placa ${vehicle.plate}` : ''}
              </Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                Clasificación: {vehicle.juridical_classification}
                {vehicle.license_expiration ? ` · licencia vence ${vehicle.license_expiration}` : ''}
                {vehicle.insurance_expiration ? ` · seguro vence ${vehicle.insurance_expiration}` : ''}
              </Typography>
              {vehicle.type === 'bicicleta_electrica' && enRevision && (
                <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap' }}>
                  <TextField select size="small" label="Clasificar" value={clasificacion} onChange={(e) => setClasificacion(e.target.value)} sx={{ minWidth: 200 }}>
                    <MenuItem value="bicicleta_asistida">Bicicleta asistida</MenuItem>
                    <MenuItem value="motorizado">Motorizado (exige docs de moto)</MenuItem>
                  </TextField>
                  <TextField size="small" label="Base normativa" value={baseClasificacion} onChange={(e) => setBaseClasificacion(e.target.value)} sx={{ minWidth: 260 }} />
                  <Button
                    size="small" variant="outlined" disabled={guardando || baseClasificacion.trim().length < 10}
                    onClick={() => accion(() => revisionService.clasificarVehiculo(token, id, { classification: clasificacion, motivo: baseClasificacion }), 'Vehículo clasificado')}
                    sx={{ color: '#fff', borderColor: 'rgba(138,92,245,0.5)' }}
                  >
                    Guardar clasificación
                  </Button>
                </Stack>
              )}
            </Card>
          </Grid>
        )}
      </Grid>

      {/* Evidencias */}
      <Box>
        <Typography variant="subtitle2" sx={{ color: '#8A5CF5', mb: 1 }}>Evidencias (descarga privada autenticada)</Typography>
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
          {slotsConArchivo.length === 0 && (
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>Sin evidencias adjuntas.</Typography>
          )}
          {slotsConArchivo.map(({ slot, fileId }) => (
            <Chip
              key={slot}
              icon={<VisibilityIcon />}
              label={ETIQUETAS_SLOT[slot] || slot}
              onClick={() => setVisor({ slot, fileId })}
              sx={{ m: 0.5, bgcolor: 'rgba(138,92,245,0.15)', color: '#fff' }}
            />
          ))}
        </Stack>
      </Box>

      {/* Cotejos (solo en revision) */}
      {enRevision && (
        <Box>
          <Typography variant="subtitle2" sx={{ color: '#8A5CF5', mb: 1 }}>
            Cotejos documentales (requeridos: {documentos_requeridos?.length || 0})
          </Typography>
          <FormularioCotejo
            cargando={guardando}
            onGuardar={(body) => accion(() => revisionService.registrarCotejo(token, id, body), 'Cotejo registrado')}
          />
          <Box sx={{ component: 'ul', mt: 1, pl: 2 }}>
            <Grid container spacing={1} sx={{ mt: 0.5 }}>
              {documentos_requeridos?.map((d) => {
                const ultimo = [...cotejosPrevios].reverse().find((e) => e.document_id === d.document_id);
                return (
                  <Grid key={d.document_id} size={{ xs: 12, sm: 6, md: 4 }}>
                    <Chip
                      size="small"
                      color={!ultimo ? 'default' : ultimo.result === 'verified' ? 'success' : 'error'}
                      label={`${ultimo ? (ultimo.result === 'verified' ? '✓' : '✗') : '•'} ${d.document_id}`}
                      sx={{ color: '#fff' }}
                    />
                  </Grid>
                );
              })}
            </Grid>
          </Box>
        </Box>
      )}

      {/* Zoom + decisiones */}
      {['pending_review', 'eligible_for_video_review'].includes(status) && (
        <Box>
          <Typography variant="subtitle2" sx={{ color: '#8A5CF5', mb: 1 }}>Validación por video (Zoom externo)</Typography>
          <Stack spacing={1}>
            <TextField size="small" label="URL de la sesión de Zoom (https://…zoom.us)" value={zoomUrl} onChange={(e) => setZoomUrl(e.target.value)} />
            <TextField select size="small" label="Resultado individual" value={zoomResult} onChange={(e) => setZoomResult(e.target.value)} sx={{ maxWidth: 260 }}>
              <MenuItem value="validado">Validado (identidad comprobada por cámara)</MenuItem>
              <MenuItem value="no_validado">No validado</MenuItem>
            </TextField>
            <Button
              size="small" variant="outlined" disabled={guardando || !zoomUrl.trim()}
              onClick={() => accion(() => revisionService.registrarValidacionZoom(token, id, { zoom_session_url: zoomUrl, attendance_result: zoomResult }), 'Validación registrada')}
              sx={{ color: '#fff', borderColor: 'rgba(138,92,245,0.5)', alignSelf: 'flex-start' }}
            >
              Registrar validación de video
            </Button>
          </Stack>
        </Box>
      )}

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.12)' }} />

      {/* Acciones finales */}
      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
        {status === 'pending_review' && (
          <Button size="small" variant="contained" disabled={guardando} onClick={() => accion(() => revisionService.marcarElegibleVideo(token, id), 'Marcado elegible para video')} sx={{ bgcolor: '#8A5CF5' }}>
            Matriz completa → elegible para video
          </Button>
        )}
        {['pending_review', 'eligible_for_video_review'].includes(status) && (
          <>
            <Button size="small" variant="contained" color="success" disabled={guardando} onClick={() => accion(() => revisionService.aprobar(token, id), 'Expediente aprobado y rol otorgado')}>
              Aprobar
            </Button>
            <Button
              size="small" variant="outlined" color="error"
              disabled={guardando || motivo.trim().length < 20}
              onClick={() => accion(() => revisionService.rechazar(token, id, { motivo }), 'Rechazado')}
            >
              Rechazar
            </Button>
          </>
        )}
        {status === 'approved' && (
          <Button size="small" variant="outlined" color="warning" disabled={guardando || motivo.trim().length < 10} onClick={() => accion(() => revisionService.suspender(token, id, { motivo }), 'Suspendido')}>
            Suspender
          </Button>
        )}
        {status === 'suspended' && (
          <Button size="small" variant="contained" disabled={guardando} onClick={() => accion(() => revisionService.revalidar(token, id), 'Revalidado')} sx={{ bgcolor: '#8A5CF5' }}>
            Revalidar
          </Button>
        )}
        {status === 'rejected' && (
          <Button size="small" variant="outlined" disabled={guardando || motivo.trim().length < 10} onClick={() => accion(() => revisionService.reabrir(token, id, { motivo }), 'Reabierto')} sx={{ color: '#fff' }}>
            Reabrir (apelación)
          </Button>
        )}
        {['pending_review', 'eligible_for_video_review'].includes(status) && (
          <Button
            size="small" variant="outlined" disabled={guardando}
            onClick={() => accion(
              () => revisionService.pedirCorrecciones(token, id, { corrections: [{ document_id: 'expediente', motivo: motivo.trim().length >= 10 ? motivo : 'Revisa tus documentos según lo indicado por la agencia' }] }),
              'Correcciones solicitadas'
            )}
            sx={{ color: '#fff', borderColor: 'rgba(255,255,245,0.4)' }}
          >
            Pedir correcciones
          </Button>
        )}
      </Stack>
      {['pending_review', 'eligible_for_video_review', 'approved', 'rejected'].includes(status) && (
        <TextField size="small" multiline minRows={2} label="Motivo (obligatorio para rechazar/suspender/reabrir)" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
      )}

      {/* Historial */}
      <Box>
        <Typography variant="subtitle2" sx={{ color: '#8A5CF5', mb: 1 }}>Historial (append-only)</Typography>
        <Stack spacing={0.5}>
          {eventos.map((e) => (
            <Typography key={e.id} variant="caption" sx={{ color: 'rgba(255,255,255,0.75)' }}>
              #{e.review_version} · {etiquetaAccion(e.action)}
              {e.document_id ? ` · ${e.document_id}` : ''}
              {e.result ? ` → ${e.result}` : ''}
              {e.official_source_url ? ` (${e.official_source_url})` : ''}
              {e.evidence_sha256 ? ` · sha256:${e.evidence_sha256.slice(0, 12)}…` : ''}
            </Typography>
          ))}
        </Stack>
      </Box>

      {visor && (
        <VisorEvidencia
          token={token}
          expedienteId={id}
          slot={visor.slot}
          fileId={visor.fileId}
          onClose={() => setVisor(null)}
        />
      )}
    </Stack>
  );
};

/** Bandeja federal: casos con señales altas + resolución auditada. */
const BandejaFederal = ({ token, onRefresco }) => {
  const { toast } = useNotifications() || {};
  const [casos, setCasos] = useState(null);
  const [resolviendo, setResolviendo] = useState(null);
  const [decision, setDecision] = useState('devolver_agencia');
  const [hallazgo, setHallazgo] = useState('');

  const cargar = useCallback(async () => {
    try {
      const resp = await federalService.casos(token);
      setCasos(resp);
    } catch (e) {
      setCasos({ error: e.message });
    }
  }, [token]);

  useEffect(() => { cargar(); }, [cargar]);

  if (!casos) return <CircularProgress size={18} sx={{ color: '#8A5CF5' }} />;
  if (casos.error) return <Alert severity="error">{casos.error}</Alert>;
  if (!casos.data?.length) return <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)' }}>Sin casos federales abiertos.</Typography>;

  return (
    <Stack spacing={2}>
      {casos.data.map((c) => (
        <Card key={c.id} variant="outlined" sx={{ p: 2, borderColor: 'rgba(244,67,54,0.4)' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
            <Box>
              <ChipEstado status={c.status} />
              <Typography variant="body2" sx={{ color: '#fff', mt: 1 }}>
                Expediente #{c.id} · Agencia #{c.agency_id}
              </Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                Señales: {(c.senales_altas || []).map((s) => s.rule).join(', ')}
              </Typography>
            </Box>
            <Button size="small" variant="outlined" onClick={() => setResolviendo(resolviendo === c.id ? null : c.id)} sx={{ color: '#fff', borderColor: 'rgba(138,92,245,0.5)' }}>
              Resolver
            </Button>
          </Box>
          {resolviendo === c.id && (
            <Stack spacing={1} sx={{ mt: 2 }}>
              {(c.senales_altas || []).map((s) => (
                <TextField
                  key={s.id} select size="small" label={`Decisión sobre señal #${s.id}`}
                  value={decision} onChange={(e) => setDecision(e.target.value)}
                >
                  <MenuItem value="devolver_agencia">Devolver a la agencia (revisión ordinaria)</MenuItem>
                  <MenuItem value="habilitar_aprobacion">Habilitar para aprobación local</MenuItem>
                  <MenuItem value="mantener_bloqueo">Mantener bloqueo (deja solo huella)</MenuItem>
                </TextField>
              ))}
              <TextField size="small" multiline minRows={2} label="Hallazgo federal" value={hallazgo} onChange={(e) => setHallazgo(e.target.value)} />
              <Button
                size="small" variant="contained" disabled={hallazgo.trim().length < 10}
                onClick={async () => {
                  for (const s of c.senales_altas || []) {
                    await federalService.resolver(token, s.id, { decision, hallazgo });
                  }
                  toast?.success('Resolución federal registrada');
                  setResolviendo(null);
                  setHallazgo('');
                  cargar();
                  onRefresco();
                }}
                sx={{ bgcolor: '#8A5CF5', alignSelf: 'flex-start' }}
              >
                Registrar resolución
              </Button>
            </Stack>
          )}
        </Card>
      ))}
    </Stack>
  );
};

/**
 * Cowork → Verificar Repartidores (spec §12D/§12F): cola por agencia junto a
 * la verificación de conductores. La policy del backend (is-delivery-reviewer
 * + ámbito de agencia + vigencia) es la única seguridad; este componente
 * solo presenta. Los federal (agencia.tipo==='federal') ven además la bandeja
 * de casos con señales altas.
 */
const RepartidoresAgencia = () => {
  const { getAccessTokenSilently } = useAuth0();
  const { userData } = useRoles();
  const { toast } = useNotifications() || {};

  const [token, setToken] = useState(null);
  const [cola, setCola] = useState(null);
  const [status, setStatus] = useState('');
  const [abierto, setAbierto] = useState(null);

  // QA Fase E: el expediente concentra cotejos+Zoom+decisiones; en movil va
  // a pantalla completa para que el scroll "paper" aproveche toda la altura.
  const esMovil = useMediaQuery(useTheme().breakpoints.down('sm'));

  const esFederal = userData?.agencia?.tipo === 'federal';

  const cargarCola = useCallback(async (tkn) => {
    const t = tkn || token;
    try {
      const resp = await revisionService.cola(t, { status });
      setCola(resp);
    } catch (e) {
      setCola({ error: e.message });
    }
  }, [token, status]);

  useEffect(() => {
    let vivo = true;
    getAccessTokenSilently({ authorizationParams: { audience } })
      .then((t) => { if (vivo) { setToken(t); return revisionService.cola(t, { status }); } })
      .then((resp) => { if (vivo && resp) setCola(resp); })
      .catch((e) => vivo && setCola({ error: e.message }));
    return () => { vivo = false; };
  }, [getAccessTokenSilently, status]);

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} color="white" gutterBottom>
        🚴 Verificar Repartidores
      </Typography>
      <Typography color="#ccc" sx={{ mb: 2 }}>
        Cola de expedientes de repartidores de tu agencia. Cada cotejo se registra con su
        fuente, resultado y evidencia; la validación final es por Zoom y la aprobación
        otorga el rol desde el backend.
      </Typography>

      <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
        {ESTADOS_FILTRO.map((f) => (
          <Chip
            key={f.id}
            label={f.label}
            onClick={() => setStatus(f.id)}
            variant={status === f.id ? 'filled' : 'outlined'}
            sx={{ color: '#fff', bgcolor: status === f.id ? 'rgba(138,92,245,0.35)' : 'transparent' }}
          />
        ))}
      </Stack>

      {!cola && <CircularProgress sx={{ color: '#8A5CF5' }} />}
      {cola?.error && <Alert severity="error">{cola.error}</Alert>}
      {cola && !cola.error && cola.data?.length === 0 && (
        <Typography sx={{ color: '#aaa', textAlign: 'center', py: 6 }}>
          No hay expedientes de repartidores con este filtro.
        </Typography>
      )}
      <Stack spacing={2}>
        {cola?.data?.map((p) => (
          <Card key={p.id} variant="outlined" sx={{ borderColor: 'rgba(255,255,255,0.12)', '&:hover': { borderColor: 'rgba(138,92,245,0.5)' } }}>
            <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
              <Box>
                <ChipEstado status={p.status} />
                <Typography variant="body2" sx={{ color: '#fff', mt: 1 }}>
                  Expediente #{p.id} · Capacitación: {p.training_status} · Zoom: {p.zoom}
                </Typography>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                  Enviado: {p.submitted_at ? new Date(p.submitted_at).toLocaleString('es-MX') : '—'}
                </Typography>
              </Box>
              <Button size="small" variant="contained" onClick={() => setAbierto(p.id)} sx={{ bgcolor: '#8A5CF5', '&:hover': { bgcolor: '#6A3FCB' } }}>
                Abrir expediente
              </Button>
            </CardContent>
          </Card>
        ))}
      </Stack>

      {esFederal && (
        <Box sx={{ mt: 4 }}>
          <Divider sx={{ mb: 2, borderColor: 'rgba(255,255,255,0.12)' }} />
          <Typography variant="h6" fontWeight={700} color="white" gutterBottom>
            🏛️ Bandeja federal (señales de riesgo alto)
          </Typography>
          {token && <BandejaFederal token={token} onRefresco={() => cargarCola()} />}
        </Box>
      )}

      <Dialog open={Boolean(abierto)} onClose={() => setAbierto(null)} maxWidth="md" fullWidth fullScreen={esMovil} scroll="paper">
        <DialogTitle sx={{ color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Expediente de repartidor #{abierto}
          <IconButton onClick={() => setAbierto(null)} sx={{ color: '#fff' }}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {token && abierto && (
            <DetalleExpediente token={token} id={abierto} onClose={() => setAbierto(null)} onRefresco={() => cargarCola()} />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAbierto(null)} sx={{ color: '#fff' }}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RepartidoresAgencia;
