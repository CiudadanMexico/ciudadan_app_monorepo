# FOOD — Cotizaciones de envío (MVP backend): diseño actual y plan de cambios

> Fase: **solo backend**. No se toca React ni el checkout visible.
> Rama: `feature/backend-repartidores-mvp`. Este documento es el resumen de
> auditoría + plan exigido por la spec (§2) antes de las decisiones de diseño.

---

## 1. Resumen del diseño actual relevante (auditoría, verificado en código)

### 1.1 Módulo Food
- **Carrito**: `api::food-cart.food-cart` — `usuario` (rel→up_users), `items`
  (componente `food-cart.food-cart-item` con `producto`, `variante`,
  `restaurante`, `cantidad`, `precio_unitario`, `subtotal`, `item_key`), `estado`
  enum `activo|procesando|convertido|abandonado`. CRUD core público; el frontend
  sincroniza con `POST/PUT /api/food-carts` sin auth (`FoodCartContext.jsx`).
- **Pedido**: `api::food-order.food-order` — se crea desde el frontend con
  `POST /api/food-orders` (CRUD core, **sin auth**; `user` va en el body). Una
  orden POR restaurante. `monto_envio` decimal (tarifa), `direccion_origen` /
  `direccion_destino` (rel→`api::direccion.direccion`), `metadata` JSON (aquí
  vive hoy `uber_direct`), status enum `pendiente_pago|pendiente_verificacion|
  pendiente_envio|enviado|en_camino|cancelado|devuelto|recibido`. `delivery_contact_name/phone`
  son required. Única ruta custom: `GET /food-orders/mine`
  (`global::is-authenticated-auth0`) y `POST /food-orders/:id/verify-payment`
  (SIN policies — hueco conocido).
- **Restaurante**: `api::food-restaurant.food-restaurant` con `direccion`
  (rel oneToOne→direccion). Su dirección se guarda en `api::direccion.direccion`
  con `restaurant_id` + JSON `direccion`/`coords` (fallback `coords` ?? `direccion.lat/lng`).
- **Dirección**: `api::direccion.direccion` — JSON `direccion`
  (`{street,number,neighborhood,city,state,postal_code,formatted_address,lat,lng}`),
  JSON `coords` `{lat,lng}`, `user_email`/`usuario_email` (propiedad), `activa`,
  `restaurant_id`, `store_id`. Sin required.
- **Envío actual**: solo **Uber Direct**. `POST /api/uber-direct/quote`
  (auth:false, **sin policy**) → servicio `api::uber-direct` que cotiza contra
  `POST {api.uber.com}/v1/customers/{UBER_DIRECT_CUSTOMER_ID}/delivery_quotes`
  (OAuth client_credentials, scope `eats.deliveries`, fee en unidades menores
  /100) con modo mock (`UBER_DIRECT_MOCK`, default true en el service;
  **en el .env real vale `false`**). La cotización **no se persiste**: viaja al
  frontend y regresa en `metadata.uber_direct` al crear la orden
  (`FoodCheckout.jsx:229-237`). La confirmación de pago
  (`verifyPaymentAndCreateDelivery`, `food-order/services/food-order.js`) exige
  `metadata.uber_direct.quote_id`, crea el delivery Uber (cliente global
  `src/services/uber-direct/index.js`) y el registro `api::food-delivery`
  (`provider` default `uber_direct`, `quote_id` required, idempotente por pedido).
- **Checkout**: el frontend bloquea "Confirmar pedido" si algún restaurante no
  tiene cotización (`restaurantesSinCotizacion`), pero es una regla de cliente.

### 1.2 Repartidores (MVP aprobación, ya integrado en la rama)
- Expediente: `api::delivery-profile.delivery-profile` — `status` enum con
  **`approved`** (+ `approved_at`, `approval_version`). Suspensión = estado
  `suspended` (el rol se conserva).
- Rol: `up_users.roles.extra` (JSON array) contiene **`repartidor`**, otorgado
  solo al aprobar (merge aditivo e idempotente, `revision-service.js`).
- Vehículo: `api::delivery-vehicle.delivery-vehicle` — `type` enum
  **`bicicleta|bicicleta_electrica|motocicleta`**, `validation_status` enum
  `pendiente|corrections_required|verificado`.
- Ubicación: `api::driver-location.driver-location` — JSON `coords` `{lat,lng}`,
  `driver_id` (rel oneToOne→up_users), `time` (datetime). Nadie en backend la
  escribe: la app conductor persiste por REST (`POST /api/driver-locations`).
  La geobúsqueda existente (`conductores-cercanos`, taxis) es un bbox MySQL crudo
  de 2 km **sin filtros** de aprobación ni frescura.
- Disponibilidad: **no existe** campo gestionado por backend para repartidores
  food (`en_viaje` es del expediente taxi, nunca lo escribe el backend). Tampoco
  existe mecanismo de asignación de repartidores food.

### 1.3 Rutas por calles (distancias)
- Ya se usa **Google Maps Directions API** en el backend: `conductores-cercanos`
  (taxis, con `GOOGLE_MAPS_API_KEY`) y `socket-service/routes/calculateFare.js`
  (con `GEOCODING_KEY` — **la única llave Google presente en `.env`**, usada
  tanto para Geocode como Directions). **No hay servicio compartido** en
  `src/`: cada consumidor inyecta su propio fetch. Haversine existe solo como
  fallback de tarifas en el socket-service (proceso separado).

### 1.4 Pruebas y convenciones
- `node:test` + `node:assert/strict` (`npm test` = `node --test "tests/**/*.test.js"`),
  176 pruebas, **8 fallos preexistentes** (todos en `wikiseed-sync.test.js`,
  rutas Windows) — nada del dominio delivery/food.
- Mocks: `tests/helpers/strapi-mock-repartidores.js` (tablas por UID en memoria,
  `db.query` con `$or/$in/$gte/...`, ctx Koa con `state.strapiUser` y errores
  `Error{status,expose}`). Patrón de policy: parchear `axios.get` para
  `/userinfo` Auth0. Rutas custom: archivos numerados, `auth:false` +
  `global::<policy>`. Errores: `Error` plano con `.status`/`.expose` en español.

---

## 2. Decisiones de diseño (justificadas)

### D1. Proveedor de rutas: Google Directions centralizado + OSRM alternativo
- **Elección**: nuevo servicio compartido `src/services/rutas/` con DOS
  implementaciones: `google` (default) y `osrm` (alternativa sin costo),
  elegidas por `RUTA_PROVEEDOR`.
- **Justificación Google**: ya es el proveedor de rutas del proyecto (taxis +
  calculate-fare), tiene la única llave verificada en `.env` (`GEOCODING_KEY`),
  cobertura MX sobresaliente y un solo GET devuelve distancia por calles en
  metros (`routes[0].legs[].distance.value`). Costo: cuota gratuita de Google
  Maps Platform cubre miles de requests/mes; se documenta que producción debe
  presupuestar consumo.
- **Justificación OSRM como alternativa**: 0 costo, 0 credenciales, latencia
  baja; el demo público (`router.project-osrm.org`) no tiene SLA, así que queda
  como opción documentada para desarrollo o para un OSRM auto-alojado
  (`RUTA_OSRM_URL`). Contrato: `GET /route/v1/{perfil}/{lng},{lat};{lng},{lat}`
  → `routes[0].distance` (m); errores `NoRoute`/`NoSegment`.
- **Fail-closed**: si el proveedor de rutas falla, no se inventa distancia
  (NADA de haversine como sustituto, a diferencia de las tarifas taxi): la
  cotización Ciudadan se reporta indisponible (`RUTA_NO_DISPONIBLE`).

### D2. Persistencia: content type nuevo `api::food-shipping.food-shipping-quote`
- `shipping-quote` existente es del dominio Marketplace/Skydropx (relación con
  `pedido`, campos carrier/oficinas) — no se toca. Se crea **`food-shipping-quote`**
  (nombre ya contemplado por los esqueletos en cuarentena de la sesión previa)
  siguiendo su patrón de snapshot + estados.
- Guarda SOLO lo necesario para validar después: proveedor, usuario, carrito,
  restaurante, dirección origen/destino (o snapshot inline), coords, importe,
  moneda, distancia, vencimiento, estado, referencia externa (quote_id de Uber),
  huella del carrito (SHA-256 de producto|variante|cantidad) y metadata
  privada. **CRUD core cerrado** (`except` completo): nada de cotizaciones por
  REST público.

### D3. API de cotización normalizada
- `POST /api/food-shipping/cotizar` con `global::is-authenticated-auth0`
  (identidad SIEMPRE del token, nunca del body). Recibe
  `{ foodCartId | foodOrderId, direccionDestinoId | direccionDestino }`.
  El servidor deriva del carrito/pedido: restaurantes, items (huella), y valida
  propiedad de carrito/pedido/dirección. Devuelve por restaurante ambas
  cotizaciones normalizadas + `puedeContinuar` global.
- Respuesta por proveedor: `proveedor`, `disponible`, `cotizacionId` (código
  opaco aleatorio), `importe`, `moneda`, `distanciaMetros`, `vence`,
  `codigoIndisponibilidad`, `mensaje`, `simulado`. Nunca expone quote_id de
  Uber, ids de repartidores ni respuestas del proveedor.

### D4. Regla Ciudadan
- Radio repartidores: **10 km** alrededor del restaurante (pre-filtro bbox +
  haversine ≤ 10 km sobre la ÚLTIMA ubicación de cada repartidor).
- Elegibilidad (solo estructuras existentes, sin estados nuevos):
  `delivery-profile.status === 'approved'` **y** `roles.extra` incluye
  `repartidor` **y** vehículo `validation_status === 'verificado'` (bicicleta,
  bicicleta eléctrica o motocicleta) **y** ubicación con `time` reciente
  (`REPARTIDOR_UBICACION_MAX_MIN`, default 15 min) **y** sin entrega food activa
  asignada (`food-delivery` con `repartidor` = usuario y status en
  pending|processing|pickup|in_transit — campo nuevo, ver D6).
- Distancia de entrega: **por calles** restaurante→cliente (D1). > 10 km exactos
  → indisponible `FUERA_DE_COBERTURA`. Los tres tipos de vehículo comparten el
  límite (no hay tarifa ni límite por vehículo en el MVP).
- Tarifa: `envio = max(30, 20 + 5·D)` MXN, con **D = metros/1000 SIN redondear
  a km enteros**; distancia se persiste en metros (entero); importe redondeado a
  2 decimales. 1 km→$30, 2 km→$30, 3 km→$35, 5 km→$45, 8 km→$60, 10 km→$70.
- No se asigna repartidor al cotizar. La "reserva" es la propia cotización
  persistida con vencimiento (`COTIZACION_VIGENCIA_MIN`, default 15) consumida
  de forma atómica al confirmar (update condicional `estado='activa'` — el mismo
  bloqueo optimista del MVP repartidores). Anti doble asignación documentada en §5.

### D5. Uber Direct: adaptador del servicio existente
- Se **reutiliza** `api::uber-direct` service `createDeliveryQuote` (contrato ya
  negociado). El adaptador agrega: timeout (`UBER_DIRECT_TIMEOUT_MS` default
  8000, `Promise.race`), aislamiento total de errores (un fallo de Uber nunca
  tumba la cotización Ciudadan ni el endpoint), normalización de moneda
  (uppercase MXN) e importe (ya viene /100 del service), y mapeo a códigos
  seguros (`PROVEEDOR_NO_CONFIGURADO|PROVEEDOR_TIMEOUT|PROVEEDOR_ERROR|
  PROVEEDOR_RECHAZO`). Credenciales 100% servidor. No se crea entrega al cotizar.
- El modo mock del service (`UBER_DIRECT_MOCK`) se refleja honestamente en
  `simulado: true`; el `.env` real lo tiene en `false`.

### D6. Confirmación de compra con revalidación
- Punto de confirmación existente: `POST /api/food-orders`. Se añade
  **lifecycle `beforeCreate`** de food-order que solo actúa si el payload trae
  `metadata.cotizacion_envio.codigo` (contrato nuevo; el flujo legacy con
  `metadata.uber_direct` queda intacto → sin regresión).
- Revalida: cotización existe, es `activa`, no vencida, pertenece al usuario de
  la orden, restaurante y destino coinciden, huella del carrito coincide
  (carrito/dirección cambiados → `CARRITO_MODIFICADO`/`DESTINO_MODIFICADO`) y
  (proveedor ciudadan) sigue habiendo repartidores elegibles. Si todo pasa:
  **consume atómicamente** la cotización (update condicional) y **sobrescribe
  `monto_envio` desde la cotización y recalcula `monto_total` = Σ subtotal items
  + envío** → el cliente no puede alterar el precio. afterCreate enlaza
  `food_order` a la cotización (best-effort).
- `food-delivery` gana una relación aditiva `repartidor` (oneToOne→up_users,
  nullable) para representar la asignación futura y excluir ocupados.
- `verifyPaymentAndCreateDelivery` gana una rama mínima: órdenes con proveedor
  `ciudadan` no exigen `metadata.uber_direct`; se registra el `food-delivery`
  con `provider:'ciudadan'`, `quote_id` = código de cotización y status
  `pending` (despacho pendiente — fuera del alcance del MVP de cotizaciones).
  Las órdenes Uber conservan el flujo existente sin cambios.

---

## 3. Plan de cambios (archivos)

**Nuevos (backend):**
| Archivo | Contenido |
|---|---|
| `src/api/food-shipping/content-types/food-shipping-quote/schema.json` | Persistencia de cotizaciones (D2) |
| `src/api/food-shipping/routes/food-shipping-quote.js` | Core router cerrado (`except` todas) |
| `src/api/food-shipping/routes/01-cotizar.js` | `POST /food-shipping/cotizar` (auth:false + `global::is-authenticated-auth0`) |
| `src/api/food-shipping/controllers/food-shipping.js` | `cotizar` |
| `src/api/food-shipping/services/cotizacion-service.js` | Orquestador: resolver carrito/pedido/dirección, proveedores, persistir, consumir/revalidar |
| `src/api/food-shipping/services/proveedor-ciudadan.js` | Distancia ruta + cobertura + repartidores + tarifa |
| `src/api/food-shipping/services/proveedor-uber.js` | Adaptador Uber (timeout/aislamiento/normalización) |
| `src/api/food-shipping/services/repartidores-service.js` | Búsqueda de repartidores elegibles (radio/frescura/estado) |
| `src/api/food-shipping/utils/constants.js` | UIDs, límites, códigos de indisponibilidad, mensajes |
| `src/api/food-shipping/utils/tarifa.js` | Fórmula y precisión (puro) |
| `src/services/rutas/index.js` | Servicio de rutas compartido: google + osrm |
| `src/api/food-order/content-types/food-order/lifecycles.js` | beforeCreate/afterCreate: revalidación + consumo + importes server-side |
| `tests/food-shipping-*.test.js` (5 archivos) | Ver §7 |

**Modificados (mínimos, aditivos):**
| Archivo | Cambio |
|---|---|
| `src/api/food-delivery/content-types/food-delivery/schema.json` | + `repartidor` (oneToOne→up_users, nullable) |
| `src/api/food-order/services/food-order.js` | Rama ciudadan en `verifyPaymentAndCreateDelivery` (sin tocar rama Uber) |
| `docs/FOOD-COTIZACIONES-ENVIO-MVP.md` | Contrato as-built + instrucciones al agente frontend |

**Sin tocar:** flujo taxi (`viaje`/`triprequest`/`conductores-cercanos`), Skydropx/marketplace, `POST /api/uber-direct/quote` legacy, frontend, socket-service.

---

## 4. Contrato de la operación de cotización (borrador; el definitivo en `docs/FOOD-COTIZACIONES-ENVIO-MVP.md`)

`POST /api/food-shipping/cotizar`
```json
{ "foodCartId": 12, "direccionDestinoId": 88 }
```
(o `"foodOrderId": 5` y/o `"direccionDestino": { "lat": 19.43, "lng": -99.13, "direccion": "..." }`)
```json
{
  "success": true,
  "puedeContinuar": true,
  "restaurantes": [
    {
      "restaurantId": 3,
      "cotizaciones": {
        "ciudadan": {
          "proveedor": "ciudadan", "disponible": true, "cotizacionId": "fshq_9f2c...",
          "importe": 45.5, "moneda": "MXN", "distanciaMetros": 5100,
          "vence": "2026-10-23T19:12:03.000Z", "codigoIndisponibilidad": null,
          "mensaje": null, "simulado": false
        },
        "uber_direct": {
          "proveedor": "uber_direct", "disponible": false, "cotizacionId": null,
          "importe": null, "moneda": null, "distanciaMetros": null, "vence": null,
          "codigoIndisponibilidad": "PROVEEDOR_RECHAZO",
          "mensaje": "Uber Direct no está disponible para esta entrega.", "simulado": false
        }
      }
    }
  ]
}
```
Errores HTTP: 400 (validación), 403 (policy), 404 (carrito/dirección no existe o ajeno), 500 (inesperado). El endpoint SIEMPRE responde 200 con el tablero de proveedores cuando la sesión y los inputs son válidos — la indisponibilidad de un proveedor es dato, no error.

---

## 5. Estrategia anti doble asignación (documentada)

1. **Cotizar no asigna ni reserva repartidores** — solo verifica que exista al
   menos uno elegible. Ningún estado del repartidor muta.
2. La **reserva con vencimiento** es la cotización persistida: `estado='activa'`
   + `vencimiento`; se consume con update condicional
   (`where: {id, estado: 'activa', vencimiento: {$gte: ahora}}`). Dos
   confirmaciones concurrentes con la misma cotización → exactamente una gana
   (la otra recibe 409 `COTIZACION_YA_USADA`); reintentos del mismo pedido
   re-cotizan, no duplican.
3. Re-cotizar el mismo carrito **invalida** (`estado='invalidada'`) las
   cotizaciones activas previas del mismo usuario+carrito+restaurante+proveedor
   (patrón `superseded` de shipping-quote).
4. El despacho en tiempo real (oferta/aceptación por repartidor, bloqueo por
   repartidor durante la entrega) queda **fuera del alcance**; el campo
   `food-delivery.repartidor` es la costura prevista para ese futuro y la
   elegibilidad ya excluye a quien tiene una entrega activa.

## 6. Tratamiento de errores y límites (resumen)

| Código | Origen | Frontend muestra |
|---|---|---|
| `ORIGEN_SIN_COORDENADAS` / `DESTINO_SIN_COORDENADAS` | restaurante/dirección sin lat/lng | pide corregir dirección |
| `RUTA_NO_DISPONIBLE` | proveedor de rutas falla/NoRoute | "no pudimos calcular la ruta" |
| `FUERA_DE_COBERTURA` | distancia > 10 km | "estás fuera de cobertura" |
| `SIN_REPARTIDORES` | 0 elegibles en el radio | "sin repartidores cerca ahora" |
| `PROVEEDOR_NO_CONFIGURADO` / `PROVEEDOR_TIMEOUT` / `PROVEEDOR_ERROR` / `PROVEEDOR_RECHAZO` | Uber (credenciales, timeout, 5xx, 4xx) | "Uber Direct no disponible" |
| `COTIZACION_EXPIRADA` / `COTIZACION_YA_USADA` / `COTIZACION_INVALIDA` / `CARRITO_MODIFICADO` / `DESTINO_MODIFICADO` / `RESTAURANTE_NO_COINCIDE` / `COTIZACION_DE_OTRO_USUARIO` | revalidación al confirmar | volver a cotizar |

Precisión: distancia en metros (entero, fuente del proveedor); km = m/1000 sin
redondeo previo; importe MXN con 2 decimales (redondeo half-up).

## 7. Pruebas nuevas (node:test, sin red, mocks en memoria)

1. `food-shipping-tarifa.test.js` — fórmula con 1, 2, 3, 5, 8, 10 km; >10 km;
   fraccionarios (3.25 km → 36.25); precisión monetaria; límite exacto.
2. `food-shipping-repartidores.test.js` — dentro/fuera del radio; sin
   aprobación; suspendido; sin rol; vehículo no verificado; ubicación
   obsoleta; ocupado (entrega activa); los tres tipos de vehículo.
3. `food-shipping-cotizar.test.js` — contrato de rutas/policies; propiedad de
   carrito/dirección; destino inline vs guardado; Uber disponible/indisponible/
   timeout/error; un proveedor falla y el otro responde; ninguno disponible;
   al menos uno disponible; `puedeContinuar`; no expone datos internos.
4. `food-shipping-rutas.test.js` — google y osrm con fetch parchado; NoRoute;
   timeout; fail-closed (sin fallback haversine); sin key → `RUTA_NO_DISPONIBLE`.
5. `food-shipping-confirmacion.test.js` — lifecycle: consumo único (concurrencia),
   expirada, modificada (carrito/dirección), de otro usuario, alteración de
   `monto_envio`/`monto_total` desde el cliente (se sobrescribe), confirmaciones
   repetidas, flujo legacy intacto (regresión), rama verify-payment ciudadan.

Al terminar: `npm test` completo (distinguir los 8 fallos preexistentes de
wikiseed) y `npm run build`.
