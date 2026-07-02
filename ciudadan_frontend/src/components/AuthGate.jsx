import { useEffect, useState } from 'react';

// Hook de Auth0 para saber si el usuario está autenticado,
// si Auth0 sigue cargando y obtener los datos del usuario
import { useAuth0 } from '@auth0/auth0-react';

// Hooks de React Router:
// - useLocation: para saber en qué ruta estamos
// - useNavigate: para redirigir al usuario
import { useLocation, useNavigate } from 'react-router-dom';

// Componente visual que se muestra mientras se valida el acceso
import PreLoader from './PreLoader';

// Función que consulta en Strapi si el usuario existe
// y si ya terminó su proceso de registro
import { findUserInStrapi } from '../utils/strapiUserService';

/**
 * AuthGate
 * ----------
 * Este componente funciona como una "puerta de acceso".
 * Envuelve otras vistas y decide si:
 * - deja pasar al usuario
 * - muestra un loader
 * - o lo manda a /registrar
 */
export default function AuthGate({ children }) {

  // Datos que nos da Auth0
  const { isAuthenticated, isLoading, user } = useAuth0();

  // Información de la ruta actual
  const location = useLocation();

  // Función para redireccionar
  const navigate = useNavigate();

  /**
   * Estado interno para saber si seguimos validando
   * Mientras `checking` sea true, se muestra el PreLoader
   */
  const [checking, setChecking] = useState(true);

  useEffect(() => {

    /**
     * Función principal de validación
     * Se ejecuta cada vez que cambia:
     * - la ruta
     * - el estado de autenticación
     * - el usuario de Auth0
     */
    const check = async () => {

      // Si Auth0 todavía está cargando información,
      // no hacemos nada aún
      if (isLoading) return;

      // Si NO está autenticado o no existe el email,
      // no bloqueamos la app
      if (!isAuthenticated || !user?.email) {
        setChecking(false);
        return;
      }

      // Si ya estamos en /registrar,
      // NO volvemos a redirigir (evita loops infinitos)
      if (location.pathname.startsWith('/registrar')) {
        setChecking(false);
        return;
      }

      try {
        // Buscamos al usuario en Strapi por su email
        const data = await findUserInStrapi(user.email);

        // Tomamos el primer resultado (si existe)
        const strapiUser = data?.[0];

        // Si el usuario NO existe en Strapi
        // o existe pero NO ha terminado su registro
        if (!strapiUser || strapiUser.registrado !== true) {

          // Redirigimos a /registrar
          // replace: true evita que pueda regresar con "back"
          //navigate('/registrar', { replace: true });
          setChecking(false);
          return;
        }

        // Si todo está bien, dejamos pasar
        setChecking(false);

      } catch (e) {
        // Si algo falla (API caída, error de red, etc.)
        // no bloqueamos la app, solo lo logueamos
        console.error(e);
        setChecking(false);
      }
    };

    // Cada vez que se ejecuta el efecto,
    // volvemos a activar el estado de validación
    setChecking(true);

    // Ejecutamos la validación
    check();

  // Dependencias del efecto:
  // Se vuelve a ejecutar cuando cambia cualquiera de estas
  }, [location.pathname, isAuthenticated, isLoading, user]);

  // Mientras estamos validando, mostramos el loader
  if (checking) return <PreLoader />;

  // Si ya pasó todas las validaciones,
  // renderizamos lo que esté dentro del AuthGate
  return children;
}
