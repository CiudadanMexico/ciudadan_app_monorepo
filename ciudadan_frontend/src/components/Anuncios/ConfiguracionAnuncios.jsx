import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  Typography,
  Switch,
  Stack,
  Checkbox,
  FormControlLabel,
  Button,
  CircularProgress,
  useMediaQuery
} from '@mui/material';
import { motion } from 'framer-motion';
import { useRoles } from '../../Contexts/RolesContext';

/*
=====================================================
CONFIGURACIÓN DE ANUNCIOS – USERS.SETTINGS (STRAPI)
=====================================================

Estructura esperada en users.settings (JSON):

{
  "anuncios": {
    "activo": true,               // ON / OFF global de anuncios
    "stats": {
      "enabled": true,            // Si recibe estadísticas
      "channels": {
        "email": true,            // Recibir por email
        "whatsapp": false         // Recibir por WhatsApp
      }
    }
  }
}

Este diseño permite:
- Activar/desactivar todo sin borrar preferencias
- Agregar nuevos canales en el futuro (sms, push, etc.)
- Mantener backward compatibility
*/

const STRAPI = process.env.REACT_APP_STRAPI_URL;

/* =====================================================
   HELPERS
===================================================== */

/**
 * Normaliza settings del usuario y aplica defaults
 */
const getAnunciosSettings = (settings = {}) => {
  return {
    activo: settings?.anuncios?.activo ?? true,
    statsEnabled: settings?.anuncios?.stats?.enabled ?? false,
    channels: {
      email: settings?.anuncios?.stats?.channels?.email ?? false,
      whatsapp: settings?.anuncios?.stats?.channels?.whatsapp ?? false
    }
  };
};

/**
 * Construye el payload final para guardar en Strapi
 */
const buildSettingsPayload = (currentSettings, anunciosState) => {
  return {
    ...currentSettings,
    anuncios: {
      activo: anunciosState.activo,
      stats: {
        enabled: anunciosState.statsEnabled,
        channels: {
          email: anunciosState.channels.email,
          whatsapp: anunciosState.channels.whatsapp
        }
      }
    }
  };
};

/* =====================================================
   COMPONENTE
===================================================== */

export default function ConfiguracionAnuncios() {
  const { userData, fetchRolesYMembresia } = useRoles();
  const isMobile = useMediaQuery('(max-width:600px)');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [activo, setActivo] = useState(true);
  const [statsEnabled, setStatsEnabled] = useState(false);
  const [channels, setChannels] = useState({
    email: false,
    whatsapp: false
  });

  /* ================= CARGA INICIAL ================= */

  useEffect(() => {
    if (!userData) return;

    const parsed = getAnunciosSettings(userData.settings);
    setActivo(parsed.activo);
    setStatsEnabled(parsed.statsEnabled);
    setChannels(parsed.channels);

    setLoading(false);
  }, [userData]);

  /* ================= GUARDAR ================= */

  const guardarConfiguracion = async () => {
    if (!userData?.id) return;

    setSaving(true);
    try {
      const payload = buildSettingsPayload(userData.settings || {}, {
        activo,
        statsEnabled,
        channels
      });

      await fetch(`${STRAPI}/api/users/${userData.id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: payload })
      });

      // Refresca userData en el contexto
      await fetchRolesYMembresia(true);
    } catch (e) {
      console.error('Error guardando configuración de anuncios', e);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box py={8} textAlign="center">
        <CircularProgress sx={{ color: '#7c4dff' }} />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        maxWidth: 900,
        mx: 'auto',
        px: 2,
        py: 4
      }}
    >
      {/* ================= ESTADO GENERAL ================= */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1 }}>
        <Card
          sx={{
            mb: 4,
            p: 3,
            borderRadius: '24px',
            border: '2px solid',
            borderColor: activo ? '#00e676' : '#ff5252',
            boxShadow: activo
              ? '0 0 28px rgba(0,230,118,0.45)'
              : '0 0 28px rgba(255,82,82,0.45)',
            background: 'linear-gradient(135deg, #ffffff, #f6f4ff)'
          }}
        >
          <Stack
            direction={isMobile ? 'column' : 'row'}
            spacing={3}
            alignItems="center"
            justifyContent="space-between"
          >
            <Box>
              <Typography
                variant="h5"
                fontWeight={900}
                color={activo ? '#2e7d32' : '#c62828'}
              >
                Anuncios {activo ? 'ACTIVOS' : 'PAUSADOS'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Control general de publicación de anuncios
              </Typography>
            </Box>

            <Switch
              checked={activo}
              onChange={(e) => setActivo(e.target.checked)}
              sx={{ transform: 'scale(1.4)' }}
            />
          </Stack>
        </Card>
      </motion.div>

      {/* ================= ESTADÍSTICAS ================= */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        <Card
          sx={{
            p: 3,
            borderRadius: '24px',
            background: 'linear-gradient(135deg, #f3e5f5, #ffffff)',
            boxShadow: '0 12px 30px rgba(124,77,255,0.25)'
          }}
        >
          <Typography variant="h6" fontWeight={800} color="#5e35b1">
            Estadísticas semanales
          </Typography>

          <Typography variant="body2" mb={3}>
            Elige cómo quieres recibir el resumen semanal de tus anuncios.
          </Typography>

          <Switch
            checked={statsEnabled}
            onChange={(e) => setStatsEnabled(e.target.checked)}
            sx={{ mb: 2 }}
          />

          {statsEnabled && (
            <Stack spacing={1}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={channels.email}
                    onChange={(e) =>
                      setChannels((c) => ({
                        ...c,
                        email: e.target.checked
                      }))
                    }
                  />
                }
                label="Recibir por Email"
              />

              <FormControlLabel
                control={
                  <Checkbox
                    checked={channels.whatsapp}
                    onChange={(e) =>
                      setChannels((c) => ({
                        ...c,
                        whatsapp: e.target.checked
                      }))
                    }
                  />
                }
                label="Recibir por WhatsApp"
              />
            </Stack>
          )}
        </Card>
      </motion.div>

      {/* ================= GUARDAR ================= */}
      <Box textAlign="right" mt={4}>
        <Button
          onClick={guardarConfiguracion}
          disabled={saving}
          sx={{
            px: 4,
            py: 1.5,
            borderRadius: '14px',
            fontWeight: 900,
            color: '#fff',
            background: 'linear-gradient(90deg, #7c4dff, #00e676)',
            boxShadow: '0 0 20px rgba(124,77,255,0.6)'
          }}
        >
          {saving ? 'Guardando…' : 'Guardar configuración'}
        </Button>
      </Box>
    </Box>
  );
}
