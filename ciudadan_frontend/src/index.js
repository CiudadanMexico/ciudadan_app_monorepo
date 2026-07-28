// src/index.js
import React, { useEffect, useState } from 'react';
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

const domain    = process.env.REACT_APP_AUTH0_DOMAIN;
const clientId  = process.env.REACT_APP_AUTH0_CLIENT_ID;
const audience  = process.env.REACT_APP_AUTH0_AUDIENCE;

// ==============================
// APP WRAPPER
// ==============================
const AppWrapper = () => {
  const { isLoading } = useAuth0();
  const location = useLocation();

  if (isLoading) {
    return <PreLoader />;
  }

  const isWikiRoute = location.pathname.startsWith('/wiki');

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

  return (
    <Box
      id="ciudadan-app"
      sx={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        minHeight: "100dvh",
        overflowX: "hidden",
      }}
    >
      {!isWikiRoute && <NavBar siteSection={siteSection} />}

      <Box sx={{ flex: 1 }}>
        <Rutas />
        <AuthGate>
          <Asistente />
        </AuthGate>
      </Box>
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
        scope: 'openid profile email',
        redirect_uri: redirectUri,
      }}
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
                    <SnackbarProvider maxSnack={3} anchorOrigin={{ vertical: 'top', horizontal: 'right' }}>
                      <AppWrapper />
                    </SnackbarProvider>
                  </CartProvider>
                </NotificationsProvider>
            </RolesProvider>
          </LocalizationProvider>
        </AuthProvider>
      </Auth0ProviderWithNavigate>
    </Router>
  </React.StrictMode>
);