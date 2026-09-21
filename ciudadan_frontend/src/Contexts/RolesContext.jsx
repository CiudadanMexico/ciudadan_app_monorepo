import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useAuth0 } from '@auth0/auth0-react';

const STRAPI_URL = process.env.REACT_APP_STRAPI_URL || 'http://localhost:33032';
const audience = process.env.REACT_APP_AUTH0_AUDIENCE ?? 'https://api.ciudadan.org';
const scope = process.env.REACT_APP_AUTH0_SCOPES ?? "openid profile email offline_access";

const RolesContext = createContext();
export const useRoles = () => useContext(RolesContext);

/**
 * Optimizations summary:
 * - In-memory cache keyed by user email with TTL to avoid redundant network calls
 *   mientras la página está abierta.
 * - OPCIÓN A: en cada carga de página se hace SIEMPRE un fetch fresco a la API, de
 *   modo que los cambios de roles hechos en el admin de Strapi se reflejan al
 *   instante. sessionStorage solo se usa como FALLBACK OFFLINE si la red falla.
 * - Promise coalescing for concurrent fetches (reuses an existing request when available).
 * - Minimal re-fetching: only when auth email changes or when forced.
 * - Optimistic updates for updateExtraRole and local cache synchronization.
 * - Safe setState (checks if component is mounted).
 *
 * API compatibility: keeps the same exported values and function names so other components work unchanged.
 */
export const RolesProvider = ({ children }) => {
  const { user: auth0User, isAuthenticated, isLoading, getAccessTokenSilently } = useAuth0();

  // Helper para obtener el token Auth0 con audience correcta
  const getToken = useCallback(async () => {
    try {
      const token = await getAccessTokenSilently({
        authorizationParams: {
          audience,
          scope,
        },
      });
      console.log("-".repeat(20));
      console.log("Access token auth0: ", token);
      console.log("-".repeat(20));
      return token;
    } catch (e) {
      console.log("-".repeat(20));
      console.warn('⚠️ No se pudo obtener token Auth0:', e.message);
      console.log("-".repeat(20));
      return null;
    }
  }, [getAccessTokenSilently]);

  // Estados locales expuestos
  const [roles, setRoles] = useState(['invitado']);
  const [membresia, setMembresia] = useState(null);
  const [userData, setUserData] = useState(null);

  // ----- CONFIG -----
  const CACHE_TTL = 5 * 60 * 1000; // 5 minutos de TTL para la caché

  // ----- Refs -----
  // para evitar setState después de un unmount
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // cache in-memory: { [email]: { data: { roles, userData, membresia }, fetchedAt } }
  const cacheRef = useRef(new Map());

  // promiseRef para coalescer fetches concurrentes por email: { [email]: Promise }
  const promiseRef = useRef({});

  // utils para cache persistente ligera en sessionStorage (por si remonta la app)
  const CACHE_KEY_PREFIX = 'roles_provider_cache_v1::';

  const readSessionCache = (email) => {
    if (!email) return null;
    try {
      const raw = sessionStorage.getItem(CACHE_KEY_PREFIX + email);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed;
    } catch (e) {
      // no detener ejecución por error de storage
      return null;
    }
  };

  const writeSessionCache = (email, payload) => {
    if (!email) return;
    try {
      sessionStorage.setItem(CACHE_KEY_PREFIX + email, JSON.stringify(payload));
    } catch (e) {
      // si falla storage, no es crítico
    }
  };

  const isCacheFresh = (fetchedAt) => {
    if (!fetchedAt) return false;
    return Date.now() - fetchedAt <= CACHE_TTL;
  };

  // Helper para volcar cache a estados (si el componente sigue montado)
  const applyCacheToState = (cached) => {
    if (!mountedRef.current || !cached) return;
    const { roles: cRoles, userData: cUserData, membresia: cMembresia } = cached;
    setRoles(Array.isArray(cRoles) ? cRoles : ['usuario']);
    setUserData(cUserData || null);
    setMembresia(cMembresia || null);
  };

  /**
   * fetchRolesYMembresia(force = false)
   * - Si hay caché fresca para el email y !force -> usa cache.
   * - Si hay una petición en curso para el mismo email -> reuse Promise (coalesce).
   * - Actualiza cache (in-memory + sessionStorage) al término.
   */
  const fetchRolesYMembresia = useCallback(
    async (force = false) => {
      // Si no estamos autenticados o no hay user, limpiamos y salimos.
      // Minúsculas: el backend normaliza el email así al crear/consultar.
      const email = String(auth0User?.email || '').toLowerCase();
      if (!isAuthenticated || !email) {
        // Si no autenticado, dejar valores por defecto
        setRoles(['invitado']);
        setMembresia(null);
        setUserData(null);
        return;
      }

      // Revisa caché in-memory primero (solo sobrevive dentro de la misma vista de
      // página; se resetea en cada reload). sessionStorage ya NO se usa como fuente
      // primaria: en cada carga se hace fetch fresco a la API para reflejar al
      // instante cambios hechos en el admin de Strapi. sessionStorage solo actúa
      // como FALLBACK OFFLINE en el catch (ver abajo).
      const memCache = cacheRef.current.get(email);
      if (!force && memCache && isCacheFresh(memCache.fetchedAt)) {
        applyCacheToState(memCache.data);
        return memCache.data;
      }

      // Si ya hay una promesa en curso para este email, devuelve la misma (coalescing)
      if (promiseRef.current[email]) {
        try {
          const existingResult = await promiseRef.current[email];
          return existingResult;
        } catch (err) {
          // Si la promesa previa falló, continuar y crear una nueva solicitud abajo
        }
      }

      // Creamos la promesa y la guardamos para coalescer
      const fetchPromise = (async () => {
        try {
          const token = await getToken();
          // 1) Obtener usuario Strapi por email (con populate necesario)
          const url = `${STRAPI_URL}/api/users?filters[email][$eq]=${encodeURIComponent(
            email
          )}&populate[role]=*&populate[roles]=*&populate[direcciones]=*&populate[club]=*&populate[agencia]=*&populate[areas]=*`;
          const headers = { 'Content-Type': 'application/json' };
          if (token) headers.Authorization = `Bearer ${token}`;
          const res = await fetch(url, { credentials: 'include', headers });
          const json = await res.json();
          const users = Array.isArray(json) ? json : json.data || [];

          if (!users.length) {
            // Usuario no existe en Strapi (todavía): asegurar su creación a través
            // del endpoint idempotente del backend (auth0-login) y releerlo. NUNCA
            // hacer POST directo a /api/users: esa segunda vía de creación competía
            // con auth0-login y producía usuarios duplicados.
            try {
              const createdData = await createStrapiUser();
              const cachedObj = { data: createdData, fetchedAt: Date.now() };
              cacheRef.current.set(email, cachedObj);
              writeSessionCache(email, cachedObj);
              if (mountedRef.current) applyCacheToState(createdData);
              return createdData;
            } catch (err) {
              // Propagar error
              throw err;
            }
          }

          // Existe usuario -> normalizar atributos
          const raw = users[0];
          const attrs = raw.attributes || raw;
          const usrId = raw.id || raw._id;

          // Compute roles
          const primary = attrs.role?.data?.attributes?.name;
          const extraArr = Array.isArray(attrs.roles?.extra) ? attrs.roles.extra : [];
          const combined = primary
            ? [primary, ...extraArr]
            : extraArr.length
              ? extraArr
              : ['usuario'];

          // 2) Obtener membresias activas para el user by email
          const membUrl = `${STRAPI_URL}/api/membresias?filters[usuarioemail][$eq]=${email}&filters[activa][$eq]=true`;
          const membHeaders = {};
          if (token) membHeaders.Authorization = `Bearer ${token}`;
          const membRes = await fetch(membUrl, { credentials: 'include', headers: membHeaders });

          let selectedMembresia = null;
          if (membRes.ok) {
            const membJson = await membRes.json();
            const items = (membJson.data || []).map((item) => ({
              id: item.id,
              ...item.attributes
            }));

            const hoy = new Date();
            const vigentes = items.filter(
              (m) => new Date(m.fechaInicio) <= hoy && hoy <= new Date(m.fechaFin)
            );
            if (vigentes.length) {
              vigentes.sort((a, b) => new Date(b.fechaInicio) - new Date(a.fechaInicio));
              selectedMembresia = vigentes[0];
            } else {
              selectedMembresia = null;
            }
          } else {
            // Si falla la petición de membresías, no lanzar: dejamos membresia en null y warn
            console.warn(`⚠️ /membresias fallo: ${membRes.status}`);
            selectedMembresia = null;
          }

          // Normalizar userData: incluir id + attrs (igual que antes)
          const normalizedUserData = { id: usrId, ...attrs };

          // Construir objeto a cachear y aplicar a estados
          const result = { roles: combined, userData: normalizedUserData, membresia: selectedMembresia };
          const cachedObj = { data: result, fetchedAt: Date.now() };
          cacheRef.current.set(email, cachedObj);
          writeSessionCache(email, cachedObj);

          if (mountedRef.current) {
            setRoles(combined);
            setUserData(normalizedUserData);
            setMembresia(selectedMembresia);
          }

          return result;
        } catch (err) {
          // OPCIÓN A: si la red/API falla, sessionStorage sirve SOLO como fallback
          // offline (datos posiblemente viejos, pero mejores que nada).
          const sess = readSessionCache(email);
          if (sess) {
            cacheRef.current.set(email, sess);
            applyCacheToState(sess.data);
            console.warn('⚠️ Usando caché local de roles (fallback offline):', err.message);
            return sess.data;
          }
          // Sin caché disponible: estado por defecto y propagamos
          if (mountedRef.current) {
            setRoles(['usuario']);
            setMembresia(null);
            setUserData(null);
          }
          console.error('❌ fetchRolesYMembresia error:', err);
          throw err;
        } finally {
          // limpiar promesa guardada (para permitir futuros reintentos)
          delete promiseRef.current[email];
        }
      })();

      // Guardar promesa para coalescing
      promiseRef.current[email] = fetchPromise;
      return fetchPromise;
    },
    // Dependencias: auth0User.email e isAuthenticated son leídos del closure, pero la función expuesta no cambiará innecesariamente
    [auth0User?.email, isAuthenticated, getToken]
  );

  /**
   * createStrapiUser
   * - Asegura que el usuario exista en Strapi usando SOLO el endpoint idempotente
   *   del backend (/api/auth/auth0-login). Ya NO hace POST directo a /api/users:
   *   esa segunda vía competía con auth0-login y podía crear usuarios duplicados.
   * - Tras asegurar la creación, relee el usuario (con backoff corto) y devuelve
   *   { roles, userData, membresia } ya normalizados.
   */
  const createStrapiUser = useCallback(async () => {
    const email = String(auth0User?.email || '').toLowerCase();
    if (!email) {
      throw new Error('No auth0 user available to create Strapi user');
    }
    const token = await getToken();
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;

    // 1) Punto ÚNICO de creación: el backend auth0-login (idempotente)
    try {
      await fetch(`${STRAPI_URL}/api/auth/auth0-login`, {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({ access_token: token, email }),
      });
    } catch (e) {
      console.warn('⚠️ auth0-login (asegurar usuario) falló:', e.message);
    }

    // 2) Releer con backoff corto: el backend pudo crear el usuario hace milisegundos
    let found = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      const res = await fetch(
        `${STRAPI_URL}/api/users?filters[email][$eq]=${encodeURIComponent(email)}`,
        { credentials: 'include', headers }
      );
      const json = await res.json();
      const arr = Array.isArray(json) ? json : json.data || [];
      if (arr.length) {
        found = arr[0];
        break;
      }
      await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
    }

    if (!found) {
      throw new Error('Strapi user no disponible tras auth0-login');
    }

    // 3) Normalizar igual que el fetch principal
    const raw = found;
    const attrs = raw.attributes || raw;
    const usrId = raw.id || raw._id;
    const primary = attrs.role?.data?.attributes?.name;
    const extraArr = Array.isArray(attrs.roles?.extra) ? attrs.roles.extra : [];
    const combined = primary
      ? [primary, ...extraArr]
      : extraArr.length
        ? extraArr
        : ['usuario'];
    const normalizedUserData = { id: usrId, ...attrs };

    if (mountedRef.current) {
      setRoles(combined);
      setUserData(normalizedUserData);
      setMembresia(null);
    }
    return { roles: combined, userData: normalizedUserData, membresia: null };
  }, [auth0User?.email, getToken]);

  /**
   * hasExtra(roleName)
   * - Simple check contra userData.roles.extra (no hace network)
   */
  const hasExtra = useCallback(
    (roleName) => {
      const arr = userData?.roles?.extra;
      return Array.isArray(arr) && arr.includes(roleName);
    },
    [userData]
  );

  // isEditor / isAdmin / isRoot (idéntico comportamiento público)
  const isEditor = useCallback(() => {
    if (!isAuthenticated || !userData) return false;
    return hasExtra('editor');
  }, [isAuthenticated, userData, hasExtra]);

  const isAdmin = useCallback(() => {
    if (!isAuthenticated || !userData) return false;
    return hasExtra('admin');
  }, [isAuthenticated, userData, hasExtra]);

  const isRoot = useCallback(() => {
    if (!isAuthenticated || !userData) return false;
    return hasExtra('root');
  }, [isAuthenticated, userData, hasExtra]);

  const isSocio = useCallback(() => {
    if (!isAuthenticated || !userData) return false;
    return hasExtra('socio');
  }, [isAuthenticated, userData, hasExtra]);

  const isVerificador = useCallback(() => {
    if (!isAuthenticated || !userData) return false;
    return hasExtra('verificador');
  }, [isAuthenticated, userData, hasExtra]);

  const isActivaMembresia = useCallback(() => Boolean(membresia), [membresia]);

  /**
   * updateExtraRole(roleName, enabled)
   * - Optimistic update: actualiza localmente + cache para evitar re-fetchs.
   * - Envía PUT a Strapi; si falla, revierte estado local y cache.
   */
  const updateExtraRole = useCallback(
    async (roleName, enabled) => {
      if (!userData) {
        console.warn('⚠️ No hay userData. Abortando.');
        return;
      }

      const email = String(auth0User?.email || '').toLowerCase();
      const prevUserData = userData;
      const existing = Array.isArray(userData.roles?.extra) ? [...userData.roles.extra] : [];
      const idx = existing.indexOf(roleName);

      // Calcular nueva lista
      const newExtra = [...existing];
      if (enabled && idx === -1) newExtra.push(roleName);
      if (!enabled && idx > -1) newExtra.splice(idx, 1);

      // Update optimisticamente local state y cache
      const newUserData = { ...userData, roles: { ...userData.roles, extra: newExtra } };
      const newRolesList = (prev => {
        const primary = prev[0] && !['editor', 'admin', 'root'].includes(prev[0]) ? prev[0] : null;
        return primary ? [primary, ...newExtra] : (newExtra.length ? newExtra : ['usuario']);
      })(roles);

      // aplicar cambios localmente
      if (mountedRef.current) {
        setUserData(newUserData);
        setRoles(newRolesList);
      }

      // actualizar cache in-memory + sessionStorage (si tenemos email)
      if (email) {
        const cached = cacheRef.current.get(email);
        const updatedCached = {
          data: {
            roles: newRolesList,
            userData: newUserData,
            membresia: cached?.data?.membresia ?? membresia
          },
          fetchedAt: cached?.fetchedAt ?? Date.now()
        };
        cacheRef.current.set(email, updatedCached);
        writeSessionCache(email, updatedCached);
      }

      // Envío a Strapi (PUT)
      try {
        const token = await getToken();
        const payload = { roles: { extra: newExtra } };
        const putHeaders = { 'Content-Type': 'application/json' };
        if (token) putHeaders.Authorization = `Bearer ${token}`;
        const res = await fetch(`${STRAPI_URL}/api/users/${userData.id}`, {
          method: 'PUT',
          credentials: 'include',
          headers: putHeaders,
          body: JSON.stringify({ data: payload })
        });

        if (!res.ok) {
          console.error(`❌ updateExtraRole failed: ${res.status}`);
          // revertir a prev
          if (mountedRef.current) {
            setUserData(prevUserData);
            // recalcular roles desde prevUserData
            const primary = prevUserData?.role?.data?.attributes?.name;
            const prevExtra = Array.isArray(prevUserData.roles?.extra) ? prevUserData.roles.extra : [];
            const prevCombined = primary ? [primary, ...prevExtra] : (prevExtra.length ? prevExtra : ['usuario']);
            setRoles(prevCombined);
          }
          throw new Error(`Failed to update roles: ${res.status}`);
        }

        // Si todo OK, dejamos el estado ya actualizado (optimistic) — cache ya actualizada arriba.
        return true;
      } catch (err) {
        // Error ya manejado arriba, solo re-lanzamos para que el llamador pueda manejar
        throw err;
      }
    },
    [userData, roles, auth0User?.email, membresia, getToken]
  );

  // isJardinero / isClub / haveClub / verificado
  // Nota: se conservó la semántica; si en backend el casing difiere, normalizar al setear userData.
  const isJardinero = useCallback(() => {
    if (!isAuthenticated || !userData) return false;
    return userData.isJardinero === true;
  }, [isAuthenticated, userData]);

  const isClub = useCallback(() => {
    if (!isAuthenticated || !userData) return false;
    return userData.isclub === true;
  }, [isAuthenticated, userData]);

  const haveClub = useCallback(() => {
    if (!isAuthenticated || !userData) return false;
    return userData.haveclub === true;
  }, [isAuthenticated, userData]);

  const verificado = useCallback(() => {
    if (!isAuthenticated || !userData) return false;
    return userData.verificado === true;
  }, [isAuthenticated, userData]);

  const setEditor = useCallback((enabled) => updateExtraRole('editor', enabled), [updateExtraRole]);
  const setAdmin = useCallback((enabled) => updateExtraRole('admin', enabled), [updateExtraRole]);
  const setRoot = useCallback((enabled) => updateExtraRole('root', enabled), [updateExtraRole]);
  const setVerificador = useCallback((enabled) => updateExtraRole('verificador', enabled), [updateExtraRole]);

  /**
   * useEffect principal:
   * - Se disparará cuando cambie isLoading, isAuthenticated o el email de auth0User.
   * - Llama a fetchRolesYMembresia() para inicializar estados si corresponde.
   */
  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        // no forzamos por defecto: usamos caché si está fresca
        fetchRolesYMembresia().catch(err => {
          // ya logueado internamente; aquí solo prevenimos warnings no deseados
          // si quieres manejar errores a nivel UI, podrías exponerlos.
        });
      } else {
        // usuario no autenticado: asegurar estado invitado
        setRoles(['invitado']);
        setMembresia(null);
        setUserData(null);
      }
    }
    // dependencias: solamente valores necesarios (email dentro de fetch está en closure)
  }, [isLoading, isAuthenticated, auth0User?.email, fetchRolesYMembresia]);

  // Exponer la misma API que el componente anterior
  return (
    <RolesContext.Provider
      value={{
        roles,
        userData,
        membresia,
        fetchRolesYMembresia, // se mantiene para compatibilidad (ahora soporta fetchRolesYMembresia(force))
        isEditor,
        isAdmin,
        isRoot,
        isSocio,
        isVerificador,
        isJardinero,
        isClub,
        haveClub,
        isActivaMembresia,
        setEditor,
        setAdmin,
        setRoot,
        setVerificador,
        verificado,
        updateExtraRole,
      }}
    >
      {children}
    </RolesContext.Provider>
  );
};
