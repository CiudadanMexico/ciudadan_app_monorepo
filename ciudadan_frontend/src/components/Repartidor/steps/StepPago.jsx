import React, { useState } from 'react';
import {
  Alert, Box, Button, Checkbox, FormControlLabel, Grid2 as Grid, TextField, Typography, Link,
} from '@mui/material';
import repartidorService from '../../../services/Repartidor/repartidorService';
import { TarjetaPaso } from '../helpers';

/**
 * Paso 5 (spec §6.8, decisiones 11/12): CLABE con dígito de control (validada
 * y CIFRADA en el backend; aquí solo se captura) + titular declarado +
 * aceptación del convenio y aviso de privacidad. En este módulo no se reciben
 * ni transfieren fondos.
 */
const StepPago = ({ token, me, recargar, siguiente, toast }) => {
  const d = me?.data || {};
  const payout = d.payout || {};

  const [clabe, setClabe] = useState('');
  const [titular, setTitular] = useState(payout.account_holder_name || '');
  const [acepta, setAcepta] = useState(Boolean(d.terms?.terms_accepted_at));
  const [cargando, setCargando] = useState(false);

  const guardar = async () => {
    setCargando(true);
    try {
      const campos = { account_holder_name: titular, accept_terms: true };
      if (clabe.replace(/\s/g, '').length > 0) campos.payout_clabe = clabe.replace(/\s/g, '');
      await repartidorService.actualizarExpediente(token, campos);
      await recargar();
      toast?.success('CLABE y términos guardados');
      siguiente(5);
    } catch (e) {
      toast?.error(e.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <TarjetaPaso titulo="5. CLABE y términos">
      <Typography variant="body2" sx={{ mb: 2, color: 'rgba(255,255,255,0.8)' }}>
        La CLABE es requisito para que tu agencia pueda aprobar tu expediente. Se guarda
        <strong> cifrada</strong>: nadie la ve completa (solo sus últimos 4 dígitos) y jamás
        aparece en notificaciones. Este módulo no mueve fondos.
      </Typography>

      {payout.clabe_last4 && (
        <Alert severity="success" sx={{ mb: 2 }}>
          CLABE registrada: •••• •••• •••• {payout.clabe_last4}
          {payout.payment_validation_status === 'formato_valido' ? ' (formato validado ✓)' : ''}
        </Alert>
      )}

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            fullWidth
            label="CLABE (18 dígitos)"
            value={clabe}
            onChange={(e) => setClabe(e.target.value.replace(/[^\d]/g, '').slice(0, 18))}
            placeholder="002180000123456789"
            inputProps={{ inputMode: 'numeric' }}
            helperText="Validamos longitud y dígito de control; la titularidad no se presume verificada."
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            fullWidth
            label="Titular de la cuenta (como aparece en tu banco)"
            value={titular}
            onChange={(e) => setTitular(e.target.value)}
          />
        </Grid>
      </Grid>

      <FormControlLabel
        sx={{ mt: 3, alignItems: 'flex-start' }}
        control={<Checkbox checked={acepta} onChange={(e) => setAcepta(e.target.checked)} />}
        label={
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.85)' }}>
            Acepto el convenio de repartidores y el aviso de privacidad de Ciudadan. Entiendo
            que la aprobación documental <strong>no implica</strong> por sí sola conformidad
            laboral ni fiscal, y que la alta no me cobra membresía alguna.
          </Typography>
        }
      />
      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', display: 'block', ml: 4 }}>
        Versión del convenio: repartidores-mvp-v1 · Consulta el aviso completo en{' '}
        <Link href="https://ciudadan.org" target="_blank" rel="noopener" sx={{ color: '#8A5CF5' }}>
          ciudadan.org
        </Link>
      </Typography>

      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          disabled={cargando || !acepta || (!titular.trim() && !payout.account_holder_name)}
          onClick={guardar}
          sx={{ bgcolor: '#8A5CF5', '&:hover': { bgcolor: '#6A3FCB' }, fontWeight: 700 }}
        >
          {cargando ? 'Guardando…' : 'Guardar y continuar'}
        </Button>
      </Box>
    </TarjetaPaso>
  );
};

export default StepPago;
