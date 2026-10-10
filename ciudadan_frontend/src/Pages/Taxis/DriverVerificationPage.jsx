import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Snackbar,
  Stack,
  Typography,
} from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import {
  ActivityTimeline,
  DocumentGrid,
  ExternalVerificationDialog,
  FinalActions,
  LiveCaptureWizard,
  OperativeChecklist,
  ReviewerObservations,
  RiskAssessmentPanel,
  VehicleDataCard,
  VerificationHeader,
  VerificationSidebar,
} from '../../components/Taxis/driver-verification';
import {
  closeVehicleReview,
  getVehicleCard,
  openVehicleReview,
} from '../../services/vehicleExpedienteService';
import { getValidationReviewBundle } from '../../services/driverVerification/getters';
import {
  completeValidation,
  updateEvidenceReview,
  updateValidationObservations,
} from '../../services/driverVerification/setters';
import { computeEvidenceReviewMetrics } from '../../services/driverVerification/reviewProgress';
import {
  buildReviewNavigationSections,
  computeReviewSectionScores,
  DEFAULT_REVIEW_SECTION_ID,
} from '../../services/driverVerification/reviewNavigation';
import { mapValidationToReviewViewModel } from '../../services/driverVerification/validationMappers';

const UI_TO_API_STATUS = {
  approved: 'approved',
  rejected: 'rejected',
  resub_requested: 'resub_requested',
  needs_review: 'needs_review',
  pending: 'pending',
};

const DriverVerificationPage = () => {
  const navigate = useNavigate();
  const { validationId } = useParams();
  const { isAuthenticated, getAccessTokenSilently } = useAuth0();

  // docs/TAXIS-VERIFICACION-CONDUCTORES-FASES.md, Fase 8: los endpoints de
  // challenges/evidences/risk-assessment/external-verifications quedaron
  // protegidos por la policy `is-verificador` — necesitan el token de Auth0
  // del verificador, no solo la cookie de sesión que usa el resto de esta
  // página (endpoints preexistentes, sin tocar).
  const getToken = useCallback(async () => {
    try {
      if (!isAuthenticated) return null;
      return await getAccessTokenSilently({
        authorizationParams: {
          audience: 'https://api.ciudadan.org',
          scope: 'openid profile email offline_access',
        },
      });
    } catch {
      return null;
    }
  }, [isAuthenticated, getAccessTokenSilently]);
  const [reloadKey, setReloadKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [validationDetails, setValidationDetails] = useState(null);
  const [activeSection, setActiveSection] = useState(DEFAULT_REVIEW_SECTION_ID);
  const [documents, setDocuments] = useState([]);
  const [observations, setObservations] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState({ open: false, message: '', severity: 'success' });
  const [liveCaptureOpen, setLiveCaptureOpen] = useState(false);
  const [liveCaptureSessionId] = useState(() => crypto.randomUUID());
  const [externalVerificationOpen, setExternalVerificationOpen] = useState(false);
  // Expediente vehicular (modelo vehicle): tarjeta de circulación + transición
  // de estado documento_completo → en_revision → aprobado/suspenso. Se lee
  // con GET /api/vehicle/card/:id (policy is-verificador).
  const [vehicleCard, setVehicleCard] = useState(null);
  const [vehicleCardState, setVehicleCardState] = useState('idle');

  const showFeedback = useCallback((message, severity = 'success') => {
    setFeedback({ open: true, message, severity });
  }, []);

  const refreshReviewBundle = useCallback(
    async ({ showLoading = false } = {}) => {
      if (!validationId) return;

      if (showLoading) {
        setLoading(true);
        setError('');
      }

      try {
        const data = await getValidationReviewBundle(validationId);
        setValidationDetails(data);
      } catch (fetchError) {
        if (showLoading) {
          setError(fetchError?.message || 'No se pudo cargar la validación del conductor.');
        } else {
          setFeedback({
            open: true,
            message: fetchError?.message || 'No se pudo actualizar la actividad.',
            severity: 'error',
          });
        }
      } finally {
        if (showLoading) setLoading(false);
      }
    },
    [validationId]
  );

  useEffect(() => {
    refreshReviewBundle({ showLoading: true });
  }, [refreshReviewBundle, reloadKey]);

  const viewModel = useMemo(
    () => mapValidationToReviewViewModel(validationDetails),
    [validationDetails]
  );

  useEffect(() => {
    if (!viewModel) return;
    setDocuments(viewModel.documents || []);
    setObservations(viewModel.observations || '');
  }, [viewModel]);

  const navigationSections = useMemo(
    () => (viewModel ? buildReviewNavigationSections({ documents, driver: viewModel.driver }) : []),
    [documents, viewModel]
  );

  useEffect(() => {
    if (!navigationSections.length) return;
    if (navigationSections.some((section) => section.id === activeSection)) return;
    setActiveSection(navigationSections[0].id);
  }, [activeSection, navigationSections]);

  const reviewMetrics = useMemo(() => computeEvidenceReviewMetrics(documents), [documents]);

  const sectionScore = useMemo(() => computeReviewSectionScores(documents), [documents]);

  const getEvidenceId = (docId) => {
    const doc = documents.find((item) => String(item.id) === String(docId));
    return doc?.evidenceId || doc?.id;
  };

  const persistEvidenceStatus = async (docId, status) => {
    if (viewModel?.validation?.status === 'completed') {
      showFeedback('La validación ya está completada. No se pueden modificar evidencias.', 'error');
      return;
    }

    const evidenceId = getEvidenceId(docId);
    if (!evidenceId) throw new Error('No se encontró la evidencia del documento.');

    const previous = documents;
    setDocuments((prev) =>
      prev.map((doc) => (String(doc.id) === String(docId) ? { ...doc, status } : doc))
    );

    try {
      setActionLoading(true);
      await updateEvidenceReview(evidenceId, {
        reviewStatus: UI_TO_API_STATUS[status] || status,
      });
      await refreshReviewBundle();
      showFeedback('Estado del documento actualizado.');
    } catch (persistError) {
      setDocuments(previous);
      showFeedback(persistError?.message || 'No se pudo guardar el estado del documento.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = (docId) => persistEvidenceStatus(docId, 'approved');
  const handleReject = (docId) => persistEvidenceStatus(docId, 'rejected');
  const handleRequestResub = (docId) => persistEvidenceStatus(docId, 'resub_requested');

  const handleSaveObservations = async () => {
    try {
      setActionLoading(true);
      await updateValidationObservations(validationId, observations);
      await refreshReviewBundle();
      showFeedback('Observaciones guardadas.');
    } catch (saveError) {
      showFeedback(saveError?.message || 'No se pudieron guardar las observaciones.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // ---- Expediente vehicular (modelo vehicle) ----
  // El driverId del expediente de validación se usa como vehicleId: el
  // expediente se crea 1:1 con el driver en el pre-registro.
  const driverVehicleId = viewModel?.driver?.id || null;

  const loadVehicleCard = useCallback(async () => {
    if (!driverVehicleId) return;
    setVehicleCardState('loading');
    try {
      const token = await getToken();
      const card = await getVehicleCard(driverVehicleId, token);
      setVehicleCard(card);
      setVehicleCardState(card?.status === 'preregistrado' ? 'not-ready' : 'ready');
    } catch {
      setVehicleCard(null);
      setVehicleCardState('error');
    }
  }, [driverVehicleId, getToken]);

  useEffect(() => {
    if (viewModel) loadVehicleCard();
  }, [viewModel, loadVehicleCard]);

  const handleVehicleOpenReview = async () => {
    if (!driverVehicleId) return;
    try {
      setActionLoading(true);
      const token = await getToken();
      const updated = await openVehicleReview(driverVehicleId, { observation: observations }, token);
      setVehicleCard(updated);
      showFeedback('Expediente vehicular en revisión (documento_completo → en_revision).');
    } catch (err) {
      showFeedback(err?.message || 'No se pudo abrir la revisión vehicular.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleVehicleCloseReview = async (outcome) => {
    if (!driverVehicleId) return;
    try {
      setActionLoading(true);
      const token = await getToken();
      const updated = await closeVehicleReview(
        driverVehicleId,
        { outcome, observation: observations },
        token,
      );
      setVehicleCard(updated);
      showFeedback(
        outcome === 'aprobado'
          ? 'Expediente vehicular aprobado.'
          : 'Expediente vehicular suspendido.',
      );
    } catch (err) {
      showFeedback(err?.message || 'No se pudo cerrar la revisión vehicular.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleComplete = async (action) => {
    const successMessages = {
      approve: 'Conductor aprobado correctamente.',
      reject: 'Conductor rechazado.',
      request_resub: 'Solicitud de reenvío registrada.',
    };

    try {
      setActionLoading(true);
      //TODO: Add user id
      await completeValidation(validationId, { action, observations });
      await refreshReviewBundle();
      showFeedback(successMessages[action] || 'Acción completada.');
      if (action === 'request_resub') {
        navigate(`/herramientas/conductores`);
      }
    } catch (completeError) {
      showFeedback(completeError?.message || 'No se pudo completar la acción.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ minHeight: '55vh', display: 'grid', placeItems: 'center' }}>
        <Stack spacing={2} alignItems="center">
          <CircularProgress />
          <Typography variant="body2" color="text.secondary">
            Cargando expediente de validación...
          </Typography>
        </Stack>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: { xs: 1.5, md: 2 } }}>
        <Alert
          severity="error"
          action={
            <Button size="small" onClick={() => setReloadKey((prev) => prev + 1)}>
              Reintentar
            </Button>
          }
        >
          {error}
        </Alert>
      </Box>
    );
  }

  if (!viewModel) {
    return (
      <Box sx={{ p: { xs: 1.5, md: 2 } }}>
        <Alert severity="info">No hay información disponible para esta validación.</Alert>
      </Box>
    );
  }

  const isClosed = ['completed', 'cancelled', 'expired'].includes(viewModel.validation?.status);
  const evidenceActionsDisabled = viewModel.validation?.status === 'completed';

  return (
    <Box sx={{ p: { xs: 1.5, md: 2 } }}>
      {isClosed && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Esta validación está cerrada (
          {viewModel.validation?.statusLabel || viewModel.validation?.status}).
        </Alert>
      )}

      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: {
            xs: '1fr',
            lg: '260px minmax(0, 1fr) 320px',
          },
          gridTemplateAreas: {
            xs: '"header" "main" "left" "right"',
            lg: '"header header header" "left main right"',
          },
          alignItems: 'start',
          opacity: actionLoading ? 0.85 : 1,
          pointerEvents: actionLoading ? 'none' : 'auto',
        }}
      >
        <Box sx={{ gridArea: 'header' }}>
          <VerificationHeader
            driver={viewModel.driver}
            validation={viewModel.validation}
            agenda={viewModel.agenda}
            docsProgress={reviewMetrics.docsProgress}
          />
        </Box>

        <Stack direction="column" spacing={2}>
          <VerificationSidebar
            sections={navigationSections}
            activeSection={activeSection}
            onSectionChange={setActiveSection}
            score={sectionScore}
          />
          <Paper variant="outlined" sx={{ p: 1.5 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Checklist operativo
            </Typography>
            <OperativeChecklist documents={documents} />
          </Paper>
        </Stack>

        <Box sx={{ gridArea: 'main', minWidth: 0 }}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <DocumentGrid
              documents={documents}
              onApprove={handleApprove}
              onReject={handleReject}
              onRequestResub={handleRequestResub}
              activeSection={activeSection}
              driver={viewModel.driver}
              biometric={viewModel.biometric}
              actionsDisabled={evidenceActionsDisabled}
            />
          </Paper>
        </Box>

        <Box sx={{ gridArea: 'right', minWidth: 0 }}>
          <Stack spacing={2}>
            <Paper variant="outlined" sx={{ p: 1.5 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Captura en vivo
              </Typography>
              <Button
                variant="outlined"
                fullWidth
                disabled={isClosed}
                onClick={() => setLiveCaptureOpen(true)}
              >
                Iniciar captura en vivo
              </Button>
            </Paper>

            <Paper variant="outlined" sx={{ p: 1.5 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Consultas oficiales
              </Typography>
              <Button
                variant="outlined"
                fullWidth
                disabled={isClosed}
                onClick={() => setExternalVerificationOpen(true)}
              >
                Registrar consulta oficial (INE / REPUVE / licencia)
              </Button>
            </Paper>

            <Paper variant="outlined" sx={{ p: 1.5 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Motor de riesgo
              </Typography>
              <RiskAssessmentPanel validationId={validationId} getToken={getToken} />
            </Paper>

            <Paper variant="outlined" sx={{ p: 1.5 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Expediente vehicular — tarjeta de circulación
              </Typography>
              {vehicleCardState === 'loading' ? (
                <Stack direction="row" spacing={1} alignItems="center">
                  <CircularProgress size={18} />
                  <Typography variant="body2" color="text.secondary">
                    Leyendo expediente (GET /api/vehicle/card/:id)…
                  </Typography>
                </Stack>
              ) : vehicleCard ? (
                <Stack spacing={1}>
                  <VehicleDataCard
                    vehicle={{
                      brand: vehicleCard.brand,
                      model: vehicleCard.model,
                      year: vehicleCard.year,
                      plates: vehicleCard.plates,
                      color: vehicleCard.color,
                      vin: vehicleCard.vin_number,
                    }}
                  />
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                    <Chip
                      size="small"
                      label={`Expediente: ${vehicleCard.status || '—'}`}
                      color={
                        vehicleCard.status === 'aprobado'
                          ? 'success'
                          : vehicleCard.status === 'en_revision'
                            ? 'warning'
                            : 'info'
                      }
                    />
                    <Button size="small" variant="text" onClick={loadVehicleCard} disabled={actionLoading}>
                      Releer tarjeta
                    </Button>
                  </Stack>
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={handleVehicleOpenReview}
                      disabled={isClosed || vehicleCard.status !== 'documento_completo'}
                    >
                      Abrir revisión vehicular
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      color="success"
                      onClick={() => handleVehicleCloseReview('aprobado')}
                      disabled={isClosed || vehicleCard.status !== 'en_revision'}
                    >
                      Aprobar vehículo
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      color="error"
                      onClick={() => handleVehicleCloseReview('suspenso')}
                      disabled={isClosed || vehicleCard.status !== 'en_revision'}
                    >
                      Suspender vehículo
                    </Button>
                  </Stack>
                </Stack>
              ) : (
                <Stack spacing={1}>
                  <Typography variant="body2" color="text.secondary">
                    {vehicleCardState === 'error'
                      ? 'Sin expediente vehicular auditable (aún en preregistrado o sin vehículo vinculado).'
                      : 'El expediente vehicular aparecerá en cuanto esté listo para auditar.'}
                  </Typography>
                  <Box>
                    <Button size="small" variant="text" onClick={loadVehicleCard} disabled={actionLoading}>
                      Reintentar lectura
                    </Button>
                  </Box>
                </Stack>
              )}
            </Paper>

            <Paper variant="outlined" sx={{ p: 1.5 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Acciones finales
              </Typography>
              <FinalActions
                documents={documents}
                disabled={isClosed}
                onApprove={() => handleComplete('approve')}
                onReject={() => handleComplete('reject')}
                onRequestResub={() => handleComplete('request_resub')}
              />
            </Paper>

            <Paper variant="outlined" sx={{ p: 1.5 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Observaciones del revisor
              </Typography>
              <ReviewerObservations
                value={observations}
                onChange={setObservations}
                onSave={handleSaveObservations}
                disabled={isClosed}
              />
            </Paper>

            <Paper variant="outlined" sx={{ p: 1.5 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Actividad reciente
              </Typography>
              <ActivityTimeline events={viewModel.events} />
            </Paper>
          </Stack>
        </Box>
      </Box>

      <Snackbar
        open={feedback.open}
        autoHideDuration={4000}
        onClose={() => setFeedback((prev) => ({ ...prev, open: false }))}
        message={feedback.message}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />

      <LiveCaptureWizard
        open={liveCaptureOpen}
        validationId={validationId}
        sessionId={liveCaptureSessionId}
        getToken={getToken}
        onClose={() => setLiveCaptureOpen(false)}
        onEvidenceUploaded={() => refreshReviewBundle()}
        onFinished={() => {
          setLiveCaptureOpen(false);
          showFeedback('Captura en vivo completada. Evidencias registradas.');
        }}
      />

      <ExternalVerificationDialog
        open={externalVerificationOpen}
        validationId={validationId}
        driverId={viewModel?.driver?.id}
        sessionId={liveCaptureSessionId}
        getToken={getToken}
        onClose={() => setExternalVerificationOpen(false)}
        onRegistered={() => {
          refreshReviewBundle();
          showFeedback('Consulta oficial registrada.');
        }}
      />
    </Box>
  );
};

export default DriverVerificationPage;
