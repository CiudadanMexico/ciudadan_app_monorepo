# Comida y Restaurantes

El módulo de **comida** te permite **pedir** a restaurantes y, si eres **restaurantero**,
afiliar tu restaurante y vender con menú, modificadores, ofertas y delivery.

## Contenido
- [[Comida#Pedir comida (cliente)|Pedir comida (cliente)]]
- [[Comida#Explorar y elegir|Explorar y elegir]]
- [[Comida#Carrito de comida y checkout|Carrito de comida y checkout]]
- [[Comida#Afiliar un restaurante (vendedor)|Afiliar un restaurante (vendedor)]]
- [[Comida#Crear tu menú y productos|Crear tu menú y productos]]
- [[Comida#Modificadores, variantes y ofertas|Modificadores, variantes y ofertas]]
- [[Comida#Gestionar pedidos|Gestionar pedidos]]
- [[Comida#Pagos|Pagos]]

---

## Pedir comida (cliente)

1. **Ver restaurantes:** `/food` (`RestaurantesRoute`) o `/restaurantes`.
2. Elige un restaurante → **/comida/restaurante/:slug**.
3. Navega su **menú**: categorías, productos, variantes (tamaños), **modificadores** (extras),
   alergenos y **ofertas**.
4. Añade al **carrito de comida** (`FoodCart`) eligiendo cantidad y modificadores.

## Explorar y elegir

- **Ofertas:** `/comida/ofertas` (`ComidaOfertas`) — combos/descuentos.
- **Producto:** `/comida/producto/:slug` — detalle con ingredientes, alergenos,
  picante, temperatura, y stock.
- Cada restaurante define su **esquema de impuestos** (sin IVA / con IVA / optativo).

## Carrito de comida y checkout

- **Carrito:** `FoodCart` (contexto `FoodCartContext`). Ves subtotal, envío y total.
- **Checkout:** `/carrito/comida/checkout` (`FoodCheckout`) — dirección de entrega,
  método de pago.
- **Paga** con tarjeta. Se crea tu **pedido** (`food-order`) y el **delivery** (`food-delivery`,
  p.ej. Uber Direct).
- **Sigue tu pedido** y el estado del delivery; **califica al llegar** (y al restaurante).

## Afiliar un restaurante (vendedor)

1. **Afíliate:** `/comida/afiliar-restaurante` (`RegistroRestaurante`). Completa:
   - **Nombre y email** (obligatorios), `slug`.
   - **Datos bancarios**: nombre, **CLABE**, banco.
   - **Esquema de impuestos**.
   - **Dirección, CP, localidad** e **imagen**.
2. Avanza por los **pasos** del formulario (`paso` del restaurante). Al terminar queda activo.

## Crear tu menú y productos

- **Categorías:** crea categorías de comida (`food-categorie`) para tu menú.
- **Producto de comida** (`AgregarProducto`, `ProductoDatosGenerales`): nombre, descripción,
  precio base, imágenes, categoría, tiempo de preparación, calorías, peso, porciones.
- **Características:** picante (ninguno→extremo), vegetariano, vegano, sin gluten, contiene
  lácteos/mariscos/cerdo. `es_picante` y `nivel_picante`.
- **Ingredientes y alergenos**: JSON.
- **Inventario:** stock, disponible, `usa_stock`, destacado.
- **Variantes** (`food-product-variant`): tamaño/porción con su propio precio, peso, calorías,
  stock e imagen.

## Modificadores, variantes y ofertas

- **Grupos de modificadores** (`ModificadoresRestaurante`, `food-modifier-group`):
  p.ej. "Elige tu extra", con `requerido` y `orden`. Contienen **modificadores** (`food-modifier`)
  que pueden tener precio adicional e imagen.
- **Ofertas** (`OfertasRestaurante`, `food-offer`): título, descripción, precio, cantidad,
  vigencia, items incluidos (con cantidad y precio).

## Gestionar pedidos

- **Panel de pedidos:** `PedidosRestaurante`, `PedidosPendientes`, `PedidoDetalleModal`.
- Aceptas un pedido, preparas, **marcas listo**, **envías/entregas**, **cancelas** o
  **devuelves** según el estado (`pedidosRestauranteService`).
- Puedes ver los pedidos por restaurante y su **detalle modal**.

## Pagos

- El cliente paga con **Stripe** (`food-order.pago`). Se registra `monto_total`, `moneda`,
  comisiones (`comisionStripe`, `comision_plataforma`).
- Recibes el pago en tu cuenta bancaria (CLABE).

---

Volver: [[Indice|índice]] · [[Marketplace|Marketplace]] · [[Cuenta|Cuenta]] · [[Taxis|Taxis]].