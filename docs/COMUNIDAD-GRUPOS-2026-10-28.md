# Comunidad — Grupos con datos reales (2026-10-28)

Rama: `feature/comunidad-grupos-1028` · Base: `origin/main`

## Qué reemplaza a qué

La pestaña **Grupos** de Ciudadan Social (`SocialSectionPage.jsx`) se alimentaba
de `MOCK_CONTENT_BY_SECTION.grupos`: tres grupos ficticios ("Nodo Producción
Local", "Laboratorio de Movilidad", "Mesa de Asamblea Distrito Sur").

Ahora los grupos se leen del backend real.

## Archivos nuevos (no se editó ningún archivo existente)

| Archivo | Qué hace |
|---|---|
| `ciudadan_frontend/src/services/comunidad/comunidadGruposService.js` | Lee `agencia` (`GET /api/agencias?populate=members,socios`) y normaliza cada agencia a un grupo: nombre, tipo, localidad, número de integrantes, wall, estadísticas de auditoría y trust score. Además `obtenerUrlWhatsapp()` (URL desde la configuración pública) y `aItemsDeBusqueda()`. |
| `ciudadan_frontend/src/components/Comunidad/Grupos/GruposView.jsx` | Tarjetas de grupo (avatar de iniciales, tipo, localidad, chips de auditoría) + CTA de WhatsApp **configurable**. |

## Dónde están los datos (backend real)

- **Grupos** → content-type `agencia` → `GET /api/agencias?populate=members,socios`
- **CTA de WhatsApp** → configuración pública → `GET /api/driver-verifier/public-config`
  → `whatsappGroupUrl` (misma fuente que usa `driverVerifierService`).

No existe un content-type `grupo`: los grupos de la comunidad **son** las
agencias. No se inventó un endpoint ni un content-type nuevo.

### El CTA de WhatsApp no lleva URL fija

`obtenerUrlWhatsapp()` devuelve la URL solo si el backend entrega una `https://`
válida; en otro caso devuelve `null` y **el botón no se renderiza**. Es la misma
política que ya sigue `driverVerifierService`: nunca inventar una URL de
WhatsApp ni dejar un literal en el código. Para activarlo, el operador fija
`verifier_candidates_whatsapp_group_url` en Strapi (Site Setting) o en
`seed/site-settings.js`.

## Enganche exacto (snippet listo para integrar)

No se editó `SocialSectionPage.jsx` para no chocar con los otros agentes del
sprint. El enganche son 3 puntos:

**1) Importar la vista**:

```jsx
import GruposView from '../../components/Comunidad/Grupos/GruposView';
```

**2) Cargar los grupos reales** (junto a los `useState` de `feedPosts`):

```jsx
const [grupos, setGrupos] = useState([]);

useEffect(() => {
  let vigente = true;
  listarGrupos()
    .then((datos) => { if (vigente) setGrupos(datos); })
    .catch(() => {});
  return () => { vigente = false; };
}, []);
```

**3) Renderizar la sección** (donde hoy se pintan los mocks):

```jsx
if (sectionKey === 'grupos') {
  return <GruposView query={query} />;
}
```

Y, si el buscador de la cabecera debe usar los datos reales:

```jsx
const baseItems = useMemo(() => {
  if (sectionKey === 'grupos') return aItemsDeBusqueda(grupos);
  return MOCK_CONTENT_BY_SECTION[sectionKey] || MOCK_CONTENT_BY_SECTION.asamblea;
}, [sectionKey, grupos]);
```

## Comportamiento ante backend sin permisos

La lectura de `agencia` depende de los permisos públicos de Strapi. Si el
backend responde 403, la vista muestra un `Alert` informativo en vez de datos
inventados.

## Verificación

- `node ciudadan_backend_26/scripts/ci/check-payload-ofuscado.js` → OK.
- Build del frontend: pendiente en el runner (el repo tiene errores de ESLint
  preexistentes en archivos ajenos; el build local usa
  `CI=false DISABLE_ESLINT_PLUGIN=true`).
