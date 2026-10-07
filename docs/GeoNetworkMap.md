# GeoNetworkMap — Motor geográfico genérico de Ciudadan

> Componente reutilizable para representar **datos territoriales** en un mapa SVG
> temático, sin dependencias de mapas comerciales (nada de Google Maps, Leaflet,
> Mapbox ni Three.js) y **sin peticiones de red en runtime**.

- **Código:** `ciudadan_frontend/src/components/GeoNetworkMap/`
- **Primera implementación:** `ciudadan_frontend/src/components/SociosEstatales/SociosEstatalesMap.jsx`
- **Demo / QA:** `/dev/geo-network-map` (solo herramienta interna)
- **Rama:** `feature/adrian1-socios-estatales`

---

## 1. Arquitectura: 3 capas desacopladas

```
GEOMETRÍA (GeoJSON)      DATOS (regionId)         CONFIG VISUAL (JSON)
states.geo.json          socios-estatales.json    socios-estatales.map.json
   │                          │                          │
   └────────────┬─────────────┴──────────────┬───────────┘
                ▼                            ▼
        <GeoNetworkMap geometry geoMeta data config selectedRegionId onRegionSelect />
                │
                ├── RegionLayer   (polígonos, fillToken, patrones, intensidad, teclado)
                ├── MapLabels     (varios labels por región, callouts, hideWhenNull)
                ├── MapTooltip    (campos dinámicos, solo con valor)
                └── MapLegend     (leyenda desde config)
```

`GeoNetworkMap` **no sabe** qué es un “Socio Estatal”. Sólo entiende de:
regiones, `regionId`, color por token, patrón, intensidad, labels, tooltip,
selección y callbacks. Toda semántica de negocio vive en el wrapper
(`SociosEstatalesMap`) y en los datasets.

### Archivos

| Archivo | Responsabilidad |
|---|---|
| `GeoNetworkMap.jsx` | Motor: indexa datos/metadata por `regionId`, proyecta, orquesta capas y estado de hover/selección |
| `RegionLayer.jsx` | Capa de regiones (Polygon/MultiPolygon), accesibilidad, hover/selected |
| `MapLabels.jsx` | Labels configurables (varias líneas por región) + callouts |
| `MapTooltip.jsx` | Tooltip flotante que **sólo** muestra campos con valor |
| `MapLegend.jsx` | Leyenda construida desde `config.legend` |
| `SvgPatternsDefs.jsx` | `<defs>`: patrones SVG y filtros de resplandor |
| `geoTheme.js` | Tokens visuales de Ciudadan + `resolveFillToken()` + `getStatusLabel()` |
| `geoUtils.js` | Proyección Mercator, paths SVG, centroides, formateadores, `normalizeRegionId` |
| `index.js` | Barrel de exportaciones |

---

## 2. API de `GeoNetworkMap`

```jsx
<GeoNetworkMap
  geometry={geometry}                 // FeatureCollection | Feature[] | Feature
  geoMeta={meta}                      // { regions: [...] } | array
  data={data}                         // array | mapa { 'MX-OAX': {...} }
  config={mapConfig}                  // ver §4
  selectedRegionId={selected}         // controlado desde fuera
  onRegionSelect={(regionId, data, meta) => {}}   // el motor NO navega
  showLabels showLegend showTooltip
  width={1000} height={620} padding={24}
  ariaLabel="Mapa territorial interactivo"
/>
```

Reglas de diseño:

- **`selectedRegionId` + `onRegionSelect` son obligatorios** para mantenerlo
  reutilizable: el motor nunca decide navegación ni routing.
- `data` y `geoMeta` se indexan por `regionId` (con `normalizeRegionId`:
  `trim()` + `toUpperCase()`), así que el orden de los arrays es irrelevante y
  **una región sin datos no rompe** el mapa.
- La proyección se calcula **una sola vez** con `useMemo` (nunca en cada hover).
- El estado de hover vive en el motor; los paths SVG se generan una vez.

---

## 3. Geografía: `states.geo.json` + `states.meta.json`

Fuente oficial: **INEGI**, servicio web del Catálogo Único de Claves
Geoestadísticas (`https://gaia.inegi.org.mx/wscatgeo/v2/geo/mgee/`,
“Marco Geoestadístico, diciembre de 2025”). Ver
`src/data/geo/mx/SOURCE.md` para procedencia, licencia y fecha de obtención.

- 32 entidades federativas, `regionId` estable en formato **ISO 3166-2:MX**
  (`MX-AGU` … `MX-ZAC`).
- Cada entidad conserva su **clave INEGI** (`cve_ent`, 01–32) en la metadata.
- Geometría simplificada con Douglas-Peucker (0.005°, de **1.014.750 a 16.131
  puntos**, −98,4 %) y coordenadas a 4 decimales. Archivo final: **~312 KB**.
  **Se carga localmente: nunca se descarga en runtime.**
- `states.meta.json` incluye por entidad: `name` (oficial INEGI),
  `shortName`, `abbreviation`, `slug`, `centroid`, `labelText`, `isSmall`,
  `labelOffset` y `labelCallout`.

### Regenerar los assets

```bash
cd ciudadan_frontend
python3 tools/geo/build-mx-states.py                  # descarga INEGI y regenera
python3 tools/geo/build-mx-states.py --cached /tmp/geo --tolerance 0.005
```

El script valida: 32 entidades, `regionId` únicos, nombres contra el catálogo
oficial, ausencia de colisiones de labels y un cruce con un dataset
independiente (0 discrepancias).

---

## 4. Configuración visual (`socios-estatales.map.json`)

La configuración visual **no se mezcla con los datos**. El dataset dice
`"fillToken": "available"` (o un campo como `status`) y el theme decide el color.

```json
{
  "title": "Socios Estatales de Ciudadan",
  "fillBy": "status",            // campo de data que define el color
  "patternBy": "nodeStage",      // campo de data que define el patrón
  "intensityBy": "drivers.total",// campo opcional que modula la opacidad
  "labels": [
    { "field": "name",       "variant": "name",  "priority": 1 },
    { "field": "investment", "variant": "money", "hideWhenNull": true, "priority": 2 },
    { "field": "status",     "variant": "status","hideWhenNull": true, "priority": 3 }
  ],
  "legend": { "title": "Disponibilidad", "items": [ { "token": "available", "label": "Disponible" } ] },
  "tooltip": { "fields": [ { "field": "drivers.total", "label": "Conductores", "variant": "metric", "hideWhenNull": true } ] }
}
```

### Tokens disponibles (`geoTheme.js`)

| Token | Significado | Color base |
|---|---|---|
| `available` | Disponible | verde `#19d79c` |
| `processing` | En proceso | amarillo `#f5c842` |
| `assigned` | Asignado | turquesa `#2ee6c8` |
| `disabled` | Inactivo / sin dato | gris verdoso `#20322d` |
| `selected` | Selección | borde blanco + glow |
| `network` | Nodos y aristas (fase 2) | turquesa translúcido |
| `background` | Lienzo / superficies | `#07120f`, `#0b1d17` |
| `label` / `text` | Tipografía | blanco / `#a2c4b9` |

Identidad Ciudadan: fondo `#07120f`, verde `#19d79c`, turquesa `#2ee6c8`,
acento `#f5c842`/`#efe92f` (no se usó azul corporativo genérico).

## 5. Patrones SVG

Implementados con `<pattern>` dentro de `<defs>` (`SvgPatternsDefs.jsx`):

| Patrón | Uso previsto |
|---|---|
| `solid` / `none` | sin trama |
| `diagonal` | etapa de infraestructura / nodo en despliegue |
| `dots` | etapa piloto |
| `crosshatch` | etapa activa |
| `horizontal`, `vertical` | reservados para nuevas dimensiones |

Color, patrón e intensidad **coexisten**: `fill` = token, `pattern` = capa
superpuesta (`fillOpacity 0.65`), `intensity` = opacidad calculada por
`calculateIntensity()`. Los patrones sirven además como distinción **no
cromática** (accesibilidad).

## 6. Labels

`config.labels` es una lista; cada región pinta **una línea por label válido**.
Variantes: `name`, `metric`, `money`, `status`, `badge`, `text`.

- `hideWhenNull` (por defecto `true`): si el valor es `null`/`undefined`/`NaN`
  la línea **no se renderiza** → nunca aparece `$null`, `NaN` ni `0 conductores`.
- Posición: centroide de la entidad (calculado en el pipeline INEGI) +
  `labelOffset` de `states.meta.json` (en unidades de `viewBox`, por eso es
  independiente del tamaño renderizado).
- `labelCallout: true` dibuja una **línea guía** desde el centroide al label
  externo (entidades pequeñas: CDMX, Tlaxcala, Morelos, Colima, Aguascalientes,
  Querétaro, Hidalgo, Puebla y Estado de México).

## 7. Tooltip, selección y accesibilidad

**Tooltip**: definido en `config.tooltip.fields`. Cada fila resuelve su campo
con `resolveNestedField` (soporta `drivers.total`), formatea según variante
(`money`, `metric`, `percent`, `status`, `text`) y **se omite si no hay valor**.
En desktop aparece con `hover` y con `focus` (teclado); en táctil la ficha
lateral del wrapper es el mecanismo principal, y el tooltip nunca captura
eventos (`pointerEvents: 'none'`).

**Selección**: totalmente controlada desde fuera.

```jsx
<GeoNetworkMap
  selectedRegionId={selected}
  onRegionSelect={(regionId, data, meta) => setSelected(regionId)}
/>
```

**Accesibilidad**:

- Cada región es `role="button"`, `tabIndex=0` y `aria-label`
  (`"Oaxaca, Estatus: Disponible"`), con `aria-pressed` para la selección.
- `Enter` y `Space` disparan la misma acción que el clic (probado en tests).
- Foco visible por `filter`/borde, no solo por color.
- Los patrones diferencian estados sin depender del color.
- `prefers-reduced-motion` se respeta (las capas SVG no dependen de animaciones;
  cualquier transición es discreta y no bloqueante).

## 8. Socios Estatales (wrapper)

`SociosEstatalesMap.jsx` es el único componente que conoce el negocio:

- Carga `states.geo.json`, `states.meta.json`, `socios-estatales.json` y
  `socios-estatales.map.json`.
- Maneja `selectedRegionId` y renderiza la **ficha lateral**: nombre, código
  (`MX-CMX · CDMX`), chip de estatus, y sólo muestra conductores / aportación
  **si el dato existe** (nunca `null`/`NaN`).
- Participación (5%) y pago (hasta 12 MSI) salen del dataset, no del componente.
- CTA según estatus: `available` → “Ver estado”, `processing` → “Ver proceso”,
  `assigned` → “Otras formas de participar”.
- **Buscador “Buscar mi estado”**: `Autocomplete` con las 32 entidades
  (nombre + nombre corto). Seleccionar ahí produce **exactamente el mismo
  resultado** que hacer clic en el mapa (mismo `handleSelect`), lo que garantiza
  acceso a CDMX, Tlaxcala, Morelos y Colima en móvil.
- `onCtaClick(slug, status, data)` está preparado para rutas futuras
  `/socios-estatales/:slug`. **No se navega** porque la página destino aún no
  existe (no se crean enlaces rotos).

## 9. Datasets

### `socios-estatales.json` (productivo)

32 registros, uno por entidad. **No se inventan cifras**:

```json
{
  "regionId": "MX-OAX",
  "status": "available",
  "drivers": { "taxi": null, "apps": null, "total": null },
  "investment": null,
  "months": 12,
  "participation": 5,
  "nodeStage": "planned"
}
```

- **Confirmado:** `MX-CMX` y `MX-MEX` → `assigned`.
- **Los otros 30** → `available`.
- Conductores, aportaciones e ingresos desconocidos → `null`.

---

## 10. Tests

```bash
cd ciudadan_frontend
CI=true npm test -- --watchAll=false
```

| Suite | Cobertura |
|---|---|
| `src/components/GeoNetworkMap/geoUtils.test.js` (13) | `resolveNestedField`, `formatMoneyMXN`, `formatMetric`, `normalizeRegionId`, `mercatorProject`, `createMapProjection`, `featureToSvgPath`, `calculateIntensity`, nulls |
| `src/components/GeoNetworkMap/GeoNetworkMap.test.jsx` (20) | render, unión geometry↔data por `regionId`, `fillToken`, patrones, múltiples labels, `hideWhenNull`, región sin datos, clic/Enter/Space, callback, tooltip sólo con campos existentes, selector móvil, config inválida, reduced-motion, 32 entidades, CDMX/Edomex `assigned`, 30 `available`, sin URLs en runtime |

Los tests unitarios del motor usan un **fixture geométrico de 2 polígonos**, no
el GeoJSON completo de México (rendimiento).

---

## 11. Cómo extender

### Otro dataset sobre el mismo país

1. Crear `src/data/maps/mi-dataset.json` con `regionId` = códigos ISO del país.
2. Crear `src/data/maps/mi-dataset.map.json` (`fillBy`, `labels`, `legend`, `tooltip`).
3. Reutilizar el motor:

```jsx
<GeoNetworkMap geometry={mxGeometry} geoMeta={mxMeta} data={miDataset} config={miConfig} />
```

### Otro país

1. Generar `src/data/geo/<pais>/regions.geo.json` + `regions.meta.json`
   (misma forma: `regionId`, `centroid`, `labelOffset`).
2. Ajustar `width`/`height` del `viewBox` si el país es muy vertical u horizontal.

### Otro nivel (municipios, localidades)

El motor **no asume 4 niveles**: sólo necesita `regionId` y geometría. Basta con
generar otro par de archivos (`MX-OAX` → municipios) y pasarlos como `geometry`.
Para no cargar todo el mundo a la vez, la referencia es **carga progresiva**
(`world` → país → estado → municipio) mediante `React.lazy`/`import()` dinámico
en el wrapper correspondiente.

### Cambiar JSON por API

Los datos entran como props. Para migrar a una API (Strapi) basta con
reemplazar el `import` del JSON por un `fetch` en el wrapper y pasar el
resultado a `data`; el motor no cambia. La **geometría debe seguir siendo
local** (o cacheable) para no repetir descargas pesadas.

### Fase 2 (ya contemplada, no implementada)

- `PointLayer`: nodos con `{ id, coordinates: [lon, lat], parentId, status }`.
- `NetworkLayer`: conexiones `{ from, to, type }` dibujadas sobre los centroides.
- `RegionsPatterns` por intensidad con leyenda numérica (heatmap).
- API pública de `GeoNetworkMap` ya recibe `width/height/padding` y los
  formateadores reutilizables, de modo que estas capas se añaden sin romper
  contratos.

---

## 12. Rendimiento

- Proyección y `d` de los paths calculados **una vez** (`useMemo`); el hover sólo
  cambia atributos de estilo del elemento afectado.
- Sin `fetch`, sin tiles, sin listeners globales.
- Sin dependencias nuevas (no se instaló `d3-geo` ni `topojson`: se implementó
  una proyección Mercator de ~10 líneas en `geoUtils.js`, suficiente para 32
  regiones y conforme a la restricción de no añadir librerías innecesarias).


### `socios-estatales.demo.json`

Fixture con cifras **ficticias** para QA (formateo, tooltips ricos, intensidad).
Sólo se usa desde la demo interna; el dataset productivo permanece intacto.

- Para entidades pequeñas, `labelText` viene abreviado (`Tlax.`, `CDMX`, `Col.`…)
  usando la abreviatura oficial del catálogo INEGI (`nom_abrev`).
- Los labels llevan `pointer-events: none` y `paint-order: stroke` (halo oscuro)
  para no bloquear la interacción y mantenerse legibles sobre cualquier relleno.

El layout de labels se calcula en el pipeline: parte de los centroides
proyectados, estima las cajas de texto y desplaza iterativamente hasta dejar
**0 colisiones** entre las 32 etiquetas.

