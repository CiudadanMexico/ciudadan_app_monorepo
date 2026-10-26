# Plaza Tecnología — seed de imágenes (beta)

Carpeta: `ciudadan_backend_26/seed/plaza-tecnologia/`

## Contenido
- `LEEME.md` — este archivo.
- `catalogo-oficial.json` — **fuente principal del seed (Bloque 3)**: seed_key
  `ciudadan-plaza-beta-v1`, markup 5%, MXN, 30 SKU con slug (`ptc-cp-*`), nombre, descripcion,
  marca, precio, segmento, categoria_slug, categoria_nombre, destacado, especificaciones,
  `images` por filename y `supplier.cost_centavos` (costo en centavos).
- `revalidacion-26oct.json` — revalidación de costos 2026-10-26: 26 cambios con regla
  `precio_final = redondear(costo_observado * 1.05, 2)`, 1 anomalía documentada
  (DTXM/128GB mantiene 196.35 del catálogo; scrape de 919 descartado) y 3 sin cambios.
  Cobertura exacta de los 30 SKU.
- `catalogo.json` — 30 SKU con sus 58 fotografías fuente (URL directa HTTPS, archivo exacto).
- `catalogo-productos.json` — **histórico** (costos observados 2026-10-12); lo sigue leyendo
  `revalidar.py` como baseline.
- `download-images.sh` — descarga con `curl --fail --location --max-time 45`, hasta 3 reintentos,
  máximo 3 simultáneas. Valida HTTP 200, Content-Type imagen y firma real JPEG/PNG.
- `seed-plaza.cjs` — validación local de imágenes (NO toca BD, NO usa `--apply`).
- `seed-plaza-tecnologia.js` — seed idempotente de tienda + 30 productos (ver Bloque 3).
- `images/` — destino: `images/<archivo>` con nombre, formato y extensión exactos (58 archivos).
- `reporte-validacion.json` — reporte de validación de imágenes (bytes, resolución, SHA-256).
- `revalidar.py` — revalida precio/disponibilidad contra cyberpuerta.mx (reporta, no escribe BD).

## Reglas
- La foto `-01` es la portada de cada SKU.
- No colocar fotos de otro SKU; conservar nombre/formato/extensión exactos.
- No añadir logos de Ciudadan, marcas de agua ni retoques que modifiquen el producto.
- Si una imagen ya existe y es válida, se reutiliza (no se re-descarga).
- Si una URL falla tras 3 reintentos: se reporta, NO se sortea el bloqueo del proveedor.
- Estas fotos NO van a `src/assets`: las sube el seeder al upload plugin de Strapi
  y las enlaza con `imagenes` e `imagen_predeterminada`.

## Bloque 2 — tienda oficial + primer seed (histórico)

- Tienda: `La plaza de la tecnología a tu casa` (slug `la-plaza-de-la-tecnologia-a-tu-casa`,
  `isOfficial: true`). Catálogo de costos del 12-oct (`catalogo-productos.json`) + imágenes
  (`catalogo.json`). Schemas: `store.descripcion` (text, i18n); `producto.store` y
  `producto.store_category` a manyToOne. Controlador store: `isOfficial` solo lo fija admin
  (403 al vendedor común que lo envíe). Frontend `Tienda.jsx`: populate + render de `descripcion`.

## Bloque 3 — catálogo oficial beta-v1 + revalidación 26-oct (rama `feature/muse-plaza-tecnologia-seed`)

- **Fuente principal**: `catalogo-oficial.json` (`ciudadan-plaza-beta-v1`). El seed ya no lee
  `catalogo-productos.json` ni `catalogo.json` (quedan como histórico/herramientas).
- **Campos integrados por producto**: `nombre`, `descripcion` (real del catálogo; antes era
  el nombre), `marca` (real; antes derivada del SKU), `especificaciones` (JSON del catálogo),
  `destacado`, `precio` (revalidado), `imagenes` por filename con portada `-01` como
  `imagen_predeterminada`, y relaciones tienda/categoría. `segmento` NO se persiste (el schema
  no tiene campo; queda como metadato del catálogo).
- **Precios**: base = precio del catálogo; los 26 revalidados aplican
  `precio = redondear(costo_observado * 1.05, 2)`; `DTXM/128GB` mantiene 196.35 (anomalía
  documentada); 3 sin cambios. Trazabilidad: en `XTPCR732GB5780MKW`, `920-010713` y
  `BR-940412` el `costo_anterior` de la revalidación (baseline scrape 12-oct) difiere del costo
  del catálogo oficial; se reporta AVISO y se aplica el `costo_observado` del 26-oct.
- **Slugs**: los productos NUEVOS usan el slug oficial del catálogo (`ptc-cp-*`); el lookup
  incluye el slug oficial y el legacy (`<sku>-plaza-tecnologia`, corridas del Bloque 2) para
  conservar la idempotencia; un producto existente conserva su slug (no se migra). Conflicto
  (ambos presentes) → se reporta y no se toca.
- **Schema**: SIN cambios — `producto` ya contiene `descripcion` (string), `marca` (string),
  `especificaciones` (json) y `destacado` (boolean). No fue necesario agregar campos.
- **Imágenes en actualización**: solo se suben/enlazan si el producto existe sin galería;
  nunca se pisan medios ya cargados.
- **Validación local (sin BD)**: meta del catálogo, campos obligatorios, existencia de las
  58 imágenes con portada `-01`, invariante `precio = redondear(costo*1.05, 2)` del catálogo,
  cobertura exacta de la revalidación y los 26 precios re-computados. Última corrida:
  30 SKU, 58 imágenes, 5 destacados, 26 refrescos, 1 anomalía, 3 sin cambios, 0 errores.

## Comandos

```bash
cd ciudadan_backend_26
node seed/plaza-tecnologia/seed-plaza-tecnologia.js            # validar local (sin BD)
node seed/plaza-tecnologia/seed-plaza.cjs                      # validar imágenes (58/58)
python3 seed/plaza-tecnologia/revalidar.py                     # revalidar proveedor
PLAZA_STORE_EMAIL=tienda@ciudadan.org node seed/plaza-tecnologia/seed-plaza-tecnologia.js --apply            # crear/cargar (borradores)
PLAZA_STORE_EMAIL=tienda@ciudadan.org node seed/plaza-tecnologia/seed-plaza-tecnologia.js --apply --publish  # + publicar listos
```

Los dos últimos requieren orden explícita — `--apply` queda pendiente (importes aprobados,
aplicación diferida).

Vars: `PLAZA_STORE_OWNER_ID` (opcional), `PLAZA_STORE_EMAIL` (operativo verificado).
Pendiente operativo: email/ID del propietario real y dirección precisa de despacho
(configurables, no bloquean código).

## Base de revisión
- Rama base: `main`, commit `956c504259c06962afad78edb74c21c4f0975b44`.
- Ramas de trabajo: `feature/muse-plaza-tecnologia-imagenes` (Bloques 1-2),
  `feature/muse-plaza-tecnologia-seed` (Bloque 3).
