# FOOD — Cotizaciones de envío: integración frontend (as-built)

> **Estado:** implementado en la rama `feature/food-cotizaciones-frontend` (solo
> frontend; cero cambios de backend).
> Contrato backend de referencia: **`docs/FOOD-COTIZACIONES-ENVIO-MVP.md`**
> (endpoint, reglas de negocio, códigos de indisponibilidad/confirmación).

---

## 1. Resumen

El checkout de Food (`/carrito/comida/checkout`, `FoodCheckout.jsx`) sustituyó
las N llamadas a `POST /api/uber-direct/quote` (una por restaurante, sin auth)
por **una única llamada** a `POST /api/food-shipping/cotizar` con el token
Auth0 en `Authorization`. El backend devuelve un tablero con las opciones de
envío por restaurante (**Ciudadan** y **Uber Direct**), cada una con precio,
distancia y vigencia; la UI permite elegir una por restaurante y recalcula
automáticamente si cambia el carrito o la dirección. Al confirmar, cada orden
viaja con `metadata.cotizacion_envio.codigo` (código opaco de la cotización
elegida) y el servidor fija el importe autoritativo.

## 2. Contrato consumido

- **Endpoint:** `POST /api/food-shipping/cotizar` (`auth: false` + policy
  `global::is-authenticated-auth0` → identidad SIEMPRE del token).
- **Body (checkout):** `{ foodCartId: <id del carrito sincronizado>, direccionDestinoId: <id de dirección guardada> }`.
  Alternativas del contrato (no usadas por el checkout): `foodOrderId`
  (re-cotización) y `direccionDestino` inline (`{ direccion, coords }` /
  `{ lat, lng }`).
- **Response 200:** `{ success, puedeContinuar, direccionDestinoId, restaurantes: [{ restaurantId, nombre, cotizaciones: { ciudadan: {...}, uber_direct: {...} } }] }`,
  donde cada cotización es `{ proveedor, disponible, cotizacionId, importe,
  moneda, distanciaMetros, vence, codigoIndisponibilidad, mensaje, simulado }`.
  La indisponibilidad de un proveedor NO es error HTTP: se muestra como bloque
  deshabilitado con su `mensaje`.
- **Confirmación:** `POST /api/food-orders` (flujo existente) +
  `metadata.cotizacion_envio.codigo`. El backend revalida (vigencia, huella
  del carrito, destino, disponibilidad), consume la cotización atómicamente y
  sobrescribe `monto_envio`/`monto_total`. El 409 se maneja volviendo al paso
  de dirección para re-cotizar.

## 3. Arquitectura frontend

| Archivo | Rol |
|---|---|
| `src/services/food/cotizacionesEnvioService.js` | **Nuevo.** `cotizarEnvio()` y `guardarDireccionEnvio()` sobre `fetchJson`/`STRAPI_URL` de `src/utils/request.utils.js` (sin URLs hardcodeadas). Token Auth0 por parámetro, igual que `services/cowork/mutationsServices.js`. |
| `src/hooks/food/useCotizacionesEnvio.js` | **Nuevo.** Estado del tablero + selecciones por restaurante; guard de carrera (solo la última solicitud actualiza); preselección por restaurante; consultas (`getCotizacionSeleccionada`, `seleccionVencida`, etc.). |
| `src/components/Food/FoodOpcionesEnvio.jsx` | **Nuevo.** UI de opciones por restaurante (MUI v6 + `sx`): tarjetas seleccionables con precio, distancia y vigencia; aviso `simulado`; bloque no disponible con `mensaje`. |
| `src/components/Food/FoodCheckout.jsx` | **Modificado.** Reemplaza `useUberDirect` (deprecado, ya sin usos en el checkout) por `useCotizacionesEnvio`; re-cotiza al cambiar dirección/carrito; selector de opciones en el paso «Confirmar pedido»; `metadata.cotizacion_envio.codigo` al confirmar; manejo de 409. |

El hook legacy `src/hooks/food/useUberDirect.js` se deja en el árbol (sin
usos) por si se quiere referenciar el flujo anterior; el endpoint legacy
`POST /api/uber-direct/quote` sigue vivo en el backend.

## 4. Flujo del checkout (UX)

1. **Paso 1 — Dirección:** `DireccionSelector` emite la dirección elegida. Si
   es temporal (sin id, «Usar sin guardar»), `seleccionarDireccion` la persiste
   primero vía `POST /api/direcciones` y usa el id resultante (ver decisión D1).
2. **Cotización automática:** un `useEffect` cotiza cuando hay dirección +
   carrito sincronizado (`cartId`) y recalcula si cambia la dirección, el
   contenido del carrito (huella `item_key:cantidad`) o llega el `cartId`.
   Mientras vuela la petición la UI muestra «Cotizando...».
3. **Paso 3 — Confirmar pedido:** por cada restaurante se muestra
   `FoodOpcionesEnvio` con las opciones disponibles (precio, distancia aprox.
   en km, vigencia «Cotización válida hasta hh:mm»). Se preselecciona la
   primera disponible (Ciudadan primero, ver D2) y el usuario puede cambiarla.
   «Envío» y «Total» se recalculan con el importe seleccionado.
4. **Confirmación:** «Confirmar pedido» se deshabilita mientras se cotiza, si
   `puedeContinuar === false`, si falta selección (`cotizacionIncompleta`) o si
   la selección venció (`hayCotizacionVencida`); en ese caso aparece
   «Volver a cotizar». Al confirmar se crea una orden por restaurante con
   `metadata.cotizacion_envio.codigo` y el flujo de pagos continúa igual.

## 5. Decisiones de diseño

- **D1 — Direcciones temporales se guardan antes de cotizar.** El backend liga
  la cotización al destino y, al confirmar, revalida `direccion_destino`
  contra la cotización: un destino inline sin dirección guardada produce 409
  `DESTINO_MODIFICADO`. El checkout auto-guarda la dirección temporal
  (`POST /api/direcciones`, mismo payload que `DireccionSelector`) y cotiza
  siempre con `direccionDestinoId` (destino guardado preferido por el
  contrato). El respaldo inline del hook solo es un safety-net.
- **D2 — Preselección «Ciudadan primero».** Ambas opciones son seleccionables;
  la preselección por restaurante es la primera disponible en el orden
  `[ciudadan, uber_direct]`. Motivo: `ciudadan` es el único camino soportado
  end-to-end por el MVP en verify-payment (ver §6), y es el que este módulo
  viene a demostrar. El usuario puede elegir Uber Direct si está disponible.
- **D3 — «Precio y tiempo».** El contrato del MVP **no incluye ETA** de
  entrega. Como información de tiempo/alcance se muestran los campos
  disponibles: **distancia** (`distanciaMetros` → km aprox.) y **vigencia**
  (`vence` → «Cotización válida hasta hh:mm», ~15 min). No se inventan
  tiempos estimados.
- **D4 — Recotización al cambiar el carrito.** La huella `item_key:cantidad`
  (la misma identidad de líneas que usa `FoodCartContext`) es dependencia del
  efecto de cotización: cualquier cambio de productos/variantes/cantidades
  dispara una nueva cotización (el backend invalida las cotizaciones activas
  previas del mismo carrito) y las selecciones se recalculan. Además, la
  revalidación de la huella en servidor (`CARRITO_MODIFICADO`) es la última
  línea de defensa al confirmar.
- **D5 — Manejo de 409.** `COTIZACION_*`, `CARRITO_MODIFICADO`,
  `DESTINO_MODIFICADO` y `SIN_REPARTIDORES` al confirmar: se muestra el
  mensaje del servidor y se vuelve al paso 1 (dirección) con las cotizaciones
  limpias para re-cotizar. Otros errores se muestran sin cambiar de paso.
- **D6 — `simulado: true`.** El modo pruebas del proveedor Uber se muestra con
  el chip «Precio de prueba (simulado)» (precio NO definitivo), tal como pide
  el contrato (§7.2 del as-built).
- **D7 — El precio lo fija el servidor.** El payload de la orden sigue
  llevando `monto_envio`/`monto_total` como preview (para no romper nada del
  flujo existente), pero el lifecycle del backend los sobrescribe con el
  importe de la cotización. El frontend nunca envía importes como dato de
  confianza.

## 6. Costura conocida (backend, fuera de alcance frontend)

`verifyPaymentAndCreateDelivery` (`food-order/services/food-order.js`)
distingue: orden con `metadata.cotizacion_envio_confirmada.proveedor === 'ciudadan'`
→ entrega registrada como pendiente de despacho (soportado por este MVP); y
órdenes Uber que requieren `metadata.uber_direct.quote_id` (flujo legacy).
Como el nuevo endpoint **no expone** el `quote_id` de Uber (anti fuga de
datos, por diseño), una orden confirmada vía `cotizacion_envio` con proveedor
`uber_direct` deja la verificación de pago sin esa referencia: es una costura
documentada del backend (el doc as-built §5 solo anuncia soporte completo
para `ciudadan` en verify-payment). Por eso la preselección es D2. Cuando el
backend cierre esa costura, el frontend no requiere cambios: la selección de
Uber ya viaja por `cotizacion_envio.codigo`.

## 7. Demo / verificación manual

**Requisitos de datos (backend):**
1. Restaurante con dirección de origen **con coordenadas** (sin ellas no hay
   checkout) y al menos un producto publicado.
2. Para la opción Ciudadan: un repartidor elegible cerca (≤10 km,
   `delivery-profile` approved, rol `repartidor`, vehículo verificado,
   ubicación reciente vía `POST /api/driver-locations`), servicio de rutas
   configurado y destino a ≤10,000 m por calles.
3. Para la opción Uber Direct: credenciales del proveedor configuradas (o
   modo mock del service → la UI lo marca como «simulado»).
4. Usuario autenticado con Auth0 (audience `https://api.ciudadan.org`) y una
   dirección de entrega guardada (o se crea una en el paso 1).

**Pasos:**
1. Añade productos al carrito de Food y entra a `/carrito/comida/checkout`.
2. Elige dirección → el paso 3 muestra por restaurante las opciones con
   precio, distancia y vigencia; «Envío» y «Total» toman la preselección.
3. Cambia la opción de envío de un restaurante → «Envío» y «Total» se
   recalculan al instante.
4. Modifica el carrito (otra pestaña/pestaña del carrito) o espera >15 min →
   el tablero se re-cotiza / aparece «Cotización vencida» con «Volver a
   cotizar».
5. «Confirmar pedido» → una orden por restaurante con
   `metadata.cotizacion_envio.codigo`; el backend consume la cotización y
   fija `monto_envio`/`monto_total` (verificar en la orden creada:
   `metadata.cotizacion_envio_confirmada`).

## 8. Build

Sin cambios en tooling: `CI=false DISABLE_ESLINT_PLUGIN=true npx craco build`
en `ciudadan_frontend/` (el `DISABLE_ESLINT_PLUGIN` es el flag estándar del
repo mientras existan errores de ESLint en archivos ajenos).

