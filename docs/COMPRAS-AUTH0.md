# Compras / Marketplace — autenticación con Auth0 (fix 401/500 en "Tus Compras")

Fecha: 2026-10-12 · Estado: **OPERATIVO** (endpoints verificados en caliente; 403 sin token, query validada).
Rama: `feature/agente2-adrian-compras-auth-fix`.

## 1. Problema

La pantalla **"Tus Compras"** (`/compras`, `ciudadan_frontend/src/Pages/MarketPlace/Compras.jsx`)
fallaba con dos errores encadenados:

1. **`401 Missing or invalid credentials`** al listar pedidos. Persistía
   **incluso tras cerrar y abrir sesión**.
2. Tras apuntar el front al Bearer de Auth0, aparecía **`500 Internal ServerError
   ("No fue posible listar los pedidos")`**.

## 2. Causa raíz

- El front ya mandaba el **JWT de Auth0** del usuario, pero `GET /api/pedidos` y
  `GET /api/food-orders` son **routers core** (`createCoreRouter`) protegidos por
  el **rol público de users-permissions**. Ese rol **no tiene permisos** sobre
  `pedido`/`food-order` y **no valida JWT de Auth0** → 401. (Mismo caso que
  documenta `src/api/favorito/routes/01-favorito-auth0.js`.)
- El `500` venía de `strapi.db.query`: **no se puede mezclar** la relation
  `usuario` con el campo **JSON** `metadata` en un mismo `$or`. Strapi lanza
  `Undefined attribute level operator usuario_email` al filtrar
  `metadata: { usuario_email }` dentro del `where`.

## 3. Patrón aplicado (el que ya usa el repo)

Rutas dedicadas con `auth: false` + `policies: ['global::is-authenticated-auth0']`
(igual que `01-favorito-auth0.js`). La policy valida el Bearer contra Auth0
(con caché anti-rate-limit en `utils/auth0-verify`) y deja el usuario en
`ctx.state.strapiUser`. El handler filtra **server-side** por ese usuario; el
front **no** manda email/id de dueño.

## 4. Endpoints nuevos (prefijo /api)

| Método | Ruta | Handler | Notas |
|---|---|---|---|
| GET | `/pedidos/mine?scope=pendientes\|por-calificar\|historial&page=&pageSize=` | `pedido.mine` | Pedidos del usuario. Filtra por relation `usuario` **y** por `metadata` (`$contains` del email) en 2 consultas, unidas por id. Respuesta `{ data, meta.pagination }`. |
| GET | `/pedidos/by-id/:id` | `pedido.byId` | Un pedido; valida dueño en memoria (relation `usuario` o `metadata.usuario_email`). 404 si no es del usuario (no enumera). |
| GET | `/pedidos/store-mine?storeId=` | `pedido.storeMine` | Vista de vendedor. **Valida ownership** de la tienda (`store.users_permissions_user`); 403 si no es suya. Filtra estados `recibido/cancelado/devuelto`. |
| GET | `/food-orders/mine` | `food-order.mine` | Órdenes de comida del usuario (relation `user`). |

Archivos:
- Backend: `src/api/pedido/routes/01-pedido-auth0.js` (nuevo),
  `src/api/pedido/controllers/pedido.js` (`mine`, `byId`, `storeMine`),
  `src/api/food-order/controllers/food-order.js` (`mine`),
  `src/api/food-order/routes/custom-food-orders.js` (ruta `/food-orders/mine`).
- Frontend: `Compras.jsx` (hook `useUserPedidos` → `/mine`, `/by-id/:id`,
  `/food-orders/mine`), `PedidosEntregados.jsx` (→ `/pedidos/store-mine`).

## 5. Detalle de dueño de un pedido

El checkout guarda al comprador en dos lugares: la **relation `usuario`**
(users-permissions) y `metadata.usuario_email`. Para listar se consultan ambas
fuentes y se unen por id (así los pedidos viejos sin relation también aparecen).
No se puede filtrar `metadata` (JSON) junto a la relation en un mismo `$or`.

## 6. Validación

- Sin token: `GET /api/pedidos/mine` → **403** (policy `is-authenticated-auth0`),
  no el 401 de users-permissions ni 500.
- Query del handler reproducida con Strapi cargado → **sin el error** de
  `usuario_email`.
- Con Bearer real: **200** con los pedidos del usuario, o lista vacía
  ("No tienes pedidos en curso").
- El front muestra un mensaje amable ("Tu sesión expiró…") solo si el backend
  responde 401/403 real, no ante un 500.

## 7. Cómo reintentar / levantar

El backend corre por systemd (`ciudadan-backend.service`, puerto 33032 vía
`launcher.sh`). Tras cambiar rutas/controllers:

```
sudo systemctl reset-failed ciudadan-backend.service
sudo systemctl restart ciudadan-backend.service
```

Si el servicio queda en `start-limit-hit` (watchdog del host), el `reset-failed`
antes del `restart` lo libera.
