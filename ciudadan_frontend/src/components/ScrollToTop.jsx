import { useLayoutEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * ScrollToTop global — montado una vez dentro de <BrowserRouter>.
 * Lleva al usuario hasta arriba en cada cambio de página (PUSH/REPLACE
 * vía Link o useNavigate), porque React Router conserva el scrollY.
 *
 * No interfiere con:
 * - anclas #seccion: deja que el scrollIntoView del destino corra.
 * - mismo pathname con distinto ?query (tabs ?tab=, filtros): no salta.
 */
const ScrollToTop = () => {
  const { pathname, hash } = useLocation();
  const prevPath = useRef(pathname);

  useLayoutEffect(() => {
    // Con hash (#como-funciona, #agencia-ruta...) no forzamos top.
    if (hash) {
      prevPath.current = pathname;
      return;
    }
    // Solo cuando cambia de ruta; cambios de ?query en la misma
    // página (tabs, filtros, paginación) no deben saltar arriba.
    if (pathname !== prevPath.current) {
      window.scrollTo(0, 0);
      // Fallback Safari/Capacitor/webview antiguos.
      if (document?.documentElement) document.documentElement.scrollTop = 0;
      if (document?.body) document.body.scrollTop = 0;
    }
    prevPath.current = pathname;
  }, [pathname, hash]);

  return null;
};

export default ScrollToTop;
