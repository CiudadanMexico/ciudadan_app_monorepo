# WIKI-SEED-SETUP — Runbook: sembrar, configurar y verificar la wiki

> Documento técnico de la **wiki de Ciudadan**: qué piezas la componen, dónde
> vive el contenido, cómo sembrar el seed (`wikiseed/`), cómo configurar la
> ruta física y cómo verificar todo el flujo end-to-end.
> Guías de usuario: `docs/08-Guia-Usuario-Wiki.md` y `docs/13-Guia-Usuario-Wiki-Ayuda.md`.

**Estado**: ✅ operativo; la fuente versionada se empaqueta y se sincroniza en
cada deploy de producción (2026-10-30). Ver §7 y §9.

---

## 1. Arquitectura

| Pieza | Rol |
|---|---|
| **`socket-service`** (puerto 33032, corre con Node 22 vía `tsx`) | Host de la wiki: el `WikiRouter` sirve el árbol (`GET /wiki/<sección>`) y los documentos (`GET /wiki/<path>`). Es un proceso aparte de Strapi (ver `AGENTS.md`) |
| **`ciudadadan.db`** (SQLite del socket-service, tabla `documents`) | **El árbol de navegación sale de esta tabla**, no del disco. Sin fila en `documents`, el archivo no aparece en la wiki |
| **Carpeta física de `.md`** | Raíz FUERA del contenido versionado (gitignored), canónica desde `site_settings.wikis_path` y, en producción, `/var/www/apps/wikis/{main,help,faq}/`. Aquí viven los archivos que leen los endpoints |
| **Strapi `api::site-setting`** | Fuente **canónica** de la ruta: `GET /api/wiki/public-config` devuelve `{ wikisPath }` desde `site_settings.wikis_path` |
| **`wikiseed/`** (raíz del monorepo) | Seed de contenido: `main/`, `help/`, `faq/` + el script oficial **`sync-wikis.js`** y la envoltura de release **`sync-wikis-production.js`** |
| **Frontend** | `src/services/wikiService.ts` consume `{REACT_APP_WIKI_URL}/wiki/<sección>` (producción: `https://socks.ciudadan.org`; fallback `{REACT_APP_SOCKET_URL}`) y `/wiki/<path>` (documento). Componentes: `WikiApp.tsx`, `WikiViewer.jsx`, `WikiTreeView.tsx`, `WikiHome.jsx`, hook `useWikiDocumento.jsx` |

### Resolución de la ruta física (precedencia)

1. `site_settings.wikis_path` en Strapi (`GET /api/wiki/public-config`) — **canónica**
2. `WIKI_ROOT_PATH` del entorno (`.env` del socket-service o el env que carga el watchdog). En producción debe quedar explícito como `/var/www/apps/wikis` en el `EnvironmentFile` compartido de `ciudadan-socket-prod.service` (`/var/www/shared/ciudadan_backend.env`).
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

Salida esperada con el seed vigente (35 documentos): `Listo: 35 copiados…` +
`Índice de la wiki: 35 indexados`. Una corrida posterior copia 0 archivos y
reindexa los 35 seeds para reparar también una fila ausente/desfasada en
SQLite.

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

Con Node incompatible el sync base copia igual los 35 `.md`, reporta
`abi-incompatible` por archivo con instrucciones y termina con EXIT 0 (el
watcher del socket-service los indexa al arrancar el servicio). La envoltura
de producción, en cambio, **falla cerrada** y el socket no abre el puerto. El
índice inmediato requiere el Node correcto. Suite de tests: 16/16.

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

# Suite oficial (16 tests; corre con Node 20 o 22 — el pre-vuelo protege al 20)
cd ciudadan_backend_26 && node --test \
  tests/wikiseed-sync.test.js \
  tests/wikiseed-sync-production.test.js \
  tests/wikiseed-sync-startup.test.js
```

## 6. Frontend

- Producción: `REACT_APP_WIKI_URL=https://socks.ciudadan.org` (host público que
  monta `/wiki` en el socket-service).
- `wikiService.ts` → `{REACT_APP_WIKI_URL}/wiki/<sección>` (árbol: `{ok, section,
  title, nodes[]}`) y `/wiki/<path>` (documento: `{ok, documentId, title, path,
  rawContent}`). `REACT_APP_SOCKET_URL` queda como fallback para entornos viejos.
- No usar `https://back.ciudadan.org/wiki`: ese vhost sólo reenvía `/socket.io/`
  al socket-service y el resto llega a Strapi, que devuelve 404.
- El default `http://localhost:33035` de `wikiService.ts` sólo aplica si faltan
  ambas variables.

## 7. Evidencia histórica de la instancia temporal1-agent3 (2026-10-14)

- **Watchdog del sistema** (`/etc/agent/env/services.env`, generado por `agent-setup.sh`; lo sourcea el loop que mantiene `npm start` del socket-service): define `SOCKET_PORT=33032`, `STRAPI_URL=http://127.0.0.1:1337` y **`WIKI_ROOT_PATH=/workspace/ciudadan_app_monorepo/ciudadan_backend_26/socket-service/wiki`** (raíz gitignored, "fuera del repo"). Es el ".env de una ruta fuera del proyecto" del que parte toda la siembra.
- **Ruta física sembrada en ese entonces**: `socket-service/wiki/{main,help,faq}` — **32 `.md`** (main: 2, help: 29 — incluye los artículos `cartera-*` —, faq: 1).
- **Índice en ese entonces**: `documents` = 32 filas → `GET /wiki/help` servía 29 nodos, `/wiki/main` 2, `/wiki/faq` 1.
- **Config canónica**: `site_settings` (id=1) con `wikis_path` = la misma ruta, publicada → `public-config` la devuelve. Si Strapi no responde en un momento dado (p. ej. durante un autoReload), el resolver cae a `WIKI_ROOT_PATH` → misma ruta → mismo resultado (resiliencia por capas, a propósito del diseño).
- **Idempotencia verificada**: segunda corrida del sync → `0 copiados, 32 sin cambios`.

> Este bloque conserva el estado histórico de la instancia de desarrollo. El
> release vigente contiene **35 documentos** (main 2 / help 32 / faq 1) y los
> publica automáticamente en producción; ver §9.

## 8. Historial de reparaciones (2026-10-14)

| # | Problema hallado | Reparación |
|---|---|---|
| 1 | Wiki sin contenido visible: carpeta física vacía y `documents` en 0 | Sembrado con `sync-wikis.js --force` (Node 22 + env del watchdog): 32 copiados + 32 indexados en la instancia de desarrollo; el watcher del socket-service también indexó por su cuenta (verificado en vivo) |
| 2 | `site_settings.wikis_path` = null (config canónica ausente; `public-config` devolvía `null`) | Fila insertada vía knex con `published_at` → `public-config` operativo |
| 3 | **SIGSEGV** al correr el sync con Node 20 (better-sqlite3 v13 exige `>=22`: el `require` pasa, el USO reventa — señal no capturable) | Pre-vuelo ABI en `sync-wikis.js` (`comprobarAbiDriver`): chequeo estático de `engines` + prueba de uso real (`:memory:` + query) en proceso hijo desechable → reporta `abi-incompatible` sin crashear y la copia se completa; la envoltura de producción falla cerrada antes de abrir el socket |
| 4 | Suite `tests/wikiseed-sync.test.js` desactualizada: asserts hardcodeados a 21 `.md` (el seed creció con los artículos `cartera-*`) → 5/8 fallando | Conteo dinámico `TOTAL_MD` desde las secciones reales de `wikiseed/`; la suite no vuelve a romperse al crecer la wiki |

## 9. Flujo automatizado en producción

Desde el release que contiene esta automatización, el pipeline de GitHub
Actions hace lo siguiente:

1. Empaqueta `wikiseed/` dentro del artefacto `<sha>.tar.gz` y valida que
   existan el seed, la envoltura de producción y el `dist/` del socket-service.
2. Instala y activa el release como cualquier deploy normal.
3. Al arrancar, el `socket-service` ejecuta la envoltura de producción **con
   Node 22 y como `alexander`** (su usuario efectivo), antes de abrir el puerto.
4. La envoltura copia los `.md`, indexa cada seed en `documents` y verifica:
   - hashes idénticos entre seed y raíz viva;
   - una fila por seed en SQLite;
   - conteos de `main`/`help`/`faq` coherentes con el paquete.
5. Si cualquiera de esas comprobaciones falla, el socket no abre el puerto y el
   deploy engine hace rollback; CI tampoco puede reportar `DEPLOY_OK`.
6. Tras el deploy, CI comprueba por HTTP las tres secciones y un documento
   representativo de cada una.

La envoltura usa `site_settings.wikis_path` de Strapi como destino canónico y
`WIKI_ROOT_PATH` sólo como fallback. Todo lo que toque `ciudadadan.db` debe
seguir usando Node 22.

> Mantener este runbook actualizado al cambiar la resolución de rutas, el
> esquema de `documents` o los scripts de `wikiseed/`.

