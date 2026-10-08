# Eventos, Cursos y Contenidos

Estos módulos te permiten **publicar/ver eventos**, **tomar cursos** y **leer contenidos**
(blog) de la comunidad.

## Contenido
- [[EventosCursos#Eventos|Eventos]]
- [[EventosCursos#Cursos|Cursos]]
- [[EventosCursos#Contenidos (blog)|Contenidos (blog)]]
- [[EventosCursos#Pagos e inscripción|Pagos e inscripción]]

---

## Eventos

- **Ver eventos:** `/eventos` (`EventosPage`). Explora por categoría y fecha.
- **Ver uno:** `/evento/:slug` — título, categoría, fechas (puede ser multifecha), modalidad
  (presencial / en línea / híbrido), **lugar** (mapa `UbicacionEvento`), **precio**, creador y
  descripción.
- **Crear (si tienes permiso):** `/eventos/crear-evento` — defines todo lo anterior y la
  modalidad; el sistema genera el slug.

## Cursos

- **Ver cursos:** `/cursos/*` (`CursosPage`). Filtra por categoría, nivel, modalidad
  (presencial / en línea tiempo real / grabaciones / híbrido).
- **Ver un curso:** `/curso/:slug/*` (`Curso`) — temario, maestro, precio, certificación,
  calendario, enlaces de la clase (Zoom), archivos y galería.
- **Inscribirte/comprar:** algunos cursos son de **pago** (`de_pago`) o **restringidos`.
  Te inscribes y accedes a los enlaces privados. Para cursos en vivo, ves `enlace_reunion`.
- **Crear/editar/eliminar (profesores/editores):**
  - Crear: `/cursos/agregar-curso`.
  - Editar/eliminar por slug: `/cursos/editar/:slug`, `/cursos/eliminar/:slug`.

## Contenidos (blog)

- **Ver:** `/contenidos/*` (`ContenidosPage`); detalle `/contenido/:slug` (`Contenido`).
- Un contenido puede tener **galería libre** y **galería restringida** (contenido exclusivo),
  `tags`, autor y categoría.
- **Crear/editar/eliminar (editores):**
  - Crear: `/contenidos/agregar-contenido`.
  - Editar/eliminar por slug: `/contenidos/editar/:slug`, `/contenidos/eliminar/:slug`.
- **Comentarios y reacciones:** en contenidos/eventos/enlaces/publicaciones puedes **comentar**
  y **reaccionar** (like). Tipos: publicación, artículo, enlace, herramienta, evento.

## Pagos e inscripción

- Eventos/cursos de pago se cobran con **Stripe** (pago tipo `evento`/`curso`).
- La **inscripción** se registra en `lista-suscripcion` (tipo curso/evento) con tus suscritos.
- Si tienes una membresía vigente, algunos beneficios aplican (ver [[Membresias|Membresías]]).

---

Volver: [[Indice|índice]] · [[Cuenta|Cuenta]] · [[Marketplace|Marketplace]] ·
[[Comunidad|Comunidad]].