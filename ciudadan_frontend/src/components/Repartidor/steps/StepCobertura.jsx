import React, { useEffect, useState } from 'react';
import {
  Alert, Box, Button, Card, CardActionArea, Checkbox, FormControlLabel, MenuItem, TextField, Typography,
} from '@mui/material';
import repartidorService from '../../../services/Repartidor/repartidorService';
import { TarjetaPaso } from '../helpers';

const CIUDADES = [{ id: 'CDMX', label: 'Ciudad de México (CDMX)' }];

/**
 * Paso 1 (spec §6.2 y §12A): confirmar ciudad de operación, resolver las
 * agencias ACTIVAS elegibles con el servicio del backend (nunca GPS ni ids
 * arbitrarios) y fijar la afiliación del expediente. Sin cobertura: lista de
 * espera voluntaria (solo email de sesión + consentimiento) y ALTO.
 */
const StepCobertura = ({ token, me, recargar, siguiente, toast }) => {
  const [territory, setTerritory] = useState('CDMX');
  const [cobertura, setCobertura] = useState(null);
  const [agencia, setAgencia] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [enWaitlist, setEnWaitlist] = useState(false);
  const [city, setCity] = useState('');
  const [municipality, setMunicipality] = useState('');
  const [consent, setConsent] = useState(false);

  useEffect(() => {
    let vivo = true;
    repartidorService
      .obtenerCobertura(token, 'CDMX')
      .then((resp) => { if (vivo) setCobertura(resp); })
      .catch((e) => { if (vivo) setCobertura({ error: e.message }); });
    return () => { vivo = false; };
  }, [token]);

  const iniciar = async () => {
    setCargando(true);
    try {
      await repartidorService.iniciarExpediente(token, { agency_id: agencia, territory });
      await recargar();
      toast?.success('Expediente iniciado. Ahora completa tu identidad.');
      siguiente(1);
    } catch (e) {
      toast?.error(e.message);
    } finally {
      setCargando(false);
    }
  };

  const suscribir = async () => {
    setCargando(true);
    try {
      await repartidorService.suscribirWaitlist(token, { city, municipality, consent });
      toast?.success('¡Listo! Te avisaremos cuando abramos cobertura en tu ciudad.');
      setEnWaitlist(true);
    } catch (e) {
      toast?.error(e.message);
    } finally {
      setCargando(false);
    }
  };

  if (cobertura?.error) {
    return <Alert severity="error">{cobertura.error}</Alert>;
  }

  if (!cobertura) return <Typography variant="body2">Consultando cobertura…</Typography>;

  return (
    <TarjetaPaso titulo="1. Ciudad de operación y agencia">
      <Typography variant="body2" sx={{ mb: 2, color: 'rgba(255,255,255,0.8)' }}>
        El MVP de repartidores arranca en CDMX con bici o motocicleta. Tu expediente queda
        afiliado a la agencia local que elijas; es la agencia quien revisa y aprueba.
      </Typography>

      <TextField
        select
        fullWidth
        label="Ciudad de operación"
        value={territory}
        onChange={(e) => setTerritory(e.target.value)}
        sx={{ mb: 3, maxWidth: 360 }}
        disabled
      >
        {CIUDADES.map((c) => (
          <MenuItem key={c.id} value={c.id}>{c.label}</MenuItem>
        ))}
      </TextField>

      {cobertura.data?.length > 0 ? (
        <>
          <Typography variant="subtitle2" sx={{ mb: 1, color: '#8A5CF5' }}>
            Agencias activas con cobertura ({cobertura.data.length})
          </Typography>
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' } }}>
            {cobertura.data.map((a) => (
              <Card
                key={a.id}
                variant="outlined"
                sx={{
                  borderColor: agencia === a.id ? '#8A5CF5' : 'rgba(255,255,255,0.15)',
                  bgcolor: agencia === a.id ? 'rgba(138,92,245,0.15)' : 'transparent',
                }}
              >
                <CardActionArea onClick={() => setAgencia(a.id)} sx={{ p: 2 }}>
                  <Typography variant="subtitle1" sx={{ color: '#fff', fontWeight: 600 }}>
                    {a.nombre}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                    Agencia local Ciudadan · CDMX
                  </Typography>
                </CardActionArea>
              </Card>
            ))}
          </Box>
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              disabled={!agencia || cargando || (me?.exists && me.data.status !== 'draft')}
              onClick={iniciar}
              sx={{ bgcolor: '#8A5CF5', '&:hover': { bgcolor: '#6A3FCB' }, fontWeight: 700 }}
            >
              {me?.exists ? 'Expediente ya iniciado — continuar' : cargando ? 'Iniciando…' : 'Iniciar mi expediente'}
            </Button>
          </Box>
        </>
      ) : (
        <Box>
          <Alert severity="info" sx={{ mb: 2 }}>
            Aún no hay agencia activa con cobertura para esta ciudad. Déjanos tu correo y te
            avisaremos en cuanto abramos: <strong>no te pedimos INE, CURP ni CLABE</strong> por ahora.
          </Alert>
          {enWaitlist ? (
            <Alert severity="success">Ya estás en la lista de espera. Puedes cerrar esta pantalla.</Alert>
          ) : (
            <Box sx={{ display: 'grid', gap: 2, maxWidth: 420 }}>
              <TextField
                label="Ciudad (y alcaldía/municipio, opcional)"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="CDMX, Coyoacán"
              />
              <TextField
                label="Alcaldía / municipio"
                value={municipality}
                onChange={(e) => setMunicipality(e.target.value)}
                placeholder="Opcional"
              />
              <FormControlLabel
                control={
                  <Checkbox checked={consent} onChange={(e) => setConsent(e.target.checked)} />
                }
                label="Acepto que Ciudadan me avise por correo cuando haya cobertura de repartidores en mi ciudad."
              />
              <Button
                variant="contained"
                disabled={!city || !consent || cargando}
                onClick={suscribir}
                sx={{ bgcolor: '#8A5CF5', '&:hover': { bgcolor: '#6A3FCB' }, fontWeight: 700 }}
              >
                Unirme a la lista de espera
              </Button>
            </Box>
          )}
        </Box>
      )}
    </TarjetaPaso>
  );
};

export default StepCobertura;
