import React, { useCallback, useEffect, useState } from 'react';
import { Box, Paper, Typography, List, ListItem, ListItemText, Grid2 as Grid, CircularProgress, Alert } from '@mui/material';
import { motion } from 'framer-motion';
import { useAuth0 } from '@auth0/auth0-react';
import { getMiembrosAgencia } from '../../services/cowork/queryServices.js';

const darkGray = '#002200';
const neonGreen = '#00ff99';

const ReputacionStat = ({ label, value }) => (
  <Grid size={{ xs: 6, sm: 4 }}>
    <Box sx={{ textAlign: 'center' }}>
      <Typography variant="h5" fontWeight={800} sx={{ color: neonGreen }}>
        {value}
      </Typography>
      <Typography variant="caption" sx={{ opacity: 0.75 }}>
        {label}
      </Typography>
    </Box>
  </Grid>
);

export default function Agencia() {
  const { getAccessTokenSilently } = useAuth0();
  const [agencia, setAgencia] = useState(null);
  const [miembros, setMiembros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const getToken = useCallback(async () => {
    try {
      return await getAccessTokenSilently({
        authorizationParams: { audience: 'https://api.ciudadan.org' },
      });
    } catch (e) {
      console.warn('No se pudo obtener token Auth0:', e.message);
      return null;
    }
  }, [getAccessTokenSilently]);

  useEffect(() => {
    let cancelado = false;
    const cargar = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = await getToken();
        const res = await getMiembrosAgencia(token);
        if (cancelado) return;
        setAgencia(res?.agencia || null);
        setMiembros(Array.isArray(res?.data) ? res.data : []);
      } catch (err) {
        if (!cancelado) setError(err.message || 'No se pudo cargar tu agencia');
      } finally {
        if (!cancelado) setLoading(false);
      }
    };
    cargar();
    return () => {
      cancelado = true;
    };
  }, [getToken]);

  const reputacion = agencia?.reputacion;

  return (
    <Box sx={{ p: 3, maxWidth: 900, mx: 'auto' }}>
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress sx={{ color: neonGreen }} />
          </Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : !agencia ? (
          <Alert severity="info">Tu cuenta no tiene una agencia asignada.</Alert>
        ) : (
          <Grid container spacing={3}>
            <Grid size={12}>
              <Paper elevation={6} sx={{ p: 4, borderRadius: 3, bgcolor: darkGray, color: '#fff' }}>
                <Typography variant="h5" fontWeight={700}>
                  {agencia.nombre}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.7, mb: 3 }}>
                  Reputación de la agencia (solo lectura — calculada por el módulo de verificación)
                </Typography>

                <Grid container spacing={2}>
                  <ReputacionStat label="Verificaciones" value={reputacion?.total_verifications ?? 0} />
                  <ReputacionStat label="Auditadas" value={reputacion?.total_audited ?? 0} />
                  <ReputacionStat label="Conformes" value={reputacion?.conforming ?? 0} />
                  <ReputacionStat label="Inconsistencias" value={reputacion?.inconsistencies ?? 0} />
                  <ReputacionStat label="Hallazgos críticos" value={reputacion?.critical_findings ?? 0} />
                  <ReputacionStat label="Re-verificaciones" value={reputacion?.reverifications ?? 0} />
                </Grid>

                <Box sx={{ mt: 3, textAlign: 'center' }}>
                  <Typography variant="overline" sx={{ opacity: 0.75 }}>
                    Trust score
                  </Typography>
                  <Typography variant="h3" fontWeight={800} sx={{ color: neonGreen }}>
                    {Number(reputacion?.trust_score ?? 0).toFixed(1)}
                  </Typography>
                </Box>
              </Paper>
            </Grid>

            <Grid size={12}>
              <Paper elevation={6} sx={{ p: 4, borderRadius: 3, bgcolor: darkGray, color: '#fff' }}>
                <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
                  Miembros de la agencia
                </Typography>
                {miembros.length === 0 ? (
                  <Typography sx={{ opacity: 0.7 }}>No hay socios en esta agencia todavía.</Typography>
                ) : (
                  <List>
                    {miembros.map((m) => (
                      <ListItem key={m.id} sx={{ bgcolor: '#003300', mb: 1, borderRadius: 1 }}>
                        <ListItemText primary={m.email} secondary={m.username !== m.email ? m.username : null} />
                      </ListItem>
                    ))}
                  </List>
                )}
              </Paper>
            </Grid>
          </Grid>
        )}
      </motion.div>
    </Box>
  );
}
