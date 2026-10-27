# FOOD — Cotizaciones de envío (MVP backend): contrato as-built

> **Estado:** implementado en `feature/backend-repartidores-mvp` (solo backend).
> Consumidor principal: **agente de frontend** que integrará el checkout de Food.
> El plan/auditoría previa vive en `docs/FOOD-COTIZACIONES-ENVIO-MVP-PLAN.md`.

---

## 1. Qué existe ahora (resumen operativo)

- **`POST /api/food-shipping/cotizar`** — cotización normalizada por restaurante y
  por proveedor (Ciudadan y Uber Direct), autenticada con Auth0, todo resuelto
  en servidor (restaurante, dirección, distancia, precio, disponibilidad).
- Cada cotización válida se **persiste** (`food-shipping-quote`) con vencimiento
  (default 15 min) y se devuelve un **código opaco** (`cotizacionId`).
- **Confirmación:** al crear la orden (`POST /api/food-orders`, flujo existente)
  el backend revalida y consume la cotización automáticamente si el payload
  trae `metadata.cotizacion_envio.codigo`; `monto_envio`/`monto_total` se
  recalculan en servidor (el precio del cliente ya no manda). El flujo legacy
  con `metadata.uber_direct` sigue funcionando igual.
- **verify-payment** soporta ahora órdenes con proveedor `ciudadan` (entrega
  registrada como pendiente de despacho, sin llamar a Uber).

## 2. Reglas de negocio implementadas

| Regla | Implementación |
|---|---|
| Proveedores | `ciudadan` y `uber_direct` (enum del content type) |
| Continuar el checkout | `puedeContinuar` = cada restaurante del carrito tiene ≥1 proveedor disponible |
| Un proveedor falla | El otro sigue disponible; el error es dato (bloque indisponible), no 500 |
| Radio de repartidores | 10 km alrededor del restaurante (última ubicación, haversine) |
| Elegibilidad | `delivery-profile.status='approved'` + rol `repartidor` + vehículo `verificado` + ubicación ≤15 min + sin entrega `ciudadan` activa asignada |
| Distancia de entrega | Por calles (servicio de rutas); sin ruta NO hay cotización Ciudadan |
| Cobertura | ≤ 10,000 m exactos; los 3 tipos de vehículo comparten el límite |
| Tarifa Ciudadan | `max(30, 20 + 5·D)` MXN; D = metros/1000 sin redondear; importe a 2 decimales |
| Vigencia | 15 min (env `COTIZACION_VIGENCIA_MIN`); Uber usa su propio `expires` |
| Asignación | Cotizar NO asigna repartidor; la "reserva" es la cotización con vencimiento, consumida atómicamente al confirmar |
| Uber Direct | Cliente existente (`api::uber-direct`), envuelto con timeout (8 s), aislamiento y normalización; modo mock del service se reporta como `simulado: true` |

**Precisión documentada:** distancia persistida en metros (entero); km
fraccionario para la fórmula; importe MXN con 2 decimales (half-up).
Referencias: 1 km=$30, 2 km=$30, 3 km=$35, 5 km=$45, 8 km=$60, 10 km=$70.

## 3. Endpoint de cotización

### `POST /api/food-shipping/cotizar`

**Auth:** `Authorization: Bearer <token Auth0>` (policy
`global::is-authenticated-auth0`; el usuario del body se ignora).

**Request** (una de las dos fuentes; destino guardado preferido):

```json
{ "foodCartId": 12, "direccionDestinoId": 88 }
```

- `foodCartId` — carrito del usuario (propietario verificado; se agrupa por
  restaurante). `foodOrderId` — orden `pendiente_pago` propia (re-cotización).
- `direccionDestinoId` — dirección guardada **del usuario** (propietario
  verificado; si es ajena → 404). Alternativa inline:
  `"direccionDestino": { "lat": 19.45, "lng": -99.15 }` (o forma fila
  `{ "direccion": {...}, "coords": {...}}`); la cotización queda ligada a esas
  coordenadas.

**Response 200** (la indisponibilidad de un proveedor NO es error HTTP):

```json
{
  "success": true,
  "puedeContinuar": true,
  "direccionDestinoId": 88,
  "restaurantes": [
    {
      "restaurantId": 3,
      "nombre": "Tacos El Buda",
      "cotizaciones": {
        "ciudadan": {
          "proveedor": "ciudadan",
          "disponible": true,
          "cotizacionId": "fshq_9f2c1d4e…",
          "importe": 45.0,
          "moneda": "MXN",
          "distanciaMetros": 5000,
          "vence": "2026-10-23T19:12:03.000Z",
          "codigoIndisponibilidad": null,
          "mensaje": null,
          "simulado": false
        },
        "uber_direct": {
          "proveedor": "uber_direct",
          "disponible": false,
          "cotizacionId": null,
          "importe": null,
          "moneda": null,
          "distanciaMetros": null,
          "vence": null,
          "codigoIndisponibilidad": "PROVEEDOR_RECHAZO",
          "mensaje": "Uber Direct no ofrece servicio para esta entrega.",
          "simulado": null
        }
      }
    }
  ]
}
```

**Errores HTTP:** 400 validación (sin fuente, carrito vacío, coords), 401 sin
sesión, 403 policy, 404 carrito/pedido/dirección inexistente o ajeno, 500
inesperado (mensaje seguro).

**Códigos de indisponibilidad** (`codigoIndisponibilidad` + `mensaje` apto para
usuario): `ORIGEN_SIN_COORDENADAS`, `DESTINO_SIN_COORDENADAS`,
`RUTA_NO_DISPONIBLE`, `FUERA_DE_COBERTURA`, `SIN_REPARTIDORES`,
`PROVEEDOR_NO_CONFIGURADO`, `PROVEEDOR_TIMEOUT`, `PROVEEDOR_ERROR`,
`PROVEEDOR_RECHAZO`.

## 4. Confirmación de compra (contrato con el flujo existente)

Al crear cada orden (`POST /api/food-orders`, sin cambios de ruta), además de
lo que ya enviaba, el frontend agrega SOLO la referencia de la cotización
elegida del restaurante:

```json
{
  "data": {
    "items": [ …igual que hoy… ],
    "direccion_destino": 88,
    "monto_envio": 45,
    "monto_total": 245,
    "metadata": {
      "origen": "food_cart",
      "food_cart_item_keys": [ … ],
      "cotizacion_envio": { "codigo": "fshq_9f2c1d4e…" }
    }
  }
}
```

El backend (lifecycle `beforeCreate` de food-order):
1. Revalida en servidor: existencia, estado `activa`, vigencia, usuario,
   restaurante, destino y huella del carrito (cualquier cambio de
   productos/variantes/cantillas/dirección → 409) y, para `ciudadan`, que siga
   habiendo repartidores elegibles.
2. Consume la cotización **atómicamente** (segunda confirmación con el mismo
   código → 409 `La cotización de envío ya fue utilizada en otro pedido.`).
3. Sobrescribe `monto_envio` con el importe de la cotización y recalcula
   `monto_total` = Σ subtotal items + envío. **El importe del body se ignora.**
4. Deja `metadata.cotizacion_envio_confirmada` para consulta/verify-payment.

Sin `metadata.cotizacion_envio` el flujo legacy (`metadata.uber_direct`) queda
intacto: desplegar gradualmente es seguro.

**Rechazos al confirmar** (Error plano, status+mensaje en español):
`COTIZACION_INVALIDA` 400 · `COTIZACION_EXPIRADA` 409 · `COTIZACION_YA_USADA`
409 · `COTIZACION_DE_OTRO_USUARIO` 403 · `RESTAURANTE_NO_COINCIDE` 400 ·
`DESTINO_MODIFICADO` 409 · `CARRITO_MODIFICADO` 409 · `SIN_REPARTIDORES` 409.

## 5. verify-payment (sin cambio de contrato)

`POST /api/food-orders/:id/verify-payment {pickupName, pickupPhone, pickupNotes}`:

- Orden Uber (antes y ahora): crea el delivery Uber + `food-delivery`
  `provider='uber_direct'`.
- Orden Ciudadan (nuevo): NO llama a Uber; crea `food-delivery`
  `provider='ciudadan'`, `quote_id` = código de cotización, `status='pending'`
  (`metadata.despacho_pendiente=true`). El despacho/asignación de repartidor es
  fase posterior; el campo `food-delivery.repartidor` (nuevo, nullable) es la
  costura prevista.

## 6. Variables de entorno (backend, sin secretos en el repo)

| Variable | Default | Uso |
|---|---|---|
| `RUTA_PROVEEDOR` | `google` | `google` \| `osrm` (distancias por calles) |
| `RUTA_GOOGLE_KEY` / `GOOGLE_MAPS_API_KEY` / `GEOCODING_KEY` | — | Llave Google Directions (primera presente; `GEOCODING_KEY` ya existe en `.env`) |
| `RUTA_OSRM_URL` | `https://router.project-osrm.org` | Base OSRM (demo público: solo dev; en prod auto-alojar) |
| `RUTA_TIMEOUT_MS` | `5000` | Timeout del proveedor de rutas |
| `UBER_DIRECT_TIMEOUT_MS` | `8000` | Timeout del cliente Uber Direct |
| `COTIZACION_VIGENCIA_MIN` | `15` | Vigencia de la cotización |
| `REPARTIDOR_UBICACION_MAX_MIN` | `15` | Frescura de la ubicación del repartidor |
| `UBER_DIRECT_*` (existente) | — | Credenciales Uber Direct (solo servidor) |

## 7. Para el agente de frontend (pasos concretos)

1. **Cotizar:** al elegir la dirección de entrega, reemplazar las N llamadas a
   `POST /api/uber-direct/quote` por **una** llamada a
   `POST /api/food-shipping/cotizar` con el token Auth0 en `Authorization`:
   `{ foodCartId, direccionDestinoId }`. Guardar el tablero por restaurante.
2. **Decidir:** mostrar ambas opciones por restaurante; deshabilitar
   "Confirmar pedido" solo si `puedeContinuar === false` (hoy equivale a: cada
   restaurante con ≥1 `disponible`). Un `simulado: true` en Uber debe
   mostrarse como precio NO definitivo (modo pruebas del proveedor).
3. **Confirmar:** al crear cada orden por restaurante, incluir
   `metadata.cotizacion_envio.codigo = <cotizacionId del proveedor elegido>`.
   Los `monto_envio`/`monto_total` que envíes serán sobrescritos por el
   servidor (puedes seguir calculándolos para preview). Manejar 409
   (`COTIZACION_*`/`CARRITO_MODIFICADO`/`DESTINO_MODIFICADO`) volviendo al
   paso de cotización con el mensaje recibido.
4. **Cobertura de la app repartidor:** los repartidores deben estar
   `approved` (expediente delivery), con rol `repartidor`, vehículo
   `verificado` y publicando su ubicación vía `POST /api/driver-locations`
   (`{ coords: {lat,lng}, driver_id, time }`) al menos cada 15 min para ser
   considerados "disponibles".
5. **No intentar** usar cotizaciones de otro usuario, reusar códigos tras
   confirmar, ni alterar `monto_envio`: el backend lo rechaza o sobrescribe.

## 8. Persistencia (`api::food-shipping.food-shipping-quote`, CRUD cerrado)

`user`, `food_cart`, `food_order` (se llena al confirmar), `restaurant`,
`direccion_origen`, `direccion_destino`, `origen_coords`, `destino_coords`,
`destino_inline` (privado), `provider` (`ciudadan|uber_direct`), `codigo`
(único, opaco), `importe`, `moneda`, `distancia_metros`, `estado`
(`activa|consumida|expirada|invalidada`), `vencimiento`,
`referencia_proveedor` (privado: quote_id Uber), `huella_carrito` (SHA-256 de
producto|variante|cantidad), `metadata` (privado).

## 9. Estrategia anti doble asignación / concurrencia (documentada)

1. Cotizar no muta nada del repartidor; solo verifica existencia de elegibles.
2. La reserva con vencimiento ES la cotización: consumo con update condicional
   `where: {id, estado: 'activa'}` (bloqueo optimista, el mismo patrón del MVP
   repartidores). Dos confirmaciones concurrentes → exactamente una gana (409
   la otra); confirmar repetidamente no duplica pedidos ni cargos.
3. Re-cotizar invalida (`estado='invalidada'`) las cotizaciones activas
   previas del mismo usuario+carrito/pedido.
4. El despacho en tiempo real (oferta/aceptación por repartidor) queda FUERA
   del MVP: `food-delivery.repartidor` + la exclusión de ocupados en la
   elegibilidad son la costura prevista.

## 10. Pruebas (as-built, `npm test`)

- **250 pruebas, 242 pasan, 8 fallan preexistentes** (`wikiseed-sync`×6,
  `wiki-root-provider`, `prelanzamiento` — rutas Windows, documentados en la
  auditoría Fase A; ajenos a este módulo).
- Nuevas (74): `food-shipping-tarifa` (fórmula 1/2/3/5/8/10 km, >10 km,
  fraccionarios, precisión), `food-shipping-rutas` (google/osrm, NoRoute,
  timeout, fail-closed sin key), `food-shipping-repartidores` (radio 10 km,
  aprobado/rol/vehículo/ubicación/ocupado, 3 tipos), `food-shipping-cotizar`
  (tablero, propiedad 404, timeout/rechazo/error/no-configurado Uber, un
  proveedor falla, ninguno disponible, `puedeContinuar`, sin fugas de datos,
  re-cotizar invalida, inline), `food-shipping-confirmacion` (consumo único,
  expirada, modificada, ajena, alteración de importes, concurrencia, legacy
  intacto, verify-payment ciudadan/uber/validación).
