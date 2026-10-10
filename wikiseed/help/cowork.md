# CoWork: Tareas y Laborys

El **CoWork** es el módulo de **trabajo colaborativo** de Ciudadan. Se publican tareas
(`todo`), las resuelves (creas una `tarea`) y al ser **calificada** ganas **laborys** (la
moneda interna de la plataforma).

## Contenido
- [[CoWork#Conceptos básicos|Conceptos básicos]]
- [[CoWork#Áreas y habilidades|Áreas y habilidades]]
- [[CoWork#Cómo trabajar (resolver tareas)|Cómo trabajar (resolver tareas)]]
- [[CoWork#Crear y asignar tareas (socios)|Crear y asignar tareas (socios)]]
- [[CoWork#Gestionar, calificar y apelaciones|Gestionar, calificar y apelaciones]]
- [[CoWork#Laborys y pago|Laborys y pago]]

---

## Conceptos básicos

- **`todo`** = tarea "maestro"/publicada (la definición del trabajo).
- **`tarea`** = tu entrega/resolución contra un `todo`. **No las confundas.**
- **laborys** = moneda interna; se gana al calificarse tu trabajo.
- **área** = categoría superior. **skill** = habilidad (permite tareas especializadas).
- Estados de tu `tarea`: en_proceso → completada → corregir/corregida → calificada → pagada
  (y cancelada). El sistema valida las transiciones.

## Áreas y habilidades

- Hay **5 áreas raíz fijas**: Administrativo, Técnico, Comercial-difusión, Software,
  Creación multimedia. Cada una puede tener **subáreas** (carreras/oficios).
- Las **skills** habilitan tareas especializadas que requieren esa habilidad.
- En tu perfil puedes **proponer** una subárea nueva y **subir verificación** documental.

## Cómo trabajar (resolver tareas)

1. Entra a **`/coowork`**. Ahí ves las tareas por pestañas (generales y especializadas).
2. Elige una tarea que encaje con tus áreas/skills.
3. **Resuelve:** sube tu trabajo (descripción, enlaces, archivos/unidades).
4. Tu `tarea` pasa a **en_proceso**, y cuando la completas → **completada**.
5. Un **socio/verificador** la revisa y puede pedir **corregir**, o **calificar**.
6. Al estar **calificada**, el sistema **paga automáticamente** los **laborys** a tu cartera.

> Ver también: [[CoWork#Laborys y pago|Laborys y pago]] y [[Cartera|Cartera]].

## Crear y asignar tareas (socios)

- **Crear tarea:** `/herramientas/agregar-tarea`. Define:
  - **Título y descripción**.
  - **Área y skill** (requiren ser verificadas por quien la toma).
  - **Tipo**: tarea/subtarea, ámbito (privada/plataforma), nivel, recurrencia.
  - **Recompensa**: `reward_laborys` y/o `reward_cash`.
  - **Fechas**: publicación, entrega, vencimiento.
- **Asignar:** `/herramientas/asignar-tarea` — puedes delegar una tarea a un usuario
  concreto (`asignado_a`).
- **Agencias:** los **socios** se organizan en **agencias** (local/federal). Desde
  `/herramientas/mi-agencia` y `/herramientas/agregar-socio`.

## Gestionar, calificar y apelaciones

| Acción | Ruta |
|---|---|
| Gestionar tareas | `/herramientas/gestionar-tareas` |
| Calificar tarea | `/herramientas/calificar-tarea` |
| Corregir tarea | `/herramientas/corregir-tarea` |
| Resolver apelaciones | `/herramientas/resolver-apelaciones` |
| Habilidades | `/herramientas/gestionar-habilidades` |
| Verificar usuarios | `/herramientas/verificar-usuarios` |

- **Calificar:** un socio/verificador puntúa (score) y la tarea pasa a `calificada` →
  pago automático.
- **Apelaciones:** si no estás de acuerdo con la calificación, apela; un revisor la resuelve.

## Laborys y pago

- **laborys** se acreditan en tu **cartera** (`laborysSaldo`) al calificarse tu tarea
  (lifecycle del backend, no manual).
- Cada tarea declara su **recompensa en laborys** (`reward_laborys`).
- Puedes consultar tu saldo en **[[Cartera|Cartera]]**.
- Pago tanto en laborys como (si aplica) efectivo, según la tarea.

---

**Roles de permiso (info):** `admin`, `socio`, `verificador`, `editor`, `root`. El front
los lee para mostrar acciones. `?mockRole=` es solo vista previa visual (no cambia permisos).

Volver: [[Indice|índice]] · [[Cuenta|Cuenta]] · [[Marketplace|Marketplace]] · [[Gana|Gana]].