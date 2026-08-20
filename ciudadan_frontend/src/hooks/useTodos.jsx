// useTodos.js
// Hook para manejar CRUD de 'todo' y operaciones relacionadas con 'tareas' en Strapi.
// - Compatible Strapi v4
// - Busca en Strapi un usuario por email (users-permissions) y usa su id como creador cuando exista
// - Normaliza relaciones (areas, subareas) y campos antes de enviar

import { useState, useCallback } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { validateTaskStatusTransition } from "../utils/cowork.helpers";

const STRAPI_BASE = process.env.REACT_APP_STRAPI_URL || "http://localhost:33032";

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
      return await getAccessTokenSilently({
        authorizationParams: {
          audience: 'https://api.ciudadan.org',
          scope: 'openid profile email offline_access',
        },
      });
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
    const users = Array.isArray(json) ? json : Array.isArray(json.data) ? json.data : [];

    if (users.length === 0) return null;
    return users[0].id;

  } catch (err) {
    return null;
  }
};

  // Normaliza el payload para Strapi v4
  const preparePayloadForStrapi = async (payload = {}) => {
    const data = { ...payload };

    // relationships arrays: areas, subareas, skills
    const areas = normalizeRelationArray(payload.areas);
    if (areas) data.areas = areas;

    const subareas = normalizeRelationArray(payload.subareas);
    if (subareas) data.subareas = subareas;

    const skills = normalizeRelationArray(payload.skills);
    if (skills) data.skills = skills;

    // numeric fields
    // Fix C (cleanup aliases legacy): los campos oficiales son reward_laborys
    // y reward_cash. Los aliases pagos_laborys/pagos_efectivo del `todo`
    // (decimal) fueron removidos del schema backend — ya no es necesario
    // mapearlos aquí. `recompensa` se mantiene como alias de lectura de
    // documentos previos al cleanup (algunos registros antiguos lo usan).
    if (payload.reward_laborys !== undefined) {
      data.reward_laborys = toNumberIfPossible(payload.reward_laborys);
    }
    if (payload.reward_cash !== undefined) {
      data.reward_cash = toNumberIfPossible(payload.reward_cash);
    }
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

    // creador: si viene un id numérico lo usamos tal cual. Si viene un email
    // (string no numérico) o no viene nada, lo resolvemos a un id de Strapi
    // por email — antes, cualquier valor "truthy" no numérico (ej. el email
    // de Auth0 que manda AgregarTarea.jsx: `creador: user?.email`) caía en un
    // `delete data.creador` y el todo se creaba SIN creador. Bug real y
    // grave: can-asignar-tarea.js exige `todo.creador.id === asignador.id`
    // para dejar asignar — con creador siempre vacío, ningún socio podía
    // jamás asignar una tarea creada desde el producto real (solo funcionaba
    // en los scripts de seed, que ponían el id directo).
    const maybeNum = toNumberIfPossible(payload.creador);
    if (typeof maybeNum === "number" && maybeNum > 0) {
      data.creador = maybeNum;
      data.created_by = maybeNum;
    } else {
      const emailParaBuscar = typeof payload.creador === "string" && payload.creador.includes("@")
        ? payload.creador
        : user?.email;
      if (emailParaBuscar) {
        const token = await getToken();
        const strapiUserId = await findStrapiUserIdByEmail(emailParaBuscar, token);
        if (strapiUserId && strapiUserId > 0) {
          data.creador = strapiUserId;
          data.created_by = strapiUserId;
        } else {
          // guardar email para emparejamiento posterior
          data.usuario_email = emailParaBuscar;
          delete data.creador;
        }
      } else {
        delete data.creador;
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
        console.log('Create todo - Token:', token ? 'presente' : 'ausente', 'Payload:', payload);

        const data = await preparePayloadForStrapi(payload);

        // asegurar fecha_publicacion si no viene
        if (!data.fecha_publicacion) data.fecha_publicacion = new Date().toISOString();

        console.log('Data enviada a Strapi:', data);
        console.log('Headers:', buildHeaders(token));

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
    console.log("Update todo - ID:", id, "Token:", token ? "presente" : "ausente", "Updates:", updates);
    const data = await preparePayloadForStrapi(updates);
    const headers = buildHeaders(token);
    console.log("Headers enviados:", headers);
    console.log("Body enviado:", JSON.stringify({ data }));
    
    // Validar transición de estado si se está cambiando
    if (updates.status) {
      const getCurrentRes = await fetch(`${STRAPI_BASE}/api/todos/${id}`, {
        headers: headers,
      });
      if (!getCurrentRes.ok) throw new Error('No se pudo obtener tarea actual');
      const currentJson = await getCurrentRes.json();
      const currentStatus = currentJson.data.attributes.status;
      
      if (!validateTaskStatusTransition(currentStatus, updates.status)) {
        throw new Error(`Transición de estado inválida: ${currentStatus} -> ${updates.status}`);
      }
    }
    
    const res = await fetch(`${STRAPI_BASE}/api/todos/${id}`, {
      method: "PUT",
      headers: headers,
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
  // PAGAR TAREA
  // ---------------------------
  // ⚠️ LEGACY: este método existe por compatibilidad pero en el MVP NO debe
  // usarse para registrar pagos manuales. El flujo canónico es `rateTask`
  // (controller `calificar.js`) que acredita laborys atómicamente en la
  // cartera del usuario. El spec documento-off.md línea 128 dice: "No hay
  // pagos en efectivo en este MVP". Aquí bloqueamos explícitamente la rama
  // `metodo:'efectivo'` para que no deje rastro residual en `pagos_efectivo`.
  // Si necesitas re-habilitar efectivo fuera del MVP, sacar este guardia.
const payTask = useCallback(async (tareaId, payment = {}) => {
  if (payment && payment.metodo === 'efectivo') {
    throw new Error(
      "El pago en efectivo no está habilitado en el MVP. Use `rateTask` para calificar y pagar en laborys."
    );
  }
  setLoading(true);
  setError(null);
  try {
    const token = await getToken();
    const getRes = await fetch(`${STRAPI_BASE}/api/tareas/${tareaId}?populate=todo`, {
      headers: buildHeaders(token),
    });
    if (!getRes.ok) throw new Error(`No se pudo leer tarea`);
    const getJson = await getRes.json();
    const current = getJson.data.attributes || {};
    // Pago manual en laborys: si se usa, se registra en pagos_laborys (no efectivo).
    const field = 'pagos_laborys';
    const arr = Array.isArray(current[field]) ? current[field] : [];
    const next = [...arr, { ...payment, fecha: payment.fecha || new Date().toISOString() }];

    const updateData = {
      [field]: next,
      payment_status: 'procesado',
      status: 'pagada',
    };

    const upd = await fetch(`${STRAPI_BASE}/api/tareas/${tareaId}`, {
      method: 'PUT',
      headers: buildHeaders(token),
      body: JSON.stringify({ data: updateData }),
    });

    if (!upd.ok) throw new Error(`Error registrando pago`);
    const updJson = await upd.json();

    const todoId = current.todo?.data?.id;
    if (todoId) {
      await updateTodo(todoId, { status: 'pagada' });
    }

    return updJson.data;
  } catch (err) {
    handleError(err);
    throw err;
  } finally {
    setLoading(false);
  }
}, [updateTodo]);

  // ---------------------------
  // CALIFICAR TAREA (con pago automático de laborys en backend)
  // ---------------------------
const rateTask = useCallback(async (tareaId, rating = {}) => {
  setLoading(true);
  setError(null);
  try {
    const token = await getToken();

    // Llama al endpoint backend /tareas/calificar que:
    //   - valida permisos (socio/admin)
    //   - guarda la calificación
    //   - acredita laborys en la cartera del usuario
    //   - marca tarea como pagada
    //   - actualiza el todo a pagada
    const res = await fetch(`${STRAPI_BASE}/api/tareas/calificar`, {
      method: 'POST',
      headers: buildHeaders(token),
      body: JSON.stringify({
        tareaId,
        score: rating.score,
        notes: rating.notes || '',
      }),
    });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Error al calificar tarea: ${res.status} ${txt}`);
    }

    const json = await res.json();
    return json.data;
  } catch (err) {
    handleError(err);
    throw err;
  } finally {
    setLoading(false);
  }
}, []);

  // ---------------------------
  // CORREGIR TAREA (verificador solicita corrección)
  // ---------------------------
  const corregirTarea = useCallback(async (tareaId, notes = '') => {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const res = await fetch(`${STRAPI_BASE}/api/tareas/corregir`, {
        method: 'POST',
        headers: buildHeaders(token),
        body: JSON.stringify({ tareaId, notes }),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Error al marcar tarea para corregir: ${res.status} ${txt}`);
      }
      const json = await res.json();
      return json.data || json;
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
    corregirTarea,
  };
}