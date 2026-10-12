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

## Bloque 2 — tienda oficial + seed de productos

- Tienda: `La plaza de la tecnología a tu casa` (slug `la-plaza-de-la-tecnologia-a-tu-casa`, `isOfficial: true`).
- `catalogo-productos.json`: 30 SKU con nombre/costo MXN/categoría/stock proveedor (costos observados
  en cyberpuerta.mx 2026-10-12, IVA incl.). Precio = `redondear(costo*1.05, 2)`.
- `seed-plaza-tecnologia.js`: valida local sin BD; con `--apply` resuelve/crea la tienda por slug
  (conflicto → reporta, no duplica), actualiza solo campos administrados, crea dirección comercial
  solo si no existe (texto conocido, sin inventar número/CP/coords), reutiliza categorías
  `computacion` y `electronica-y-tecnologia`, sube medios por nombre (reutiliza), `imagenes` +
  `imagen_predeterminada=[portada]`, borrador por defecto y `--publish` explícito, sin reponer stock
  ni tocar productos ajenos. Owner/email por env (no desvincula tiendas ajenas).
- `revalidar.py`: revalida precio/disponibilidad antes de activar (reporta cambios/agotados).
- Schemas: `store.descripcion` (text, i18n); `producto.store` y `producto.store_category` a manyToOne.
- Controlador store: `isOfficial` solo lo fija admin (403 al vendedor común que lo envíe).
- Frontend `Tienda.jsx`: populate + render de `descripcion`.

```bash
cd ciudadan_backend_26
node seed/plaza-tecnologia/seed-plaza-tecnologia.js            # validar local
python3 seed/plaza-tecnologia/revalidar.py                    # revalidar proveedor
PLAZA_STORE_EMAIL=tienda@ciudadan.org node seed/plaza-tecnologia/seed-plaza-tecnologia.js --apply                 # crear/cargar (borradores)
PLAZA_STORE_EMAIL=tienda@ciudadan.org node seed/plaza-tecnologia/seed-plaza-tecnologia.js --apply --publish       # + publicar listos
```

Vars: `PLAZA_STORE_OWNER_ID` (opcional), `PLAZA_STORE_EMAIL` (operativo verificado).
Pendiente operativo: email/ID del propietario real y dirección precisa de despacho (configurables, no bloquean código).

## Base de revisión
- Rama base: `main`, commit `956c504259c06962afad78edb74c21c4f0975b44`.
- Rama de trabajo: `feature/muse-plaza-tecnologia-imagenes`.
