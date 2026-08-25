import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControlLabel,
    MenuItem,
    Switch,
    TextField,
    Typography
} from "@mui/material";

const ENUM_OPTIONS = {
    charla: ['indiferente', 'silencio', 'ligera', 'social'],
    musica: ['indiferente', 'sin música', 'música suave', 'pasajero elige'],
};

const BOOLEAN_OPTIONS = [
    { label: 'WiFi', value: 'wifi' },
    { label: 'Agua', value: 'agua' },
    { label: 'Cargador', value: 'cargador' },
    { label: 'Snacks', value: 'snacks' },
    { label: 'Portabici', value: 'portabici' },
    { label: 'Accesibilidad', value: 'accesibilidad' },
    { label: 'Mascotas', value: 'mascotas' },
    { label: 'Fumadores', value: 'fumadores' },
    { label: 'Aire Acondicionado', value: 'aire_acondicionado' },
    { label: 'Rócola', value: 'rockola' },
    { label: 'Ambiente Inclusivo', value: 'ambiente_inclusivo' },
    { label: 'Otro Género', value: 'otro_genero' }
];

const PreferencesModal = ({
    open,
    setOpen,
    saving,
    preferences,
    setPreferences,
    paymentLabory,
    setPaymentLabory,
    onSavePreferences
}) => {
    const handlePreferenceFieldChange = (field, value) => {
        setPreferences((prev) => ({ ...prev, [field]: value }));
    };

    const handlePaymentLaboryChange = (field, value) => {
        setPaymentLabory(value);
    };

    return (
        <Dialog open={open} onClose={() => setOpen(false)} maxWidth='sm' fullWidth sx={{ zIndex: 1600 }}>
            <DialogTitle>Tus preferencias de viaje</DialogTitle>
            <DialogContent dividers sx={{ maxHeight: '400px' }}>
                <Box sx={{ display: 'grid', gap: 2 }}>
                    <Typography variant='body2' color='text.secondary'>
                        Ajusta tus preferencias para que los conductores puedan ver si encajan contigo antes de aceptar el viaje.
                    </Typography>

                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                        <TextField label='Marca' value={preferences.marca || ''} onChange={(e) => handlePreferenceFieldChange('marca', e.target.value)} fullWidth />
                        <TextField label='Nombre' value={preferences.nombre || ''} onChange={(e) => handlePreferenceFieldChange('nombre', e.target.value)} fullWidth />
                        <TextField label='Modelo' type='number' value={preferences.modelo || ''} onChange={(e) => handlePreferenceFieldChange('modelo', e.target.value)} fullWidth />
                        <TextField label='Puertas' type='number' value={preferences.puertas || ''} onChange={(e) => handlePreferenceFieldChange('puertas', e.target.value)} fullWidth />
                    </Box>

                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                        <TextField select label='Charla' value={preferences.charla || 'indiferente'} onChange={(e) => handlePreferenceFieldChange('charla', e.target.value)} fullWidth>
                            {ENUM_OPTIONS.charla.map((option) => (
                                <MenuItem key={option} value={option}>{option}</MenuItem>
                            ))}
                        </TextField>
                        <TextField select label='Música' value={preferences.musica || 'indiferente'} onChange={(e) => handlePreferenceFieldChange('musica', e.target.value)} fullWidth>
                            {ENUM_OPTIONS.musica.map((option) => (
                                <MenuItem key={option} value={option}>{option}</MenuItem>
                            ))}
                        </TextField>
                    </Box>

                    <TextField
                        label='Tipo de música'
                        value={Array.isArray(preferences.tipo_musica) ? preferences.tipo_musica.join(', ') : ''}
                        onChange={(e) => handlePreferenceFieldChange('tipo_musica', e.target.value.split(',').map((item) => item.trim()).filter(Boolean))}
                        placeholder='rock, electrónica, salsa'
                        fullWidth
                    />

                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1 }}>
                        {BOOLEAN_OPTIONS.map((option) => (
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={Boolean(preferences[option.value])}
                                        onChange={(e) => handlePreferenceFieldChange(option.value, e.target.checked)}
                                    />
                                }
                                label={option.label}
                            />
                        ))}
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={Boolean(paymentLabory)}
                                    onChange={(e) => handlePaymentLaboryChange('pago_labory', e.target.checked)}
                                />
                            }
                            label='Pagar hasta el 10% con Labory'
                        />
                    </Box>
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => setOpen(false)} disabled={saving}>Cancelar</Button>
                <Button variant='contained' onClick={onSavePreferences} disabled={saving}>
                    {saving ? 'Guardando...' : 'Guardar'}
                </Button>
            </DialogActions>
        </Dialog>
    )
}

export default PreferencesModal;