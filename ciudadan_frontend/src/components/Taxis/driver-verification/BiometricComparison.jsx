import React from 'react';
import PropTypes from 'prop-types';
import { Box, Button, Grid2 as Grid, Paper, Stack, Typography } from '@mui/material';
import FaceRetouchingNaturalOutlinedIcon from '@mui/icons-material/FaceRetouchingNaturalOutlined';
import PsychologyAltOutlinedIcon from '@mui/icons-material/PsychologyAltOutlined';

const PreviewBox = ({ title, url }) => (
  <Paper
    variant="outlined"
    sx={{
      p: 2,
      minHeight: 170,
      display: 'grid',
      placeItems: 'center',
      bgcolor: 'grey.100',
    }}
  >
    {url ? (
      <img src={url} alt={title} style={{ maxWidth: '100%', maxHeight: 140, objectFit: 'cover' }} />
    ) : (
      <Stack spacing={1} alignItems="center">
        <FaceRetouchingNaturalOutlinedIcon color="action" />
        <Typography variant="caption" color="text.secondary">
          {title}
        </Typography>
      </Stack>
    )}
  </Paper>
);

const BiometricComparison = ({ selfieUrl, ineUrl, similarityScore }) => (
  <Stack spacing={2}>
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, md: 6 }}>
        <PreviewBox title="Selfie" url={selfieUrl} />
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <PreviewBox title="INE" url={ineUrl} />
      </Grid>
    </Grid>

    <Paper variant="outlined" sx={{ p: 1.5 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
        <Stack direction="row" spacing={1} alignItems="center">
          <PsychologyAltOutlinedIcon color="primary" />
          <Box>
            <Typography variant="subtitle2">Análisis biométrico</Typography>
            {typeof similarityScore === 'number' ? (
              <Typography variant="body2" sx={{ color: 'success.main', fontWeight: 700 }}>
                Similitud: {similarityScore}%
              </Typography>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Sin análisis biométrico disponible
              </Typography>
            )}
          </Box>
        </Stack>
        <Button variant="outlined" size="small">
          Ver análisis
        </Button>
      </Stack>
    </Paper>
  </Stack>
);

PreviewBox.propTypes = {
  title: PropTypes.string.isRequired,
  url: PropTypes.string,
};

BiometricComparison.propTypes = {
  selfieUrl: PropTypes.string,
  ineUrl: PropTypes.string,
  similarityScore: PropTypes.number,
};

export default BiometricComparison;
