// src/components/Membresias/MiMembresia.jsx
import React, { useEffect, useState } from 'react';
import { Box, Typography, List, ListItem, Divider, CircularProgress } from '@mui/material';
import { useRoles } from '../../Contexts/RolesContext';
import PreLoader from '../PreLoader';
import BotonMembresia from './BotonMembresia'; // tu componente de Stripe

const MiMembresia = () => {
  // HOOKS: siempre al inicio
  const { membresia } = useRoles();
  const [tipoData, setTipoData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Helper para construir URL Strapi
  const buildStrapiUrl = (path) => {
    const base = (process.env.REACT_APP_STRAPI_URL || '').replace(/\/+$/, '');
    if (!base) return path;
    if (!path) return base;
    if (path.startsWith('http')) return path;
    return `${base}${path.startsWith('/') ? '' : '/'}${path}`;
  };

  // useEffect declarado incondicionalmente (no después de un return)
  useEffect(() => {
    const tipo = membresia?.tipo;
    // guardia interna: si no hay tipo, limpiamos y no hacemos fetch
    if (!tipo) {
      setTipoData(null);
      setLoading(false);
      setError(null);
      return;
    }

    let mounted = true;
    const fetchTipos = async () => {
      setLoading(true);
      setError(null);
      try {
        const url = buildStrapiUrl('/api/membresias-tipos?populate=pic');
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Error al pedir membresías: ${res.status}`);
        const json = await res.json();
        const items = Array.isArray(json.data) ? json.data : [];

        const claveBuscada = String(tipo || '').trim().toLowerCase();
        const match = items.find((it) => {
          const attrs = it.attributes || {};
          const tipoAttr = String(attrs.tipo ?? '').trim().toLowerCase();
          const nombreAttr = String(attrs.nombre ?? '').trim().toLowerCase();
          const raw = JSON.stringify(attrs).toLowerCase();
          return (
            (tipoAttr && tipoAttr === claveBuscada) ||
            (nombreAttr && nombreAttr === claveBuscada) ||
            (claveBuscada && raw.includes(claveBuscada))
          );
        });

        if (mounted) setTipoData(match ? (match.attributes || match) : null);
      } catch (err) {
        console.error(err);
        if (mounted) setError(err.message || 'Error desconocido');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchTipos();
    return () => {
      mounted = false;
    };
  }, [membresia?.tipo]); // dependemos de membresia?.tipo

  // ahora el return temprano (hooks ya se declararon)
  if (!membresia) return null;

  const { plan, tipo, monto_pagado, fechaInicio, fechaFin } = membresia;

  // Normalizar nombre del plan
  const planKey = plan?.charAt(0).toUpperCase() + plan?.slice(1).toLowerCase();

  const mapPlanName = (tipo) => {
    const mapa = {
      sencilla: 'Miembro de Club de Cultivo Solidario de Interior de 3 Plantas',
      doble: 'Miembro de Club de Cultivo Solidario de Interior de 6 Plantas',
      jardinero: 'Jardinero de Club Solidario de Cultivo',
      consumo: 'Red de Clubs de Consumo',
    };
    const clave = tipo?.toString()?.trim()?.toLowerCase();
    return mapa[clave] || tipo || 'Tipo desconocido';
  };

  // Siguiente nivel (si aplica)
  const next = {
    Mensual: {
      label: 'Escalar a Semestral',
      priceId: process.env.REACT_APP_STRIPE_PRICE_ID_SEMESTRAL,
    },
    Semestral: {
      label: 'Escalar a Anual',
      priceId: process.env.REACT_APP_STRIPE_PRICE_ID_ANUAL,
    },
  }[planKey];

  const beneficiosPorPlan = {
    Mensual: [
      'Acceso a clubes',
      'Descuentos exclusivos',
      'Contenido premium / secciones exclusivas de la wiki',
      'Asesoría básica legal',
      'Vende en nuestra marketplace',
      'Publica Anuncios/Contenidos/Eventos hasta 10 GB mensual',
      'Gana 15% de comisión por tus referidos',
    ],
    Semestral: [
      'Todo lo anterior',
      'Acceso a red de cultivo solidario',
      'Tramitamos tu permiso COFEPRIS, en caso de negativa',
    ],
    Anual: [
      'Si mantienes tu plan semestral por 2 semestres o contratas la anual, pagas solo $1 500 por tu amparo',
      'Te acompañamos hasta obtención de negativa de COFEPRIS (4–6 meses)',
    ],
  };

  // Resolver URL de la imagen 'pic' (soporta distintos formatos de respuesta de Strapi)
  const imageUrl = (() => {
    const candidates = [
      tipoData?.pic?.data?.attributes?.url,
      tipoData?.pic?.url,
      tipoData?.attributes?.pic?.data?.attributes?.url,
      tipoData?.attributes?.pic?.url,
    ];
    const pic = candidates.find(Boolean) || null;
    if (!pic) return null;
    return pic.startsWith('http') ? pic : buildStrapiUrl(pic);
  })();

  // beneficios preferidos desde Strapi (si existen) o fallback local
  const beneficios =
    tipoData?.beneficios ||
    tipoData?.attributes?.beneficios ||
    beneficiosPorPlan[planKey] ||
    [];

  return (
    <Box p={3} maxWidth={800} margin="0 auto">
      <Box display="flex" alignItems="center" gap={2}>
        {loading ? (
          <PreLoader text=" " size={48} />
        ) : (
          <Box
            component="img"
            src={imageUrl || '/guest.png'}
            alt={mapPlanName(tipo)}
            sx={{ width: 96, height: 96, objectFit: 'cover', borderRadius: 2, border: '1px solid #ddd' }}
          />
        )}

        <Box>
          <Typography variant="h5">Mi Membresía</Typography>
          <Typography variant="h6">
            {planKey} — {mapPlanName(tipo)}
          </Typography>
          <Typography variant="body2">
            Pagaste <strong>${monto_pagado}</strong> el{' '}
            {new Date(fechaInicio).toLocaleDateString()} —{' '}
            {new Date(fechaFin).toLocaleDateString()}
          </Typography>
        </Box>
      </Box>

      <Divider sx={{ my: 2 }} />

      {error ? (
        <Typography color="error">No se pudieron cargar los datos de la membresía: {error}</Typography>
      ) : (
        <>
          <Typography variant="h6">Beneficios incluidos</Typography>
          <List dense>
            {Array.isArray(beneficios) && beneficios.length > 0 ? (
              beneficios.map((b, i) => (
                <ListItem key={i}>
                  <span className="material-icons" style={{ marginRight: 8, color: '#4caf50' }}>
                    check_circle
                  </span>
                  <span>{b}</span>
                </ListItem>
              ))
            ) : (
              <ListItem>No hay beneficios listados para este tipo de membresía.</ListItem>
            )}
          </List>

          <Box mt={4} display="flex" gap={2}>
            <BotonMembresia priceId={process.env.REACT_APP_STRIPE_PRICE_ID_MENSUAL} color="#A3D977" label="Renovar" />
            {next && <BotonMembresia priceId={next.priceId} color="#1976d2" label={next.label} />}
          </Box>
        </>
      )}
    </Box>
  );
};

export default MiMembresia;
