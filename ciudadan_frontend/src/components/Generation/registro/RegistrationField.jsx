/**
 * RegistrationField — renderiza UN campo del formulario según su tipo
 * (text, email, tel, url, select, textarea, consent). Config-driven:
 * los campos provienen de REGISTRATION en generationFounderConfig.js.
 * Accesibilidad: labels reales de MUI, errores en texto, focus visible.
 */
import {
  TextField,
  MenuItem,
  FormControlLabel,
  Checkbox,
  FormHelperText,
  Box,
} from '@mui/material';
import { GEN_COLORS } from '../GenerationTheme';

const inputSx = {
  '& .MuiOutlinedInput-root': {
    bgcolor: 'rgba(255,255,255,0.04)',
    '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
    '&:hover fieldset': { borderColor: GEN_COLORS.verde },
    '&.Mui-focused fieldset': { borderColor: GEN_COLORS.verde },
    '&.Mui-error fieldset': { borderColor: '#ef5350' },
  },
  '& .MuiInputLabel-root': { color: GEN_COLORS.textoSecundario },
  '& .MuiInputLabel-root.Mui-focused': { color: GEN_COLORS.verde },
  '& .MuiInputBase-input': { color: GEN_COLORS.texto },
  '& .MuiSvgIcon-root': { color: GEN_COLORS.textoSecundario },
};

const RegistrationField = ({ field, value, error, disabled, onChange }) => {
  const commonProps = {
    label: field.label,
    required: Boolean(field.required),
    error: Boolean(error),
    helperText: error || field.placeholder || ' ',
    disabled,
    fullWidth: true,
    sx: inputSx,
  };

  switch (field.type) {
    case 'select':
      return (
        <TextField
          select
          name={field.name}
          value={value || ''}
          onChange={(e) => onChange(field.name, e.target.value)}
          {...commonProps}
        >
          {(field.options || []).map((option) => (
            <MenuItem key={option} value={option} sx={{ color: '#111' }}>
              {option}
            </MenuItem>
          ))}
        </TextField>
      );

    case 'textarea':
      return (
        <TextField
          multiline
          rows={4}
          name={field.name}
          value={value || ''}
          onChange={(e) => onChange(field.name, e.target.value)}
          placeholder={field.placeholder || ''}
          {...commonProps}
        />
      );

    case 'consent':
      return (
        <Box sx={{ mt: 1 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={Boolean(value)}
                onChange={(e) => onChange(field.name, e.target.checked)}
                name={field.name}
                sx={{
                  color: GEN_COLORS.verde,
                  '&.Mui-checked': { color: GEN_COLORS.verde },
                }}
              />
            }
            label={<span style={{ color: GEN_COLORS.textoSecundario, fontSize: '0.9rem' }}>{field.label}</span>}
          />
          {error && <FormHelperText error>{error}</FormHelperText>}
        </Box>
      );

    default:
      // text, email, tel, url
      return (
        <TextField
          type={field.type === 'email' ? 'email' : field.type === 'tel' ? 'tel' : 'text'}
          name={field.name}
          value={value || ''}
          onChange={(e) => onChange(field.name, e.target.value)}
          inputProps={field.type === 'url' ? { 'aria-label': field.label } : undefined}
          {...commonProps}
        />
      );
  }
};

export default RegistrationField;
