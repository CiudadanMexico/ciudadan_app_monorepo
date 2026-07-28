// src/hooks/useTarea.jsx
import { useState, useEffect } from "react";
import { useMembresia } from "./useMembresia.jsx";
import { useRolEditor } from "./useRolEditor.jsx";
import { useAuth0 } from "@auth0/auth0-react";

const STRAPI_URL = process.env.REACT_APP_STRAPI_URL;

export function useTarea() {
  const { user } = useAuth0();
  const tieneMembresia = useMembresia();
  const esEditor = useRolEditor(user?.email);

  const [tareas, setTareas] = useState([]);
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  useEffect(() => {
    fetchTareas();
    fetchAreas();
  }, [pagina, porPagina]);

  // =============================
  // 🔹 Obtener todas las tareas
  // =============================
  async function fetchTareas() {
    try {
      setLoading(true);
      const url = `${STRAPI_URL}/api/todos?populate=agencia,usuario,areas&pagination[page]=${pagina}&pagination[pageSize]=${porPagina}&sort[0]=id:desc`;
      const res = await fetch(url);
      const data = await res.json();

      const items = Array.isArray(data.data) ? data.data : [];
      setTotalItems(data.meta?.pagination?.total || 0);

      const parsed = items.map((item) => {
        const a = item.attributes;
        const usuario = a.usuario?.data;
        const agencia = a.agencia?.data;
        const area = a.areas?.data;

        return {
          id: item.id,
          tipo: a.tipo,
          titulo: a.titulo,
          descripcion: a.descripcion,
          usuario_email: usuario?.attributes?.email || null,
          minutos_desarrollo: a.minutos_desarrollo || 0,
          fecha_entrega: a.fecha_entrega || null,
          vence: a.vence || false,
          pagos_laborys: a.pagos_laborys || 0,
          pagos_efectivo: a.pagos_efectivo || 0,
          agencia: agencia
            ? { id: agencia.id, nombre: agencia.attributes.nombre }
            : null,
          usuario: usuario
            ? { id: usuario.id, nombre: usuario.attributes.username, email: usuario.attributes.email }
            : null,
          area: area
            ? { id: area.id, nombre: area.attributes.nombre, nivel: area.attributes.nivel }
            : null,
        };
      });

      setTareas(parsed);
    } catch (err) {
      console.error("Error al obtener tareas:", err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }

  // =============================
  // 🔹 Obtener Áreas
  // =============================
  async function fetchAreas() {
    try {
      const res = await fetch(`${STRAPI_URL}/api/areas?populate=*`);
      const json = await res.json();
      const parsed = (json.data || []).map((a) => ({
        id: a.id,
        nombre: a.attributes?.nombre || "",
        nivel: a.attributes?.nivel || 0,
      }));
      setAreas(parsed);
    } catch (err) {
      console.error("Error al obtener áreas:", err);
      setError(err);
    }
  }

  // =============================
  // 🔹 Crear Tarea
  // =============================
  async function crearTarea(nuevaTarea) {
    if (!esEditor) throw new Error("Permiso denegado: se requiere rol editor");

    try {
      console.log("💃💃💃 crearTarea iniciada con:", nuevaTarea);

      let usuarioId = null;
      let agenciaId = null;

      // Buscar usuario por email
      if (nuevaTarea.usuario_email) {
        const userRes = await fetch(
          `${STRAPI_URL}/api/users?filters[email][$eq]=${nuevaTarea.usuario_email}`
        );
        const userData = await userRes.json();
        if (Array.isArray(userData) && userData.length > 0) {
          usuarioId = userData[0].id;
        }
      }

      // Buscar agencia (si el valor es string como "cdmx")
      if (nuevaTarea.agencia && isNaN(nuevaTarea.agencia)) {
        const agenciaRes = await fetch(
          `${STRAPI_URL}/api/agencias?filters[nombre][$eq]=${nuevaTarea.agencia}`
        );
        const agenciaData = await agenciaRes.json();
        if (Array.isArray(agenciaData.data) && agenciaData.data.length > 0) {
          agenciaId = agenciaData.data[0].id;
        }
      } else if (!isNaN(nuevaTarea.agencia)) {
        agenciaId = Number(nuevaTarea.agencia);
      }

      const body = {
        data: {
          titulo: nuevaTarea.titulo,
          descripcion: nuevaTarea.descripcion,
          tipo: nuevaTarea.tipo || "tarea",
          minutos_desarrollo: Number(nuevaTarea.minutos_desarrollo) || 0,
          pagos_laborys: Number(nuevaTarea.pagos_laborys) || 0,
          pagos_efectivo: Number(nuevaTarea.pagos_efectivo) || 0,
          vence: nuevaTarea.vence || false,
          fecha_entrega: nuevaTarea.fecha_entrega || null,
          usuario_email: nuevaTarea.usuario_email || null,
          area: nuevaTarea.area ? Number(nuevaTarea.area) : null,
          usuario: usuarioId,
          agencia: agenciaId,
        },
      };

      console.log("💃💃💃 Body final enviado a Strapi:", body);

      const res = await fetch(`${STRAPI_URL}/api/todos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = await res.json();
      console.log("💃💃💃 Respuesta Strapi:", json);

      if (!res.ok) {
        console.error("❌ Error Strapi:", json);
        throw new Error("No se pudo crear la tarea");
      }

      await fetchTareas();
      return json.data;
    } catch (err) {
      console.error("Error al crear tarea:", err);
      setError(err);
      throw err;
    }
  }

  // =============================
  // 🔹 Editar / Eliminar (sin cambios)
  // =============================
  async function editarTarea(id, cambios) {
    try {
      const body = { data: { ...cambios } };
      const res = await fetch(`${STRAPI_URL}/api/todos/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("No se pudo editar la tarea");
      await fetchTareas();
    } catch (err) {
      console.error("Error al editar tarea:", err);
      setError(err);
    }
  }

  async function eliminarTarea(id) {
    try {
      const res = await fetch(`${STRAPI_URL}/api/todos/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("No se pudo eliminar la tarea");
      await fetchTareas();
    } catch (err) {
      console.error("Error al eliminar tarea:", err);
      setError(err);
    }
  }

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
    tieneMembresia,
    esEditor,
    pagina,
    setPagina,
    porPagina,
    setPorPagina,
    totalItems,
  };
}
