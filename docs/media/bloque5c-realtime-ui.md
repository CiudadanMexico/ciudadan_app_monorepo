# Bloque 5C — REALTIME + Centro Multimedia MVP

Fecha: 2026-10-08 · Rama: `feature/media-realtime-ui` (sobre 5B
`feature/media-api-integration`).

## 1. Socket architecture

- **Servidor Socket.IO en el backend Strapi** (el PRIMERO del backend):
  attach a `strapi.server.httpServer` (MISMO puerto 33432, path
  `/socket.io`), usando la dependencia `socket.io ^4.8.1` ya presente en
  package.json (sin instalar nada nuevo). Archivo:
  `ciudadan_backend_26/src/sockets/media-socket.js` (idempotente para
  hot-reload).
- NO se creó un segundo servidor WebSocket: el socket de Taxis es un
  microservicio separado (:33035, no corriendo); websockify (OpenClaw
  noVNC, :3001) NO se toca. NO se instaló otro framework.
- CORS: `CORS_ORIGINS` (mismo origen que el backend).

## 2. Rooms

- Patrón: `media:user:<USER_ID>` — asignadas SERVER-SIDE tras verificar la
  credencial del handshake (`auth.token` → getAuth0Email Auth0 O JWT local
  users-permissions; el MISMO concepto de identidad del backend real — no
  inventa login).
- Un socket sin credencial válida NO se une a ningún room media (conecta
  pero sin eventos).
- El cliente NO puede elegir room/userId: cualquier evento `media:*`/`join`/
  `subscribe` desde el cliente se ignora (log de advertencia).

## 3. Events

- `media:job:created` (emitido inmediatamente al crear/reintentar por REST).
- `media:job:updated` (cambios de metadata del poller).
- `media:job:succeeded` / `media:job:failed` / `media:job:cancelled` /
  `media:job:interrupted` (transiciones del poller).
- Payload seguro (sin mediaJobId remoto, paths, tokens, PIDs ni logs):
  `{ id (LOCAL), type, status, resourceClass, progress: null, warnings,
  updatedAt, artifactsReady, errorCode }`.

## 4. Poller (bridge Media API → MediaJob local → Socket.IO)

- `src/api/media/services/media-sync-poller.js`: revisa SOLO jobs activos
  (queued/running, limit 50); nunca la tabla histórica completa.
- Intervalo: `MEDIA_JOB_SYNC_INTERVAL_MS` (default 2000ms, configurable);
  sin jobs activos → timer dormido (idle 20s) sin requests.
- Compara remoto vs local; **actualiza solo si cambió y emite solo si hubo
  cambio relevante** (nunca "running/running/running").
- Media API down: mantiene el status previo, loguea, reintenta en el
  próximo intervalo (nunca marca failed en cascada).
- 404 remoto: marca el local `failed` + `MEDIA_REMOTE_JOB_NOT_FOUND`
  (documentado; no convierte silenciosamente).
- progress: siempre `null` (la Media API no da progreso estructurado; NO
  inventar porcentajes — la UI muestra estado indeterminado).
- Una sola instancia: poller in-process (existe UN solo proceso backend,
  verificado con pgrep); el timer se detiene en `destroy()` (shutdown, sin
  timers huérfanos). Sin Redis, sin BullMQ.
- Mutaciones SOLO por REST (create/cancel/retry); Socket.IO nunca escribe
  estado en MediaJob.

## 5. Frontend

- `src/Contexts/MediaSocketContext.jsx`: UNA conexión por sesión (patrón
  NotificationsContext; `auth: { token }`); URL:
  `REACT_APP_MEDIA_SOCKET_URL || REACT_APP_STRAPI_URL` (NO usa
  REACT_APP_SOCKET_URL, que es del microservicio de Taxis). Las páginas se
  suscriben vía `subscribe(event, fn)` — NUNCA abren sockets propios; los
  listeners se limpian al desmontar (`off`) para no acumular.
- `src/Pages/Multimedia/MultimediaRoute.jsx`: Centro Multimedia en la ruta
  `/multimedia` (añadida a src/Routes/index.jsx, patrón `<Route path/>`).
- `src/services/mediaJobDefinitions.js`: definición central por tipo
  (label/description/fields/defaults/resourceClass/warnings/validate) —
  params REALES del backend 5B (allowlist; camelCase → snake_case
  server-side). La capability API sigue siendo autoridad de disponibilidad.

## 6. Capabilities dinámicas

- La UI llama `mediaCapabilities()` (GET /api/media/capabilities) y
  construye el selector a partir de `available`, `commercialStatus`,
  `resourceClass` y `warning` (NO hardcodea disponibilidad). Muestra
  "(uso interno)" en operaciones con restricción comercial y el warning
  del backend.

## 7. Forms (10 tipos, params reales)

- transcribe (uploadId, language; provider oculto — backend auto).
- av_sync (videoUpload, audioUpload; mode=auto default; allowGenerative
  implícito false; offsetMs avanzado opcional).
- faceswap (sourceUpload, targetUpload; warning comercial + bloqueo si
  commercialStatus != approved).
- lipsync (videoUpload, audioUpload; hint "Procesamiento intensivo").
- music_generate (prompt, lyrics, duration).
- music_repaint (uploadId, start, end, prompt; validación start>=0, end>start).
- music_add_track / music_complete (uploadId, track, prompt).
- stem_extract (uploadId, track select de las 12 pistas Demucs).
- stems (uploadId, tracks multi-select; default vocals, drums, bass).

## 8. Upload

- `uploadMediaFile(token, file)` → POST /api/media/uploads (multipart).
- Estado real: "Subiendo… (sin progreso disponible)" → listo (name · size)
  o error. NO simula porcentaje (limitación documentada de fetch).
- **No duplica**: el upload se reutiliza en el form (params[f.key] = id del
  upload ya subido; no se vuelve a subir al crear el job).

## 9. Mis trabajos

- Lista/cards responsive (tipo, estado chip legible + icono, fecha,
  resourceClass, warnings, acciones).
- Orden: más recientes arriba (createdAt desc, limit 50 — sin historial
  infinito).
- Realtime: cada evento actualiza SOLO el job afectado (sin refetch
  completo); REST refetch al (re)conectar el socket.
- Cancel: solo estados cancelables (queued/running); deshabilitado mientras
  la request pendiente (sin doble click).
- Retry: solo failed/cancelled/interrupted; crea un NUEVO job (la UI lo
  muestra como job nuevo con parentJob — nunca convierte el viejo).
- Heavy limit UX: 429 MEDIA_HEAVY_LIMIT → "Ya tienes un trabajo de
  procesamiento intensivo activo" (sin reintento automático).
- Error UX: MEDIA_POLICY_CONFLICT / MEDIA_HEAVY_LIMIT / MEDIA_LIMIT /
  MEDIA_SERVICE_UNAVAILABLE / MEDIA_INVALID_REQUEST → mensajes
  comprensibles (sin stack trace).

## 10. Artifacts

- Panel al succeeded (o botón "Ver artifacts"): lista name/mime/size desde
  `getMediaArtifacts(jobId)` (endpoint backend; sin rutas internas).
- Preview: image/jpeg|png|webp|gif (img, max-width 100%), audio (HTML5
  audio controls), video (HTML5 video controls, Range 206 sin descarga
  previa), text/plain|vtt|application/json (texto preformateado, límite
  256KB; NO renderiza HTML arbitrario).
- Download: desde el backend (URL del proxy; sin remote UUID ni URL
  privada expuestas — el frontend usa solo el id local del job + artifact
  id del endpoint backend).
- Transcripción UX: el artifact .txt/.json del transcribe se previsualiza
  como texto ("Ver transcripción" vía el panel).

## 11. Seguridad

- Room hijack: eventos del cliente ignorados; room asignada server-side.
- Owner isolation socket: verificado (usuario A recibe sus eventos; B NO).
- Owner REST: 404 para jobs ajenos (verificado en 5B, mantiene 5C).
- Artifact owner: B intenta la URL del artifact de A → 404 (proxy verifica
  ownership antes de servir).
- Secret scan: 100.73.191.3 / 8090 / MEDIA_API_TOKEN /
  CIUDADAN_MEDIA_API_TOKEN / /srv/multimedia-workspace → **0 ocurrencias**
  en frontend/src y build (verificado). Sin source maps servidos.

## 12. E2E verificados (reales, en el servidor)

- Socket auth: sin credencial → sin room media (handshake log).
- **Isolation A/B**: A crea job → A recibe media:job:created (id, status)
  inmediato; B recibe 0 eventos ✓.
- **Cancel emit**: create → cancel REST → A recibe media:job:cancelled ✓
  (el estado llega por socket; la mutación sigue por REST).
- **Disconnect/reconnect**: el socket maneja reconnect; al reconectar, la
  UI hace REST refetch de GET /api/media/jobs (no reconstruye desde
  eventos perdidos). El job continúa si el cliente se desconecta (client
  disconnect NO cancela).
- Poller: sincroniza estados residuales en boot (running→cancelled,
  queued→succeeded verificado); latencia de actualización ~2-4s objetivo
  (intervalo 2000ms; REST create 166ms; poll request 9-14ms).

## 13. Limitaciones

- progress: null (sin progreso estructurado de los motores; la UI muestra
  estado indeterminado).
- Upload sin progreso de bytes (limitación de fetch; documentado en la UI:
  "Subiendo… (sin progreso disponible)").
- El preview text está limitado a 256KB (más grande → descarga).
- El poller es in-process (una sola instancia backend; si se escala a
  múltiples procesos, migrar a un lock DB ligero — documentado).

## 14. Config

- Backend `.env.example`: `MEDIA_JOB_SYNC_INTERVAL_MS=2000` (sin secretos).
- Frontend: `REACT_APP_MEDIA_SOCKET_URL` (opcional; si no se define, mismo
  origen que REACT_APP_STRAPI_URL).

## 15. Builds

- Backend: build real + arranque (:33432 health 204; rutas 5B intactas;
  poller iniciado; socket server en el mismo puerto).
- Frontend: build real (react-scripts build; 0 errores; warnings
  pre-existentes de otros componentes; bundle con Centro Multimedia +
  media:job:created verificados en main.*.js).
