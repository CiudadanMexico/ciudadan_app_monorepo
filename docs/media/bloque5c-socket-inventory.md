# BLOQUE 5C — INVENTARIO REAL Socket.IO
Fecha: 2026-10-08 · Inspección REAL del monorepo (backend + frontend).

## 1. Backend (ciudadan_backend_26)
- **socket.io ^4.8.1 en package.json — NO USADA**: NO existe servidor
  Socket.IO en src/ ni config/ (grep 0 resultados). La env SOCKET_PORT=
  33035 / SOCKET_HOST=http://localhost NO es de Strapi: la usa el
  controller `conductores-cercanos` como MICROSERVICIO SEPARADO (URLs
  MESSAGE_SERVICE_URL/PRICE_SERVICE_URL — server de Taxis en :33035, NO
  corriendo en esta copia).
- Conclusión: el backend Strapi (:33432) NO tiene socket server propio.
- Dependencia EXISTENTE (socket.io ^4.8.1) → se añadirá socket.io al
  backend Strapi SIN instalar nada nuevo (patrón Strapi v4: attach al
  httpServer de strapi.server, MISMO puerto 33432).

## 2. Otros sockets existentes (NO tocar)
- **websockify** (OpenClaw noVNC) en puerto 3001 del server — NO relacionado.
- **Microservicio Taxis** (:33035, no corriendo) — socket.io propio de esa
  app; NO es el backend; NO tocar.

## 3. Frontend (ciudadan_frontend)
- **socket.io-client ^4.8.1** (dependencia existente ✓).
- **NotificationsContext.jsx**: patrón de socket por-feature:
  - `socketRef` (useRef) + guard "ya conectado" + disconnect previo.
  - `SOCKET_URL = process.env.REACT_APP_SOCKET_URL || STRAPI`.
  - Auth: `opts.auth = { token }` (token de Auth0 via
    useAuth0().getAccessTokenSilently()).
  - Eventos: connect / connect_error / disconnect / notification.
  - Manejo de errores graceful (si el socket no está disponible, el fetch
    REST sigue siendo la fuente).
- **Taxis** (Conductor.jsx/Pasajero.jsx): mismo patrón (io +
  REACT_APP_SOCKET_URL + transports websocket + trip-request/drivers-found).
- Conclusión: la arquitectura actual usa sockets POR-FEATURE (notifications,
  taxis) con un socketRef por feature. El 5C añade el feature media con el
  MISMO patrón (una conexión por sesión para el feature media, compartida
  por context — NO un socket por componente/job).

## 4. Auth (identidad real)
- Frontend: useAuth0 → getAccessTokenSilently() → Bearer (REST) / auth.token
  (socket).
- Backend: token Auth0 (getAuth0Email, cache 30s) O JWT local
  users-permissions (HS256 JWT_SECRET) — policy is-authenticated-media.
- El socket usará el MISMO concepto: handshake auth.token → verificación
  Auth0/local → usuario → room media:user:<ID> (server-side).

## 5. Rutas frontend
- react-router-dom; `<Route path='/x' element={<X />} />` en
  src/Routes/index.jsx; páginas en src/Pages/. El 5C añade /multimedia.

## 6. Decisiones 5C
- Socket.IO en el backend Strapi: attach a strapi.server.httpServer (puerto
  33432, path /socket.io, CORS = CORS_ORIGINS), auth por handshake token,
  rooms media:user:<ID> asignadas server-side, eventos media:job:*.
- Poller in-process (una sola instancia backend; documentado).
- Frontend: MediaSocketContext (nuevo, patrón NotificationsContext) +
  página MultimediaRoute en /multimedia.
