import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { Box, Button, Grid2 as Grid, Stack, Typography } from '@mui/material';
import DocumentCard from './DocumentCard';
import PersonalDataCard from './PersonalDataCard';
import BiometricComparison from './BiometricComparison';
import {
  getDocumentsForReviewSection,
  getReviewSectionLabel,
} from '../../../services/driverVerification/reviewNavigation';
import CameraAltIcon from '@mui/icons-material/CameraAlt';

const EMPTY_COPY = {
  identity: 'No hay documentos de identidad disponibles.',
  vehicle: 'No hay archivos del vehículo disponibles.',
  biometric: 'No hay evidencias biométricas disponibles.',
};

const SectionPanel = ({ title, subtitle, children, activeSection }) => (
  <Box>
    <Stack direction="row" justifyContent="space-between" alignItems="center">
      <Typography variant="h6" component="h2" sx={{ fontWeight: 600, lineHeight: 1.3 }}>
        {title}
      </Typography>
      {activeSection === 'vehicle' && (
        <Button
          endIcon={<CameraAltIcon />}
          variant="contained"
          color="primary"
          sx={{ mt: 2, backgroundColor: 'yellow', color: 'black' }}
        >
          Subir evidencias
        </Button>
      )}
    </Stack>
    {subtitle ? (
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2 }}>
        {subtitle}
      </Typography>
    ) : (
      <Box sx={{ mb: 2 }} />
    )}
    {children}
  </Box>
);

SectionPanel.propTypes = {
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
  children: PropTypes.node.isRequired,
};

const DocumentGrid = ({
  documents,
  onApprove,
  onReject,
  onRequestResub,
  activeSection,
  driver,
  biometric,
  actionsDisabled = false,
}) => {
  const sectionTitle = getReviewSectionLabel(activeSection);

  const sectionDocuments = useMemo(
    () => getDocumentsForReviewSection(activeSection, documents),
    [activeSection, documents]
  );

  const sectionSubtitle = useMemo(() => {
    if (activeSection === 'identity' || activeSection === 'vehicle') {
      const uploaded = sectionDocuments.filter((doc) => doc.hasFile).length;
      const total = sectionDocuments.length;
      return total ? `${uploaded} de ${total} documentos cargados` : null;
    }
    if (activeSection === 'biometric') {
      const uploaded = sectionDocuments.filter((doc) => doc.hasFile).length;
      return `${uploaded} de 2 evidencias requeridas`;
    }
    return null;
  }, [activeSection, sectionDocuments]);

  const showEmptyState = (copy) => (
    <Box sx={{ py: 4, textAlign: 'center' }}>
      <Typography variant="body2" color="text.secondary">
        {copy}
      </Typography>
    </Box>
  );

  if (activeSection === 'personal') {
    return (
      <SectionPanel title={sectionTitle}>
        <PersonalDataCard driver={driver} />
      </SectionPanel>
    );
  }

  if (activeSection === 'biometric') {
    return (
      <SectionPanel title={sectionTitle} subtitle={sectionSubtitle}>
        <BiometricComparison
          selfieUrl={biometric?.selfieUrl}
          ineUrl={biometric?.ineUrl}
          similarityScore={biometric?.similarityScore}
        />
      </SectionPanel>
    );
  }

  if (activeSection === 'identity' || activeSection === 'vehicle') {
    return (
      <SectionPanel title={sectionTitle} subtitle={sectionSubtitle} activeSection={activeSection}>
        {sectionDocuments.length > 0 ? (
          <Grid container spacing={2}>
            {sectionDocuments.map((doc) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={doc.id}>
                <DocumentCard
                  doc={doc}
                  onApprove={onApprove}
                  onReject={onReject}
                  onRequestResub={onRequestResub}
                  actionsDisabled={actionsDisabled}
                />
              </Grid>
            ))}
          </Grid>
        ) : (
          showEmptyState(EMPTY_COPY[activeSection])
        )}
      </SectionPanel>
    );
  }

  return showEmptyState('Selecciona una sección del panel izquierdo.');
};

DocumentGrid.propTypes = {
  documents: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      type: PropTypes.string.isRequired,
      status: PropTypes.string.isRequired,
      note: PropTypes.string,
      evidenceType: PropTypes.string,
      hasFile: PropTypes.bool,
    })
  ).isRequired,
  onApprove: PropTypes.func.isRequired,
  onReject: PropTypes.func.isRequired,
  onRequestResub: PropTypes.func.isRequired,
  activeSection: PropTypes.string.isRequired,
  driver: PropTypes.shape({
    name: PropTypes.string,
    personal: PropTypes.object,
    contact: PropTypes.object,
  }),
  biometric: PropTypes.shape({
    selfieUrl: PropTypes.string,
    ineUrl: PropTypes.string,
    similarityScore: PropTypes.number,
  }),
  actionsDisabled: PropTypes.bool,
};

export default DocumentGrid;
