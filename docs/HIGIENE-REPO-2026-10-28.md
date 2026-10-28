# Higiene del repositorio — 2026-10-28

Rama: `feature/higiene-repo-1028` (base: `origin/main` @ `9f4eabd`)

Objetivo: retirar del tracking **solo** la basura inequívoca, ajustar los `.gitignore`
para que no vuelva a colarse, y **documentar** los casos dudosos sin tocarlos.

Regla aplicada: si un archivo no es basura evidente, **no se toca**. Se documenta para
que una persona decida con el contexto completo.

---

## 1. Retirados del tracking (34 archivos)

Todos se conservan **en disco**: solo se retiran del índice con `git rm --cached`.

| Grupo | Rutas | Motivo |
|---|---|---|
| Salida de comandos | `main` | Volcado de `git log` a un archivo sin extensión (44 B). Sin referencias. |
| Stack dump | `less.exe.stackdump` | Crash de `less` en Windows (msys-2.0.dll). |
| Logs de ejecución (15) | `ciudadan_backend_26/{boot,boot_err,core.class,queue.class,strapi-win,strapi_err,strapi_out}.log`, `ciudadan_backend_26/socket-service/{core.class,queue.class,run_live}.log`, `ciudadan_frontend/{fe_boot,fe_boot_err,fe_live}.log`, `fe-win.log`, `strapi-win.log` | Salida de procesos en runtime. Regenerables. |
| Config de editor | `wikiseed/.obsidian/{app,appearance,core-plugins,workspace}.json` | Estado local de Obsidian. El contenido `.md` **sí** se versiona. |
| Bases de Obsidian | `wikiseed/Sin título.base`, `wikiseed/Sin título 1.base`, `wikiseed/Sin título 2.base` | Archivos `.base` de Obsidian, 39 B idénticos. No son notas `.md`; `sync-wikis.js` solo procesa `.md`. |
| Backups | `ciudadan_frontend/public/manifest.json.bk` | Copia de seguridad de `manifest.json`. |
| Restos de comandos | `ciudadan_frontend/x` | Archivo de 2 B con el contenido `a`. |
| Restos de comandos | `ciudadan_frontend/et --soft HEAD~2` | Salida de `git log --oneline` con códigos ANSI, guardada como archivo (8 KB). |
| Respuesta de API fallida | `ciudadan_backend_26/export.json` | 94 B: `{"data":null,"error":{"status":404,...}}`. No es un export. |
| Volcado de tablas | `ciudadan_backend_26/strapi_users.json` | 7 KB con la lista de tablas de SQLite (`.tables`), no usuarios. Sin referencias. |
| Bytecode Python | `ciudadan_backend_26/socket-service/lmai/__pycache__/app.cpython-310.pyc` | `.pyc` compilado. |
| Artefacto de build | `build_artifacts.zip` | 72 MB (106 archivos) con el build de CRA (`static/js/main.*.js.map` de 29 MB). Regenerable con `npm run build`. Sin referencias. |
| Salida de `netstat` | `puertos.txt` | 3.8 KB de `netstat -ano` de Windows. |
| Archivo vacío | `anuncio.txt` | 0 B. Sin referencias. |

### `wikiseed/Como Usar Wikilinks.md` (0 B) — sí retirado, con justificación

Estaba en la lista de dudosos y se resolvió revisando el resolver real
(`socket-service/services/WikiService.ts`, `buildTargetResolver()`):

- Los wikilinks `[[Como Usar Wikilinks]]` se resuelven **por título y por basename/slug**
  contra los documentos indexados en la tabla `documents`.
- El documento real se titula **«Cómo usar la Wiki y los Enlaces (Wikilinks)»** y vive en
  `wikiseed/help/como-usar-wikilinks.md` (1.8 KB).
- El slug `como-usar-wikilinks` que genera el resolver **coincide** con ese archivo, así
  que el enlace sigue resolviendo aunque el archivo vacío de la raíz desaparezca.
- `sync-wikis.js` solo copia `wikiseed/{main,help,faq}/**/*.md`: un `.md` suelto en la raíz
  de `wikiseed/` **nunca** llega al árbol publicado.
- Nadie lo referencia fuera de `wikiseed/.obsidian/workspace.json` (que también se retiró).

Conclusión: es un `.md` vacío huérfano de Obsidian, no una fuente de la wiki. Retirado.

---

## 2. Casos dudosos — **documentados, NO modificados**

| Caso | Por qué se conserva | Recomendación |
|---|---|---|
| `ciudadan_backend_26/strapi_dump.sql` | Es un dump real (3305 `INSERT`, 110 emails). Contiene **PII**. | **No commitear nunca.** Moverlo fuera del repo y rotar credenciales expuestas. Requiere `git filter-repo` para purgar el historial: es una tarea aparte, con riesgo de reescritura. |
| `site-settings.json` (raíz) vs `ciudadan_frontend/public/site-settings.json` | Son **idénticos** (mismo md5 `3c6559a8…`). El frontend lee el de `public/` vía `fetch('/site-settings.json')`; el de la raíz es una copia espejo. | Mantener el de `public/` como fuente de verdad (es el que se sirve). El de la raíz es redundante: candidato a eliminar en una limpieza posterior. |
| `ciudadan_frontend/public/{al,dos,editado,editadote,iii,iiii,initialPattern,o,para,random,randomize}.json` | JSON scratch sin referencias en el código. Hay duplicados exactos: `dos`≡`initialPattern` y `editado`≡`random`≡`randomize`. | Están en `public/`, así que **se sirven en producción** y algún flujo externo podría consumirlos. No se tocan aquí. Revisar y consolidar. |
| `ciudadan_frontend/doc/*` | Notas de trabajo (`UseProductos.md`, `clases_trash.txt`, `subpaleta.txt`, `contextos/`). Documentación interna útil. | No son basura: son notas. Si dejan de ser útiles, mover a `docs/`. |
| `docs/chat.txt` | 169 KB de transcripción EBVTT (video original). `docs/chat.md` (37 KB) es la versión procesada y esa sí se referencia en el código. | Fuente original valuable. No se borra. |
| `docs/captions.srt` | 60 KB de subtítulos. Sin referencias, pero es material de origen. | Conservar. |
| `ciudadan_frontend/android/.idea/*` | Configuración de Android Studio (6 archivos XML + su `.gitignore`). | El `.gitignore` raíz no cubre `.idea/` del frontend. Decisión del equipo; no se tocó. |
| `ciudadan_backend_26/types/generated/{components,contentTypes}.d.ts` | Tipos generados por Strapi. Strapi los regenera en cada build del admin panel. | Se versionan hoy; el flujo de build los sobrescribe. No se tocaron (y el build del frontend no los genera). |
| `ciudadan_backend_26/yarn.lock` + `package-lock.json` (y los de `middleware/` y `socket-service/`) | Lockfiles duplicados: conviven npm y yarn en el backend. | La CI usa `npm ci`, así que `package-lock.json` es el que cuenta. Decidir cuál es el canónico. |
| `ciudadan_backend_26/.env.example` | Plantilla **sin secretos**; se versiona a propósito, pero `ciudadan_backend_26/.gitignore` la ignoraba por culpa de `.env.*`. | **Corregido** en este commit: se añadió `!.env.example`. |

---

## 3. Cambios en `.gitignore`

**Raíz (`/.gitignore`)**
- `package-lock.json` → `/package-lock.json`: antes ignoraba los lockfiles de **todos** los
  subproyectos; ahora solo el de la raíz del monorepo.
- Nuevas reglas: `*.log`, `*.stackdump`, `*.bk`, `__pycache__/`, `*.pyc`, `.obsidian/`,
  `wikiseed/*.base`, `/build_artifacts*.zip`, `/main`.

**Backend (`ciudadan_backend_26/.gitignore`)**
- `!.env.example` (después de las reglas `.env*`, para que la negación prevalezca).

**Frontend (`ciudadan_frontend/.gitignore`)**
- Se quitó `/package-lock.json`: el lockfile **se versiona** porque la CI ejecuta `npm ci`.
  `/yarn.lock` sigue ignorado (el frontend usa npm).

---

## 4. Verificación

- `git ls-files -i -c --exclude-standard` → vacío (antes listaba 5 archivos: `.env.example`
  y 4 `package-lock.json` que estaban rastreados **y** ignorados a la vez).
- `git check-ignore -v` por cada patrón nuevo → todos hacen match.
- `git fsck --connectivity-only` → OK (solo blobs dangling, sin objetos corruptos).
- Build del frontend: ver §5.

---

## 5. Pruebas

_(pendiente de completar tras el build)_

