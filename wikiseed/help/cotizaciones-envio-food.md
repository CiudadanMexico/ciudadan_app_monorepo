# Cotizaciones de Envío (Comida)

Cuando pides comida en Ciudadan, antes de pagar puedes **cotizar el envío**: la
plataforma calcula cuánto costará llevar tu pedido del restaurante a tu dirección y te
muestra las opciones disponibles — la **red de repartidores de Ciudadan** o
**Uber Direct** — por cada restaurante de tu carrito.

## Contenido
- [[Cotizaciones Envio Food#Qué es una cotización de envío|Qué es una cotización de envío]]
- [[Cotizaciones Envio Food#Los dos proveedores de envío|Los dos proveedores de envío]]
- [[Cotizaciones Envio Food#Cómo se calcula la tarifa de la red Ciudadan|Cómo se calcula la tarifa de la red Ciudadan]]
- [[Cotizaciones Envio Food#Cómo cotizar en el checkout|Cómo cotizar en el checkout]]
- [[Cotizaciones Envio Food#Confirmar tu pedido|Confirmar tu pedido]]
- [[Cotizaciones Envio Food#Repartir con la red Ciudadan|Repartir con la red Ciudadan]]
- [[Cotizaciones Envio Food#Preguntas frecuentes|Preguntas frecuentes]]

---

## Qué es una cotización de envío

- Es el **precio de la entrega calculado por Ciudadan** para llevar tu pedido desde el
  restaurante hasta tu dirección.
- Se cotiza **por restaurante**: si tu carrito tiene alimentos de dos restaurantes,
  ves una cotización por cada uno.
- Cada cotización trae un **código único** y una **vigencia de 15 minutos**. Si
  expira, solo tienes que volver a cotizar.
- Todo se calcula **en el servidor**: restaurante, dirección, distancia real por
  calles y disponibilidad de repartidores. El precio que ves es el que pagas.

## Los dos proveedores de envío

| Proveedor | Cómo entrega |
|---|---|
| **Ciudadan** (red propia) | Repartidores de la comunidad, aprobados y con vehículo verificado, a menos de 10 km del restaurante. Tarifa transparente por distancia. |
| **Uber Direct** | Entrega a través del proveedor externo. El precio y la disponibilidad los define Uber Direct. |

- Si un proveedor no está disponible para tu entrega (fuera de cobertura, sin
  repartidores, proveedor ocupado…), el **otro sigue disponible**: la indisponibilidad
  se muestra como aviso con su motivo, no como error.
- Puedes **confirmar tu pedido** mientras cada restaurante de tu carrito tenga al
  menos **una** opción de envío disponible (`puedeContinuar`).
- Una cotización de Uber Direct en **modo de pruebas** se marca como *simulada*:
  trátala como precio **no definitivo**.

## Cómo se calcula la tarifa de la red Ciudadan

- La distancia se mide **por calles** (la ruta real que recorrerá el repartidor), no
  en línea recta. Si no hay ruta, la red Ciudadan no cotiza esa entrega.
- **Cobertura:** hasta **10 km exactos** desde el restaurante, para cualquier tipo de
  vehículo.
- **Tarifa (MXN):** `máximo(30, 20 + 5 × kilómetros)`, a 2 decimales.

| Distancia por calles | Costo de envío |
|---|---|
| 1 km | $30.00 |
| 2 km | $30.00 |
| 3 km | $35.00 |
| 5 km | $45.00 |
| 8 km | $60.00 |
| 10 km | $70.00 |

- Las distancias fraccionarias también cuentan (p. ej. 3.5 km → $37.50).

## Cómo cotizar en el checkout

1. Arma tu **carrito de comida** y ve al checkout (`/carrito/comida/checkout`).
2. Elige tu **dirección de entrega**: una guardada de tu perfil o una nueva con su
   ubicación en el mapa.
3. La plataforma cotiza **una sola vez para todo el carrito** y muestra un **tablero
   por restaurante** con las dos opciones (Ciudadan y Uber Direct), su importe y su
   vigencia.
4. Elige el proveedor que prefieras **por restaurante** y confirma tu pedido.

El flujo completo de pedir comida (menús, carrito, pagos) está en
[[Comida|Comida y restaurantes]].

## Confirmar tu pedido

- Al confirmar, tu pedido incluye el **código de la cotización** que elegiste.
- El backend **revalida** la cotización —que sea tuya, vigente, del mismo
  restaurante, del mismo carrito y de la misma dirección— y **recalcula** el envío y
  el total en el servidor. El importe no se puede alterar desde la app.
- Si algo cambió, la confirmación se rechaza con un mensaje claro y vuelves al paso
  de cotización:
  - **Cotización expirada** — pasaron los 15 minutos: vuelve a cotizar.
  - **Carrito modificado** — agregaste o quitaste productos: vuelve a cotizar.
  - **Dirección modificada** — cambiaste el destino: vuelve a cotizar.
  - **Cotización ya utilizada** — cada código sirve para un solo pedido.
- Con la red **Ciudadan**, al verificarse tu pago la entrega queda registrada como
  **pendiente de despacho** para asignar un repartidor de la red (no se llama a
  Uber).

## Repartir con la red Ciudadan

Para que el sistema te considere disponible como repartidor necesitas:

- Expediente de repartidor **aprobado** y rol **repartidor** activo.
- **Vehículo verificado** (bici, motocicleta o automóvil).
- **Ubicación reciente**: publicada en los últimos 15 minutos.
- Estar a **menos de 10 km** del restaurante y sin otra entrega de la red activa
  asignada.
- Importante: **cotizar no asigna repartidor**. La cotización solo reserva el precio
  del envío; la asignación ocurre al confirmar el pedido.

## Preguntas frecuentes

- **¿Por qué mi envío aparece como "no disponible"?** Puede que estés a más de 10 km,
  que no haya repartidores cerca del restaurante en ese momento, que no exista ruta
  por calles hacia tu dirección, o que el proveedor no ofrezca servicio para esa
  entrega. Revisa el motivo que se muestra y prueba la otra opción.
- **¿Puedo usar una cotización más tarde?** Solo dentro de su vigencia (15 minutos) y
  para el mismo carrito y la misma dirección.
- **¿Quién fija el precio del envío?** El servidor de Ciudadan: distancia real por
  calles y tarifa transparente. El importe de la app nunca manda.
- **¿Pago la comida y el envío juntos?** Sí: el envío se suma al total del pedido. Ver
  [[Comida#Pagos|pagos en Comida]].
- **Soy repartidor, ¿cómo participo?** Completa tu expediente, verifica tu vehículo
  y mantén tu ubicación al día (ver la sección anterior).

---

Volver: [[Indice|índice]] · [[Comida|Comida y restaurantes]] ·
[[Bienvenida Comunidad|Bienvenida a la comunidad]].

