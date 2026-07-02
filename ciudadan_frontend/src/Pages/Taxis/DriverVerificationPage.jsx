import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Snackbar,
  Stack,
  Typography,
} from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ActivityTimeline,
  DocumentGrid,
  FinalActions,
  OperativeChecklist,
  ReviewerObservations,
  VerificationHeader,
  VerificationSidebar,
} from '../../components/Taxis/driver-verification';
import { getValidationReviewBundle } from '../../services/driverVerification/gettters';
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
  const [reloadKey, setReloadKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [validationDetails, setValidationDetails] = useState(null);
  const [activeSection, setActiveSection] = useState(DEFAULT_REVIEW_SECTION_ID);
  const [documents, setDocuments] = useState([]);
  const [observations, setObservations] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState({ open: false, message: '', severity: 'success' });

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
        navigate(`/herramientas/agencia/conductores`);
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
    </Box>
  );
};

export default DriverVerificationPage;
