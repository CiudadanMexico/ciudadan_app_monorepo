import React, { useCallback, useEffect, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { Box, Button, Chip, CircularProgress, Stack, Typography } from '@mui/material';
import { getUserSkills } from '../../services/cowork/queryServices';

/**
 * Skill-Token (Human Skill Proof): habilidades REALES asociadas al usuario.
 *
 * Fuente: `/api/users?filters[email][$eq]=...&populate[skills]=*` (misma vía que
 * usa RolesContext; en este proyecto los usuarios se devuelven en formato plano
 * —array— y no como { data: { attributes } }, por eso se normaliza con
 * tolerancia a ambas formas).
 *
 * Es informativo: la gestión administrativa de habilidades NO es el destino del
 * usuario común (spec sección 18), por eso la ficha no ofrece un CTA al panel de
 * gestión. Sin datos se muestra un vacío honesto, nunca datos falsos.
 */

const normalizarSkills = (json) => {
  const usuarios = Array.isArray(json) ? json : json?.data || [];
  const usuario = usuarios[0];
  if (!usuario) return [];

  const raw = usuario.skills ?? usuario.attributes?.skills;
  const items = Array.isArray(raw) ? raw : raw?.data || [];

  return items
    .map((item) => {
      const attrs = item?.attributes || item;
      return {
        id: item?.id ?? attrs?.id,
        name: attrs?.name || attrs?.nombre || null,
        description: attrs?.description || null,
      };
    })
    .filter((skill) => Boolean(skill.name));
};

const TokenSkills = ({ email, isAuthenticated }) => {
  const { getAccessTokenSilently } = useAuth0();
  const [skills, setSkills] = useState([]);
  const [estado, setEstado] = useState('idle'); // idle | loading | error | ok
  const [error, setError] = useState(null);

  const cargar = useCallback(async () => {
    if (!isAuthenticated || !email) {
      setSkills([]);
      setEstado('idle');
      return;
    }
    setEstado('loading');
    setError(null);
    try {
      const token = await getAccessTokenSilently({
        authorizationParams: { audience: 'https://api.ciudadan.org' },
      }).catch(() => null);
      const json = await getUserSkills(email, token);
      setSkills(normalizarSkills(json));
      setEstado('ok');
    } catch (err) {
      setError(err?.message || 'No se pudieron cargar tus habilidades');
      setSkills([]);
      setEstado('error');
    }
  }, [email, getAccessTokenSilently, isAuthenticated]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  if (!isAuthenticated) {
    return (
      <Typography sx={{ mt: 1, fontSize: 12, color: 'rgba(255,255,255,0.65)' }}>
        Inicia sesión para ver tus habilidades verificadas.
      </Typography>
    );
  }

  if (estado === 'loading' || estado === 'idle') {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
        <CircularProgress size={22} sx={{ color: '#2ee6c8' }} />
      </Box>
    );
  }

  if (estado === 'error') {
    return (
      <Box sx={{ mt: 1 }}>
        <Typography sx={{ fontSize: 12, color: '#ff8a8a' }}>{error}</Typography>
        <Button size="small" onClick={cargar} sx={{ mt: 0.5, color: '#c9b4ff', fontSize: 11 }}>
          Reintentar
        </Button>
      </Box>
    );
  }

  if (skills.length === 0) {
    return (
      <Box sx={{ mt: 1, textAlign: 'center' }}>
        <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>
          Todavía no tienes habilidades asociadas a tu perfil.
        </Typography>
        <Typography sx={{ fontSize: 11, mt: 0.5, color: 'rgba(255,255,255,0.6)' }}>
          Tus habilidades se acreditan con la actividad real dentro de Coowork: tareas completadas,
          evaluaciones recibidas y las verificaciones de área que ya existen.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 1, width: '100%' }}>
      <Chip
        size="small"
        label={`${skills.length} habilidad${skills.length === 1 ? '' : 'es'} en tu perfil`}
        sx={{ bgcolor: 'rgba(46,230,200,0.18)', color: '#8ee9d6', fontWeight: 700, mb: 1.5 }}
      />
      <Stack spacing={1} sx={{ maxHeight: 260, overflowY: 'auto', pr: 0.5 }}>
        {skills.map((skill) => (
          <Box
            key={skill.id}
            sx={{
              p: 1.5,
              borderRadius: 2,
              bgcolor: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              textAlign: 'left',
            }}
          >
            <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{skill.name}</Typography>
            {skill.description && (
              <Typography sx={{ fontSize: 12, mt: 0.5, color: 'rgba(255,255,255,0.75)' }}>
                {skill.description}
              </Typography>
            )}
          </Box>
        ))}
      </Stack>
    </Box>
  );
};

export default TokenSkills;
