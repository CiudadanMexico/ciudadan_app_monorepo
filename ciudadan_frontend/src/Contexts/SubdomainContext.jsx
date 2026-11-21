import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getCurrentSubdomain, setSubdomain, getSubdomainConfig, VALID_SUBDOMAINS } from '../utils/subdomain';

const SubdomainContext = createContext(null);

/**
 * Provider para el contexto de subdominio
 * Detecta automáticamente el subdominio y permite override en desarrollo
 */
export function SubdomainProvider({ children }) {
  const [subdomain, setSubdomainState] = useState(() => getCurrentSubdomain());
  const [config, setConfig] = useState(() => getSubdomainConfig(getCurrentSubdomain()));
  const [isReady, setIsReady] = useState(false);

  // Detectar subdominio al montar
  useEffect(() => {
    const detected = getCurrentSubdomain();
    setSubdomainState(detected);
    setConfig(getSubdomainConfig(detected));
    setIsReady(true);
  }, []);

  // Función para cambiar subdominio (solo en desarrollo local)
  const changeSubdomain = useCallback((newSubdomain) => {
    if (VALID_SUBDOMAINS.includes(newSubdomain)) {
      setSubdomain(newSubdomain);
      setSubdomainState(newSubdomain);
      setConfig(getSubdomainConfig(newSubdomain));
      // Recargar la página para aplicar el nuevo routing
      window.location.reload();
      return true;
    }
    return false;
  }, []);

  // Verificar si una ruta está permitida
  const isRouteAllowed = useCallback((path) => {
    return config.routes.length === 0 || config.routes.some(route => {
      const routePattern = route.path.replace(/:[^/]+/g, '[^/]+');
      const regex = new RegExp(`^${routePattern}(/|$)`);
      return regex.test(path);
    });
  }, [config]);

  // Obtener navegación filtrada por rol
  const getNavigation = useCallback((userRole) => {
    return config.navigation.filter(item => {
      if (!item.role) return true;
      return item.role === userRole || item.role === 'admin';
    });
  }, [config]);

  const value = {
    subdomain,
    config,
    isReady,
    changeSubdomain,
    isRouteAllowed,
    getNavigation,
  };

  return (
    <SubdomainContext.Provider value={value}>
      {children}
    </SubdomainContext.Provider>
  );
}

/**
 * Hook para usar el contexto de subdominio
 */
export function useSubdomain() {
  const context = useContext(SubdomainContext);
  if (!context) {
    throw new Error('useSubdomain must be used within a SubdomainProvider');
  }
  return context;
}

export default SubdomainContext;