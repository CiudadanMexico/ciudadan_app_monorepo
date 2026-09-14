# 08 — Guía de usuario: Wiki y Wikilinks

> Documento de **ayuda para el usuario final** sobre el visor de wiki de Ciudadan y los
> enlaces entre documentos (**wikilinks**, similar a Obsidian).
> Útil como contenido de la sección `help` de la propia wiki y como referencia para el equipo.

---

## ¿Qué es la wiki?

La wiki de Ciudadan es una **documentación navegable en Markdown** con un visor integrado:

- **Panel izquierdo:** árbol de documentos (Explorador Wiki), organizado por secciones
  (`main`, `help`, `faq`).
- **Panel derecho:** el contenido del documento seleccionado.

La wiki soporta **wikilinks** (enlaces internos estilo Obsidian): escribes el nombre de otra
página entre dobles corchetes y se convierte en un enlace clicable.

---

## Navegación

1. En el panel izquierdo, haz clic en una **carpeta** para expandirla/colapsarla.
2. Haz clic en un **documento** para abrirlo a la derecha.
3. Cambia de sección con las pestañas (`main` / `help` / `faq`).

---

## Wikilinks (enlaces entre páginas)

Un wikilink enlaza una página con otra. El destino se resuelve automáticamente por
nombre/archivo, y al hacer clic **la página se abre al instante en el mismo visor**
(sin recargar).

### 1) Enlace básico
```
[[Otro Articulo]]
```
Se muestra como un enlace azul. Al hacer clic abre "Otro Articulo".

### 2) Enlace con texto visible distinto (alias)
```
[[Preguntas Frecuentes|Ver las preguntas frecuentes]]
```
Solo se ve el texto después de `|`, pero enlaza a "Preguntas Frecuentes".

### 3) Enlace a una sección específica (ancla)
```
[[Como Funciona#Instalacion]]
```
Abre el documento y salta a ese encabezado. También con alias:
```
[[Como Funciona#Instalacion|ver instalación]]
```

### 4) Enlace pendiente (destino inexistente)
Si la página destino aún no existe, el enlace se muestra igual, sin resolver
(aparece sin el color/estilo de enlace resuelto). Se activa cuando se crea la página.

---

## Consejos

- Enlaza usando el **título** o el nombre del archivo; no importan mayúsculas ni espacios.
- No hace falta escribir la extensión `.md` ni la carpeta al enlazar.
- Si dos páginas se llaman igual, el sistema prioriza por nombre de archivo.

---

## ¿Qué hace el sistema internamente? (para el equipo)

- **Backend** (`socket-service/routes/utils/MarkdownParser.ts`): reconoce
  `[[x]]`, `[[x|alias]]`, `[[x#seccion]]`, `[[x^block]]` y las convierte en
  `<a class="wiki-link" href="..." data-path="...">`.
- **Resolución** (`WikiService.buildTargetResolver`): busca el destino por nombre de archivo,
  título, slug o path completo y emite `resolvedPath` (ej. `wiki/main/otro-articulo.md`).
- **Frontend** (`WikiViewer.jsx`): captura el clic en `.wiki-link`, lee `data-path` y
  navega el visor a ese documento sin recargar (`onNavigateDocument`).
- El **href** generado sigue el patrón del router `/:section/:path` (ya no `/wiki/doc/...`),
  por lo que los enlaces se abren correctamente.

---

## Archivos de la wiki (ejemplos)

En `ciudadan_backend_26/socket-service/wiki/`:
- `main/mi-primer-articulo.md`, `main/otro-articulo.md`
- `help/como-funciona.md`, `help/como-usar-wikilinks.md` (esta guía)
- `faq/preguntas-frecuentes.md`

Para **resetear/re-indexar** la wiki tras agregar archivos: reinicia el socket-service
(`npm run build && npm start`), o edita un `.md` para que el watcher lo sincronice.

---

*Fin de la guía de usuario de la wiki.*