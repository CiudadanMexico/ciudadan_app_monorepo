# wikiseed/

Contenido de ejemplo de la wiki (`.md`), versionado en el monorepo. El contenido
**en vivo** vive fuera del proyecto, en la ruta física configurada en Strapi
(`site-setting.wikis_path`, ej. `/home/ubuntu/apps/wikis`).

## Sincronizar hacia el destino en vivo

```bash
# checkout local o desarrollo
node wikiseed/sync-wikis.js [--dry-run] [--force]

# release de producción (Node 22; usa el dist/ de este mismo release)
node wikiseed/sync-wikis-production.js [--dry-run] [--verify]
```

- Lee el destino con la misma precedencia del socket-service:
  `site-setting.wikis_path` (Strapi, vía `STRAPI_URL`) → `WIKI_ROOT_PATH` → default.
- Solo copia lo que falte o cambie (compara contenido); **nunca borra** lo del
  destino, así que lo editado en vivo se conserva.
- Copia + indexa en SQLite. Una segunda pasada también reindexa los seeds sin
  cambios para poder reparar una fila ausente o desfasada.
- `--dry-run` reporta sin escribir; `--force` re-copia todo; `--verify` sólo
  valida archivos e índice sin modificar nada.
- En producción, todo lo que toque `ciudadadan.db` debe ejecutarse con
  **Node 22** (`better-sqlite3` v13).

## Flujo de despliegue

`wikiseed/` se incluye en el artefacto de producción. El `socket-service`
sincroniza y verifica el seed **antes de abrir su puerto**, con Node 22 y como
`alexander` (el usuario del servicio): copia los `.md`, indexa cada documento
en `documents` y aborta el arranque si falta un archivo o una fila del índice.
El deploy engine sólo declara `DEPLOY_OK` cuando el socket quedó activo y sus
healthchecks pasaron; CI vuelve a comprobar por HTTP las tres secciones y un
documento representativo de cada una. Ver `docs/WIKI-SEED-SETUP.md` §9.

## Estructura

```
wikiseed/
  sync-wikis.js   ← script de sincronización (node, sin dependencias)
  main/*.md       ← sección Principal
  help/*.md       ← sección Ayuda
  faq/*.md        ← sección FAQ
```

Para agregar o corregir un documento de ejemplo, edítalo aquí y luego sincroniza.
