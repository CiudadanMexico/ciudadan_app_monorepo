'use strict';

/**
 * POST /tareas/asignar
 *
 * Un socio (o admin) fija la asignación de un `todo` a un conjunto de
 * usuarios. Es una operación de "edición continua" (Fase 6,
 * README_logica_cowork.md: "se puede agregar más usuarios asignados o
 * quitar usuarios ya asignados"), no de creación de una sola vez:
 *
 *   - Calcula el diff entre los usuarios YA asignados (tareas activas, no
 *     canceladas, ligadas a este todo) y los `userIds` recibidos.
 *   - Usuarios nuevos en la lista → crea su `tarea` (agregar).
 *   - Usuarios que ya no están en la lista → cancela su `tarea`
 *     (status='cancelada') en vez de dejarla huérfana (quitar).
 *   - Usuarios que siguen en la lista → no se tocan (evita duplicar
 *     `tarea` si se llama dos veces con la misma selección).
 *   - Actualiza el `todo`: `asignador` = socio en sesión, `asignado_a` =
 *     primer usuario de la lista final (mantenemos o2o, decisión de diseño:
 *     multi-asignación = N tareas). El `status` solo se mueve a 'asignada'
 *     si la transición es válida desde el estado actual (borrador/publicada);
 *     si el todo ya avanzó más (en_proceso, etc.) no se retrocede su estado.
 *
 * La policy `global::can-asignar-tarea` ya validó:
 *   - Que el socio sea admin o socio.
 *   - Que el socio sea el creador del todo (si no es admin).
 *   - Que cada usuario destino sea asignable según la matriz
 *     agencia-del-asignador × tipo-de-tarea (Fase 6).
 *   - Cacheó el contexto en `ctx.state._asignarContext`.
 */

const ESTADOS_REASIGNABLES_DESDE = ['borrador', 'publicada'];

module.exports = {
  async asignar(ctx) {
    const user = ctx.state.strapiUser;
    if (!user) return ctx.throw(401, 'No autenticado');

    const ctxAsignar = ctx.state._asignarContext;
    if (!ctxAsignar) {
      // La policy debió haber cacheado el contexto; si no, algo va mal.
      return ctx.throw(500, 'Contexto de asignación no disponible');
    }
    const { todo, usuarios } = ctxAsignar;

    const targetIds = usuarios.map((u) => Number(u.id));
    const ahora = new Date().toISOString();

    let tareasCreadas = [];
    let tareasCanceladas = [];
    let todoActualizado;

    // Transacción atómica: el diff completo (altas + bajas + update del
    // todo) se aplica junto; si falla cualquier paso, rollback total.
    await strapi.db.transaction(async () => {
      // Tareas activas actuales de este todo (no canceladas) para calcular
      // el diff. Usamos entityService (no el filtro REST) porque `usuario`
      // es una relación y la ruta find de `tarea` corre con auth:false
      // (spec: visibilidad pública de tareas generales), lo que hace que el
      // validador de filtros por relación de Strapi rechace `filters[usuario]`
      // aunque el usuario esté autenticado — no aplica aquí porque usamos
      // entityService directo, que no pasa por esa validación REST.
      const tareasExistentes = await strapi.entityService.findMany('api::tarea.tarea', {
        filters: { todo: todo.id },
        populate: { usuario: true },
      });

      const activas = tareasExistentes.filter(
        (t) => t.status !== 'cancelada' && t.usuario
      );
      const activasPorUsuarioId = new Map(activas.map((t) => [Number(t.usuario.id), t]));

      const usuariosAAgregar = usuarios.filter((u) => !activasPorUsuarioId.has(Number(u.id)));
      // No se puede "quitar" (cancelar) una tarea que ya fue calificada o
      // pagada — el lifecycle de tarea no permite esa transición (y no
      // tendría sentido revertir un pago ya acreditado). Esas quedan
      // asignadas de facto aunque ya no estén en la lista nueva.
      const NO_CANCELABLES = ['calificada', 'pagada'];
      const tareasAQuitar = activas.filter(
        (t) => !targetIds.includes(Number(t.usuario.id)) && !NO_CANCELABLES.includes(t.status)
      );

      for (const u of usuariosAAgregar) {
        const tarea = await strapi.entityService.create('api::tarea.tarea', {
          data: {
            usuario: u.id,
            todo: todo.id,
            tipo: 'tarea',
            status: 'en_proceso',
            payment_status: 'pendiente',
            resolved_at: ahora,
          },
        });
        tareasCreadas.push(tarea);
      }

      for (const t of tareasAQuitar) {
        const cancelada = await strapi.entityService.update('api::tarea.tarea', t.id, {
          data: { status: 'cancelada' },
        });
        tareasCanceladas.push(cancelada);
      }

      // Actualizamos el todo: asignador = socio, asignado_a = primer destino
      // de la lista final. El status solo avanza a 'asignada' si la
      // transición es válida desde el estado actual (no se retrocede un
      // todo que ya está en_proceso/pendiente_revision/etc.).
      const todoActual = await strapi.entityService.findOne('api::todo.todo', todo.id, {
        fields: ['id', 'status'],
      });
      const dataUpdate = {
        asignador: user.id,
        asignado_a: targetIds[0],
      };
      if (ESTADOS_REASIGNABLES_DESDE.includes(todoActual.status)) {
        dataUpdate.status = 'asignada';
      }

      todoActualizado = await strapi.entityService.update('api::todo.todo', todo.id, {
        data: dataUpdate,
      });
    });

    ctx.body = {
      data: {
        todoId: todo.id,
        todo: todoActualizado,
        tareasCreadas,
        tareasCanceladas,
        asignados: usuarios.map((u) => ({ id: u.id, username: u.username })),
      },
    };
  },
};
