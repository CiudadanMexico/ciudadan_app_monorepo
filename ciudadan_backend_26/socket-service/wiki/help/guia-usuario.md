# Guía de Usuario de Ciudadan

Bienvenido. Esta guía te explica cómo usar las funciones principales de la plataforma.
Para el manual completo, consulta el documento **09-Guía-Usuario-Sitio**.

## Tu cuenta

- Entra con el botón **Login** (Auth0). Al primer ingreso se crea tu usuario con tu email.
- En tu **Perfil** (`/perfil/:username`) editas tus datos y ves tu **QR** (`/miqr`).
- Guiarda tus **favoritos** (productos, cursos, contenido, clubs) en `/favoritos` con el botón ❤.
- **Referir** amigos: genera tu código en `/referir` y gana comisiones.

## CoWork: gana laborys haciendo tareas

- Entra a `/coowork`. Hay tareas en **áreas** (5 fijas) y **skills**.
- Abre una tarea y sube tu **resolución**. Al ser **calificada**, ganas **laborys** automáticamente.
- Los **socios** pueden crear tareas (`/herramientas/agregar-tarea`), asignarlas
  (`/herramientas/asignar-tarea`) y calificar (`/herramientas/calificar-tarea`).

## Compra y venta (Marketplace)

**Comprar:** `/market` → producto → agregas al **carrito** (`/carrito`) → pagas en
`/carrito/finalizar` → sigues tu pedido en `/compras/*` y lo calificas al llegar.

**Vender:** registra tu **tienda** en `/registro-vendedor`, sube **productos** en
`/agregar-producto`, y gestiona pedidos/pagos en `/market/store/:slug`.

## Comida

**Pedir:** `/food` → restaurante → carrito de comida → checkout `/carrito/comida/checkout`.
**Vender:** afíliate en `/comida/afiliar-restaurante`, sube tu menú y gestiona pedidos.

## Taxis

**Pasajero:** `/taxis` → pide un viaje, paga y califica.
**Conductor:** pre-registro en `/taxis/conductor/preregistro` (documentos + vehículo), cita de
verificación y operación en `/taxis/conductor/esperando`.

## Gana viendo anuncios

En `/gana` → `/gana/ver-anuncios`. Mira anuncios, valida la visualización y gana **laborys**.
También puedes **promover** membresías o **generar contenido** para ganar.

## Tu cartera

- `/cartera` → saldo de **laborys** y tokens.
- Crea tu **billetera** en `/cartera/crear`.
- Compra tokens en `/comprar-tokens`.

## Eventos, cursos y contenidos

- **Eventos:** `/eventos`, detalle `/evento/:slug`, crear en `/eventos/crear-evento`.
- **Cursos:** `/cursos/*`, detalle `/curso/:slug/*`.
- **Contenidos:** `/contenidos/*`, detalle `/contenido/:slug`.

## Comunidad y clubs

- **Comunidad:** `/comunidad`, crear en `/crear-comunidad`.
- **Anuncios de comunidad:** `/comunidad/nuevo-anuncio-programado` y `/comunidad/mis-anuncios`.
- Los **clubs** agrupan socios (plantas, bitácoras, verificación legal COFEPRIS/amparos).

## Más ayuda

- Preguntas frecuentes: `/ayuda`, `/preguntas-frecuentes`.
- Cómo usar los **wikilinks** de la wiki: [[Como Usar Wikilinks|leer guía]].
- Conoce más sobre la plataforma: [[Como Funciona|qué es Ciudadan]].

---
*Esta página forma parte de la ayuda del sitio.*