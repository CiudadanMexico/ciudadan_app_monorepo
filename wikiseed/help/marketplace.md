# Marketplace: Comprar y Vender

El **Marketplace** te permite **comprar productos** y, si eres **vendedor**, registrar tu
**tienda** y vender con envíos y cobros integrados (Stripe).

## Contenido
- [[Marketplace#Comprar (cliente)|Comprar (cliente)]]
- [[Marketplace#El carrito y finalizar compra|El carrito y finalizar compra]]
- [[Marketplace#Registrar una tienda (vendedor)|Registrar una tienda (vendedor)]]
- [[Marketplace#Subir un producto|Subir un producto]]
- [[Marketplace#Gestionar tu tienda y pedidos|Gestionar tu tienda y pedidos]]
- [[Marketplace#Envíos y guías|Envíos y guías]]
- [[Marketplace#Pagos y comisiones|Pagos y comisiones]]
- [[Marketplace#Preguntas y reseñas|Preguntas y reseñas]]

---

## Comprar (cliente)

1. **Entra al Market:** `/market` (o `/marketplaces`). Usa el **buscador** o explora
   categorías/productos.
2. **Ve el producto:** `/market/producto/:slug` — precio, fotos, especificaciones,
   stock, dimensiones/peso, preguntas y reseñas.
3. **Añade al carrito:** botón **AgregarCarrito**. Puedes elegir cantidad (y variaciones si
   el producto las tiene).
4. Revisa tu **carrito** en `/carrito` antes de pagar.

## El carrito y finalizar compra

- **Carrito:** `/carrito` — ver items, cantidades, total, envío. Puedes modificar.
- **Finalizar:** `/carrito/finalizar` — eliges la **dirección de envío** (de tu perfil/`
  ubicacion` o nueva), se calcula el **envío**, y pasas a **pago**.
- **Pagas** con **tarjeta (Stripe)**.
- Al pagar: se genera tu **pedido** (`pedido`) y el **pago** (`pago`). El vendedor lo prepara
  y lo envía.
- **Sigue tu pedido:** `/compras/*`. Cuando llega, lo **calificas** y puedes dejar una
  **reseña** (`Resenas`).

## Registrar una tienda (vendedor)

1. **Registra tu tienda:** `/registro-vendedor` (`RegistroTienda`). Completa:
   - **Nombre y email** (obligatorios) y `slug` de la tienda.
   - **Datos bancarios**: nombre en el banco, **CLABE**, banco (para liquidar ventas).
   - **Esquema de impuestos**: sin IVA / con IVA / optativo.
   - **Dirección, CP, localidad** y una **imagen**.
2. Completa los pasos del formulario (stepper). Cuando `terminado=true`, tu tienda queda
   **activa**.
3. **Stripe (pagos):** vinculas tu cuenta Stripe (`stripeAccountId`,
   `stripeOnboarded`, `stripeChargesEnabled`, `stripePayoutsEnabled`) para recibir pagos.

## Subir un producto

- **Agregar:** `/agregar-producto` (o dentro de tu tienda).
- Define:
  - **Datos generales**: nombre, descripción, precio, marca, categoría (`store-categorie`).
  - **Imágenes**: una o varias (predeterminada + galería).
  - **Inventario**: stock, activo, destacado.
  - **Dimensiones/peso**: largo, ancho, alto, peso → para calcular el **volumétrico** del envío.
  - **Especificaciones y variaciones** (JSON), **tags**.
  - **Slug** y **CP** de origen.
- Al guardar, queda en tu **store** y visible en el Market (si `activo`).

## Gestionar tu tienda y pedidos

En `/market/store/:slug`:

| Pestaña | Qué hace |
|---|---|
| `agregar-producto` · `productos` | Agregar/editar productos |
| `pedidos` (**MisProductos**) | Ver pedidos y **preguntas de clientes** |
| `entregados` (**PedidosEntregados**) | Pedidos enviados/entregados |
| `pagos` (**PagosTienda**) | Pagos recibidos, comisiones |
| `configuracion` | Datos, impuestos, banco |

- **Pedido:** aceptas, preparas y **envías**. Según el proveedor logístico generas la guía.
- Entregas y el cliente califica.

## Envíos y guías

- Calculas el **envío** por peso/volumen/distancia del cliente.
- **Generas la guía** (`GenerarGuia`) con un proveedor: Estafeta, FedEx, DHL, Redpack,
  Paquetexpress, Sendex, iVoy, Quiken, Carssa.
- Capturas el **número de guía** y el pedido pasa a `enviado` → `en_camino`.

## Pagos y comisiones

- El cliente paga con **Stripe** (`pago`). Se registra:
  - `monto` total, `moneda`.
  - `comisionStripe`, `comisionPlataforma`, `pago_vendedor`.
- El pago se **liquida** a tu cuenta bancaria (CLABE).
- `PedidosPendientes`/`PagosTienda` te muestran el estado financiero.

## Preguntas y reseñas

- Los clientes pueden hacer **preguntas** al producto (`PreguntasProducto`). Tú **respondes**
  desde tu panel (`preguntas-producto`).
- Los clientes dejan **reseñas** (`Resenas`) y **calificaciones** a producto/tienda.

---

Volver: [[Indice|índice]] · [[Cuenta|Cuenta]] · [[Comida|Comida]] · [[Cartera|Cartera]].