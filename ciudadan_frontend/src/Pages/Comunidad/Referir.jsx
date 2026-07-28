// src/pages/Referir.jsx
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { useRoles } from '../../Contexts/RolesContext.jsx';
import { Box, CircularProgress, useMediaQuery, useTheme } from '@mui/material';

import Pestanas from '../../components/Pestanas';
import Referidos from './Referidos.jsx';
import HistorialPagosReferidos from './HistorialPagosReferidos.jsx';
import CodigoReferido from './CodigoReferido.jsx';

const basePrueba = '/referir';

const Referir = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isLoading } = useAuth0();
  const { isJardinero, userData } = useRoles();

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // tabs memoizados (fácil de extender según rol)
  const tabs = useMemo(() => {
    const base = [
      { label: 'Tu Código de Descuento', path: 'codigo' },
      { label: 'Historial de Referidos', path: 'referidos' },
      { label: 'Historial de Pagos', path: 'pagos' },
    ];

    // ejemplo: si quisieras cambiar tabs para jardineros:
    // if (isJardinero) { ... }

    return base;
  }, [isJardinero]);

  // índice activo de pestaña
  const [tabIndex, setTabIndex] = useState(0);

  /**
   * Sincroniza tabIndex con la URL.
   * - Si la URL contiene /referir/<path> -> selecciona la pestaña correspondiente
   * - Si estamos en /referir o no se encuentra el segmento -> 0 (codigo)
   */
  useEffect(() => {
    const fullPath = (location.pathname || '').toLowerCase();
    const rel = fullPath.startsWith(basePrueba) ? fullPath.slice(basePrueba.length) : fullPath;
    const segments = rel.split('/').filter(Boolean); // ej: ['codigo'] o []

    if (segments.length === 0) {
      // raíz -> default a 'codigo' (índice 0)
      setTabIndex(0);
      return;
    }

    const seg = segments[0];
    const found = tabs.findIndex((t) => t.path === seg);
    if (found !== -1) {
      setTabIndex(found);
    } else {
      // si no coincide con ninguna ruta conocida, mantener el índice actual
      // o forzar a 0 para evitar estados incoherentes:
      setTabIndex(0);
    }
  }, [location.pathname, tabs]);

  // handler para cuando el usuario cambia pestaña desde la UI (Pestanas)
  const onTabChange = useCallback(
    (newIndex) => {
      if (!tabs[newIndex]) return;
      setTabIndex(newIndex);
      const nextPath = `${basePrueba}/${tabs[newIndex].path}`;
      // navegamos sin replace para que el usuario pueda usar back
      navigate(nextPath);
    },
    [navigate, tabs]
  );

  // Esperar Auth0 + datos de roles antes de renderizar
  if (isLoading || !userData) {
    return (
      <Box
        sx={{
          width: '100%',
          minHeight: '200px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          py: 4,
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  // render
  return (
    <Box
      component="main"
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column-reverse', md: 'row' },
        gap: { xs: 3, md: 4 },
        px: { xs: 2, md: 3 },
        py: { xs: 2, md: 4 },
        width: '100%',
        maxWidth: '100%',
        overflowX: 'hidden',
        boxSizing: 'border-box',
        // si tu NavBar es fixed, puedes compensar con pt en xs:
        // pt: { xs: '72px', md: 0 },
      }}
    >
      <Box
        sx={{
          flex: '1 1 100%',
          maxWidth: '100%',
          width: '100%',
        }}
      >
        <Pestanas
          tabs={tabs}
          basePath={basePrueba}
          onTabChange={onTabChange}
          collapseAt={640}
          activeIndex={tabIndex}
        />

        <Box sx={{ width: '100%', overflowX: 'hidden', mt: 2 }}>
          {tabs[tabIndex]?.path === 'codigo' && <CodigoReferido />}

          {tabs[tabIndex]?.path === 'referidos' && <Referidos />}

          {tabs[tabIndex]?.path === 'pagos' && <HistorialPagosReferidos user={user} />}
        </Box>
      </Box>
    </Box>
  );
};

export default Referir;
