# wikiseed/

Contenido de ejemplo de la wiki (`.md`), versionado en el monorepo. El contenido
**en vivo** vive fuera del proyecto, en la ruta física configurada en Strapi
(`site-setting.wikis_path`, ej. `/home/ubuntu/apps/wikis`).

## Sincronizar hacia el destino en vivo

```bash
node wikiseed/sync-wikis.js [--dry-run] [--force]
```

- Lee el destino con la misma precedencia del socket-service:
  `site-setting.wikis_path` (Strapi, vía `STRAPI_URL`) → `WIKI_ROOT_PATH` → default.
- Solo copia lo que falte o cambie (compara contenido); **nunca borra** lo del
  destino, así que lo editado en vivo se conserva.
- `--dry-run` reporta sin escribir; `--force` re-copia todo.

## Estructura

```
wikiseed/
  sync-wikis.js   ← script de sincronización (node, sin dependencias)
  main/*.md       ← sección Principal
  help/*.md       ← sección Ayuda
  faq/*.md        ← sección FAQ
```

Para agregar o corregir un documento de ejemplo, edítalo aquí y luego sincroniza.
