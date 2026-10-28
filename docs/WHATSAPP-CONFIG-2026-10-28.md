# WhatsApp configurable en Comunidad — auditoría de URLs hardcodeadas (2026-10-28)

- **Fecha:** 2026-10-28 · **Rama:** `feature/comunidad-whatsapp-config-1028` (creada desde `origin/main` = `9f4eabd`; **local, sin push**)
- **Objetivo:** que la URL del grupo de WhatsApp de Comunidad se pueda cambiar **sin redesplegar el frontend**, usando la configuración pública ya existente (`getPublicConfig()`).
- **Alcance de este documento:** inventario de **todas** las URLs de WhatsApp hardcodeadas en `ciudadan_frontend/src` y `docs/`, con archivo, línea, valor y acción sugerida para el operador.
- **Cambios de código de esta tarea:** **solo** `ciudadan_frontend/src/Pages/ComunidadPage.jsx`. Las demás entradas quedan **documentadas, sin tocar** (según instrucción del sprint).

---

## 1. Qué se cambió (único cambio de código)

`ciudadan_frontend/src/Pages/ComunidadPage.jsx`

| Antes | Después |
|---|---|
| `href="https://chat.whatsapp.com/H5GM7PJPIjE5z2Rkh4p95k"` (literal en el JSX, línea 64) | `href={whatsappUrl}` (línea 97), valor resuelto en runtime |

Patrón usado (idéntico al de `ciudadan_frontend/src/Pages/Prelanzamiento.jsx:49`):

```jsx
import { getPublicConfig } from '../services/driverVerifierService';

const [whatsappUrl, setWhatsappUrl] = useState(WHATSAPP_COMUNIDAD_FALLBACK);

useEffect(() => {
  let vigente = true;
  getPublicConfig()
    .then(config => {
      if (!vigente) return;
      setWhatsappUrl(config?.whatsappGroupUrl || WHATSAPP_COMUNIDAD_FALLBACK);
    })
    .catch(() => {
      if (vigente) setWhatsappUrl(WHATSAPP_COMUNIDAD_FALLBACK);
    });
  return () => { vigente = false; };
}, []);
```

### 1.1 Cadena de configuración (fuente de verdad)

```
GET {REACT_APP_STRAPI_URL}/api/driver-verifier/public-config
  → { testingDays, requiredReferrals, whatsappGroupUrl }
  → backend: src/api/driver-verifier-candidacy/services/driver-verifier-candidacy.js
  → campo: site-setting.verifier_candidates_whatsapp_group_url
  → (single type) site_settings
```

El frontend valida la URL: sólo se acepta si es `string` y empieza por `https://`
(`ciudadan_frontend/src/services/driverVerifierService.js:44-47`). Si el backend no
devuelve una URL válida o falla la petición, `getPublicConfig()` devuelve
`whatsappGroupUrl: null` y el CTA usa el **fallback explícito**.

### 1.2 Fallback: explícito y visible (NO un segundo hardcode silencioso)

`ciudadan_frontend/src/Pages/ComunidadPage.jsx:9-25` — constante
`WHATSAPP_COMUNIDAD_FALLBACK = 'https://chat.whatsapp.com/H5GM7PJPIjE5z2Rkh4p95k'`,
con bloque de comentario que declara:

1. cuál es la **fuente de verdad** (configuración pública),
2. que el literal **sólo** se usa si la configuración pública no trae URL válida,
3. que es la **misma URL que estaba hardcodeada antes** de esta tarea (comportamiento
   idéntico cuando el backend no responde),
4. que el **operador** debe fijar la URL oficial en
   `site-setting.verifier_candidates_whatsapp_group_url` (Strapi → Site Setting, o
   `ciudadan_backend_26/seed/site-settings.js`) y **no** editar ese literal.

> **Estado en esta instancia:** `GET http://localhost:1337/api/driver-verifier/public-config`
> responde `{"testingDays":15,"requiredReferrals":10,"whatsappGroupUrl":null}` y la tabla
> `site_settings` de `ciudadan_backend_26/.tmp/data.db` tiene **0 filas**. Es decir, en el
> entorno local el CTA sigue mostrando el fallback. Para que el botón sea configurable
> aquí hay que **crear/publicar el single type `site-setting`** (o correr
> `node seed/site-settings.js`) y setear `verifier_candidates_whatsapp_group_url`.

> **Pendiente para el operador (importante):** el campo que hoy alimenta este CTA se llama
> `verifier_candidates_whatsapp_group_url` y su comentario en
> `ciudadan_backend_26/src/api/site-setting/content-types/site-setting/schema.json:28-31`
> dice *"URL del grupo de WhatsApp de candidatos a Líder Verificador"*, mientras que el
> valor sembrado (`https://chat.whatsapp.com/Kfc6OeZCTNlChmMMZwoQkh`) **no** es el mismo
> grupo que usaba Comunidad (`...H5GM7PJPIjE5z2Rkh4p95k`). Al desplegar, el CTA de
> Comunidad pasará a apuntar al valor configurado. Decidir explícitamente:
> (a) reutilizar ese campo para ambos grupos (lo que hace el código ahora), o
> (b) crear un campo propio (p. ej. `comunidad_whatsapp_group_url`) + endpoint de config
> pública específico, y ajustar `driver-verifier-candidacy.js` y
> `driverVerifierService.js`. **No se hizo ese cambio en esta tarea** (quedaría fuera del
> alcance pedido) y **no se tocó** `api.js` ni `middleware/src/routes/auth0.js`.

---

## 2. Inventario completo de URLs de WhatsApp hardcodeadas

Búsqueda ejecutada sobre `ciudadan_frontend/src` y `docs/` con los patrones
`chat.whatsapp.com`, `wa.me`, `api.whatsapp.com` (case-insensitive):

```bash
grep -rniE 'chat\.whatsapp\.com|wa\.me|api\.whatsapp\.com' ciudadan_frontend/src docs/
```

**`api.whatsapp.com`: 0 coincidencias** en `ciudadan_frontend/src`, `docs/`,
`ciudadan_backend_26/src` y `ciudadan_backend_26/seed`. No hay ninguna URL de la API de
WhatsApp Business hardcodeada que auditar en este alcance.

### 2.1 Frontend (`ciudadan_frontend/src`)

| # | Archivo | Línea | Valor hardcodeado | Qué se debe hacer |
|---|---|---|---|---|
| F1 | `ciudadan_frontend/src/Pages/ComunidadPage.jsx` | **25** (antes el literal estaba en el JSX, línea 64) | `https://chat.whatsapp.com/H5GM7PJPIjE5z2Rkh4p95k` | **RESUELTO en esta tarea.** Ahora es el **fallback explícito y documentado** (bloque de comentario en líneas 9-24) y el CTA usa `getPublicConfig().whatsappGroupUrl`. **El operador debe setear el valor real en `site-setting.verifier_candidates_whatsapp_group_url`.** No volver a hardcodear en el JSX. |
| F2 | `ciudadan_frontend/src/services/prelanzamientoService.js` | **4** | `export const WHATSAPP_COMUNIDAD = 'https://chat.whatsapp.com/Kfc6OeZCTNlChmMMZwoQkh';` | **PENDIENTE (no cambiado).** Es la constante "oficial" que hoy exporta el repo, pero es un literal: cambiar el grupo obliga a redesplegar. Se usa como fallback en `Prelanzamiento.jsx:49` y `SocioEstatalForm.jsx:75-76`, y como valor **directo** (no configurable) en `components/Comunidad/Comunidad.jsx:87,229,358`. Recomendación: dejar la constante sólo como último fallback y leer siempre `getPublicConfig()` primero; mover el uso directo de `Comunidad.jsx` a config cuando el agente-owner de ese archivo libere el archivo (ver F3). |
| F3 | `ciudadan_frontend/src/components/Comunidad/Comunidad.jsx` | **87, 229, 358** | `href: WHATSAPP_COMUNIDAD` / `href={WHATSAPP_COMUNIDAD}` (valor `https://chat.whatsapp.com/Kfc6OeZCTNlChmMMZwoQkh` vía F2) | **PENDIENTE, NO TOCADO por restricción dura** (lo trabaja otro agente en paralelo). Es la superficie más visible del grupo de WhatsApp (CTA "Entrar al grupo", hero y footer) y sigue atada al literal de `prelanzamientoService.js`. **Acción:** cuando se libere el archivo, migrar sus 3 usos al mismo patrón `getPublicConfig()` + fallback documentado. |
| F4 | `ciudadan_frontend/src/Pages/DescargarConductores.jsx` | **25** (usada en 157 y 167) | `const WHATSAPP = 'https://wa.me/525540927949?text=Hola%2C%20quiero%20descargar%20la%20app%20de%20Ciudadan%20para%20conductores';` | **PENDIENTE (no cambiado).** URL de contacto (wa.me con número + texto prellenado) **queda fuera de la configuración pública actual**: el endpoint `driver-verifier/public-config` no expone números de teléfono. **Acción:** exponer el número (p. ej. `site-setting.whatsapp_number`, que ya existe en el schema) por un endpoint público y componer `wa.me/<numero>?text=...` en runtime; o, como mínimo, mover el número a `REACT_APP_WHATSAPP_NUMBER` (hoy esa variable existe en `.env` pero **no se usa en ningún archivo de `src/`** — ver §4). |
| F5 | `ciudadan_frontend/src/utils/sendToWhatsApp.js` | **23** | `` window.open(`https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`, "_blank") `` | **PENDIENTE, menor (no cambiado).** El **número ya es configurable**: se lee de `GET /api/site-setting` → `data.attributes.whatsapp_number` (líneas 6-20). Sólo el **dominio/base `wa.me` y el texto** son literales, lo cual es correcto (no dependen del grupo). Nota operativa: usa `fetch` directo en vez de `src/utils/request.utils.js` y **no valida** que `phoneNumber` exista (si es `null` abre `wa.me/null`). **Acción:** migrar a `fetchJson` y ocultar/omitir el CTA si no hay número configurado. |
| F6 | `ciudadan_frontend/src/components/Taxis/AdeudoWarning.jsx` | **64** | `` `https://wa.me/${String(phone).replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}` `` | **PENDIENTE, menor (no cambiado).** Igual que F5: el número viene de `site-setting.whatsapp_number` (líneas 38-40), sólo la plantilla de `wa.me` es literal (correcto). **Acción:** mismo criterio que F5 (centralizar en `request.utils.js` y validar número vacío). |
| F7 | `ciudadan_frontend/src/components/ShareButton.jsx` | **125** (comentario) y **126** | `` const waLink = `https://wa.me/?text=${encodeURIComponent(text)}`; `` | **PENDIENTE, menor / probablemente sin acción (no cambiado).** Enlace de *compartir* sin destinatario (`wa.me/?text=`): abre el selector de contactos de WhatsApp, no apunta a un grupo ni a un número. **Acción:** ninguno obligatorio; si el operador quiere forzar un número de destino, usar el de `site-setting.whatsapp_number` (F4/F5). |

### 2.2 Documentación (`docs/`)

| # | Archivo | Línea | Valor | Qué se debe hacer |
|---|---|---|---|---|
| D1 | `docs/tarea-lideres-verdes.md` | **323** | `` `https://chat.whatsapp.com/Kfc6OeZCTNlChmMMZwoQkh` `` (valor inicial del campo `verifier_candidates_whatsapp_group_url`) | **PENDIENTE, cosmético (no cambiado).** Es la especificación original del campo; el propio doc dice *"Esta URL NO debe quedar hardcodeada dentro de la landing"*. **Acción:** actualizar el valor de ejemplo cuando el grupo oficial cambie, para que la spec no contradiga a `site-setting`. |
| D2 | `docs/tarea-lideres-verdes.md` | **364** | `https://chat.whatsapp.com/Kfc6OeZCTNlChmMMZwoQkh` (bloque del seed) | **PENDIENTE, cosmético (no cambiado).** Debe seguir **coincidiendo** con `ciudadan_backend_26/seed/site-settings.js:28` (`WHATSAPP_GROUP_URL`), que es lo que se escribe en la BD al sembrar. **Acción:** cambiar ambos a la vez si el grupo oficial cambia. |
| D3 | `docs/tarea-lideres-verdes.md` | **393** | `"whatsappGroupUrl": "https://chat.whatsapp.com/Kfc6OeZCTNlChmMMZwoQkh"` (ejemplo de respuesta del endpoint público) | **PENDIENTE, cosmético (no cambiado).** Ejemplo de payload de `GET /api/driver-verifier/public-config`. **Acción:** igual que D1/D2 — es ilustrativo, no operativo. |

### 2.3 Referencia fuera del alcance auditado (sólo para contexto)

| Archivo | Línea | Valor | Nota |
|---|---|---|---|
| `ciudadan_backend_26/seed/site-settings.js` | 28 | `https://chat.whatsapp.com/Kfc6OeZCTNlChmMMZwoQkh` | **Es el valor sembrado en `site-setting.verifier_candidates_whatsapp_group_url`** ⇒ es el "segundo lugar" donde el operador cambia la URL oficial (además del panel de Strapi). **No modificado** en esta tarea (fuera del alcance: solo frontend + docs). |
| `ciudadan_backend_26/src/api/site-setting/content-types/site-setting/schema.json` | 28-31 | — | Campo `verifier_candidates_whatsapp_group_url` (string). Comentario desactualizado respecto a su uso actual en Comunidad (ver §1.2). **No modificado.** |

---

## 3. Restricciones respetadas en esta tarea

- ✅ Sólo se modificó `ciudadan_frontend/src/Pages/ComunidadPage.jsx` (+ este documento).
- ❌ **NO** se tocó `api.js` ni `ciudadan_backend_26/middleware/src/routes/auth0.js` (investigación de seguridad abierta).
- ❌ **NO** se tocó `ciudadan_frontend/src/components/Comunidad/Comunidad.jsx` (lo trabaja otro agente en paralelo) — sólo documentado en F2/F3.
- ❌ **NO** se commiteó `components.d.ts` ni `contentTypes.d.ts` (archivos generados).
- ❌ **NO** se reiniciaron servicios ni se hizo ningún despliegue.
- ❌ **NO** se hizo `push`; el commit queda local en `feature/comunidad-whatsapp-config-1028`.

---

## 4. Hallazgo adicional: variable de entorno declarada pero sin uso

- `ciudadan_frontend/.env:25` → `REACT_APP_WHATSAPP_NUMBER=5559099956`.
- Documentada en `docs/07-Variables-de-Entorno.md:176` y `docs/despliege_produccion.md:113`.
- **No hay ninguna lectura de `REACT_APP_WHATSAPP_NUMBER` en `ciudadan_frontend/src/`** (verificado con `grep -rn`): la variable está muerta. El número que realmente se usa en runtime viene de `site-setting.whatsapp_number` (F5/F6).

**Acción sugerida:** o bien se conecta `REACT_APP_WHATSAPP_NUMBER` como fallback para F4 (wa.me de soporte en `DescargarConductores.jsx`), o bien se elimina de `.env` y de la documentación para que no confunda.

---

## 5. Checklist para el operador

1. Publicar/crear el single type **Site Setting** en Strapi (o correr `node seed/site-settings.js` en `ciudadan_backend_26/`).
2. Setear `verifier_candidates_whatsapp_group_url` con la URL **https://** del grupo oficial de Comunidad (y confirmar si es el mismo grupo de Líderes Verificadores o si hace falta un campo nuevo — §1.2).
3. Verificar en runtime: `GET {REACT_APP_STRAPI_URL}/api/driver-verifier/public-config` debe devolver `whatsappGroupUrl` con la URL nueva.
4. Recargar `/comunidad` (CTA "Únete al Grupo de WhatsApp") y confirmar que el enlace cambió **sin redesplegar**.
5. Decidir el tratamiento de F2/F3 (`prelanzamientoService.js` y `Comunidad.jsx`) cuando se libere el archivo en paralelo.
6. Decidir el tratamiento de F4 (`wa.me` de soporte en `DescargarConductores.jsx`) y de la variable muerta `REACT_APP_WHATSAPP_NUMBER` (§4).
7. Si el grupo oficial cambia, actualizar también `docs/tarea-lideres-verdes.md` (D1-D3) y `ciudadan_backend_26/seed/site-settings.js:28` para que no se contradigan.
