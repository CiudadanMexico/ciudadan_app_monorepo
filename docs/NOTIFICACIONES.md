# Notificaciones — Guía de uso

> **Para agents y humanos.** Fuente única para añadir avisos y notificaciones
> en Ciudadan usando **únicamente `useNotifications()`**.
>
> Última verificación: 2026-09-28 · rama `feature/adrian2-notificaciones` ·
> backend Strapi `4.25.9` · socket-service (Socket.IO) separado.

## Índice

1. [TL;DR](#tldr)
2. [Las dos cosas que hay: toast vs notificación persistente](#dos-cosas)
3. [API pública de `useNotifications()`](#api-publica)
4. [Uso con ejemplos](#ejemplos)
5. [Flujo interno](#flujo)
6. [Endpoints del backend](#endpoints)
7. [Modelo en Strapi](#modelo)
8. [Contrato de Socket.IO](#socket)
9. [Tipos de notificación (`type`)](#tipos)
10. [Mapa de ficheros](#ficheros)
11. [Cómo probarlo](#probar)
12. [Convenciones / qué NO hacer](#no-hacer)
13. [Deuda técnica conocida](#deuda)
14. [Troubleshooting](#troubleshooting)

---

<a name="tldr"></a>
## 1. TL;DR

```jsx
import { useNotifications } from "path/al/Contexts/NotificationsContext";

const { toast, send } = useNotifications();

// aviso efímero local (no persiste)
toast.success("Cambios guardados");

// notificación persistente: se guarda en Strapi y llega en tiempo real
await send({
  to: usuario.email,
  title: "Tarea aprobada",
  message: "Tu tarea fue revisada y aprobada.",
  type: "task.approved",
  link: "/cartera/tareas/123",
});
```

Pantallas: `/notificaciones` (listado completo) · `/notificacion/:id` (detalle)
· `/notificationtester` (pantalla de pruebas).

---

<a name="dos-cosas"></a>
## 2. Las dos cosas que hay

| | **A. Toast** | **B. Notificación persistente** |
|---|---|---|
| Para qué | avisar al usuario **actual** que algo pasó | comunicar algo que debe **quedarse** y poder revisarse luego |
| Persiste | No (desaparece en unos segundos) | **Sí** (base de datos) |
| Tiempo real | No | Sí (Socket.IO) |
| API | `toast.success/error/warning/info/default` | `send({...})` |
| Dónde se ve | donde estés | campanita del NavBar, `/notificaciones`, y al recargar la página |

**Ambas cosas viven en el mismo contexto**: `useNotifications()`. Los componentes
**no necesitan** saber Strapi, Socket.IO ni notistack.

---

<a name="api-publica"></a>
## 3. API pública de `useNotifications()`

```js
const {
  // estado
  notifications,   // [{ id, title, message, type, link, icon, image, read, createdAt, meta }]
  unreadCount,     // number — derivado de `notifications` (filter(!read).length)
  loading,         // boolean
  error,           // string | null

  // acciones
  toast,           // { success, error, warning, info, default }
  send,            // async (payload) => notificación creada (normalizada)
  refresh,         // async () => vuelve a pedir la lista al backend
  fetchById,       // async (id) => notificación | null (local primero, luego backend)
  markAsRead,      // async (id | ids[], read = true)  — idempotente, optimista
  markAsUnread,    // async (id)  = markAsRead(id, false)
  markAllAsRead,   // async ()    — endpoint masivo, sólo este usuario

  // legacy alias - migrate gradually
  notificaciones,            // = notifications
  refreshNotificaciones,     // = refresh
  fetchNotificationById,     // = fetchById
} = useNotifications();
```

### Firmas y comportamiento

| Función | Devuelve | Comportamiento |
|---|---|---|
| `toast.success(mensaje, options?)` | id de notistack | `options` se mezcla y gana (p. ej. `{ autoHideDuration: 6000 }`) |
| `send(payload)` | `Promise<notificación normalizada>` | **lanza** `Error` si falta `to`, si falta `title`/`message`, si el destinatario no existe (404) o si no hay sesión (403) |
| `refresh()` | `Promise<lista \| null>` | reemplaza la lista por la del servidor; **en error conserva** la lista en memoria y rellena `error` |
| `fetchById(id)` | `Promise<notificación \| null>` | primero en memoria, si no está va a backend y la inserta en el estado |
| `markAsRead(id)` | `Promise<void>` | actualiza **ya** en pantalla, pide al backend y, si falla, resincroniza con `refresh()` |
| `markAllAsRead()` | `Promise<void>` | `POST /mark-all-read` (sólo el usuario autenticado) |

> Los alias legacy existen **sólo** para no romper componentes antiguos.
> Todo código nuevo usa `notifications` / `refresh` / `fetchById`.

---

<a name="ejemplos"></a>
## 4. Uso con ejemplos

### 4.1 Toast

```jsx
const { toast } = useNotifications();

toast.success("Cambios guardados");
toast.error("No se pudo guardar");
toast.warning("Falta completar información");
toast.info("Buscando conductor...");
toast.default("Aviso genérico");

// con options (se pasan a notistack)
toast.success("Guardado", { autoHideDuration: 6000, persist: true });
```

### 4.2 Enviar una notificación persistente

```jsx
const { send } = useNotifications();

await send({
  to: usuario.email,                    // obligatorio
  title: "Nueva tarea",                 // title o message (al menos uno)
  message: "Tienes una tarea pendiente.",
  type: "task.created",                 // opcional
  link: `/cartera/tareas/${task.id}`,   // opcional
});
```

Con todos los campos:

```jsx
await send({
  to: usuario.email,
  title: "Nuevo viaje",
  message: "Tienes una nueva solicitud de viaje.",
  type: "taxi.trip.request",
  link: `/taxis/viajes/${123}`,
  icon: "taxi",
  image: null,                 // URL string → ver deuda en §13
  meta: { tripId: 123 },
});
```

Manejo de errores:

```jsx
try {
  await send({ to, title, message });
  toast.success("Notificación enviada");
} catch (err) {
  toast.error(err.message);   // "Se requiere title o message" / "Forbidden" / 404
}
```

### 4.3 Listado y contador

```jsx
const { notifications, unreadCount, loading } = useNotifications();

if (loading) return <Spinner />;

notifications.map((n) => (
  <Row key={n.id} title={n.title} body={n.message} read={n.read} />
));
// <Badge>{unreadCount}</Badge>
```

### 4.4 Marcar como leída

```jsx
const { markAsRead, markAsUnread, markAllAsRead } = useNotifications();

await markAsRead(notif.id);     // idempotente: marcar dos veces no rompe nada
await markAsRead([id1, id2]);   // compat: acepta arrays (peticiones en paralelo)
await markAsUnread(notif.id);   // desmarcar (PUT ?read=false)
await markAllAsRead();          // masivo en backend, sólo este usuario
```

### 4.5 Abrir `/notificacion/:id` directo (sin cargar la lista antes)

```jsx
const { fetchById, markAsRead } = useNotifications();

const notif = await fetchById(id);   // estado local primero, luego backend
if (!notif) return <NoEncontrada />;
if (!notif.read) await markAsRead(id);
```

---

<a name="flujo"></a>
## 5. Flujo interno

```
send({ to, title, message, ... })
  │
  ├─ validateSendPayload()               utils/notifications.helpers.js
  ├─ POST /api/notificaciones/send       services/notifications.js
  │     ├─ policy is-authenticated-auth0 → ctx.state.strapiUser
  │     ├─ service.createForUser()       → Strapi entityService.create   (persiste)
  │     ├─ service.toPublicNotification()→ DTO público
  │     └─ service.emitRealtime()        → POST http://<socket>:33035/notifica (best-effort)
  │                                            └─ io.to(email).emit('notification', dto)
  └─ respuesta { data: dto, meta: { realtime } }
        └─ upsertNotification() → notifications[]   (sin duplicar por id)

socket 'notification' → normalizeNotification() → upsertNotification() → toast.info(...)
```

Puntos clave:

- **Un solo socket.io**, vive en `NotificationsContext`. Se registra en su room
  en **cada** `connect` (también tras reconectar) y se limpia al desmontar.
- **El contador no se mantiene a mano**: `unreadCount` se deriva de la lista.
- **Sin `refresh()` tras cada socket**: si ya llegó completa, no se pide de nuevo.
- **La emisión al socket es best-effort**: si el socket-service está caído, la
  notificación ya quedó guardada y se verá al refrescar.

---

<a name="endpoints"></a>
## 6. Endpoints del backend

Todos los nuevos están en
`ciudadan_backend_26/src/api/notificacion/routes/01-notificacion-auth0.js`
con `auth: false` + `policies: ['global::is-authenticated-auth0']`
(ese es el patrón del repo: la policy valida el Bearer de Auth0 contra
`/userinfo` y deja el usuario en `ctx.state.strapiUser`).

**Requieren `Authorization: Bearer <token Auth0>`.**

| Método | Path | Uso | Éxito |
|---|---|---|---|
| GET | `/api/notificaciones/me` | identidad del usuario (la usa el socket-service para resolver el room) | `200 {data:{id,email}}` |
| GET | `/api/notificaciones/mine?limit=100` | listado propio | `200 {data:[...], meta:{count}}` |
| GET | `/api/notificaciones/mine/:id` | detalle (permite `/notificacion/:id`) | `200 {data}` / `404` |
| POST | `/api/notificaciones/send` | **crear + emitir** (flujo único) | `200 {data, meta:{realtime}}` |
| PUT | `/api/notificaciones/:id/read` | marcar leída (idempotente) | `200 {data}` |
| PUT | `/api/notificaciones/:id/read?read=false` | marcar no leída | `200 {data}` |
| POST | `/api/notificaciones/mark-all-read` | masivo del propio usuario | `200 {data:{updated,unreadLeft}}` |

Errores: `401/403` sin token o token inválido · `400` sin `to` o sin
`title`/`message` · `404` destinatario inexistente o notificación no propia.

**Conservadas sin cambios:** las rutas core de Strapi
(`/api/notificaciones`, `/api/notificaciones/:id`) para no romper compatibilidad.
Ojo: **el rol público no tiene permisos de `notificacion`**, por eso responden
403 sin token — usa siempre las rutas de arriba.

Llamada directa con `curl`:

```bash
TOKEN="<access token de Auth0>"
curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:33032/api/notificaciones/mine?limit=5" | jq

curl -s -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"to":"yo@ejemplo.com","title":"Hola","message":"Prueba","type":"system.info"}' \
  "http://localhost:33032/api/notificaciones/send" | jq
```

Endpoint interno (sólo Strapi → socket-service, no usar desde el frontend):

```
POST http://<socket-host>:33035/notifica
{ "email": "destinatario@mail.com", "notification": {…DTO…}, "broadcast": false }
```

---

<a name="modelo"></a>
## 7. Modelo en Strapi

Content type: **`api::notificacion.notificacion`**
→ `ciudadan_backend_26/src/api/notificacion/content-types/notificacion/schema.json`
· tabla MySQL `notificaciones` · `draftAndPublish: true`.

| Campo | Tipo | Notas |
|---|---|---|
| `titulo` | string | título de la notificación (añadido en esta rama) |
| `cuerpo` | **blocks** | el `message` en texto plano se convierte a bloques en el backend |
| `usuario` | **manyToOne** → `users-permissions.user` | antes era `oneToOne`: un usuario sólo podía tener 1 notificación |
| `user_email` | string | email denormalizado; se rellena siempre |
| `tipo` | string | ver §9 (`task.approved`, …) |
| `link` | string | destino al pulsar |
| `icono` | string | icono opcional |
| `imagen` | media (multiple) | media subida a Strapi |
| `meta` | json | metadatos libres (`{tripId: 123}`) — añadido en esta rama |
| `leida` | boolean | **fuente de verdad de "leída" en la UI** |
| `status` | enum `entregada/leida/borrada` | se mantiene sincronizado con `leida` al escribir |
| `timestamp` | datetime | |

> ⚠️ `draftAndPublish` está activo: el backend fija `publishedAt` al crear.
> Si alguna vez creas una notificación a mano y no aparece, es borrador.

---

<a name="socket"></a>
## 8. Contrato de Socket.IO

Servicio aparte: `ciudadan_backend_26/socket-service` (Express + Socket.IO,
`SOCKET_PORT=33035`, proceso separado de Strapi).

**Cliente → servidor**

| Evento | Payload | Cuándo |
|---|---|---|
| (handshake) | `auth: { token }` | en `io(SOCKET_URL, { auth: cb => cb({ token }) })` — token **fresco** en cada (re)conexión |
| `register` | `{ token, email }` | en cada `connect` |

**Servidor → cliente**

| Evento | Payload |
|---|---|
| `notification` | el **mismo DTO** que devuelve `POST /send`: `{id, titulo, cuerpo, tipo, link, icono, imagen, leida, status, meta, timestamp, createdAt, updatedAt}` |

Reglas del servidor:

1. El room es **el email**. El servidor lo resuelve llamando a
   `GET /api/notificaciones/me` con el token (identidad **verificada** por
   Auth0), **ignorando** el `email` que reclame el cliente.
2. **Nunca hay broadcast global por defecto**: si no hay destinatario y no llega
   `broadcast: true`, `/notifica` responde **400**.
3. Si el token no valida, el cliente **no entra a ningún room**. Existe un
   escape hatch de desarrollo `SOCKET_ALLOW_LEGACY_REGISTER=true` en el `.env`
   del backend (apagado por defecto) — sólo para depurar.

Comprobación rápida de que el room funciona:

```bash
curl -s http://localhost:33035/socket.io/?EIO=4\&transport=polling   # 200 = vivo
tail -f /home/ubuntu/logs/ciudadan-socket.log | grep -i 'room\|identity'
```

---

<a name="tipos"></a>
## 9. Tipos de notificación (`type`)

No hay enum: **es un string libre** y está preparado para valores tipo:

```
task.created · task.approved · task.rejected
wallet.payment.received · wallet.payment.sent
taxi.trip.request · taxi.trip.accepted · taxi.trip.cancelled
agency.invitation · agency.task.created
system.info · system.warning
```

Convención: `area.accion` en minúsculas. No hay lógica por tipo todavía (sólo
se guarda y se muestra); si la necesitas, añádela en el normalizador o en la UI
sin tocar el contrato.

---

<a name="ficheros"></a>
## 10. Mapa de ficheros

> Los paths de las dos tablas son **relativos a la raíz de su proyecto**:
> los de *Frontend* a `ciudadan_frontend/` y los de *Backend* a
> `ciudadan_backend_26/`.

**Frontend (los que importan para añadir features)**

| Fichero | Qué hay |
|---|---|
| `src/Contexts/NotificationsContext.jsx` | **la fachada**: estado, socket, `toast`, `send`, `refresh`, `fetchById`, `markAsRead`, `markAllAsRead` |
| `src/utils/normalizeNotification.js` | normalizador único (Strapi / socket / legado → `{id,title,message,…}`) |
| `src/utils/notifications.helpers.js` | `upsertNotification`, `countUnread`, `validateSendPayload` |
| `src/services/notifications.js` | HTTP puro con `fetchJson` (sin estado React) |
| `src/components/NavBar/NotificationsIcon.jsx` | campana + contador |
| `src/components/NavBar/NotificationsMenu.jsx` | desplegable de la campana |
| `src/Pages/Notificacions.jsx` | listado completo `/notificaciones` |
| `src/Pages/Notificacion.jsx` | detalle `/notificacion/:id` |
| `src/components/Testers/NotificationTester.jsx` | pruebas `/notificationtester` |
| `src/index.js` | orden de providers (**`SnackbarProvider` envuelve a `NotificationsProvider`**) |

**Backend**

| Fichero | Qué hay |
|---|---|
| `src/api/notificacion/routes/01-notificacion-auth0.js` | las 6 rutas nuevas con policy Auth0 |
| `src/api/notificacion/routes/notificacion.js` | rutas core de Strapi (sin tocar) |
| `src/api/notificacion/controllers/notificacion.js` | `me`, `mine`, `mineOne`, `send`, `markRead`, `markAllRead` + DTO |
| `src/api/notificacion/services/notificacion.js` | crear, listar, marcar, `emitRealtime`, `toPublicNotification` |
| `src/api/notificacion/content-types/notificacion/schema.json` | modelo |
| `src/policies/is-authenticated-auth0.js` | policy reutilizada (no inventar otra) |
| `src/utils/auth0-verify.js` | caché de `/userinfo` (no re-lanzar en el `catch`, §13.3) |
| `socket-service/routes/notifica.js` | emisión **sólo al room** |
| `socket-service/server.js` | `register` con identidad verificada |

---

<a name="probar"></a>
## 11. Cómo probarlo

### Servicios necesarios

```bash
tmux ls      # debe haber: ciudadan-backend, ciudadan-frontend, ciudadan-socket
# si falta algo (idempotente, no mata sesiones existentes):
bash /home/ubuntu/runners/start-sessions.sh
```

| Servicio | Local | Comprobación |
|---|---|---|
| backend | http://localhost:33032 | `GET /_health` → `204` |
| frontend | http://localhost:3001 | `GET /` → `200` |
| socket | http://localhost:33035 | `GET /socket.io/?EIO=4&transport=polling` → `200` |

### Manual en el navegador (los 7 casos)

> **Estado: ✅ verificado el 2026-09-28** por pruebas manuales del equipo sobre
> esta misma rama: toast, `send`, persistencia tras recarga, marcado individual
> y masivo con el contador, carga directa en `/notificacion/:id` y
> reconexiones sin duplicados → **todo OK**.

1. Abre `https://frontend-adrianperez2.ciudadan.org/notificationtester` (inicia sesión).
2. Botón **toast** → aviso arriba a la derecha, **no persiste**.
3. Botón **send(...)** → toast de éxito, **sube el contador**, llega un toast con
   la notificación y aparece en el menú y en `/notificaciones`.
4. **Recarga** → la notificación sigue ahí (persiste).
5. **Marcar como leída** → cambia el chip y **baja el contador**; recarga → sigue leída.
6. **Marcar todas como leídas** → `unreadCount = 0`; recarga → sigue en 0.
7. Abre `/notificacion/<id>` en una **pestaña nueva** (URL directa, sin lista en
   memoria) → carga sin alert.
8. Varias recargas / reconexiones → sin duplicados ni `connect_error` repetidos.

> El **Caso A/B (dos usuarios distintos)** necesita un segundo usuario
> autenticado; a nivel de socket está cubierto por el test automático de la
> sección *Automatizados* de más abajo.

### Automatizados

```bash
node /tmp/test-notifica-route.js      # contrato /notifica, io simulado → 9/9
node /tmp/test-notif-e2e.js           # A recibe, B NO (Caso 2)        → 7/7
node /tmp/test-notif-seguridad.js     # token inválido no entra al room → 2/2
node /tmp/test-notif-http.js "<ACCESS_TOKEN_AUTH0>"   # Casos 1/3/4/5 (opcional, para regresión)
```

> Los scripts viven en `/tmp` de la máquina de dev (fuera del repo); se
> regeneran a partir de este documento en unos minutos.

---

<a name="no-hacer"></a>
## 12. Convenciones / qué NO hacer

1. **No importes `useSnackbar()`** en componentes nuevos para avisos → usa
   `const { toast } = useNotifications()`.
2. **No abras otro socket**: el único `io()` de notificaciones vive en
   `NotificationsContext`. `src/hooks/useNotificationsSocket.jsx` se eliminó
   (nadie lo usaba) — no lo reintroduzcas.
3. **No llames a `POST /notifica` desde el frontend**: es un endpoint interno
   (Strapi → socket-service). Usa `send()`.
4. **No filtres `titulo || title` ni `mensaje || cuerpo`**: pasa todo por
   `normalizeNotification()` y trabaja con `title`/`message`/`read`/`createdAt`.
5. **No lleves contadores locales de no leídas**: `unreadCount` ya se deriva de
   la lista (sin `baselineUnread` ni `optimisticRef`).
6. **No escribas `leida` y `status` a mano**: usa los endpoints; el backend los
   mantiene sincronizados (`leida=true` ⇔ `status=leida`).
7. **No hagas broadcast global por defecto** (fuga de datos). Si algún día hace
   falta avisar a todos: `broadcast: true` **explícito** + autorización.
8. **No hardcodees emails ni URLs**: usa `REACT_APP_STRAPI_URL`,
   `REACT_APP_SOCKET_URL` y `user.email`.
9. **No cambies el orden de providers** en `src/index.js`: `SnackbarProvider`
   **envuelve** a `NotificationsProvider` (si no, `useSnackbar()` lanza
   excepción y la app entera revienta).
10. **No crees un segundo content type** de notificaciones ni otro cliente HTTP:
    reutiliza `api::notificacion.notificacion` y `fetchJson`.
11. **No hagas `refresh()` tras cada evento de socket**: la notificación ya
    llega completa; sólo pide de nuevo si de verdad no la tienes.
12. **No guardes estado en el servicio** (`src/services/notifications.js`): ahí
    sólo vive HTTP. El estado es cosa del contexto.

---

<a name="deuda"></a>
## 13. Deuda técnica conocida

1. **La verificación con token real ya se hizo** (2026-09-28, en navegador):
   el cliente registra su room con el token de Auth0 y los Casos 1/3/4/5
   funcionan. Falta **automatizarla**: `test-notif-http.js` no corre en CI
   (vive en `/tmp` de la máquina de dev) — sirve para regresión.
2. **`send()` no restringe quién puede notificar a quién**: cualquier usuario
   autenticado puede enviar a cualquier email. Falta autorización por dominio
   (p. ej. sólo agencias/admin pueden invitar).
3. **`image` como URL externa** se guarda en `meta.image`, no en el campo
   `media` de Strapi (crear media desde una URL exige el pipeline de uploads).
4. **Sin lógica por `type`** (§9) y sin paginación server-side: se piden hasta
   500 notificaciones en una sola llamada.
5. **`SOCKET_ALLOW_LEGACY_REGISTER`** es una vía de escape de desarrollo: si
   está `true` y la identidad no valida, se acepta el email reclamado. Mantener
   `false` fuera de desarrollo.
6. **Sólo hay 1 usuario en la BD de dev**, así que el escenario A/B se prueba a
   nivel de socket, no con usuarios reales.
7. **Bug de OOM en la máquina de dev**: `npm run build` con el dev server
   levantado mata al dev server en VMs de ≤6 GB.

---

<a name="troubleshooting"></a>
## 14. Troubleshooting

| Síntoma | Causa | Solución |
|---|---|---|
| `403 Forbidden` en `/api/notificaciones/*` | falta el Bearer de Auth0 | añade `Authorization: Bearer $TOKEN`; en navegador comprueba `isAuthenticated` |
| La campana no sube / `notifications` vacío | el fetch falló y `error` está relleno | imprime `useNotifications().error` y mira el log del backend |
| No llega toast ni notificación en tiempo real | el cliente no entró al room | mira `/home/ubuntu/logs/ciudadan-socket.log`: `registro legacy deshabilitado` / `token no verificado` = el token no validó |
| Reciben todos los usuarios | alguien re-introdujo un `io.emit` global en `notifica.js` | no debe pasar; sólo `broadcast: true` emite en global |
| `cuerpo` sale vacío en la UI | estás leyendo la entidad cruda | usa `normalizeNotification()` (convierte los blocks a texto) |
| El contador no baja tras recargar | había un contador local duplicado | `unreadCount` se deriva; revisa `refresh()` y `meta.realtime` |
| `Cannot read properties of undefined (reading 'useSnackbar')` | orden de providers cambiado | restaura el orden de `src/index.js` (`SnackbarProvider` envuelve) |
| Creada pero no aparece en el listado | quedó como borrador (`draftAndPublish`) | el backend fija `publishedAt` al crear — no lo quites |
| El backend se tumba con un token viejo | `throw` dentro de un `.catch()` | ya corregido en `src/utils/auth0-verify.js`; no reintroducirlo |
| El dev server muere con `npm run build` | OOM en ≤6 GB | no los ejecutes a la vez; relanza con `tmux new-session -d -s ciudadan-frontend 'bash /home/ubuntu/runners/run-frontend.sh'` |

---

## Ver también

- `AGENTS.md` → *Architecture & Key Docs* (este documento) y
  *Domain Concepts* → **notificación**.
- `docs/07-Variables-de-Entorno.md` → variables `REACT_APP_STRAPI_URL`,
  `REACT_APP_SOCKET_URL`, `SOCKET_PORT`, `CORS_ORIGINS`.
- `docs/04-Servicios-Auxiliares.md` → socket-service (puertos y proceso aparte).
