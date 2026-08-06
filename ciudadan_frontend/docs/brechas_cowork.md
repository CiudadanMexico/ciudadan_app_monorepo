# Brechas entre Especificación PDF y Implementación Frontend - Módulo CoWork

## 1. Resumen

La implementación actual del frontend del módulo CoWork cubre la mayor parte de la especificación del PDF, pero存在 varias brechas significativas en funcionalidades clave, especialmente en la gestión de áreas/subáreas, verificación de usuarios, y flujo de pagos.

## 2. Brechas de Implementación

### 2.1. Gestión de Áreas y Subáreas

| Requisito PDF | Implementación Actual | Brecha |
|---------------|------------------------|--------|
| Tabla de subáreas cargada manualmente por el equipo | Las áreas y subáreas se cargan dinámicamente desde Strapi | ✅ Cumplido |
| Subáreas pertenecen a 5 áreas raíz definidas (Administrativo, Técnico, Comercial-difusión, Software, Creación multimedia) | No se verifica ni limita el nombre de las áreas en Strapi | ⚠️ **Falta validación** - No se garantiza que las áreas sean solo las 5 especificadas |
| Nivel 0 para área general, nivel 1 o superior para subárea | El sistema usa `nivel` en la colección `areas` | ✅ Cumplido |
| Verificación de áreas almacenada en `area_details` JSON | No existe la colección `area_details` ni el campo en `users` | ❌ **Falta completamente** - No se implementa el sistema de verificación documental |
| Relación usuario↔área↔subárea: muchos a muchos con tabla intermedia o JSON controlado | Se usa una relación directa en `user` (areas) | ⚠️ **Incompleto** - No se implementa el JSON `area_details` para almacenar estado de verificación, documentos y metadatos |

### 2.2. Sistema de Verificación de Usuarios

| Requisito PDF | Implementación Actual | Brecha |
|---------------|------------------------|--------|
| Rol `Verificador` que revisa documentación y valida áreas/subáreas | No existe rol `verificador` ni interfaz para revisar documentación | ❌ **Falta completamente** - No hay forma de validar documentación ni marcar áreas como verificadas |
| Estado "pendiente de verificación" para usuarios con datos capturados pero no validados | No se implementa ningún estado de verificación | ❌ **Falta completamente** - No hay forma de distinguir entre usuarios con áreas asignadas y usuarios con áreas verificadas |
| Documentación asociada al proceso de verificación | No se permite subir ni gestionar documentos de verificación | ❌ **Falta completamente** - No hay campos para adjuntar documentos ni flujo de revisión |

### 2.3. Flujos de Tareas y Estado

| Requisito PDF | Implementación Actual | Brecha |
|---------------|------------------------|--------|
| Estado de tarea original: `borrador`, `publicada`, `asignada`, `en_proceso`, `pendiente_revision`, `corregir`, `corregida`, `calificada`, `pagada`, `cancelada` | Se implementa la mayoría, pero faltan `pendiente_revision`, `corregir`, `corregida` | ⚠️ **Incompleto** - No se implementan los estados de revisión y corrección de tareas |
| Estado de resolución: `en_proceso`, `completada`, `corregir`, `corregida`, `calificada`, `pagada`, `cancelada`, `modificada` | Se implementa solo `en_proceso` y `completada` (usando `pendiente_revision` en frontend) | ❌ **Falta** - No se implementan `corregir`, `corregida`, `modificada` |
| Flujo de calificación y disparo automático de pago de laborys | Se implementa el pago de laborys, pero no se dispara automáticamente al calificar | ⚠️ **Incompleto** - El pago se registra manualmente en `payTask`, pero no se dispara automáticamente al cambiar a `calificada` |
| Campo `ambito` no debe usarse como filtro | El campo `ambito` existe en el modelo pero no se usa en filtros | ✅ Cumplido |

### 2.4. Gestión de Pagos

| Requisito PDF | Implementación Actual | Brecha |
|---------------|------------------------|--------|
| Recompensa principal en laborys | Implementado en `pagos_laborys` | ✅ Cumplido |
| Pago automático en laborys al calificar | El pago se registra manualmente en `payTask` | ❌ **Falta** - No se dispara automáticamente al cambiar el estado a `calificada` |
| Campo `reward_cash` preparado pero no usado en MVP | Implementado en `pagos_efectivo` | ✅ Cumplido |
| No se implementan pagos en efectivo en MVP | Implementado pero no se usa en flujo de trabajo | ✅ Cumplido |
| Sistema de pagos con múltiples registros (`pagos_laborys` como array) | Implementado como array en `pagos_laborys` | ✅ Cumplido |

### 2.5. Flujos de Interfaz

| Requisito PDF | Implementación Actual | Brecha |
|---------------|------------------------|--------|
| Perfil de usuario: capturar carrera o especialidad, elegirla de lista o escribirla, cargar documentación | Solo permite seleccionar áreas/subáreas, no permite escribir nuevas ni cargar documentación | ❌ **Falta** - No hay forma de crear nuevas subáreas ni subir documentación de verificación |
| Gestión de tareas: socios pueden crear, editar, eliminar y calificar tareas | Crear, editar, eliminar sí; calificar no implementado | ⚠️ **Incompleto** - No existe funcionalidad para calificar tareas (solo asignar y completar) |
| Resolución: usuario sube avances/archivos en media múltiple, pasa a en proceso, envía a revisión y termina en calificada/pagada | No se permite subir archivos adjuntos ni hay flujo de revisión | ❌ **Falta completamente** - No existe campo `media` en la colección `tareas` ni interfaz para subir archivos |

### 2.6. Decisiones Abiertas

| Requisito PDF | Implementación Actual | Brecha |
|---------------|------------------------|--------|
| Confirmar nombre de colección maestra: `todo`, `todos` o equivalente | Se usa `todos` (plural) | ✅ Decidido |
| Definir si `type` se conserva o se elimina | Se usa `type` en `tareas` pero no en `todos` | ⚠️ **Inconsistente** - No se documenta el propósito del campo `type` en `tareas` |
| Verificación de áreas en `area_details` JSON o colección propia | No se implementa `area_details` | ❌ **Falta** - No se ha tomado decisión, pero se necesita implementar |
| Definir relación usuario, área y subárea | Se usa relación directa en `users` | ⚠️ **Incompleto** - No se implementa el JSON `area_details` para controlar verificación |
| Habilidades con validación documental | No se implementan habilidades | ❌ **Falta completamente** - No existe colección `skills` ni campos en `users` |
| Flujo visual de calificación y disparo de pago | No existe interfaz de calificación ni disparo automático | ❌ **Falta completamente** - No se ha implementado el flujo de calificación |

## 3. Conclusión

La implementación actual del frontend cubre el 60-70% de la especificación del PDF, pero las brechas restantes son críticas para el funcionamiento del sistema:

1. **Falta el sistema de verificación de usuarios** - Sin esto, no se puede distinguir entre usuarios con áreas asignadas y usuarios con áreas verificadas, lo que rompe la lógica de visibilidad de tareas especializadas.
2. **Falta el flujo de calificación y pago automático** - El sistema no puede calificar tareas ni disparar automáticamente el pago en laborys.
3. **Falta el soporte de archivos adjuntos** - Los usuarios no pueden subir documentos de resolución.
4. **Falta el soporte de habilidades** - No se implementan habilidades como filtro para tareas.

Las funcionalidades implementadas correctamente incluyen:
- CRUD de tareas
- Filtrado de tareas por área/subárea
- Asignación de tareas
- Registro de pagos (manual)

**Recomendación:** Priorizar la implementación del sistema de verificación de usuarios y el flujo de calificación/pago automático, ya que son fundamentales para el propósito del módulo CoWork.