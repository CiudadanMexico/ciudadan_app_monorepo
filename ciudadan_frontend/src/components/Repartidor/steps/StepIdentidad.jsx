import React, { useMemo, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import {
  Alert, Box, Button, Grid2 as Grid, TextField, Typography,
} from '@mui/material';
import repartidorService from '../../../services/Repartidor/repartidorService';
import { TarjetaPaso, etiquetaFaltante } from '../helpers';

/**
 * Paso 2 (spec §6.6, §4.1): identidad prellenada + faltantes.
 * La CLABE y la CURP se validan en el backend; aquí solo se capturan.
 * Los documentos propios (INE frente/reverso) pueden reutilizarse si ya
 * están cargados en el perfil de usuario — el backend lo determina (spec 3.3).
 */
const StepIdentidad = ({ token, me, recargar, siguiente, toast }) => {
  const { user } = useAuth0();
  const d = me?.data || {};
  const identidad = d.identity || {};

  const [phone, setPhone] = useState(identidad.phone || '');
  const [curp, setCurp] = useState('');
  const [birthdate, setBirthdate] = useState(identidad.birthdate || '');
  const [contactoNombre, setContactoNombre] = useState(identidad.emergency_contact_name || '');
  const [contactoTelefono, setContactoTelefono] = useState(identidad.emergency_contact_phone || '');
  const [cargando, setCargando] = useState(false);

  const faltantesIdentidad = useMemo(
    () => (d.faltantes || []).filter((f) => f.campo === 'identidad' || f.campo === 'phone'),
    [d.faltantes]
  );

  const guardar = async () => {
    setCargando(true);
    try {
      const campos = { phone };
      if (curp.trim()) campos.curp = curp.trim().toUpperCase();
      if (birthdate) campos.birthdate = birthdate;
      if (contactoNombre) campos.emergency_contact_name = contactoNombre;
      if (contactoTelefono) campos.emergency_contact_phone = contactoTelefono;

      await repartidorService.actualizarExpediente(token, campos);
      await recargar();
      toast?.success('Identidad guardada');
      siguiente(2);
    } catch (e) {
      toast?.error(e.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <TarjetaPaso titulo="2. Tus datos de identidad">
      <Typography variant="body2" sx={{ mb: 2, color: 'rgba(255,255,255,0.8)' }}>
        Confirmemos quién eres. Tu correo de sesión ({user?.email}) ya quedó vinculado; solo
        completamos lo que falte. La CURP y tu fecha de nacimiento se validan contra la
        estructura oficial (18 posiciones y mayoría de edad).
      </Typography>

      {faltantesIdentidad.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Pendiente: {faltantesIdentidad.map(etiquetaFaltante).join(' · ')}
        </Alert>
      )}

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            fullWidth
            label="Teléfono de contacto"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="55 1234 5678"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            fullWidth
            label="Fecha de nacimiento"
            type="date"
            value={birthdate}
            onChange={(e) => setBirthdate(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />
        </Grid>
        <Grid size={{ xs: 12 }}>
          <TextField
            fullWidth
            label="CURP (18 posiciones)"
            value={curp}
            onChange={(e) => setCurp(e.target.value.toUpperCase())}
            placeholder="GARC900520HDFRRT09"
            helperText={identidad.curp_masked ? `Ya registrada: ${identidad.curp_masked}` : 'Se guarda protegida; nunca se publica completa.'}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            fullWidth
            label="Contacto de emergencia (nombre, opcional)"
            value={contactoNombre}
            onChange={(e) => setContactoNombre(e.target.value)}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            fullWidth
            label="Contacto de emergencia (teléfono, opcional)"
            value={contactoTelefono}
            onChange={(e) => setContactoTelefono(e.target.value)}
          />
        </Grid>
      </Grid>

      <Alert severity="info" sx={{ mt: 2 }}>
        Tus documentos de identidad (INE frente/reverso) se adjuntan en el paso de
        <strong> Evidencias</strong>. Si ya cargaste tu INE en tu perfil de Ciudadan, solo
        necesitaremos tu selfie.
      </Alert>

      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          disabled={cargando}
          onClick={guardar}
          sx={{ bgcolor: '#8A5CF5', '&:hover': { bgcolor: '#6A3FCB' }, fontWeight: 700 }}
        >
          {cargando ? 'Guardando…' : 'Guardar y continuar'}
        </Button>
      </Box>
    </TarjetaPaso>
  );
};

export default StepIdentidad;
