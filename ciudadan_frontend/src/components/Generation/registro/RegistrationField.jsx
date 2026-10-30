/**
 * RegistrationField — renderiza UN campo del formulario según su tipo
 * (text, email, tel, url, select, textarea, consent, file). Config-driven:
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
  Button,
} from '@mui/material';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import { GEN_COLORS } from '../GenerationTheme';

const inputSx = {
  '& .MuiOutlinedInput-root': {
    bgcolor: 'rgba(255,255,255,0.04)',
    '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
    '&:hover fieldset': { borderColor: GEN_COLORS.verde },
    '&.Mui-focused fieldset': { borderColor: GEN_COLORS.verde },
    '&.Mui-error fieldset': { borderColor: '#ef5350' },
  },
  // Estado deshabilitado (email de Auth0): sobre fondo oscuro el gris
  // por defecto de MUI no contrasta. Forzamos texto legible y borde visible.
  '& .MuiOutlinedInput-root.Mui-disabled': {
    bgcolor: 'rgba(255,255,255,0.08)',
    '& fieldset': { borderColor: 'rgba(255,255,255,0.28)' },
  },
  '& .MuiInputLabel-root': { color: GEN_COLORS.textoSecundario },
  '& .MuiInputLabel-root.Mui-focused': { color: GEN_COLORS.verde },
  '& .MuiInputLabel-root.Mui-disabled': { color: GEN_COLORS.textoSecundario },
  '& .MuiInputBase-input': { color: GEN_COLORS.texto },
  '& .MuiInputBase-input.Mui-disabled': {
    color: GEN_COLORS.texto,
    WebkitTextFillColor: GEN_COLORS.texto,
    opacity: 1,
  },
  '& .MuiSvgIcon-root': { color: GEN_COLORS.textoSecundario },
};

const RegistrationField = ({ field, value, error, disabled, onChange }) => {
  const commonProps = {
    label: field.label,
    required: Boolean(field.required),
    error: Boolean(error),
    helperText: error || field.helperText || field.placeholder || ' ',
    disabled,
    fullWidth: true,
    sx: inputSx,
  };

  switch (field.type) {
    case 'select': {
      // Las opciones pueden ser cadenas (registro de Generación) u objetos
      // { value, label } (catálogos del backend: áreas, agencias).
      const opciones = (field.options || []).map((option) =>
        option && typeof option === 'object'
          ? { value: String(option.value), label: option.label ?? String(option.value) }
          : { value: String(option), label: String(option) }
      );

      // Si el valor actual ya no está entre las opciones (catálogo vacío o
      // recargado), se resetea a '' para no dejar el Select fuera de rango.
      const valor = opciones.some((opcion) => opcion.value === String(value))
        ? String(value)
        : '';

      // Catálogo vacío: se muestra un campo deshabilitado con la explicación
      // (helperText) en vez de un desplegable sin opciones.
      if (opciones.length === 0) {
        return (
          <TextField
            select
            name={field.name}
            value=""
            disabled
            SelectProps={{ displayEmpty: true }}
            {...commonProps}
          >
            <MenuItem value="" sx={{ color: '#111' }}>
              Sin opciones disponibles
            </MenuItem>
          </TextField>
        );
      }

      return (
        <TextField
          select
          name={field.name}
          value={valor}
          onChange={(e) => onChange(field.name, e.target.value)}
          {...commonProps}
        >
          {opciones.map((opcion) => (
            <MenuItem key={opcion.value} value={opcion.value} sx={{ color: '#111' }}>
              {opcion.label}
            </MenuItem>
          ))}
        </TextField>
      );
    }

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

    case 'file':
      // Subida de archivo (CV). `value` es el File seleccionado o null.
      return (
        <Box sx={{ mt: 1 }}>
          <Button
            component="label"
            variant="outlined"
            startIcon={<AttachFileIcon />}
            disabled={disabled}
            sx={{
              color: GEN_COLORS.texto,
              borderColor: error ? '#ef5350' : 'rgba(255,255,255,0.2)',
              textTransform: 'none',
              '&:hover': { borderColor: GEN_COLORS.verde },
            }}
          >
            {value?.name || field.label}
            <input
              type="file"
              hidden
              name={field.name}
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
              onChange={(e) => onChange(field.name, e.target.files?.[0] || null)}
            />
          </Button>
          {value && (
            <Button
              size="small"
              onClick={() => onChange(field.name, null)}
              disabled={disabled}
              sx={{ color: GEN_COLORS.textoSecundario, ml: 1, textTransform: 'none' }}
            >
              Quitar
            </Button>
          )}
          <FormHelperText error={Boolean(error)} sx={{ color: error ? undefined : GEN_COLORS.textoSecundario }}>
            {error || field.helperText || 'PDF, Word o imagen. Máx. 10 MB.'}
          </FormHelperText>
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
