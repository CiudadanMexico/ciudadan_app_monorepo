// useTodos.js
// Hook para manejar CRUD de 'todo' y operaciones relacionadas con 'tareas' en Strapi.
// - Compatible Strapi v4
// - Busca en Strapi un usuario por email (users-permissions) y usa su id como creador cuando exista
// - Normaliza relaciones (areas, subareas) y campos antes de enviar

import { useState, useCallback } from "react";
import { useAuth0 } from "@auth0/auth0-react";

const STRAPI_BASE = process.env.REACT_APP_STRAPI_URL || "http://localhost:1337";

function buildHeaders(token) {
  const headers = {
    "Content-Type": "application/json",
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function toNumberIfPossible(v) {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return v;
  const n = Number(v);
  return Number.isNaN(n) ? v : n;
}

function normalizeRelationArray(val) {
  // acepta: undefined, number, string, array => devuelve array de ids (number) o undefined
  if (val === undefined || val === null || val === "") return undefined;
  if (Array.isArray(val)) return val.map(toNumberIfPossible).filter((x) => x !== null && x !== undefined);
  return [toNumberIfPossible(val)].filter((x) => x !== null && x !== undefined);
}

export default function useTodos() {
  const { user, isAuthenticated, getAccessTokenSilently } = useAuth0();

  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleError = (err) => {
    console.error(err);
    setError(err?.message || String(err));
  };

  const getToken = async () => {
    try {
      if (!isAuthenticated) return null;
      return await getAccessTokenSilently();
    } catch {
      return null;
    }
  };

  // Intenta buscar en Strapi (users-permissions) un usuario por email.
  // Devuelve id numérico o null.
const findStrapiUserIdByEmail = async (email, token = null) => {
  if (!email) return null;

  try {
    const url = `${STRAPI_BASE}/api/users?filters[email][$eq]=${encodeURIComponent(email)}&pagination[limit]=1`;

    const res = await fetch(url, {
      headers: buildHeaders(token),
    });

    if (!res.ok) return null;

    const json = await res.json();

    // users endpoint devuelve ARRAY, no {data:[]}
    if (!Array.isArray(json) || json.length === 0) return null;

    return json[0].id;

  } catch (err) {
    return null;
  }
};

  // Normaliza el payload para Strapi v4
  const preparePayloadForStrapi = async (payload = {}) => {
    const data = { ...payload };

    // relationships arrays: areas, subareas
    const areas = normalizeRelationArray(payload.areas);
    if (areas) data.areas = areas;

    const subareas = normalizeRelationArray(payload.subareas);
    if (subareas) data.subareas = subareas;

    // numeric fields
    if (payload.pagos_laborys !== undefined) data.pagos_laborys = toNumberIfPossible(payload.pagos_laborys);
    if (payload.pagos_efectivo !== undefined) data.pagos_efectivo = toNumberIfPossible(payload.pagos_efectivo);
    if (payload.minutos_desarrollo !== undefined) data.minutos_desarrollo = toNumberIfPossible(payload.minutos_desarrollo);
    if (payload.recompensa !== undefined) data.recompensa = toNumberIfPossible(payload.recompensa);

    // fechas
    if (payload.fecha_entrega) {
      try {
        const d = new Date(payload.fecha_entrega);
        if (!Number.isNaN(d.getTime())) data.fecha_entrega = d.toISOString();
        else data.fecha_entrega = payload.fecha_entrega;
      } catch {
        data.fecha_entrega = payload.fecha_entrega;
      }
    }

    // creador: si viene un id numérico lo usamos; sino intentamos buscar por email del auth0 user
    if (payload.creador !== undefined && payload.creador !== null && payload.creador !== "") {
      //const maybeNum = toNumberIfPossible(payload.creador);
      const maybeNum = toNumberIfPossible(payload.creador);

if (typeof maybeNum === "number" && maybeNum > 0) {
  data.creador = maybeNum;
} else {
  delete data.creador;
}
    } else {
      // no nos pasaron creador: intentar mapear user.email (Auth0) a Strapi user id
      if (user?.email) {
        // find id (intenta con token si está disponible)
        const token = await getToken();
        const strapiUserId = await findStrapiUserIdByEmail(user.email, token);
        if (strapiUserId && strapiUserId > 0) {
  data.creador = strapiUserId;
} else {
          // guardar email para emparejamiento posterior
          data.usuario_email = user.email;
        }
      }
    }

    // otros campos (enum/string) los dejamos tal cual: tipo, ambito, nivel, recurrencia, status, titulo, descripcion, etc.
    return data;
  };

  // ---------------------------
  // FETCH TODOS
  // ---------------------------
  const fetchTodos = useCallback(async (opts = {}) => {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const query = opts.query || "?populate=deep,3";
      const res = await fetch(`${STRAPI_BASE}/api/todos${query}`, {
        headers: buildHeaders(token),
      });
      if (!res.ok) throw new Error(`Error fetching todos: ${res.status}`);
      const json = await res.json();
      const list = Array.isArray(json.data) ? json.data : json.data ? [json.data] : [];
      setTodos(list);
      return list;
    } catch (err) {
      handleError(err);
      setTodos([]);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // ---------------------------
  // CREATE TODO
  // ---------------------------
  const createTodo = useCallback(
    async (payload = {}) => {
      setLoading(true);
      setError(null);
      try {
        const token = await getToken();

        const data = await preparePayloadForStrapi(payload);

        // asegurar fecha_publicacion si no viene
        if (!data.fecha_publicacion) data.fecha_publicacion = new Date().toISOString();

        const res = await fetch(`${STRAPI_BASE}/api/todos`, {
          method: "POST",
          headers: buildHeaders(token),
          body: JSON.stringify({ data }),
        });

        if (!res.ok) {
          const txt = await res.text();
          throw new Error(`Error creando todo: ${res.status} ${txt}`);
        }

        const json = await res.json();
        setTodos((prev) => [json.data, ...prev]);
        return json.data;
      } catch (err) {
        handleError(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  // ---------------------------
  // UPDATE TODO
  // ---------------------------
  const updateTodo = useCallback(async (id, updates = {}) => {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const data = await preparePayloadForStrapi(updates);
      const res = await fetch(`${STRAPI_BASE}/api/todos/${id}`, {
        method: "PUT",
        headers: buildHeaders(token),
        body: JSON.stringify({ data }),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Error actualizando todo: ${res.status} ${txt}`);
      }
      const json = await res.json();
      setTodos((prev) => prev.map((t) => (t.id === json.data.id ? json.data : t)));
      return json.data;
    } catch (err) {
      handleError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // ---------------------------
  // DELETE TODO
  // ---------------------------
  const deleteTodo = useCallback(async (id) => {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const res = await fetch(`${STRAPI_BASE}/api/todos/${id}`, {
        method: "DELETE",
        headers: buildHeaders(token),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Error borrando todo: ${res.status} ${txt}`);
      }
      setTodos((prev) => prev.filter((t) => t.id !== id));
      return true;
    } catch (err) {
      handleError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // ---------------------------
  // ASIGNAR A AGENCIA
  // ---------------------------
  const assignToAgency = useCallback(
    async ({ todoId, agencyId, data = {} }) => {
      setLoading(true);
      setError(null);
      try {
        const token = await getToken();
        const payload = {
          todo: todoId,
          agencia: agencyId,
          tipo: "tarea",
          ...data,
        };
        const res = await fetch(`${STRAPI_BASE}/api/tareas`, {
          method: "POST",
          headers: buildHeaders(token),
          body: JSON.stringify({ data: payload }),
        });
        if (!res.ok) {
          const txt = await res.text();
          throw new Error(`Error asignando a agencia: ${res.status} ${txt}`);
        }
        const json = await res.json();
        await updateTodo(todoId, { status: "asignada", agencia: agencyId });
        return json.data;
      } catch (err) {
        handleError(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [updateTodo]
  );

  // ---------------------------
  // ASIGNAR A USUARIO
  // ---------------------------
  const assignToUser = useCallback(
    async ({ todoId, userId, data = {} }) => {
      setLoading(true);
      setError(null);
      try {
        const token = await getToken();
        const payload = {
          todo: todoId,
          usuario: userId,
          tipo: "tarea",
          ...data,
        };
        const res = await fetch(`${STRAPI_BASE}/api/tareas`, {
          method: "POST",
          headers: buildHeaders(token),
          body: JSON.stringify({ data: payload }),
        });
        if (!res.ok) {
          const txt = await res.text();
          throw new Error(`Error asignando a usuario: ${res.status} ${txt}`);
        }
        const json = await res.json();
        await updateTodo(todoId, { status: "asignada" });
        return json.data;
      } catch (err) {
        handleError(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [updateTodo]
  );

  // ---------------------------
  // CALIFICAR TAREA
  // ---------------------------
  const rateTask = useCallback(async (tareaId, rating = {}) => {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const getRes = await fetch(`${STRAPI_BASE}/api/tareas/${tareaId}`, {
        headers: buildHeaders(token),
      });
      if (!getRes.ok) throw new Error(`No se pudo leer tarea`);
      const getJson = await getRes.json();
      const current = getJson.data.attributes || {};
      const califs = Array.isArray(current.calificaciones) ? current.calificaciones : [];
      const next = [...califs, { ...rating, fecha: rating.fecha || new Date().toISOString() }];
      const upd = await fetch(`${STRAPI_BASE}/api/tareas/${tareaId}`, {
        method: "PUT",
        headers: buildHeaders(token),
        body: JSON.stringify({ data: { calificaciones: next } }),
      });
      if (!upd.ok) throw new Error(`Error al calificar tarea`);
      const updJson = await upd.json();
      return updJson.data;
    } catch (err) {
      handleError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // ---------------------------
  // PAGAR TAREA
  // ---------------------------
  const payTask = useCallback(async (tareaId, payment = {}) => {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const getRes = await fetch(`${STRAPI_BASE}/api/tareas/${tareaId}`, {
        headers: buildHeaders(token),
      });
      if (!getRes.ok) throw new Error(`No se pudo leer tarea`);
      const getJson = await getRes.json();
      const current = getJson.data.attributes || {};
      const field = payment.metodo === "efectivo" ? "pagos_efectivo" : "pagos_laborys";
      const arr = Array.isArray(current[field]) ? current[field] : [];
      const next = [...arr, { ...payment, fecha: payment.fecha || new Date().toISOString() }];
      const upd = await fetch(`${STRAPI_BASE}/api/tareas/${tareaId}`, {
        method: "PUT",
        headers: buildHeaders(token),
        body: JSON.stringify({ data: { [field]: next } }),
      });
      if (!upd.ok) throw new Error(`Error registrando pago`);
      const updJson = await upd.json();
      return updJson.data;
    } catch (err) {
      handleError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    todos,
    loading,
    error,
    fetchTodos,
    createTodo,
    updateTodo,
    deleteTodo,
    assignToAgency,
    assignToUser,
    rateTask,
    payTask,
  };
}