# Landing de descarga para conductores (`/descargar`)

Página de prelanzamiento donde un conductor deja su correo, recibe un enlace
personal y descarga el APK con la **membresía promocional ya aplicada**.
Ningún precio se hardcodea en el frontend: todo sale del backend.

## Flujo

```
Conductor → POST /api/driver-launch/claim   (correo + Turnstile + atribución UTM)
          ← { downloadUrl, message, promocionConcedida, emailEnviado }
          → GET  /api/driver-launch/download/:token   (enlace personal, revocable)
          ← application/vnd.android.package-archive   y aquí se consolida la promo
          → POST /api/driver-launch/notify            (aviso de lanzamiento / reenviar / baja)
```

1. **Claim.** Se crea o actualiza el `driver-launch-lead`. Si la promoción sigue
   abierta (`promotion_active` y `promotion_claim_deadline`) y el lead no había
   reclamado antes, se marca `promo_claimed = true` con
   `promo_source = 'prelaunch_download'`. El `claim_token` **siempre** se
   entrega (aunque la promo haya cerrado): es el control de abuso de la descarga,
   no del precio. Si ya existe token, se reutiliza: el enlace personal no rota
   en cada visita.
2. **Descarga.** El `GET` busca el lead por `claim_token` y lo compara en tiempo
   constante (`tokenCoincide`), aplica la elegibilidad con
   `promo.aplicarPromoEnDescarga()` (un fallo aquí **no** impide descargar la
   app) y marca `downloaded_at`. Recién cuando existe un `driver` con ese correo
   se escriben `promo_eligible`, `promo_source` y `promo_granted_at`; si el
   conductor aún no existe, el lifecycle de `driver` resolverá el vínculo al
   registrarse. `promo_expires_at` es columna del `driver` (no del lead) y no se
   calcula aquí: los meses promocionales corren desde el inicio de la membresía
   real.
3. **Precio.** `driver/services/driver.js` pregunta el precio efectivo a
   `driver-membership-config.resolveDriverMembershipPrice(driver)`
   (`precios.js → resolverPrecioMembresia`), que aplica
   `regular_monthly_price` o `promotional_monthly_price` según el estado de la promo.
4. **Correo de lanzamiento.** El cron `driver-launch-ticker` envía en lotes el
   aviso cuando llega `launch_at` a los leads con consentimiento. Está definido
   en `config/cron-tasks.js` y se registra desde `config/server.js`
   (`cron: { enabled, tasks }`), que es donde Strapi 4 busca las tareas.

## Endpoints

| Método | Ruta | Auth | Notas |
|---|---|---|---|
| POST | `/api/driver-launch/claim` | pública | Turnstile + rate limit (40/10 min por IP+correo, hash, sin IP cruda) |
| POST | `/api/driver-launch/notify` | pública | `accion`: `aviso` \| `resend_link` \| `unsubscribe` |
| GET | `/api/driver-launch/download/:token` | pública | token criptográfico de un solo uso |
| GET | `/api/driver-membership/public-config` | pública | precios, vigencia de promo y datos del binario |

## Variables de entorno

**Backend (`ciudadan_backend_26/.env`)**

| Variable | Producción | Descripción |
|---|---|---|
| `DRIVER_DOWNLOAD_BASE_URL` | obligatoria | Origen con el que se arman los enlaces de descarga. Si falta, cae a `PUBLIC_FRONTEND_URL` y luego a `https://api.ciudadan.org` |
| `DRIVER_APK_PATH` | opcional | Override de la ruta del APK. Sin ella se usa `public/downloads/ciudadan-latest.apk` |
| `TURNSTILE_SECRET_KEY` | obligatoria | Secreto del sitio. Sin ella, en `NODE_ENV=production` los POST responden **503** (nunca se omite la verificación en silencio) |
| `TURNSTILE_DISABLED` | sólo dev | `true` omite la verificación |
| `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, `BREVO_SENDER_NAME`, `BREVO_LAUNCH_TEMPLATE_ID`, `BREVO_TRANSACTIONAL_TEMPLATE_ID` | correo | Plantillas transaccionales del enlace. Sin `BREVO_TRANSACTIONAL_TEMPLATE_ID` no se envía el correo y la respuesta trae `emailEnviado: false`: la UI muestra el enlace en pantalla |
| `CRON_ENABLED` | opcional | `false` desactiva el cron del arranque (útil con varias instancias para no duplicar correos). Por defecto `true` |

**Frontend (`ciudadan_frontend/.env`)**

| Variable | Descripción |
|---|---|
| `REACT_APP_TURNSTILE_SITE_KEY` | Site key del widget. Vacía ⇒ no se monta el widget (dev) |
| `REACT_APP_AVISO_PRIVACIDAD_URL` | Enlace del aviso de privacidad que acepta el conductor |
| `REACT_APP_STRAPI_URL` | Origen de la API (ya existía) |

## Publicar el APK

```bash
cd ciudadan_backend_26
npm run sync:apk                      # o: node scripts/sync-apk.js ruta/al/app-release.apk
```

Copia el binario a `public/downloads/ciudadan-latest.apk`, aborta si está vacío
e imprime tamaño y SHA-256. La landing lee de ahí el peso real (`≈ 148.4 MB`)
para avisar antes de descargar; si el archivo no existe, `apk.disponible` es
`false` y la página avisa que el binario se está publicando (el peso nunca se
inventa).

## Configuración editable (admin panel)

Single Type **Driver membership config** (`driver-membership-config`):
`regular_monthly_price` (500), `promotional_monthly_price` (300), `currency`
(MXN), `promotion_duration_months` (12), `promotion_active`,
`promotion_claim_deadline`, `launch_at`, `launch_title`, `apk_version`.
Se crea solo con los defaults al arrancar (`asegurarExiste()` en `src/index.js`).

Cerrar la promoción sin apagar la landing = `promotion_active = false` o
`promotion_claim_deadline` en el pasado: la página sigue entregando el APK y el
mensaje pasa a hablar en precio regular.

## Códigos de error

| Código | Cuándo |
|---|---|
| 400 | correo inválido, falta consentimiento explícito de correo, token de Turnstile inválido o enlace de descarga mal formado |
| 404 | token de descarga desconocido, usado o que ya no coincide |
| 429 | muchas solicitudes o muchas descargas desde la misma clave (40 por ventana de 10 min) |
| 500 | no se pudo registrar el lead tras la colisión de dos claims simultáneos |
| 503 | Turnstile sin configurar o caído, o el APK todavía no está publicado |

## Frontend

- Página: `src/Pages/DescargarConductores.jsx` (rutas `/descargar` y
  `/descargar-conductores`, y dominio `descargar.ciudadan.org`).
- Componentes: `src/components/Descargar/` (`DescargarForma.jsx`,
  `Turnstile.jsx`, `datos.js`, `descargar.css`).
- Servicio: `src/services/driverLaunchService.js` — normaliza camelCase y
  snake_case y, si la API no responde, muestra precios de referencia con
  `esRespaldo: true` (la página nunca se rompe).
- El enlace de descarga **siempre** lo decide el servidor; el frontend no arma
  URLs de descarga.

## Pruebas

```bash
cd ciudadan_backend_26 && npm test                       # 47 pruebas (node:test)
cd ciudadan_frontend && npx craco test --watchAll=false --testPathPattern=Descargar   # 22 pruebas
```

Los tests del backend corren con un mock de `strapi`
(`tests/helpers/strapi-mock.js`): no tocan la base de datos ni salen a la red
(Turnstile se omite con `TURNSTILE_DISABLED=true` y Brevo responde "sin
configurar"). El test `driver-launch-claim.test.js` además compara cada campo que
escribe el claim contra `schema.json` del lead: si alguien vuelve a escribir una
columna inexistente, la suite lo detecta.
