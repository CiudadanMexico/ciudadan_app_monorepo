import React from 'react';
import PropTypes from 'prop-types';
import { Box, Button, TextField } from '@mui/material';
import SendOutlinedIcon from '@mui/icons-material/SendOutlined';

const ReviewerObservations = ({ value, onChange, onSave, disabled = false }) => (
  <Box>
    <TextField
      fullWidth
      multiline
      rows={2}
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      placeholder="Escribe observaciones para el conductor o el equipo..."
    />
    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
      <Button
        size="small"
        variant="outlined"
        startIcon={<SendOutlinedIcon />}
        onClick={onSave}
        disabled={disabled}
      >
        Guardar
      </Button>
    </Box>
  </Box>
);

ReviewerObservations.propTypes = {
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

export default ReviewerObservations;
