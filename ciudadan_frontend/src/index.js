// src/index.js
import React from 'react';
import ReactDOM from 'react-dom/client';
import { Box } from "@mui/material";
import PreLoader from './components/PreLoader.jsx';
import { useNavigate } from 'react-router-dom'
import { Auth0Provider, useAuth0 } from '@auth0/auth0-react';
import { AuthProvider } from './Contexts/AuthContext';
import { RolesProvider } from './Contexts/RolesContext';
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { BrowserRouter as Router, useLocation } from 'react-router-dom';
import { CartProvider }  from './Contexts/CartContext';
import NavBar from './components/NavBar/NavBar.jsx';
import Rutas from './Routes/index.jsx';
import Asistente from './components/Asistente/Asistente';
import { SnackbarProvider } from 'notistack';
import { NotificationsProvider } from './Contexts/NotificationsContext';
import './styles/index.css';

import AuthGate from './components/AuthGate.jsx';
import { Capacitor } from '@capacitor/core';
import { FoodCartProvider } from './Contexts/FoodCartContext.jsx';

const domain    = process.env.REACT_APP_AUTH0_DOMAIN;
const clientId  = process.env.REACT_APP_AUTH0_CLIENT_ID;
const audience  = process.env.REACT_APP_AUTH0_AUDIENCE;

// ==============================
// APP WRAPPER
// ==============================
const AppWrapper = () => {
  const { isLoading } = useAuth0();
  const location = useLocation();

  const hostname = window.location.hostname;
  const dominiosPrelanzamiento = [
    "taxis.ciudadan.org",
    "lideres.ciudadan.org",
    "socios.ciudadan.org",
  ];
  const isDomainPrelanzamiento = dominiosPrelanzamiento.includes(hostname);

  if (isLoading) {
    return <PreLoader />;
  }

  const isWikiRoute = location.pathname.startsWith('/wiki');
  const isPrelanzamiento = location.pathname.replace(/\/$/, '') === '/prelanzamiento' || isDomainPrelanzamiento;

  const sectionMap = {
    productos: 'market',
    contenido: 'contenidos',
    club: 'clubs',
    carrito: 'market',
    curso: 'cursos',
    referir: 'comunidad',
  };

  const pathSection = location.pathname.split('/').filter(Boolean)[0];
  const siteSection = sectionMap[pathSection] ?? pathSection ?? '';

  if (isDomainPrelanzamiento) {
    // Si viene por subdominio, forzamos la vista de Prelanzamiento
    // pero mantenemos el wrapper para consistencia de Providers si fuera necesario
    return <Rutas />; 
    // Nota: Rutas ya maneja la lógica de <Route path='/prelanzamiento' element={<Prelanzamiento />} />
    // pero para que el subdominio muestre Prelanzamiento sin que el usuario escriba /prelanzamiento,
    // necesitamos que Rutas sepa que debe renderizar Prelanzamiento.
    // Para evitar cambiar Rutas, podemos envolver el renderizado.
  }

  return (
    <Box
      id="ciudadan-app"
      sx={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        minHeight: "100dvh",
        overflowX: "clip",
      }}
    >
      {!isWikiRoute && !isPrelanzamiento && <NavBar siteSection={siteSection} />}

      <Box sx={{ flex: 1 }}>
        <Rutas />
        {!isPrelanzamiento && <AuthGate>
          <Asistente />
        </AuthGate>}
      </Box>

      {!isWikiRoute && !isPrelanzamiento && (
        <Box
          aria-hidden="true"
          sx={{
            width: "100%",
            flexShrink: 0,
            height: 88,
            pointerEvents: "none",
          }}
        />
      )}
    </Box>
  );
};

// ==============================
// AUTH0 PROVIDER (FIXED)
// ==============================
const Auth0ProviderWithNavigate = ({ children }) => {
  const navigate = useNavigate();

  const isNative = Capacitor.isNativePlatform();

  const redirectUri = isNative
    ? 'com.ciudadan.org://callback'
    : window.location.origin;

  const onRedirectCallback = (appState) => {
    navigate(appState?.returnTo || '/', { replace: true });
  };

  return (
    <Auth0Provider
      domain={domain}
      clientId={clientId}
      authorizationParams={{
        audience,
        scope: 'openid profile email offline_access',
      }}
      redirectUri={redirectUri}
      cacheLocation="localstorage"
      useRefreshTokens
      onRedirectCallback={onRedirectCallback}
    >
      {children}
    </Auth0Provider>
  );
};

// ==============================
// RENDER
// ==============================
const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <React.StrictMode>
    <Router>
      <Auth0ProviderWithNavigate>
        <AuthProvider>
          <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
            <RolesProvider>
              <NotificationsProvider>
                <CartProvider>
                  <FoodCartProvider>
                    <SnackbarProvider maxSnack={3} anchorOrigin={{ vertical: 'top', horizontal: 'right' }}>
                      <AppWrapper />
                    </SnackbarProvider>
                  </FoodCartProvider>
                </CartProvider>
              </NotificationsProvider>
            </RolesProvider>
          </LocalizationProvider>
        </AuthProvider>
      </Auth0ProviderWithNavigate>
    </Router>
  </React.StrictMode>
);
