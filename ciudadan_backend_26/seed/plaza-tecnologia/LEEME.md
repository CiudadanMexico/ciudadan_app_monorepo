# Plaza Tecnología — seed de imágenes (beta)

Carpeta: `ciudadan_backend_26/seed/plaza-tecnologia/`

## Contenido
- `LEEME.md` — este archivo.
- `catalogo.json` — 30 SKU con sus 58 fotografías fuente (URL directa HTTPS, archivo exacto).
- `download-images.sh` — descarga con `curl --fail --location --max-time 45`, hasta 3 reintentos,
  máximo 3 descargas simultáneas. Escribe primero en temporal y renombra solo al validar
  (HTTP 200, Content-Type imagen, firma real JPEG/PNG). No guarda páginas HTML de error.
- `seed-plaza.cjs` — validación local de datos (NO toca BD, NO usa `--apply`, NO cambia schemas).
- `images/` — destino: `images/<archivo>` con nombre, formato y extensión exactos.
- `reporte-validacion.json` — se genera al validar: archivo, URL, bytes, resolución, SHA-256.

## Reglas
- La foto `-01` es la portada de cada SKU.
- No colocar fotos de otro SKU; conservar nombre/formato/extensión exactos.
- No añadir logos de Ciudadan, marcas de agua ni retoques que modifiquen el producto.
- Si una imagen ya existe y es válida, se reutiliza (no se re-descarga).
- Si una URL falla tras 3 reintentos: se reporta, NO se sortea el bloqueo del proveedor.
- Estas fotos NO van a `src/assets`: las subirá el seeder al upload plugin de Strapi
  y las enlazará con `imagenes` e `imagen_predeterminada`.

## Uso
```bash
cd ciudadan_backend_26/seed/plaza-tecnologia
./download-images.sh            # descarga + valida (idempotente)
node seed-plaza.cjs             # valida datos localmente (sin --apply)
```

## Base de revisión
- Rama base: `main`, commit `956c504259c06962afad78edb74c21c4f0975b44`.
- Rama de trabajo: `feature/muse-plaza-tecnologia-imagenes`.
