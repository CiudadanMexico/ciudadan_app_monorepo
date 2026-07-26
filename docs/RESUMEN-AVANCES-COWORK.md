# Avances módulo CoWork (resumen para el equipo)

## ✅ Lo que ya quedó funcionando

- **Permisos reales**: crear/editar/eliminar tareas (`todo`/`tarea`) ahora solo lo pueden hacer usuarios con rol `admin` o `socio`. Antes no había ninguna restricción real en el backend.
- **Resolver tarea**: cualquier usuario con sesión iniciada puede tomar una tarea general o especializada (no hace falta ser admin/socio para esto). Endpoint nuevo y separado, sin tocar el sistema de permisos de arriba.
- **Marcar tarea como completada**: agregamos un botón en "Socio → Tareas" para que el usuario marque su tarea como entregada (pasa a estado `pendiente_revision`).
- **Botón "Editar"** en Tareas Generales: solo visible para admin/socio, ya conectado a datos reales (ya no es mock).
- Arreglamos varios permisos de Strapi que estaban mal configurados desde antes (Areas, Tareas, Todos, Usuarios no cargaban por permisos faltantes) — esto destrababa cosas que ni siquiera eran de Cowork (carrito, notificaciones).
- Reorganizamos el proyecto en un monorepo (`ciudadan_app_monorepo`), con `docs/` documentando todo lo técnico.

## ⚠️ Pendiente / no tocado (a propósito o por alcance)

- **Calificar tarea y pago automático de laborys**: sigue sin conectar. Ya existe el código (`rateTask`/`payTask`) pero no está enlazado a ningún botón, y no se toca hasta que decidamos bien el flujo.
- **Rol Verificador**: no existe todavía, ni el flujo de verificación de documentos/área del usuario.
- **Colección `skills` (habilidades)**: no existe en la base de datos.
- **Subir archivos/avances** en la resolución de una tarea: no implementado.
- **Tareas Generales visibles sin login**: el spec pide que se vean incluso sin sesión; hoy piden login para ver la lista. Pendiente decidir si se cambia.

## 📄 Documentación

Quedó todo documentado en `docs/TAREAS-CRUD-PERMISOS.md` (detalle técnico de permisos) y en este archivo.
