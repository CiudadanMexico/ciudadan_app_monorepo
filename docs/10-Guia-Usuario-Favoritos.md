# 10 — Guía de usuario: Favoritos

> Documento de **ayuda para el usuario final** sobre la función de **favoritos** de Ciudadan.
> Complementa las guías `09-Guia-Usuario-Sitio.md` (sección 3) y el archivo de ayuda del
> visor de wiki (`socket-service/wiki/help/favoritos.md`).

---

## Qué puedes marcar como favorito

Puedes guardar como favorito:

- **Productos** del Marketplace.
- **Cursos** y **contenidos** (blog).
- **Clubs** de la comunidad.

## Añadir un favorito

- En la ficha del elemento (producto, curso, contenido o club) pulsa el **corazón** ❤️.
- El botón de favorito (`HearthButton`) llama a `toggleFavorito`: si no está marcado lo
  **agrega**, y si ya lo estaba lo **quita**.

## Ver y quitar favoritos

- **Ver todos:** entra a `/favoritos` (también `/favoritos/*`).
- Ahí aparecen tus favoritos organizados; puedes **eliminarlos** uno por uno.
- Para **quitar** un favorito sin entrar a la lista, vuelve a pulsar el corazón en la ficha
  del elemento.

> Cada favorito (`favorito`) guarda qué **elemento** marcaste (producto/curso/contenido/club)
> y a qué **usuario** pertenece.

## Preguntas frecuentes

- **¿Necesito pagar para guardar favoritos?** No, es gratuito y solo requiere tu cuenta.
- **¿Dónde veo lo que guardé?** En `/favoritos`.
- **¿Puedo marcar lo mismo dos veces?** No, el mismo elemento se guarda una sola vez por
  cuenta.

---

## Rutas relacionadas

| Acción | Ruta |
|---|---|
| Ver / quitar favoritos | `/favoritos` · `/favoritos/*` |
| Productos (para marcar) | `/market/producto/:slug` |
| Contenidos (para marcar) | `/contenido/:slug` |
| Clubs (para marcar) | página del club |

---

*Fin de la guía de favoritos.*