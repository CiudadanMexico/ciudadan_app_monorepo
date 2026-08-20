import { fetchJson, STRAPI_URL } from '../../utils/request.utils';

export const createTask = (userId, todoId, token) => {
  if (!userId) return Promise.reject(new Error('Usuario invalido'));
  if (!todoId) return Promise.reject(new Error('Tarea invalida'));

  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  return fetchJson(
    `${STRAPI_URL}/api/tareas`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({
        data: {
          usuario: userId,
          todo: todoId,
          tipo: 'tarea',
        },
      }),
    },
    'No se pudo asignar la tarea'
  );
};

export const updateTodoStatus = (todoId, status, token) => {
  if (!todoId) return Promise.reject(new Error('Todo invalido'));

  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  return fetchJson(
    `${STRAPI_URL}/api/todos/${todoId}`,
    {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        data: { status },
      }),
    },
    'No se pudo actualizar el estado de la tarea'
  );
};

// Resuelve/toma una tarea general o especializada. A diferencia de createTask,
// esta ruta solo exige estar autenticado (no admin/socio), y crea la tarea +
// actualiza el status del todo en un solo paso del lado del servidor.
export const resolverTarea = (todoId, token) => {
  if (!todoId) return Promise.reject(new Error('Tarea invalida'));
  if (!token) return Promise.reject(new Error('Falta el token de autenticación'));

  return fetchJson(
    `${STRAPI_URL}/api/tareas/resolver`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ todoId }),
    },
    'No se pudo asignar la tarea'
  );
};

// Marca una tarea (resolución) del usuario como completada/entregada.
// Solo el dueño de esa tarea puede hacerlo (validado en el backend).
export const completarTarea = (tareaId, token, { notes, enlaces } = {}) => {
  if (!tareaId) return Promise.reject(new Error('Tarea invalida'));
  if (!token) return Promise.reject(new Error('Falta el token de autenticación'));

  const body = { tareaId };
  if (notes !== undefined) body.notes = notes;
  if (enlaces !== undefined) body.enlaces = enlaces;

  return fetchJson(
    `${STRAPI_URL}/api/tareas/completar`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    },
    'No se pudo marcar la tarea como completada'
  );
};

// Califica una tarea (resolución) — solo admin/socio. El backend paga
// automáticamente los laborys al usuario en el lifecycle afterUpdate.
export const calificarTarea = (tareaId, score, notes, token) => {
  if (!tareaId) return Promise.reject(new Error('Tarea invalida'));
  if (!token) return Promise.reject(new Error('Falta el token de autenticación'));

  return fetchJson(
    `${STRAPI_URL}/api/tareas/calificar`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ tareaId, score, notes }),
    },
    'No se pudo calificar la tarea'
  );
};

// Envía una tarea completada a corrección — solo admin/socio/verificador.
export const corregirTarea = (tareaId, notes, token) => {
  if (!tareaId) return Promise.reject(new Error('Tarea invalida'));
  if (!token) return Promise.reject(new Error('Falta el token de autenticación'));

  return fetchJson(
    `${STRAPI_URL}/api/tareas/corregir`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ tareaId, notes }),
    },
    'No se pudo enviar la tarea a corrección'
  );
};

// Apela una tarea calificada — el usuario dueño puede apelar si no está
// conforme con la calificación recibida. Solo aplica si la tarea está en
// estado 'calificada' o 'pagada' y score <= 3 (validado en backend).
// Payload:
//   - tareaId (obligatorio)
//   - motivo (obligatorio, >= 10 chars)
//   - scoreSolicitado (opcional, 1-5; score que el usuario considera justo)
export const apelarTarea = (tareaId, motivo, scoreSolicitado, token) => {
  if (!tareaId) return Promise.reject(new Error('Tarea invalida'));
  if (!motivo || String(motivo).trim().length < 10) {
    return Promise.reject(new Error('El motivo debe tener al menos 10 caracteres'));
  }
  if (!token) return Promise.reject(new Error('Falta el token de autenticación'));

  const body = { tareaId, motivo: String(motivo).trim() };
  if (scoreSolicitado !== undefined && scoreSolicitado !== null && scoreSolicitado !== '') {
    const s = Number(scoreSolicitado);
    if (isNaN(s) || s < 1 || s > 5) {
      return Promise.reject(new Error('scoreSolicitado debe ser un numero entre 1 y 5'));
    }
    body.scoreSolicitado = s;
  }

  return fetchJson(
    `${STRAPI_URL}/api/tareas/apelar`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    },
    'No se pudo apelar la tarea'
  );
};

// Resuelve una apelación abierta (aprobar o rechazar) — solo admin/socio.
// El backend valida policy is-admin-or-socio y que la apelación exista y
// esté 'abierta' o 'en_revision'. Si se aprueba con scoreFinal > scoreActual,
// el backend re-paga atómicamente la diferencia de laborys al usuario.
// Payload:
//   - tareaId (obligatorio)
//   - apelacionId (obligatorio) — id interno del entry en tarea.apelaciones[]
//   - decision: 'aprobada' | 'rechazada' (obligatorio)
//   - notasResolucion (opcional; obligatorio si decision=rechazada)
//   - scoreFinal (opcional, 1-5; si se omite usa scoreSolicitado de la apelación)
// Spec documento-off.md:176 — endpoint /tareas/resolver-apelacion.
export const resolverApelacion = (tareaId, apelacionId, decision, notasResolucion = '', scoreFinal, token) => {
  if (!tareaId) return Promise.reject(new Error('Tarea invalida'));
  if (!apelacionId) return Promise.reject(new Error('Apelacion invalida'));
  if (!decision) return Promise.reject(new Error('decision es requerida'));
  if (!['aprobada', 'rechazada'].includes(decision)) {
    return Promise.reject(new Error("decision debe ser 'aprobada' o 'rechazada'"));
  }
  if (decision === 'rechazada' && !notasResolucion.trim()) {
    return Promise.reject(new Error('notasResolucion es requerido cuando decision=rechazada'));
  }
  if (!token) return Promise.reject(new Error('Falta el token de autenticación'));

  const body = { tareaId, apelacionId, decision, notasResolucion: String(notasResolucion).slice(0, 2000) };
  if (scoreFinal !== undefined && scoreFinal !== null && scoreFinal !== '') {
    const s = Number(scoreFinal);
    if (isNaN(s) || s < 1 || s > 5) {
      return Promise.reject(new Error('scoreFinal debe ser un numero entre 1 y 5'));
    }
    body.scoreFinal = s;
  }

  return fetchJson(
    `${STRAPI_URL}/api/tareas/resolver-apelacion`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    },
    'No se pudo resolver la apelacion'
  );
};

export const assignUserAreas = (userId, areaIds, token = null) => {
  if (!userId) return Promise.reject(new Error('Usuario invalido'));

  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  return fetchJson(
    `${STRAPI_URL}/api/users/${userId}/areas`,
    {
      method: 'PUT',
      headers,
      body: JSON.stringify({ areaIds }),
    },
    'No se pudieron asignar las areas'
  );
};

// Spec 5.3 — "escribirla si no existe": el usuario propone una subárea
// (carrera/oficio) nueva que no existe en la lista. La propuesta se
// guarda en user.area_details.proposed_subareas[] para revisión de
// socio/verificador. No crea el área inmediatamente (solo un socio
// puede hacerlo vía POST /api/areas con policy is-admin-or-socio).
export const proposeSubarea = (userId, areaId, nombre, observaciones = '', token = null) => {
  if (!userId) return Promise.reject(new Error('Usuario invalido'));
  if (!areaId) return Promise.reject(new Error('areaId invalido'));
  if (!nombre || !nombre.trim()) return Promise.reject(new Error('nombre vacio'));

  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  return fetchJson(
    `${STRAPI_URL}/api/users/${userId}/proponer-subarea`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({ areaId, nombre: nombre.trim(), observaciones }),
    },
    'No se pudo proponer la subarea'
  );
};

// Lista las propuestas de subárea que un usuario ha enviado (status
// pending/approved/rejected). Útil para que el socio vea pendientes.
export const listProposedSubareas = (userId, token = null) => {
  if (!userId) return Promise.reject(new Error('Usuario invalido'));

  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  return fetchJson(
    `${STRAPI_URL}/api/users/${userId}/proposed-subareas`,
    { method: 'GET', headers },
    'No se pudieron cargar las propuestas de subarea'
  );
};

// Adjunta un documento (ya subido a Strapi Media Library) al area_details
// propio del usuario. Self-service: antes la subida de documentos en el
// perfil era puramente decorativa (se subía el archivo pero nunca quedaba
// asociado a ninguna área, así que un verificador jamás podía verlo).
export const subirDocumentoArea = (userId, areaId, documento, token = null, observaciones = undefined) => {
  if (!userId) return Promise.reject(new Error('Usuario invalido'));
  if (!areaId) return Promise.reject(new Error('areaId invalido'));
  if (!documento || !documento.nombre || !documento.url) {
    return Promise.reject(new Error('documento invalido (falta nombre o url)'));
  }

  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const body = { areaId, documento };
  if (observaciones !== undefined) body.observaciones = observaciones;

  return fetchJson(
    `${STRAPI_URL}/api/users/${userId}/subir-documento-area`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    },
    'No se pudo subir el documento'
  );
};

// Aprueba o rechaza una propuesta de subárea (solo admin/socio/verificador).
// Al aprobar, el backend crea la subárea real (o reusa una existente con el
// mismo nombre) y la asigna al usuario.
export const revisarSubarea = (userId, { areaId, nombre, decision, motivo }, token = null) => {
  if (!userId) return Promise.reject(new Error('Usuario invalido'));
  if (!areaId || !nombre) return Promise.reject(new Error('areaId y nombre son requeridos'));
  if (!['approved', 'rejected'].includes(decision)) {
    return Promise.reject(new Error('decision debe ser "approved" o "rejected"'));
  }

  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  return fetchJson(
    `${STRAPI_URL}/api/users/${userId}/revisar-subarea`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({ areaId, nombre, decision, motivo }),
    },
    'No se pudo revisar la propuesta de subarea'
  );
};

// Asigna un todo a varios usuarios (Fase 5/6). Usa el endpoint
// POST /tareas/asignar que requiere la policy can-asignar-tarea.
// Da de alta (o actualiza) un usuario como socio miembro de una agencia.
// Solo admin/socio. El backend crea el usuario si no existe (provider auth0).
export const agregarSocio = (agenciaId, { email, username, roles_extra }, token) => {
  if (!agenciaId) return Promise.reject(new Error('Falta el id de la agencia'));
  if (!email) return Promise.reject(new Error('Falta el email del socio'));
  if (!token) return Promise.reject(new Error('Falta el token de autenticación'));

  return fetchJson(
    `${STRAPI_URL}/api/agencias/${agenciaId}/socios`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ email, username, roles_extra }),
    },
    'No se pudo dar de alta al socio'
  );
};

export const asignarTarea = (todoId, userIds, token) => {
  if (!todoId) return Promise.reject(new Error('Todo invalido'));
  if (!Array.isArray(userIds) || userIds.length === 0) return Promise.reject(new Error('userIds debe ser un array no vacío'));
  if (!token) return Promise.reject(new Error('Falta el token de autenticación'));

  return fetchJson(
    `${STRAPI_URL}/api/tareas/asignar`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ todoId, userIds }),
    },
    'No se pudo asignar la tarea'
  );
};

// Sube evidencia (archivos) para una tarea al entregarla. `archivos` es un
// array de objetos File del navegador — se convierten a base64 acá porque
// el endpoint POST /tareas/subir-evidencia espera { nombre, tipo, dataBase64 }
// (mismo shape que valida el controller subir-evidencia.js: máx 10MB por
// archivo, máx 10 archivos, tipos MIME de la whitelist del backend).
const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      const base64 = typeof result === 'string' ? result.split(',')[1] : '';
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

export const subirEvidencia = async (tareaId, archivosFile, notas, token) => {
  if (!tareaId) return Promise.reject(new Error('Tarea invalida'));
  if (!Array.isArray(archivosFile) || archivosFile.length === 0) {
    return Promise.reject(new Error('Debes seleccionar al menos un archivo'));
  }
  if (!token) return Promise.reject(new Error('Falta el token de autenticación'));

  const archivos = await Promise.all(
    archivosFile.map(async (file) => ({
      nombre: file.name,
      tipo: file.type,
      dataBase64: await fileToBase64(file),
    }))
  );

  return fetchJson(
    `${STRAPI_URL}/api/tareas/subir-evidencia`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ tareaId, archivos, notas: notas || '' }),
    },
    'No se pudo subir la evidencia'
  );
};
