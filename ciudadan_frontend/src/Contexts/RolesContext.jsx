import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useAuth0 } from '@auth0/auth0-react';

const STRAPI_URL = process.env.REACT_APP_STRAPI_URL;

const RolesContext = createContext();
export const useRoles = () => useContext(RolesContext);

/**
 * Optimizations summary:
 * - In-memory + sessionStorage cache keyed by user email with TTL to avoid redundant network calls.
 * - Promise coalescing for concurrent fetches (reuses an existing request when available).
 * - Minimal re-fetching: only when auth email changes or when forced.
 * - Optimistic updates for updateExtraRole and local cache synchronization.
 * - Safe setState (checks if component is mounted).
 *
 * API compatibility: keeps the same exported values and function names so other components work unchanged.
 */
export const RolesProvider = ({ children }) => {
  const { user: auth0User, isAuthenticated, isLoading } = useAuth0();

  // Estados locales expuestos
  const [roles, setRoles] = useState(['invitado']);
  const [membresia, setMembresia] = useState(null);
  const [userData, setUserData] = useState(null);

  // ----- CONFIG -----
  const CACHE_TTL = 1 * 1 * 1000; // 5 minutos de TTL para la caché (ajustable)AJUSTAR ESTÁ EN 1 SEGUNDO

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
      const email = auth0User?.email;
      if (!isAuthenticated || !email) {
        // Si no autenticado, dejar valores por defecto
        setRoles(['invitado']);
        setMembresia(null);
        setUserData(null);
        return;
      }

      // Revisa caché in-memory primero
      const memCache = cacheRef.current.get(email);
      if (!force && memCache && isCacheFresh(memCache.fetchedAt)) {
        applyCacheToState(memCache.data);
        return memCache.data;
      }

      // Luego revisa sessionStorage si memCache no existe o está vieja
      if (!force && (!memCache || !isCacheFresh(memCache.fetchedAt))) {
        const sess = readSessionCache(email);
        if (sess && isCacheFresh(sess.fetchedAt)) {
          // Bulk load from session cache
          cacheRef.current.set(email, sess);
          applyCacheToState(sess.data);
          return sess.data;
        }
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
          // 1) Obtener usuario Strapi por email (con populate necesario)
          const url = `${STRAPI_URL}/api/users?filters[email][$eq]=${encodeURIComponent(
            email
          )}&populate[role]=*&populate[roles]=*&populate[direcciones]=*&populate[club]=*`;
          const res = await fetch(url, { credentials: 'include' });
          const json = await res.json();
          const users = Array.isArray(json) ? json : json.data || [];

          if (!users.length) {
            // Usuario no existe en Strapi: crear uno nuevo (no forzar re-fetch automático para evitar loops)
            try {
              await createStrapiUser(); // createStrapiUser maneja errores internamente (lanza si falla)
              // Tras crear, no hacemos refetch forzado automáticamente; dejamos roles default.
              const defaultData = { roles: ['usuario'], userData: null, membresia: null };
              const cachedObj = { data: defaultData, fetchedAt: Date.now() };
              cacheRef.current.set(email, cachedObj);
              writeSessionCache(email, cachedObj);
              if (mountedRef.current) applyCacheToState(defaultData);
              return defaultData;
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
          const membRes = await fetch(membUrl, { credentials: 'include' });

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
          // En caso de error crítico, restauramos un estado razonable y lanzamos
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
    [auth0User?.email, isAuthenticated]
  );

  /**
   * createStrapiUser
   * - Misma funcionalidad que antes pero sin mutar logs.
   * - Intencionalmente simple: crea usuario en Strapi con los datos de Auth0.
   * - Nota: no hace re-fetch forzado para no crear loops; la llamada superior decide qué hacer.
   */
  const createStrapiUser = useCallback(async () => {
    const email = auth0User?.email;
    if (!email) {
      throw new Error('No auth0 user available to create Strapi user');
    }
    const password = Math.random().toString(36).slice(-10);
    const roleId = 1;
    const payload = {
      username: auth0User.nickname || auth0User.name || email.split('@')[0],
      email,
      password,
      role: roleId,
      provider: 'auth0',
      confirmed: true,
      blocked: false
    };

    const createRes = await fetch(`${STRAPI_URL}/api/users`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!createRes.ok) {
      const errText = await createRes.text();
      console.error('❌ Crear usuario falló:', errText);
      throw new Error('Failed to create Strapi user');
    }

    // Tras creación, dejamos rol por defecto y estado limpio.
    if (mountedRef.current) {
      setRoles(['usuario']);
      setMembresia(null);
      setUserData(null);
    }
    return true;
  }, [auth0User?.email]);

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

      const email = auth0User?.email;
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
        const primary = prev[0] && !['editor','admin','root'].includes(prev[0]) ? prev[0] : null;
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
        const payload = { roles: { extra: newExtra } };
        const res = await fetch(`${STRAPI_URL}/api/users/${userData.id}`, {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
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
    [userData, roles, auth0User?.email, membresia]
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
        isJardinero,
        isClub,
        haveClub,
        isActivaMembresia,
        setEditor,
        setAdmin,
        setRoot,
        verificado
      }}
    >
      {children}
    </RolesContext.Provider>
  );
};
