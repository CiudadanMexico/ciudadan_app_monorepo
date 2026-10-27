# WIKI-SEED-SETUP — Runbook: sembrar, configurar y verificar la wiki

> Documento técnico de la **wiki de Ciudadan**: qué piezas la componen, dónde
> vive el contenido, cómo sembrar el seed (`wikiseed/`), cómo configurar la
> ruta física y cómo verificar todo el flujo end-to-end.
> Guías de usuario: `docs/08-Guia-Usuario-Wiki.md` y `docs/13-Guia-Usuario-Wiki-Ayuda.md`.

**Estado**: ✅ operativo en la instancia temporal1-agent3 (2026-10-14). Ver §7.

---

## 1. Arquitectura

| Pieza | Rol |
|---|---|
| **`socket-service`** (puerto 33032, corre con Node 22 vía `tsx`) | Host de la wiki: el `WikiRouter` sirve el árbol (`GET /wiki/<sección>`) y los documentos (`GET /wiki/<path>`). Es un proceso aparte de Strapi (ver `AGENTS.md`) |
| **`ciudadadan.db`** (SQLite del socket-service, tabla `documents`) | **El árbol de navegación sale de esta tabla**, no del disco. Sin fila en `documents`, el archivo no aparece en la wiki |
| **Carpeta física de `.md`** | Raíz FUERA del contenido versionado (gitignored): `ciudadan_backend_26/socket-service/wiki/{main,help,faq}/`. Aquí viven los archivos que leen los endpoints |
| **Strapi `api::site-setting`** | Fuente **canónica** de la ruta: `GET /api/wiki/public-config` devuelve `{ wikisPath }` desde `site_settings.wikis_path` |
| **`wikiseed/`** (raíz del monorepo) | Seed de contenido: `main/`, `help/`, `faq/` + el script oficial **`sync-wikis.js`** |
| **Frontend** | `src/services/wikiService.ts` consume `{REACT_APP_SOCKET_URL}/wiki/<sección>` (árbol → `response.data.nodes`) y `/wiki/<path>` (documento). Componentes: `WikiApp.tsx`, `WikiViewer.jsx`, `WikiTreeView.tsx`, `WikiHome.jsx`, hook `useWikiDocumento.jsx` |

### Resolución de la ruta física (precedencia)

1. `site_settings.wikis_path` en Strapi (`GET /api/wiki/public-config`) — **canónica**
2. `WIKI_ROOT_PATH` del entorno (`.env` del socket-service o el env que carga el watchdog)
3. Default de plataforma: `/var/www/apps/wikis` (Linux) / `./wikis` (Windows)

El `WikiRootProvider` del socket-service re-verifica Strapi cada `WIKI_CONFIG_TTL_MS` (60s) y `WikiPaths.resolveWikiDiskPath()` convierte la ruta lógica `wiki/<sección>/<archivo>.md` en la ruta física (quitando el prefijo `wiki/`).

## 2. ⚠️ Por qué copiar los .md NO basta

La wiki NO lista el disco: el árbol sale de la tabla `documents`. Copiar sin
indexar dejaba el artículo invisible en el listado (solo legible por URL
directa, gracias al fallback a disco de `getDocumentByPath`). Por eso
`sync-wikis.js` **copia + indexa**: tras copiar, indexa con el mismo
`WikiService.updateIndex` que usa el watcher del servicio (idempotente por
SHA-256 → re-sincronizar no duplica; escribe solo la BD, no el archivo).

## 3. Cómo sembrar

```bash
# 1) Con el MISMO entorno del watchdog (para resolver la misma ruta:
#    Strapi public-config → WIKI_ROOT_PATH → default)
set -a; . /etc/agent/env/services.env; set +a

# 2) Con el MISMO Node del socket-service (¡Node 22! — ver §4)
/opt/node22/bin/node wikiseed/sync-wikis.js            # siembra (idempotente)
/opt/node22/bin/node wikiseed/sync-wikis.js --force    # re-copia todo
/opt/node22/bin/node wikiseed/sync-wikis.js --dry-run  # solo reporta
```

Salida esperada la primera vez: `Listo: 32 copiados…` +
`Índice de la wiki: 32 indexados`. Segunda corrida: `0 copiados, 32 sin cambios`.

El script nunca borra nada del destino: lo editado en vivo se conserva.

## 4. ⚠️ Node y ABI: el SIGSEGV histórico de better-sqlite3

El indexado carga `dist/` del socket-service, que usa **`better-sqlite3` v13**
(prebuild N-API, `engines.node: ">=22"`). Con un Node menor (p. ej. el 20 del
shell de la instancia):

- `require('better-sqlite3')` **NO falla** (la ABI N-API del require es estable)
- pero **USAR** el binding (`new Database(...)`) mataba el proceso con
  **SIGSEGV** — señal no capturable en JS — y el sync se caía a mitad de
  copia, sin explicación.

**Fix aplicado al seed (2026-10-14)**: `sync-wikis.js` hace un **pre-vuelo ABI**
(`comprobarAbiDriver()`) antes de indexar:

1. **Chequeo estático**: lee `engines.node` de `node_modules/better-sqlite3/package.json`
   y lo compara con el Node del proceso → detecta el caso a tiempo, sin tocar el driver.
2. **Prueba dinámica** (fallback): si no hay `engines`, ejercita el driver de
   verdad (abrir `:memory:` + query) dentro de un **proceso hijo desechable**:
   si el hijo revienta, el padre sigue vivo y reporta.

Con Node incompatible el sync hoy: copia igual los 32 `.md`, reporta
`abi-incompatible` por archivo con instrucciones y termina con EXIT 0 (el
watcher del socket-service los indexa al arrancar el servicio). El índice
inmediato requiere el Node correcto. Suite de tests: 8/8 con ambos runtimes.

## 5. Verificación end-to-end

```bash
# Árbol por sección (lo que consume el frontend → response.data.nodes)
curl -s http://localhost:33032/wiki/help | head -c 300
curl -s http://localhost:33032/wiki/main
curl -s http://localhost:33032/wiki/faq

# Documento concreto
curl -s http://localhost:33032/wiki/help/ayuda.md | head -c 300

# Config canónica de Strapi (fuente de la ruta)
curl -s http://localhost:1337/api/wiki/public-config

# Conteo en la BD de la wiki (Node 22 — usa better-sqlite3 del servicio)
cd ciudadan_backend_26/socket-service && /opt/node22/bin/node -e "
const db=require('better-sqlite3')('ciudadadan.db');
const c=p=>db.prepare('SELECT COUNT(*) n FROM documents WHERE path LIKE ?').get(p).n;
console.log(JSON.stringify({total:c('wiki/%'),main:c('wiki/main/%'),help:c('wiki/help/%'),faq:c('wiki/faq/%')}))"

# Suite oficial (8 tests; corre con Node 20 o 22 — el pre-vuelo protege al 20)
cd ciudadan_backend_26 && node --test tests/wikiseed-sync.test.js
```

## 6. Frontend

- `ciudadan_frontend/.env` → `REACT_APP_SOCKET_URL=https://socket-temporal1-agent3.ciudadan.org` (túnel público del socket de la instancia).
- `wikiService.ts` → `{REACT_APP_SOCKET_URL}/wiki/<sección>` (árbol: `{ok, section, title, nodes[]}`) y `/wiki/<path>` (documento: `{ok, documentId, title, path, rawContent}`).
- El default `http://localhost:33035` de `wikiService.ts` solo aplica si falta la env (no es el caso de la instancia).

## 7. Estado de la instancia temporal1-agent3 (2026-10-14)

- **Watchdog del sistema** (`/etc/agent/env/services.env`, generado por `agent-setup.sh`; lo sourcea el loop que mantiene `npm start` del socket-service): define `SOCKET_PORT=33032`, `STRAPI_URL=http://127.0.0.1:1337` y **`WIKI_ROOT_PATH=/workspace/ciudadan_app_monorepo/ciudadan_backend_26/socket-service/wiki`** (raíz gitignored, "fuera del repo"). Es el ".env de una ruta fuera del proyecto" del que parte toda la siembra.
- **Ruta física sembrada**: `socket-service/wiki/{main,help,faq}` — **32 `.md`** (main: 2, help: 29 — incluye los artículos `cartera-*` —, faq: 1).
- **Índice**: `documents` = 32 filas → `GET /wiki/help` sirve 29 nodos, `/wiki/main` 2, `/wiki/faq` 1.
- **Config canónica**: `site_settings` (id=1) con `wikis_path` = la misma ruta, publicada → `public-config` la devuelve. Si Strapi no responde en un momento dado (p. ej. durante un autoReload), el resolver cae a `WIKI_ROOT_PATH` → misma ruta → mismo resultado (resiliencia por capas, a propósito del diseño).
- **Idempotencia verificada**: segunda corrida del sync → `0 copiados, 32 sin cambios`.

## 8. Historial de reparaciones (2026-10-14)

| # | Problema hallado | Reparación |
|---|---|---|
| 1 | Wiki sin contenido visible: carpeta física vacía y `documents` en 0 | Sembrado con `sync-wikis.js --force` (Node 22 + env del watchdog): 32 copiados + 32 indexados; el watcher del socket-service también indexó por su cuenta (verificado en vivo) |
| 2 | `site_settings.wikis_path` = null (config canónica ausente; `public-config` devolvía `null`) | Fila insertada vía knex con `published_at` → `public-config` operativo |
| 3 | **SIGSEGV** al correr el sync con Node 20 (better-sqlite3 v13 exige `>=22`: el `require` pasa, el USO revienta — señal no capturable) | Pre-vuelo ABI en `sync-wikis.js` (`comprobarAbiDriver`): chequeo estático de `engines` + prueba de uso real (`:memory:` + query) en proceso hijo desechable → reporta `abi-incompatible` sin crashear y la copia se completa; suite 8/8 con ambos runtimes |
| 4 | Suite `tests/wikiseed-sync.test.js` desactualizada: asserts hardcodeados a 21 `.md` (el seed creció a 32 con los artículos `cartera-*`) → 5/8 fallando | Conteo dinámico `TOTAL_MD` desde las secciones reales de `wikiseed/` → 8/8 (no vuelve a romperse al crecer la wiki) |

> Mantener este runbook actualizado al cambiar la resolución de rutas, el
> esquema de `documents` o los scripts de `wikiseed/`.

