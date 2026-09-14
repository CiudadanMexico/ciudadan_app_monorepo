# 12 — Guía de usuario: Publicaciones, Comentarios y Reacciones

> Documento de **ayuda para el usuario final** sobre la **red social** de Ciudadan
> (publicaciones, comentarios y reacciones). Complementa `09-Guia-Usuario-Sitio.md`
> (sección 13) y el archivo de ayuda del visor de wiki
> (`socket-service/wiki/help/publicaciones.md`).

---

## Crear una publicación

- Desde el **mural** de la comunidad puedes **crear una publicación**, compartiendo texto,
  enlaces o contenido.
- Ver la sección "Comunidad y mural" en `09-Guia-Usuario-Sitio.md` para el espacio de difusión.

## Tipos de publicación

Las publicaciones (`publicacion`) pueden ser de varios tipos:

| Tipo | Qué es |
|---|---|
| **publicacion** | Texto/entrada general del usuario |
| **articulo** | Artículo de blog/contenido |
| **enlace** | Enlace compartido (herramienta/enlace) |
| **herramienta** | Herramienta o recurso |
| **evento** | Anuncio/vinculación a evento |

## Comentarios

- Puedes **comentar** las publicaciones y contenidos. Cada comentario es un
  `comentario-publicacion` ligado a la publicación y a su autor.
- Los comentarios permiten **respuestas** (hilos).

## Reacciones (likes)

- Puedes **reaccionar** (dar "like") a publicaciones, contenidos y comentarios.
- Cada reacción (`reaccion`) queda asociada a su autor y al elemento reaccionado.
- También existen **calificaciones** (`rating`) para productos/servicios (ver Marketplace).

## Dónde se ven

- **Comunidad:** `/comunidad` — mural con publicaciones, comentarios y reacciones.
- **Contenidos (blog):** `/contenidos/*` y detalle `/contenido/:slug`.
- **Eventos/enlaces:** dentro de su página de detalle también puedes comentar y reaccionar.

---

## Rutas relacionadas

| Acción | Ruta |
|---|---|
| Comunidad (mural) | `/comunidad` |
| Contenidos (blog) | `/contenidos/*` |
| Detalle de contenido | `/contenido/:slug` |

---

*Fin de la guía de publicaciones, comentarios y reacciones.*