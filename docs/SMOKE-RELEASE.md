# Smoke test del release — Ciudadan

Script ejecutable y repetible que convierte la verificación manual de
`docs/VERIFICACION-RELEASE-2026-10-27.md` en una comprobación automática de los
puntos públicos más críticos del release.

## Cómo ejecutarlo

```bash
node scripts/smoke-release.mjs          # salida legible (PASS / FAIL / WARN)
node scripts/smoke-release.mjs --json   # documento JSON para integraciones
```

No requiere instalación, credenciales ni variables obligatorias: usa `fetch` de
Node 18+ y solo peticiones **GET**.

| Variable | Por defecto | Para qué sirve |
|---|---|---|
| `SMOKE_FRONTEND_URL` | `https://frontend-temporal1-agent1.ciudadan.org` | Frontend de una instancia de agente |
| `SMOKE_API_URL` | `https://backend-temporal1-agent1.ciudadan.org` | API Strapi de una instancia de agente |
| `SMOKE_MAIN_URL` | `https://ciudadan.org` | Sitio público de producción |
| `SMOKE_TIMEOUT_MS` | `20000` | Timeout por petición |
| `SMOKE_RETRIES` | `2` | Reintentos por punto (espera creciente) |

**Código de salida:** `0` si no hay ningún `FAIL`, `1` si hay al menos un `FAIL`.
Los `WARN` no cambian el código de salida.

## Qué comprueba

| # | Punto | Qué espera |
|---|---|---|
| 1 | API Strapi `/api/productos` | HTTP 200 y respuesta con `{ data: [...] }` |
| 2 | API Strapi `/api/wiki/public-config` | HTTP 200 y JSON válido |
| 3 | API Strapi `/api/stores?filters[isOfficial][$eq]=true` | HTTP 200 y **una tienda oficial con `slug` y `publishedAt`** (de ahí se toma el slug para el deep-link) |
| 4 | Frontend de agente, raíz | HTTP 200 |
| 5 | Producción, raíz | HTTP 200 |
| 6 | Producción, deep-link SPA `/comunidad` | HTTP 200 (prueba de que el servidor tiene fallback de history API) |
| 7 | Producción, vitrina `/market/store/<slug-oficial>` | HTTP 200 en la tienda oficial publicada |
| 8 | Instancia dev, deep-link `/market/store/<slug-oficial>` | HTTP 200; si da 404 se marca **WARN** (no FAIL) — ver nota abajo |

## Salida real (2026-10-28)

```text
Smoke test del release — Ciudadan
Frontend dev: https://frontend-temporal1-agent1.ciudadan.org
API:          https://backend-temporal1-agent1.ciudadan.org
Producción:   https://ciudadan.org

[PASS] API Strapi responde (/api/productos) — HTTP 200, 1 producto(s) (565 ms)
[PASS] API Strapi: wiki public-config — HTTP 200 (114 ms)
[PASS] API Strapi: tienda oficial publicada — La plaza de la tecnología a tu casa (slug la-plaza-de-la-tecnologia-a-tu-casa) (223 ms)
[PASS] Frontend de agente: raíz — HTTP 200 (283 ms)
[PASS] Producción: raíz — HTTP 200 (303 ms)
[PASS] Producción: deep-link SPA /comunidad — HTTP 200 (142 ms)
[PASS] Producción: vitrina de tienda oficial — HTTP 200 en /market/store/la-plaza-de-la-tecnologia-a-tu-casa (141 ms)
[WARN] Instancia dev: deep-link /market/store/<slug> — HTTP 404 — la instancia dev no resuelve deep-links (falta fallback de history API); en producción sí resuelve (128 ms)

Resumen: 7 PASS · 1 WARN · 0 FAIL
```

### Nota del WARN

Las instancias de agente sirven el frontend sin *history API fallback*: la raíz
(`/`) responde 200, pero cualquier ruta de SPA (`/market/...`, `/comunidad`)
responde **404**. En producción (`ciudadan.org`) las mismas rutas responden 200,
o sea que **no es una regresión del producto**: es una diferencia de despliegue
entre el build estático de producción y el servidor de las instancias dev.

Por eso el punto 8 es informativo: mientras el deep-link de producción sea 200,
el release se considera sano. Si algún día la producción devuelve 404, ese
punto pasa a FAIL y el script sale con código 1.

## Qué NO comprueba

- No hace escrituras: no crea ni modifica tiendas, productos, publicaciones ni usuarios.
- No valida autenticación (Auth0, permisos, roles) ni flujos de pago (Stripe).
- No comprueba el wiki renderizado en el frontend ni el socket de notificaciones.
- No verifica el build de la app ni el de Strapi (eso es de CI).
- No prueba la app móvil (Capacitor).
- No mide rendimiento ni carga; solo disponibilidad y forma de la respuesta.
- No usa ni imprime credenciales: los puntos públicos son anónimos.

## Cómo interpretarlo

- `0 FAIL` → el release está publicable en cuanto a disponibilidad pública.
- `FAIL` en puntos 1–3 → la API Strapi no está sirviendo; es el punto más grave.
- `FAIL` en 5–7 → producción caída o deep-links rotos: revisar el despliegue del frontend.
- `WARN` en 8 → conocido y esperado en instancias dev; si aparece también en
  producción, el script lo marcará FAIL.
