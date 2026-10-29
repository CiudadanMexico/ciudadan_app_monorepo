# Comunidad — Chats y Contactos con datos reales (2026-10-28)

Rama: `feature/comunidad-chats-contactos-1028` · Base: `origin/main` = `7d99d42`

## Qué reemplaza a qué

En `ciudadan_frontend/src/Pages/Comunidad/SocialSectionPage.jsx` las pestañas
**Chats** y **Contactos** se alimentaban de datos falsos:

| Pestaña | Antes | Ahora |
|---|---|---|
| Chats | `MOCK_CONTENT_BY_SECTION.chats` + `CHAT_THREADS` (constantes en el archivo) | `GET /api/messages` → hilos derivados de mensajes reales |
| Contactos | `MOCK_CONTENT_BY_SECTION.contactos` (3 personas ficticias) | `GET /api/agencias?populate=members,socios` → personas reales |

## Archivos nuevos (no se editó ningún archivo existente)

| Archivo | Qué hace |
|---|---|
| `ciudadan_frontend/src/services/comunidad/comunidadChatsService.js` | Lee `message` (`text`, `sender_id`, `receiver_id`, `timestamp`, `status`) y arma una conversación por par (emisor, receptor). Expone `listarConversaciones()` y `aItemsDeBusqueda()`. |
| `ciudadan_frontend/src/services/comunidad/comunidadContactosService.js` | Lee `agencia` con `members`/`socios` poblados y devuelve las personas deduplicadas con su agencia. Expone `listarContactos()` y `aItemsDeBusqueda()`. |
| `ciudadan_frontend/src/components/Comunidad/Chats/ChatsView.jsx` | Lista de conversaciones + panel del hilo abierto (mensajes, hora, no leídos). |
| `ciudadan_frontend/src/components/Comunidad/Contactos/ContactosView.jsx` | Tarjetas de contactos (avatar de iniciales, agencia, chips). |

Los servicios son el **único** punto que conoce la respuesta de Strapi; los
componentes reciben objetos ya normalizados.

## Dónde están los datos (backend real)

- **Chats** → content-type `message` → `GET /api/messages?populate=sender_id,receiver_id&sort[0]=timestamp:desc`
- **Contactos** → content-type `agencia` (relaciones `members` y `socios`) → `GET /api/agencias?populate=members,socios`

No existe un content-type `contacto`: los contactos de la comunidad **son** las
personas de las agencias. No se inventó un endpoint nuevo ni se tocó el backend.

## Enganche exacto (snippet listo para integrar)

En `SocialSectionPage.jsx` **no** se editó nada para evitar conflictos con los
otros agentes del sprint. El enganche es de 3 puntos:

**1) Importar las vistas** (arriba del todo, junto a los demás imports):

```jsx
import ChatsView from '../../components/Comunidad/Chats/ChatsView';
import ContactosView from '../../components/Comunidad/Contactos/ContactosView';
```

**2) Cargar los datos reales** (dentro del componente, junto a los `useState`
de `feedPosts`/`driveConnection`):

```jsx
const [conversaciones, setConversaciones] = useState([]);
const [contactos, setContactos] = useState([]);

useEffect(() => {
  let vigente = true;
  Promise.all([listarConversaciones(), listarContactos()])
    .then(([chats, contactosReales]) => {
      if (!vigente) return;
      setConversaciones(chats);
      setContactos(contactosReales);
    })
    .catch(() => {});
  return () => { vigente = false; };
}, []);
```

**3) Renderizar por sección** (donde hoy se pintan los mocks, alrededor de la
línea 1139 donde ya existe la rama `if (sectionKey === 'chats')`):

```jsx
if (sectionKey === 'chats') {
  return (
    <ChatsView
      threadId={selectedThreadId}
      onOpenThread={openThread}
      query={query}
    />
  );
}

if (sectionKey === 'contactos') {
  return <ContactosView query={query} />;
}
```

Para que el buscador de la cabecera use también los datos reales, basta con
reemplazar la constante:

```jsx
const baseItems = useMemo(() => {
  if (sectionKey === 'chats') return aItemsDeBusqueda(conversaciones);
  if (sectionKey === 'contactos') return aItemsDeBusqueda(contactos);
  return MOCK_CONTENT_BY_SECTION[sectionKey] || MOCK_CONTENT_BY_SECTION.asamblea;
}, [sectionKey, conversaciones, contactos]);
```

`openThread` y `selectedThreadId` ya existen en el archivo (`navigate('/comunidad/chats/${threadId}')` y `params.conversationId`), por lo que las rutas
`/comunidad/chats/:conversationId` siguen funcionando sin cambios.

## Comportamiento ante backend sin permisos

La lectura de `message` y de `agencia` depende de los permisos públicos de
Strapi. Si el backend responde 403, las vistas **no rompen**: muestran un
`Alert` informativo explicando que faltan permisos. No se inventan datos ni se
muestran mocks como si fueran reales.

## Verificación

- `node ciudadan_backend_26/scripts/ci/check-payload-ofuscado.js` → OK (2088 archivos).
- Build del frontend: pendiente de ejecutar en el runner (el repo ya tiene
  errores de ESLint preexistentes en archivos ajenos; por eso el build local
  usa `CI=false DISABLE_ESLINT_PLUGIN=true`).
