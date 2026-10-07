# Fuente de Datos Geográficos — México (32 Entidades)

## Origen de los Datos
- **Organismo**: Instituto Nacional de Estadística y Geografía (INEGI), México.
- **Servicio Web Oficial**: Catálogo Único de Claves Geoestadísticas (AGEEML).
  - Servicio Tabular (Catálogo AGEE): `https://gaia.inegi.org.mx/wscatgeo/v2/mgee/`
  - Servicio Vectorial (Marco Geoestadístico GeoJSON): `https://gaia.inegi.org.mx/wscatgeo/v2/geo/mgee/`
- **Metadatos Oficiales**:
  - `Fuente_informacion_vectorial`: INEGI. Marco Geoestadístico, diciembre de 2025.
  - `Fuente_informacion_estadistica`: INEGI. Censo de Población y Vivienda, 2020.
- **Fecha de obtención**: 28 de septiembre de 2026.
- **Licencia**: Información pública oficial de los Estados Unidos Mexicanos (Ley del Sistema Nacional de Información Estadística y Geográfica - LSNIEG). Uso libre para consulta, reproducción y desarrollo de aplicaciones con atribución al INEGI.

## Procesamiento Realizado
El GeoJSON original de INEGI contiene geometrías completas de alta resolución (~28.8 MB, 1,014,750 vértices).
Para uso web en tiempo real sin dependencias externas en runtime:
1. Simplificación algorítmica Douglas-Peucker a 0.005° (~500 m) preservando la topología de las 32 entidades.
2. Reducción de 1,014,750 a 16,131 puntos (reducción del 98.4%).
3. Coordenadas redondeadas a 4 decimales (~11 m de precisión, idóneo para mapa a escala país).
4. Tamaño final en disco: `states.geo.json` (~310 KB). No requiere peticiones externas en runtime.
5. Exactamente 32 entidades federativas correspondientes a las 32 AGEE del INEGI y la norma ISO 3166-2:MX (`MX-AGU` a `MX-ZAC`).
6. Se calculó el polo de inaccesibilidad / centroide interior para cada entidad y se generaron los offsets de labels en `states.meta.json` para garantizar legibilidad en entidades de área reducida (CDMX, Tlaxcala, Morelos, Colima, Aguascalientes, Querétaro).

## Script de Reproducción
Cualquier desarrollador puede regenerar este dataset ejecutando:
```bash
python3 tools/geo/build-mx-states.py --tolerance 0.005
```
