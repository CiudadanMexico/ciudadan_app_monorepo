// src/hooks/useTarea.jsx
//
// Hook para gestionar RESOLUCIONES (entidad `tarea` en Strapi), no tareas
// originales (`todo`). Cubre: listado, creación, edición, eliminación y
// actualización de estado. Incluye soporte para `media`, `skills` y
// `area_details` según el spec de CoWork (documento-off.md).
//
// Nota: `final-cowork.md` describe este hook como "Gestión de resoluciones";
// antes estaba apuntando a /api/todos (tareas originales) — se corrige aquí
// para que apunte a /api/tareas que es la colección de resoluciones.

import { useState, useEffect, useCallback } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useRoles } from "../Contexts/RolesContext";
import {
  getTareasApeladas,
} from "../services/cowork/queryServices";
import {
  resolverApelacion as resolverApelacionService,
} from "../services/cowork/mutationsServices";

const STRAPI_URL = process.env.REACT_APP_STRAPI_URL || "http://localhost:33032";

function buildHeaders(token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

export function useTarea() {
  const { isAuthenticated, getAccessTokenSilently } = useAuth0();
  const { isAdmin, isSocio, isVerificador } = useRoles();

  const [tareas, setTareas] = useState([]);
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  const getToken = useCallback(async () => {
    try {
      if (!isAuthenticated) return null;
      return await getAccessTokenSilently({
        authorizationParams: {
          audience: "https://api.ciudadan.org",
          scope: "openid profile email offline_access",
        },
      });
    } catch {
      return null;
    }
  }, [isAuthenticated, getAccessTokenSilently]);

  // Permisos CRUD: admin/socio para crear/editar/eliminar (per spec)
  const canCRUD = isAdmin() || isSocio();

  useEffect(() => {
    fetchTareas();
    fetchAreas();
  }, [pagina, porPagina]); // eslint-disable-line react-hooks/exhaustive-deps

  // =============================
  // Obtener todas las resoluciones (tareas)
  // =============================
  const fetchTareas = useCallback(async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const url = `${STRAPI_URL}/api/tareas?populate=todo,usuario,reviewed_by,media,skills&pagination[page]=${pagina}&pagination[pageSize]=${porPagina}&sort[0]=id:desc`;
      const res = await fetch(url, { headers: buildHeaders(token) });
      if (!res.ok) throw new Error(`Error fetching tareas: ${res.status}`);
      const data = await res.json();

      const items = Array.isArray(data.data) ? data.data : [];
      setTotalItems(data.meta?.pagination?.total || 0);

      const parsed = items.map((item) => {
        const a = item.attributes || item;
        const usuario = a.usuario?.data || a.usuario;
        const todo = a.todo?.data || a.todo;
        const agencia = a.agencia?.data || a.agencia;
        const mediaAttr = a.media?.data || a.media;
        const skillsAttr = a.skills?.data || a.skills;

        return {
          id: item.id,
          todo: todo
            ? {
                id: todo.id,
                titulo: todo.attributes?.titulo || todo.titulo,
                status: todo.attributes?.status || todo.status,
                reward_laborys: todo.attributes?.reward_laborys ?? todo.reward_laborys ?? 0,
              }
            : null,
          usuario: usuario
            ? {
                id: usuario.id,
                nombre: usuario.attributes?.username || usuario.username,
                email: usuario.attributes?.email || usuario.email,
                area_details: usuario.attributes?.area_details || usuario.area_details || {},
              }
            : null,
          status: a.status,
          payment_status: a.payment_status,
          notes: a.notes,
          score: a.score,
          resolved_at: a.resolved_at,
          media: Array.isArray(mediaAttr)
            ? mediaAttr.map((m) => ({
                id: m.id,
                name: m.attributes?.name || m.name,
                url: m.attributes?.url || m.url,
              }))
            : [],
          skills: Array.isArray(skillsAttr)
            ? skillsAttr.map((s) => ({
                id: s.id,
                name: s.attributes?.name || s.name,
              }))
            : [],
          agencia: agencia
            ? { id: agencia.id, nombre: agencia.attributes?.nombre || agencia.nombre }
            : null,
        };
      });

      setTareas(parsed);
    } catch (err) {
      console.error("Error al obtener resoluciones:", err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [pagina, porPagina, getToken]);

  // =============================
  // Obtener Áreas
  // =============================
  const fetchAreas = useCallback(async () => {
    try {
      const token = await getToken();
      const res = await fetch(`${STRAPI_URL}/api/areas?populate=*`, {
        headers: buildHeaders(token),
      });
      const json = await res.json();
      const parsed = (json.data || []).map((a) => ({
        id: a.id,
        name: a.attributes?.name || a.attributes?.nombre || "",
        level: a.attributes?.level ?? a.attributes?.nivel ?? 0,
        is_active: a.attributes?.is_active ?? true,
      }));
      setAreas(parsed);
    } catch (err) {
      console.error("Error al obtener áreas:", err);
      setError(err);
    }
  }, [getToken]);

  // =============================
  // Crear Resolución (tarea)
  // =============================
  const crearTarea = useCallback(
    async (nuevaTarea) => {
      if (!canCRUD) {
        throw new Error("Permiso denegado: se requiere rol admin o socio");
      }

      try {
        setLoading(true);
        const token = await getToken();

        // Resolver usuario destino por email si viene
        let usuarioId = nuevaTarea.usuario_id || null;
        if (!usuarioId && nuevaTarea.usuario_email) {
          const userRes = await fetch(
            `${STRAPI_URL}/api/users?filters[email][$eq]=${encodeURIComponent(
              nuevaTarea.usuario_email
            )}`,
            { headers: buildHeaders(token) }
          );
          const userData = await userRes.json();
          if (Array.isArray(userData) && userData.length > 0) {
            usuarioId = userData[0].id;
          }
        }

        const body = {
          data: {
            todo: nuevaTarea.todo_id ? Number(nuevaTarea.todo_id) : null,
            usuario: usuarioId,
            tipo: nuevaTarea.tipo || "tarea",
            status: nuevaTarea.status || "en_proceso",
            payment_status: "pendiente",
            notes: nuevaTarea.notes || "",
            score: nuevaTarea.score || 0,
            media: Array.isArray(nuevaTarea.media) ? nuevaTarea.media : [],
            skills: Array.isArray(nuevaTarea.skills) ? nuevaTarea.skills.map(Number).filter(Boolean) : [],
          },
        };

        const res = await fetch(`${STRAPI_URL}/api/tareas`, {
          method: "POST",
          headers: buildHeaders(token),
          body: JSON.stringify(body),
        });

        const json = await res.json();
        if (!res.ok) {
          throw new Error(`No se pudo crear la resolución (${res.status})`);
        }

        await fetchTareas();
        return json.data;
      } catch (err) {
        console.error("Error al crear resolución:", err);
        setError(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [canCRUD, getToken, fetchTareas]
  );

  // =============================
  // Editar Resolución
  // =============================
  const editarTarea = useCallback(
    async (id, cambios) => {
      if (!canCRUD) {
        throw new Error("Permiso denegado: se requiere rol admin o socio");
      }
      try {
        setLoading(true);
        const token = await getToken();
        const body = { data: { ...cambios } };
        const res = await fetch(`${STRAPI_URL}/api/tareas/${id}`, {
          method: "PUT",
          headers: buildHeaders(token),
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error(`No se pudo editar la resolución (${res.status})`);
        await fetchTareas();
        return res.json();
      } catch (err) {
        console.error("Error al editar resolución:", err);
        setError(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [canCRUD, getToken, fetchTareas]
  );

  // =============================
  // Eliminar Resolución
  // =============================
  const eliminarTarea = useCallback(
    async (id) => {
      if (!canCRUD) {
        throw new Error("Permiso denegado: se requiere rol admin o socio");
      }
      try {
        setLoading(true);
        const token = await getToken();
        const res = await fetch(`${STRAPI_URL}/api/tareas/${id}`, {
          method: "DELETE",
          headers: buildHeaders(token),
        });
        if (!res.ok) throw new Error(`No se pudo eliminar la resolución (${res.status})`);
        await fetchTareas();
        return true;
      } catch (err) {
        console.error("Error al eliminar resolución:", err);
        setError(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [canCRUD, getToken, fetchTareas]
  );

  // =============================
  // Apelar calificación de una tarea resuelta (Fix G — UI de apelacion)
  // =============================
  // Solo el dueño de la tarea puede apelar. El backend valida:
  //   - estado en ['calificada', 'pagada']
  //   - score <= 3
  //   - motivo >= 10 chars
  //   - no existe apelación abierta previa
  // Spec documento-off.md:147-164.
  const apelarTarea = useCallback(
    async (tareaId, motivo, scoreSolicitado) => {
      if (!tareaId) throw new Error("tareaId es requerido");
      if (!motivo || String(motivo).trim().length < 10) {
        throw new Error("El motivo debe tener al menos 10 caracteres");
      }
      try {
        setLoading(true);
        const token = await getToken();
        if (!token) throw new Error("No autenticado");
        const body = { tareaId, motivo: String(motivo).trim() };
        if (scoreSolicitado !== undefined && scoreSolicitado !== null && scoreSolicitado !== "") {
          const s = Number(scoreSolicitado);
          if (isNaN(s) || s < 1 || s > 5) {
            throw new Error("scoreSolicitado debe ser un numero entre 1 y 5");
          }
          body.scoreSolicitado = s;
        }
        const res = await fetch(`${STRAPI_URL}/api/tareas/apelar`, {
          method: "POST",
          headers: buildHeaders(token),
          body: JSON.stringify(body),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          const msg = json?.error?.message || json?.message || `(${res.status})`;
          throw new Error(`No se pudo apelar la tarea: ${msg}`);
        }
        await fetchTareas();
        return json.data;
      } catch (err) {
        console.error("Error al apelar calificación:", err);
        setError(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [getToken, fetchTareas]
  );

  // =============================
  // Verificar área de un usuario (endpoint formal Fix D /areas/verificar-area)
  // =============================
  // Reemplaza el PUT /users/:id legacy pisándolo con merge destructivo. El
  // endpoint formal requiere userId + areaId + status, registra verificado_por
  // y verificado_en, y hace merge no destructivo sobre otros entries de
  // area_details. Status permitidos: 'verified' | 'pending' | 'rejected'
  // (rejected requiere observaciones).
  const verificarArea = useCallback(
    async ({ userId, areaId, status, observaciones }) => {
      if (!isAdmin() && !isVerificador()) {
        throw new Error("Permiso denegado: se requiere rol admin o verificador");
      }
      try {
        const token = await getToken();
        const res = await fetch(`${STRAPI_URL}/api/areas/verificar-area`, {
          method: "POST",
          headers: buildHeaders(token),
          body: JSON.stringify({ userId, areaId, status, observaciones }),
        });
        if (!res.ok) {
          let msg;
          try { msg = (await res.json()).error?.message || `(${res.status})`; }
          catch { msg = `(${res.status})`; }
          throw new Error(`No se pudo verificar el área: ${msg}`);
        }
        return res.json();
      } catch (err) {
        console.error("Error al verificar área:", err);
        setError(err);
        throw err;
      }
    },
    [isAdmin, isVerificador, getToken]
  );

  // Listar verificaciones actuales de un usuario
  const listarVerificaciones = useCallback(
    async (userId) => {
      if (!isAdmin() && !isVerificador()) {
        throw new Error("Permiso denegado: se requiere rol admin o verificador");
      }
      try {
        const token = await getToken();
        const res = await fetch(
          `${STRAPI_URL}/api/areas/verificaciones?userId=${encodeURIComponent(userId)}`,
          { headers: buildHeaders(token) },
        );
        if (!res.ok) throw new Error(`No se pudo listar verificaciones (${res.status})`);
        return res.json();
      } catch (err) {
        console.error("Error al listar verificaciones:", err);
        setError(err);
        throw err;
      }
    },
    [isAdmin, isVerificador, getToken]
  );

  // =============================
  // Listar tareas con apelaciones abiertas (Fix H — UI resolver apelaciones)
  // =============================
  // Solo admin/socio. Usa el query `getTareasApeladas` que filtra por
  // `apelaciones` no nulo. Spec documento-off.md:163-176.
  const listarTareasApeladas = useCallback(
    async () => {
      if (!isAdmin() && !isSocio()) {
        throw new Error("Permiso denegado: se requiere rol admin o socio");
      }
      try {
        const token = await getToken();
        if (!token) throw new Error("No autenticado");
        return await getTareasApeladas(token);
      } catch (err) {
        console.error("Error al listar tareas apeladas:", err);
        setError(err);
        throw err;
      }
    },
    [isAdmin, isSocio, getToken]
  );

  // =============================
  // Resolver una apelación (Fix H — UI resolver apelaciones)
  // =============================
  // Aprueba o rechaza una apelación abierta. El backend valida permisos,
  // que la apelación exista y esté 'abierta'/'en_revision', y ejecuta el
  // re-pago de laborys atómicamente si se aprueba con scoreFinal > scoreActual.
  // Spec documento-off.md:176.
  const resolverApelacion = useCallback(
    async ({ tareaId, apelacionId, decision, notasResolucion, scoreFinal }) => {
      if (!isAdmin() && !isSocio()) {
        throw new Error("Permiso denegado: se requiere rol admin o socio");
      }
      try {
        setLoading(true);
        const token = await getToken();
        if (!token) throw new Error("No autenticado");
        return await resolverApelacionService(
          tareaId,
          apelacionId,
          decision,
          notasResolucion,
          scoreFinal,
          token
        );
      } catch (err) {
        console.error("Error al resolver apelación:", err);
        setError(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [isAdmin, isSocio, getToken]
  );

  return {
    tareas,
    areas,
    loading,
    error,
    fetchTareas,
    fetchAreas,
    crearTarea,
    editarTarea,
    eliminarTarea,
    apelarTarea,
    // Fix D — verificación de áreas (reemplaza updateAreaDetails legacy)
    verificarArea,
    listarVerificaciones,
    // Fix H — resolución de apelaciones (admin/socio)
    listarTareasApeladas,
    resolverApelacion,
    canCRUD,
    pagina,
    setPagina,
    porPagina,
    setPorPagina,
    totalItems,
  };
}
