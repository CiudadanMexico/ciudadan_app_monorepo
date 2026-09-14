# 09 — Guía de Usuario del Sitio (todos los módulos)

> Guía **paso a paso** para usar todas las funciones de Ciudadan desde el punto de vista del
> usuario final: crear cuenta, comprar, vender, trabajar (CoWork), viajar (taxis), ver anuncios
> y ganar, manejar tu cartera, participar en eventos/cursos, y más.
>
> Las rutas indicadas corresponden al frontend (`ciudadan_frontend`). En producción el dominio
> raíz es `https://ciudadan.org` (en local: `http://localhost:3001`).

## Contenido
1. [Crear cuenta / entrar](#cuenta)
2. [Tu perfil y preferencias](#perfil)
3. [Favoritos](#favoritos)
4. [Referidos e invitaciones](#referidos)
5. [Membresías](#membresia)
6. [CoWork: tareas y moneda laborys](#cowork)
7. [Marketplace: comprar y vender](#marketplace)
8. [Comida / restaurantes](#food)
9. [Taxis / movilidad](#taxis)
10. [Gana / anuncios remunerados](#gana)
11. [Cartera y wallets](#cartera)
12. [Eventos](#eventos)
13. [Cursos y contenidos (blog)](#cursos)
14. [Comunidad y clubs](#comunidad)
15. [Wiki y ayuda](#wiki)

---

<a name="cuenta"></a>
## 1. Crear cuenta / entrar

Ciudadan usa **Auth0** para el login (Google/u otra cuenta social). No creas una contraseña en
Ciudadan; entras con tu cuenta de Auth0.

**Registro/Login:**
1. Dirígete a la **Home** (`/`).
2. Pulsa el botón **Entrar / Login** (en la barra superior `NavBar`).
3. Se abre la ventana de **Auth0**: elige tu proveedor (Google, etc.) o crea una cuenta.
4. Acepta los permisos. Al terminar regresas a Ciudadan ya autenticado.

> En el primer login se crea automáticamente tu usuario (`up_users`). El email queda como
> identificador en toda la plataforma.

**Cerrar sesión:** pulsa tu avatar/perfil → **Salir / Logout** (`LogoutButton`).

### Rutas de registro específicas
| Acción | Ruta |
|---|---|
| Registro de **conductor** de taxi | `/taxis/conductor/registro` · `/taxis/conductor/preregistro` |
| Registro de **pasajero** | `/taxis/pasajero/registro` |
| Afiliar una **tienda** (vendedor) | `/registro-vendedor` |
| Afiliar un **restaurante** | `/comida/afiliar-restaurante` |
| Crear una **comunidad** | `/crear-comunidad` |
| **Integrarme** a una comunidad | `/integrarme-comunidad` |

---

<a name="perfil"></a>
## 2. Tu perfil y preferencias

- **Ver / editar perfil:** `Perfil` (icono de usuario en la barra, o `/perfil/:username`).
  Ahí ves tu nombre, email, foto, tu **QR** personal (`/miqr`) y tus datos.
- **Ubicación:** usa `/ubicacion` para indicar tu dirección/ubicación (con Google Maps). Útil
  para envíos y para encontrar servicios cerca.
- **Notificaciones:** `/notificaciones` — ver tu bandeja; `Notificacion` para el detalle.

---

<a name="favoritos"></a>
## 3. Favoritos

Puedes guardar como favoritos **productos, cursos, contenidos y clubs**.
- **Añadir:** en la ficha del producto/curso/contenido/club pulsa el corazón («favorito»)
  (`HearthButton` / `toggleFavorito`).
- **Ver / quitar:** `/favoritos` (también `/favoritos/*`). Ahí aparecen todos tus favoritos y
  puedes eliminarlos.

---

<a name="referidos"></a>
## 4. Referidos e invitaciones

- **Generar tu código de referido:** en `/referir` (también `/registrar`). Genera tu enlace
  personal con tu **código de referido**.
- Alguien que se registre con tu enlace se hace **tu referido**; ves su historial de pagos y
  ganas **comisiones** (`CodigoReferido`, `HistorialPagosReferidos`).
- También sirve el mismo flujo para **referir/agregar** a un club (`/referir/*`, `/agregar-club/:club`).

---

<a name="membresia"></a>
## 5. Membresías

Ciudadan ofrece **membresías** (Marihuanas Club / club) con varios planes. El pago se hace con
**Stripe u OpenPay**.
- **Ver planes:** `/membresias` — lista los tipos de membresía (`membresias-tipo`).
- **Adquirir / pagar:** `/membresias/adquirir/*` (checkout) o `/membresias/pago/plan/:planId`.
- **Probar / activar:** `/membresias/pagar/*` (probar), `/activatumembresia` (activar).
- **Ver tu membresía:** `/mi-membresia` — estado, fechas, vigencia.

> ⚠️ La membresía tipo `socio` (club) **no es** el mismo "rol" de permisos (`roles.extra`).
> Son conceptos distintos.

---

*Continúa: [CoWork](#cowork), [Marketplace](#marketplace), [Food](#food), [Taxis](#taxis),
[Gana](#gana), [Cartera](#cartera), [Eventos](#eventos), [Cursos](#cursos), [Comunidad](#comunidad),
[Wiki](#wiki).*

<a name="cowork"></a>
## 6. CoWork: tareas y moneda laborys

**CoWork** es el módulo de trabajo colaborativo. Se publican **todos** (tareas "maestro") en
**áreas** y **skills**; los usuarios las **resuelven** (crean una `tarea`) y al ser calificadas
ganan **laborys** (moneda interna).

### Áreas y habilidades
- Hay **5 áreas raíz fijas**: Administrativo, Técnico, Comercial-difusión, Software, Creación
  multimedia. Cada área puede tener **subáreas** (carreras/oficios).
- Las **skills** (habilidades) habilitan tareas especializadas.
- En tu **perfil** puedes proponer una subárea nueva si no existe (`proponer-subarea`) y subir
  documentos de **verificación** (`subir-documento-area`). Un socio/verificador la aprueba.

### El módulo CoWork `/coowork`
- **Ver tareas:** el tablero de `/coowork` muestra las tareas según tu rol. Usa las pestañas
  `generales` y las tareas especializadas.
- **Resolver una tarea:** abre una tarea y sube tu **resolución** (`resolver tarea`). Estado de
  tu `tarea`: en_proceso → completada.
- **Crear tareas (socio/editores/root):** `/herramientas/agregar-tarea`. Define título, área,
  skill, recompensa (laborys/efectivo), fecha de entrega, recurrencia.
- **Asignar tareas:** `/herramientas/asignar-tarea` (socios pueden delegar/asignar).
- **Gestionar** y **calificar**: `/herramientas/gestionar-tareas`, `/herramientas/calificar-tarea`,
  `/herramientas/corregir-tarea`, `/herramientas/resolver-apelaciones`.
- **Mi agencia / socios:** `/herramientas/mi-agencia`, `/herramientas/agregar-socio` (los
  socios forman agencias local/federal).

### Laborys
- **`laborys`** es tu moneda. Se acredita automáticamente cuando tu `tarea` es **calificada**
  (estado `calificada` → pago en tu **cartera** `laborysSaldo`). No ganas por entregar, sino por
  la calificación de tu trabajo.
- Puedes consultar tu saldo en **Cartera** (sección 11).

### Roles de permiso (informativos)
`admin`, `socio`, `verificador`, `editor`, `root`. El frontend los lee para mostrar u ocultar
acciones (`isAdmin`, `isSocio`, `isVerificador`, `isRoot`). `?mockRole=admin|socio|usuario` en la
URL de CoWork es **solo una vista previa visual**, no cambia permisos reales.

---

<a name="marketplace"></a>
## 7. Marketplace: comprar y vender

### Comprar
1. Entra al **Market** (`/market` o `/marketplaces`). Explora productos o busca
   (`BuscadorMarket`).
2. Abre un **producto** (`/market/producto/:slug`): ver precio, fotos, especificaciones,
   preguntas y reseñas.
3. Añade al **carrito** (`AgregarCarrito`). Revisa tu carrito en `/carrito`.
4. Finaliza la compra en `/carrito/finalizar`: elige **dirección de envío** (`/ubicacion` o la
   de tu perfil), se calcula el envío.
5. **Paga** con tarjeta (Stripe). Al terminar, el pago queda en `pago` y se genera el **pedido**.
6. Sigue el estado del pedido en `/compras/*`. Cuando llega, **califica** el producto y puedes
   dejar una **reseña**.

### Vender (registrar una tienda)
1. Registra tu **tienda** en `/registro-vendedor` (RegistroTienda): nombre, email, datos
   bancarios (CLABE), esquema de impuestos, dirección.
2. Completa los pasos del formulario (stepper `Paso01`/`Paso02`). Al terminar tu tienda queda
   creada con el slug.
3. Sube **productos**: en `/agregar-producto` (o dentro de tu tienda) define nombre, precio,
   fotos, stock, dimensiones/peso (para envío), tags, variaciones.
4. Gestiona tu tienda en `/market/store/:slug`:
   - `productos` / `agregar-producto` → agregar/editar productos.
   - `pedidos` (`MisProductos`) → ver pedidos y **preguntas** de clientes.
   - `entregados` (`PedidosEntregados`) → pedidos enviados/entregados.
   - `pagos` (`PagosTienda`) → ver **pagos recibidos** y comisiones.
   - `configuracion` → ajustes, datos bancarios, impuestos.
5. **Envíos:** generas la **guía** del pedido (`GenerarGuia`) con proveedores logísticos
   (Estafeta, FedEx, DHL, Redpack, Paquetexpress, Sendex, iVoy, Quiken, Carssa).
6. **Pagos:** CityMapping/Stripe. El pago se liquida a tu cuenta (con comisiones de plataforma
   y de Stripe).

### Preguntas y reseñas
- Los clientes pueden hacer **preguntas** al producto (`PreguntasProducto`); tú respondes.
- Los clientes dejan **reseñas** (`Resenas`) a productos/tiendas.

---

<a name="food"></a>
## 8. Comida / restaurantes

### Pedir comida
1. **Ver restaurantes:** `/food` (`RestaurantesRoute`) o `/restaurantes`. Elige uno.
2. **Menú del restaurante:** `/comida/restaurante/:slug/*` — ver categorías, productos,
   variantes (tamaños), modificadores (extras), alergenos, ofertas.
3. Añade al **carrito de comida** (`FoodCart`), elige modificadores.
4. **Checkout:** `/carrito/comida/checkout` (`FoodCheckout`) — dirección, método de pago.
5. **Paga** con tarjeta. Se crea el **pedido** (`food-order`) y un **delivery** (p.ej. Uber Direct).
6. Sigue tu pedido y el estado del delivery; califica al llegar.

### Vender comida (afiliar un restaurante)
1. **Afíliate:** `/comida/afiliar-restaurante` (`RegistroRestaurante`): nombre, email, slug,
   dirección, datos bancarios, impuestos.
2. Completa tu restaurante paso a paso (`paso` en `food-restaurant`).
3. **Sube productos** de comida (`AgregarProducto`, `ProductoDatosGenerales`,
   `ProductoIngredientes`, `ProductoModificadores`, `ProductoAlergenos`): definelos con
   categoría, precio, stock, ingredientes, alergenos, picante, temperatura.
4. Define **grupos de modificadores** (extras, tamaños) (`ModificadoresRestaurante`,
   `food-modifier-group`) y **ofertas** (`OfertasRestaurante`).
5. Gestiona **pedidos** en tu panel (`PedidosRestaurante`, `PedidosPendientes`): accepta,
   marca listo, entrega, cancela.
6. Recibe **pagos** y gestiona tu cuenta.

---

*Continúa: [Taxis](#taxis), [Gana](#gana), [Cartera](#cartera), [Eventos](#eventos),
[Cursos](#cursos), [Comunidad](#comunidad), [Wiki](#wiki).*

<a name="taxis"></a>
## 9. Taxis / movilidad

El módulo de **taxis** conecta pasajeros y conductores en tiempo real (Socket.IO).

### Como pasajero
1. Entra a `/taxis` (`TaxisRoute`).
2. Registra tus datos de pasajero (`/taxis/pasajero/registro`).
3. Pide un viaje: indicas origen/destino (Google Maps). Se calcula la **tarifa** en vivo
   (coste base + por km + por min, con mínimo; vé `calculate-fare`).
4. Un conductor acepta tu **oferta de viaje**. Sigues el avance (ubicación en vivo, `viatravel`).
5. Al llegar, confirmas el pago (efectivo, laboris u otro) y **calificas** al conductor.

### Como conductor
1. **Pre-registro:** `/taxis/conductor/preregistro` (wizard por pasos). Se te piden:
   - **Cuenta** (email/whatsapp, verificación por código).
   - **Datos personales** (nombre, CURP, RFC, fecha de nacimiento).
   - **Documentos** (INE, licencia, comprobante).
   - **Vehículo** (fotos: frente, lateral, atrás, interior; tarjeta de circulación, seguro; placa, VIN, marca, modelo).
   - **Cita presencial** (`/taxis/conductor/requisitos`) para la **verificación** en persona.
2. La validación la revisa un **verificador** (`/validations/:validationId/review`
   `DriverVerificationPage`): compara biométrico, documentos y datos del vehículo.
3. Una vez **aprobado**, puedes operar.
4. **Conductor en línea:** `/taxis/conductor/esperando` — esperas/aceptas ofertas de viaje,
   te llegan `ofertaviaje`. Confirmas, vas por el pasajero, al llegar confirmas pago y
   calificación.

> El sistema tiene además `free_trips` (viajes gratis promocionales) y `taxi-debt` (adeudos).

---

<a name="gana"></a>
## 10. Gana / anuncios remunerados

**Gana** te permite **ver anuncios** a cambio de **laborys**. Es el módulo `AnunciosRemunerados`.

1. Entra a `/gana` (`GanaRoute`). Ahí eliges cómo ganar (ver anuncios, generar contenido,
   promover membresías, vender).
2. **Ver anuncios pagados:** `/gana/ver-anuncios` (`AnunciosRemunerados`).
   - Se te presenta una **playlist** de anuncios (`PlaylistBar`, `VideoPlayer`, `AdGrid`).
   - Mientras el anuncio se reproduce, el sistema valida la visualización real (`heartbeat`).
   - Al terminar hay un **DecisionWindow** donde confirmas/comprometes.
   - Al completar el anuncio ganas la **recompensa** (laborys) y se suma a tu **cartera**.
3. **Crear anuncios (usuarios con permiso):** puedes programar anuncios en `/comunidad/
   nuevo-anuncio-programado` (ver sección Comunidad). El anuncio puede pagarse y difundirse en la
   plataforma (`/comunidad/mis-anuncios`).

> En `AnunciosRemunerados` hay estados por anuncio: queued → playing → decision_window →
> committed → completed. El backend valida cobertura/duración real para **evitar fraude**.

---

<a name="cartera"></a>
## 11. Cartera y wallets

Tu **cartera** (`cartera`) guarda tus **laborys** y tokens.

- **Ver saldo:** `/cartera` (o `/cartera/:moneda`). Ves `laborysSaldo`, `laborysGanados`,
  `ciudadanTokens`, `ciudadanRendimientos`.
- **Crear billetera:** `/cartera/crear` (`CrearCarteraPage`) — genera una **cartera/wallet**
  (con `ethers.js`): dirección + clave.
- **ITokens / FreeBooks:** `/cartera/itokens`, `/cartera/FreeBoocks` (catálogo).
- **Comprar tokens:** `/comprar-tokens` (`OpWalletRoute`).
- La moneda interna **laborys** se gana en CoWork (sección 6) y en **Gana** (sección 10).

> Relacionado: existe el concepto **WorldCoin** (`world-coin-wallet`) y `gen-wallet`. En
> producción, la wallet real se vincula a tu usuario.

---

*Continúa: [Eventos](#eventos), [Cursos](#cursos), [Comunidad](#comunidad), [Wiki](#wiki).*

<a name="eventos"></a>
## 12. Eventos

- **Ver eventos:** `/eventos` (`EventosPage`). Explora por categoría.
- **Ver un evento:** `/evento/:slug` — fecha, hora, modalidad (presencial/en línea/híbrido),
  lugar (mapa), precio, creador.
- **Crear un evento (si tienes permiso):** `/eventos/crear-evento` — título, categoría,
  fecha(s) múltiples, modalidad, lugar, precio, descripción.
- **Inscripción/pago:** para eventos de pago, te inscribes (lista de suscripción) y pagas.

## 13. Cursos y contenidos (blog)

### Cursos
- **Ver cursos:** `/cursos/*` (`CursosPage`). Filtra por categoría, nivel, modalidad
  (presencial, en línea tiempo real, grabaciones, híbrido).
- **Ver un curso:** `/curso/:slug/*` — temario, maestro, precio, certificación, calendario,
  enlaces de la clase (Zoom).
- **Inscribirse / comprar:** dependiendo del curso, te inscribes (lista de suscripción) y pagas
  si es de pago; accedes a los enlaces privados.
- **Crear/editar (profesores/editores):** `/cursos/agregar-curso`, `/cursos/editar/:slug`,
  `/cursos/eliminar/:slug`.

### Contenidos / Blog
- **Ver:** `/contenidos/*` (`ContenidosPage`) y detalle `/contenido/:slug` (`Contenido`).
- **Crear/editar/eliminar (editores):** `/contenidos/agregar-contenido`,
  `/contenidos/editar/:slug`, `/contenidos/eliminar/:slug`.
- Cada contenido puede tener **galería libre** y **restringida** (contenido exclusivo).

### Publicaciones, comentarios y reacciones
- En Blog/red los usuarios hacen **publicaciones**, **comentarios** y **reacciones**
  (likes). Pueden ser de tipo: publicación, artículo, enlace, herramienta, evento.

---

<a name="comunidad"></a>
## 14. Comunidad y clubs

### Comunidad / anuncios
- **Ver comunidad:** `/comunidad` (`ComunidadRoute`) — un mural/feed.
- **Publicar un anuncio:** `/comunidad/nuevo-anuncio-programado` (programar difusión) y ver tus
  anuncios en `/comunidad/mis-anuncios` (pestañas `programados`, `historial`, `configuracion`).
- **Crear una comunidad nueva:** `/crear-comunidad`. **Unirme:** `/integrarme-comunidad`.

### Clubs (cannabis / Marihuanas Club)
- Los **clubs** agrupan socios (cultivo/consumo/ambos).
- Un club tiene: foto, descripción, horarios, ubicación, documentos legales (estatutos, acta),
  miembros y plantas.
- **Afiliación:** el flujo de referido/afiliación te adhiere a un club (kit jardinero,
  membresía). Ver también **Bitácoras y plantas**:
  - `bitacora` (registro del club), `planta` (plantas con QR y estados: semilla, secado, curado),
    `registrobitacora` (registros por planta/jardinero).
- La **verificación legal** se maneja con trámites **COFEPRIS** y **amparos**
  (subir INE, acuse, resolución, escrito libre).

---

<a name="wiki"></a>
## 15. Wiki y ayuda

- **Wiki:** `/wiki` — visor con árbol de documentos (secciones `main`, `help`, `faq`).
- Navega con el árbol o mediante **wikilinks** (enlaces azules entre páginas).
- **Guía de la wiki:** ver `08-Guia-Usuario-Wiki.md` (cómo usar enlaces internos estilo Obsidian).
- Páginas informativas rápidas:
  - `/quienes-somos` · `/info/quienes` — sobre la plataforma.
  - `/ayuda` · `/preguntas-frecuentes` · `/info/faq` — preguntas frecuentes.
  - `/documentacion-transparencia` — transparencia.

---

## Anexo: mapa rápido de rutas por tarea

| Quiero... | Ruta |
|---|---|
| Entrar/registrarme | `/` (Login en NavBar) |
| Ver mi perfil / QR | `/perfil/:username` · `/miqr` |
| Favoritos | `/favoritos` |
| Referir amigos | `/referir` |
| Membresías | `/membresias` · `/mi-membresia` |
| Trabajar (CoWork) | `/coowork` |
| Crear tarea | `/herramientas/agregar-tarea` |
| Comprar | `/market` → producto → `/carrito` → `/carrito/finalizar` |
| Registrar tienda | `/registro-vendedor` |
| Gestionar tienda | `/market/store/:slug` |
| Pedir comida | `/food` → restaurante → checkout `/carrito/comida/checkout` |
| Afiliar restaurante | `/comida/afiliar-restaurante` |
| Taxi pasajero | `/taxis` → `/taxis/pasajero/registro` |
| Taxi conductor | `/taxis/conductor/preregistro` → `/taxis/conductor/esperando` |
| Ver anuncios y ganar | `/gana` → `/gana/ver-anuncios` |
| Mi cartera | `/cartera` |
| Crear billetera | `/cartera/crear` |
| Ver eventos | `/eventos` |
| Ver cursos | `/cursos/*` |
| Ver contenidos | `/contenidos/*` |
| Comunidad | `/comunidad` |
| Wiki / ayuda | `/wiki` · `/ayuda` |

---

*Fin de la guía de usuario del sitio.*