import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useRoles } from '../Contexts/RolesContext.jsx';

import Conductor from '../components/Taxis/Conductor.jsx';
import Pasajero from '../components/Taxis/Pasajero.jsx';
import Invitado from '../components/Taxis/Invitado.jsx';

import { Box, CircularProgress, Typography } from '@mui/material';
import { motion } from 'framer-motion';

const TaxisRoute = () => {
  const location = useLocation();
  const { roles, fetchRolesYMembresia } = useRoles();

  // 🔥 Normalización segura SIEMPRE
  const actualRoles = Array.isArray(roles)
    ? roles
    : Array.isArray(roles?.roles)
      ? roles.roles
      : [];

  const [activeTab, setActiveTab] = useState(null);
  const [showTabs, setShowTabs] = useState(false);
  const [hideTabs, setHideTabs] = useState(false);
  const [shiftToPasajero, setShiftToPasajero] = useState(false);

  const routeRepeat = location.state?.routeRepeat || 0;

  // ============================
  // 🔥 FETCH CONTROLADO (SIN LOOP)
  // ============================
  useEffect(() => {
    if (roles === undefined) {
      fetchRolesYMembresia();
    }
  }, [roles, fetchRolesYMembresia]);

  // ============================
  // 🔥 LÓGICA PRINCIPAL
  // ============================
  useEffect(() => {
    if (!actualRoles.length) return;

    // Tabs toggle controlado
    setShowTabs(routeRepeat % 2 === 0);

    if (shiftToPasajero) {
      setActiveTab('pasajero');
      setShowTabs(true);
      setShiftToPasajero(false);
      return;
    }

    // 🔥 PRIORIDAD: conductor
    if (actualRoles.includes('conductor')) {
      setActiveTab((prev) => prev || 'conductor');
    } else if (actualRoles.includes('pasajero')) {
      setActiveTab('pasajero');
    }
  }, [actualRoles, routeRepeat, shiftToPasajero]);

  // ============================
  // 🔥 LOADING REAL
  // ============================
  const isLoading = roles === undefined;

  if (isLoading) {
    return (
      <Box
        sx={{
          width: '100%',
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <CircularProgress size={56} />
          <Typography sx={{ mt: 2 }}>Verificando permisos...</Typography>
        </motion.div>
      </Box>
    );
  }

  // ============================
  // 🔥 INVITADO (CLARO Y DIRECTO)
  // ============================
  const isConductor = actualRoles.includes('conductor');
  const isPasajero = actualRoles.includes('pasajero');

  if (!isConductor && !isPasajero) {
    return <Invitado />;
  }

  // ============================
  // 🔥 RENDER PRINCIPAL
  // ============================
  return (
    <div style={{ width: '90%', height: '100vh', padding: '20px' }}>
      {/* Tabs SOLO si es conductor */}
      {isConductor && showTabs && !hideTabs && (
        <div
          style={{
            display: 'flex',
            borderBottom: '2px solid #ccc',
            marginBottom: '20px',
          }}
        >
          <button
            onClick={() => setActiveTab('pasajero')}
            style={{
              flex: 1,
              padding: '10px',
              background: activeTab === 'pasajero' ? '#fff200' : '#fff',
            }}
          >
            Pasajero
          </button>

          <button
            onClick={() => setActiveTab('conductor')}
            style={{
              flex: 1,
              padding: '10px',
              background: activeTab === 'conductor' ? '#fff200' : '#fff',
            }}
          >
            Conductor
          </button>
        </div>
      )}

      {/* 🔥 LÓGICA LIMPIA */}
      {isConductor ? (
        activeTab === 'pasajero' ? (
          <Pasajero
            setHideTabs={setHideTabs}
            setShowTabs={setShowTabs}
            showTabs={showTabs}
            hideTabs={hideTabs}
            setActiveTab={setActiveTab}
          />
        ) : (
          <Conductor
            setHideTabs={setHideTabs}
            setShowTabs={setShowTabs}
            showTabs={showTabs}
            hideTabs={hideTabs}
            setActiveTab={setActiveTab}
            shiftToPasajero={shiftToPasajero}
            setShiftToPasajero={setShiftToPasajero}
          />
        )
      ) : (
        <Pasajero />
      )}
    </div>
  );
};

export default TaxisRoute;
