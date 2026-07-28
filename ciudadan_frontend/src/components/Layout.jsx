import React, { useEffect } from 'react';
import { useLocation, Outlet } from 'react-router-dom';
import NavBar from './NavBar/NavBar';

const Layout = () => {
  const location = useLocation();

  useEffect(() => {
    // Si la URL contiene "code=" (y probablemente "state=") no actualizamos la cookie
    if (location.search.includes('code=')) {
      console.log("Callback detectado, no se actualiza la cookie.");
      return;
    }
    // Concatenamos la URL completa (ruta, query, hash)
    const currentUrl = location.pathname + location.search + location.hash;
    // Guardamos la URL en la cookie, codificada para evitar problemas con caracteres especiales
    document.cookie = `returnTo=${encodeURIComponent(currentUrl)}; path=/; max-age=3600`; // Expira en 1 hora
    console.log("URL actual guardada en cookie:", currentUrl);
  }, [location]);

  return (
    <>
      <NavBar />
      <div id="ciudadan-app" className="page-wrapper">
        <Outlet />
      </div>
    </>
  );
};

export default Layout;
