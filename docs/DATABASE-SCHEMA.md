# Esquema de base de datos (Strapi)

Documento generado a partir de los `schema.json` en `src/api/**/content-types/**` y la extensión `plugin::users-permissions.user` en `src/extensions/users-permissions/content-types/user/schema.json`.

Útil para pegar en Notion: las tablas Markdown se importan bien; los bloques de código pueden pegarse como “código”.

## Leyenda

- **Tabla** = valor `collectionName` en Strapi (nombre habitual en SQL).
- **`up_users`**: usuarios de la API (Users & Permissions).
- **`admin_users`**: usuarios del panel de administración de Strapi.
- **`mappedBy` / `inversedBy`**: lado dueño/inverso de la relación en Strapi.
- No incluye campos **`media`** ni tablas internas de uploads (`files`, enlaces polimórficos).
- Tablas del plugin (`up_roles`, `up_permissions`) solo aparecen cuando son destino explícito (p. ej. desde `up_users.role`).

## Índice de tablas (59 en `src/api` + `up_users` por extensión = 60)

- `ad_views`
- `ads`
- `agencias`
- `agendas`
- `areas`
- `bitacoras`
- `carritos`
- `carros`
- `carteras`
- `categorias_contenidos`
- `categorias_cursos`
- `categorias_enlaces`
- `categorias_eventos`
- `categorias_herramientas`
- `categorias_wikimapa`
- `clubs`
- `codigosreferidos`
- `cofepristramites`
- `comentarios_publicaciones`
- `configuraciones_sistemas`
- `configuraciones_usuarios`
- `contenidos`
- `credenciales`
- `cursos`
- `direcciones`
- `driver_locations`
- `drivers`
- `enlaces`
- `eventos`
- `favoritos`
- `gen_wallets`
- `kitjardineros`
- `listas_suscripciones`
- `membresias`
- `membresias_tipos`
- `messages`
- `notificaciones`
- `pagos`
- `pedidos`
- `plantas`
- `postulaciones`
- `preguntas_productos`
- `productos`
- `publicaciones`
- `ratings`
- `reacciones`
- `registrosbitacoras`
- `resenas`
- `respuestas`
- `servicios`
- `solicitudafiliaciones`
- `solicitudplantas`
- `store_categories`
- `stores`
- `tareas`
- `todos`
- `triprequests`
- `up_users`
- `viajes`
- `world_coin_wallets`

## Tablas sin FK salientes en schema (11)

- `categorias_contenidos`
- `categorias_cursos`
- `categorias_enlaces`
- `categorias_eventos`
- `categorias_herramientas`
- `categorias_wikimapa`
- `configuraciones_sistemas`
- `gen_wallets`
- `kitjardineros`
- `membresias_tipos`
- `store_categories`

## Diagrama ASCII (visión por ejes)

```
                    up_roles                          admin_users
                       ^                                   ^
                       | role (manyToOne)                  | members, tareas, carteras, wallets…
                       |                                   |
    +------------------+-------------------+---------------+------------------+
    |                  up_users             |                                  |
    |  (Auth API + extensión)               |                                  |
    +----+----+----+----+----+----+----+----+----+                             |
         |    |    |    |    |    |    |                                        |
         |    |    |    |    |    |    +--> drivers, driver_locations, viajes… |
         |    |    |    |    |    +--> clubs, stores, pedidos, bitácora…       |
         |    |    |    |    +--> carritos, pagos…                               |
         |    |    |    +--> cursos, eventos, publicaciones…                     |
         |    |    +--> agencias <--> todos / tareas                             |
         |    +--> (muchas tablas usuario/autor/…)                               |
```

## Relaciones por tabla

### `ad_views`

| Campo | Tabla destino | Tipo |
|-------|---------------|------|
| `ad` | `ads` | oneToOne |
| `contenido` | `contenidos` | oneToOne |
| `usuario` | `up_users` | oneToOne |

### `ads`

| Campo | Tabla destino | Tipo |
|-------|---------------|------|
| `usuario` | `up_users` | oneToOne |

### `agencias`

| Campo | Tabla destino | Tipo |
|-------|---------------|------|
| `members` | `admin_users` | oneToMany |

### `agendas`

| Campo | Tabla destino | Tipo |
|-------|---------------|------|
| `usuario` | `up_users` | oneToOne |

### `areas`

| Campo | Tabla destino | Tipo |
|-------|---------------|------|
| `creador` | `admin_users` | oneToOne |
| `todos` | `todos` | manyToMany, `inversedBy:subareas` |

### `bitacoras`

| Campo | Tabla destino | Tipo |
|-------|---------------|------|
| `club` | `clubs` | oneToOne |
| `colaboradores` | `up_users` | oneToMany, `mappedBy:bitacora` |
| `plantas` | `plantas` | oneToMany, `mappedBy:bitacora` |
| `usuario` | `up_users` | oneToOne |

### `carritos`

| Campo | Tabla destino | Tipo |
|-------|---------------|------|
| `direccion` | `direcciones` | oneToOne |
| `usuario` | `up_users` | oneToOne |

### `carros`

| Campo | Tabla destino | Tipo |
|-------|---------------|------|
| `conductor` | `up_users` | oneToOne |

### `carteras`

| Campo | Tabla destino | Tipo |
|-------|---------------|------|
| `user_id` | `admin_users` | oneToOne |

### `categorias_contenidos`

_Sin relaciones salientes declaradas en schema._

### `categorias_cursos`

_Sin relaciones salientes declaradas en schema._

### `categorias_enlaces`

_Sin relaciones salientes declaradas en schema._

### `categorias_eventos`

_Sin relaciones salientes declaradas en schema._

### `categorias_herramientas`

_Sin relaciones salientes declaradas en schema._

### `categorias_wikimapa`

_Sin relaciones salientes declaradas en schema._

### `clubs`

| Campo | Tabla destino | Tipo |
|-------|---------------|------|
| `users_permissions_user` | `up_users` | oneToOne |

### `codigosreferidos`

| Campo | Tabla destino | Tipo |
|-------|---------------|------|
| `usuario` | `up_users` | oneToOne |

### `cofepristramites`

| Campo | Tabla destino | Tipo |
|-------|---------------|------|
| `club` | `clubs` | oneToOne |
| `usuario` | `up_users` | oneToOne |

### `comentarios_publicaciones`

| Campo | Tabla destino | Tipo |
|-------|---------------|------|
| `autor` | `up_users` | oneToOne |
| `comentario_id` | `comentarios_publicaciones` | oneToOne |
| `publicacion_id` | `publicaciones` | oneToOne |

### `configuraciones_sistemas`

_Sin relaciones salientes declaradas en schema._

### `configuraciones_usuarios`

| Campo | Tabla destino | Tipo |
|-------|---------------|------|
| `usuario` | `up_users` | oneToOne |

### `contenidos`

| Campo | Tabla destino | Tipo |
|-------|---------------|------|
| `autor` | `up_users` | oneToOne |
| `categoria` | `categorias_contenidos` | oneToOne |

### `credenciales`

| Campo | Tabla destino | Tipo |
|-------|---------------|------|
| `usuario` | `up_users` | oneToOne |

### `cursos`

| Campo | Tabla destino | Tipo |
|-------|---------------|------|
| `categoria` | `categorias_cursos` | oneToOne |
| `maestro` | `up_users` | oneToOne |
| `ubicacion` | `direcciones` | oneToOne |
| `user` | `up_users` | manyToOne, `inversedBy:cursos` |

### `direcciones`

| Campo | Tabla destino | Tipo |
|-------|---------------|------|
| `club` | `clubs` | oneToOne |
| `event_id` | `eventos` | oneToOne |
| `store_id` | `stores` | oneToOne |

### `driver_locations`

| Campo | Tabla destino | Tipo |
|-------|---------------|------|
| `driver_id` | `up_users` | oneToOne |

### `drivers`

| Campo | Tabla destino | Tipo |
|-------|---------------|------|
| `agency` | `agencias` | oneToOne |
| `reviewer` | `up_users` | oneToOne |
| `user` | `up_users` | oneToOne |

### `enlaces`

| Campo | Tabla destino | Tipo |
|-------|---------------|------|
| `autor` | `up_users` | oneToOne |
| `enlace_id` | `enlaces` | oneToOne |

### `eventos`

| Campo | Tabla destino | Tipo |
|-------|---------------|------|
| `creador` | `up_users` | oneToOne |
| `direccion` | `direcciones` | oneToOne |
| `evento_id` | `eventos` | oneToOne |

### `favoritos`

| Campo | Tabla destino | Tipo |
|-------|---------------|------|
| `club` | `clubs` | oneToOne |
| `contenido` | `contenidos` | oneToOne |
| `curso` | `cursos` | oneToOne |
| `producto` | `productos` | oneToOne |
| `usuario` | `up_users` | oneToOne |

### `gen_wallets`

_Sin relaciones salientes declaradas en schema._

### `kitjardineros`

_Sin relaciones salientes declaradas en schema._

### `listas_suscripciones`

| Campo | Tabla destino | Tipo |
|-------|---------------|------|
| `curso` | `cursos` | oneToOne |
| `evento` | `eventos` | oneToOne |
| `suscritos` | `up_users` | oneToMany |

### `membresias`

| Campo | Tabla destino | Tipo |
|-------|---------------|------|
| `usuario` | `up_users` | oneToOne |

### `membresias_tipos`

_Sin relaciones salientes declaradas en schema._

### `messages`

| Campo | Tabla destino | Tipo |
|-------|---------------|------|
| `receiver_id` | `up_users` | oneToOne |
| `sender_id` | `up_users` | oneToOne |

### `notificaciones`

| Campo | Tabla destino | Tipo |
|-------|---------------|------|
| `usuario` | `up_users` | oneToOne |

### `pagos`

| Campo | Tabla destino | Tipo |
|-------|---------------|------|
| `carrito_id` | `carritos` | oneToOne |
| `curso_id` | `cursos` | oneToOne |
| `evento_id` | `eventos` | oneToOne |
| `pedido` | `pedidos` | oneToOne |
| `store` | `stores` | oneToOne |
| `usuario` | `up_users` | oneToOne |

### `pedidos`

| Campo | Tabla destino | Tipo |
|-------|---------------|------|
| `carrito_id` | `carritos` | oneToOne |
| `curso_id` | `cursos` | oneToOne |
| `direccion_destino` | `direcciones` | oneToOne |
| `direccion_origen` | `direcciones` | oneToOne |
| `evento_id` | `eventos` | oneToOne |
| `pago_id` | `pagos` | oneToOne |
| `store` | `stores` | oneToOne |
| `usuario` | `up_users` | oneToOne |

### `plantas`

| Campo | Tabla destino | Tipo |
|-------|---------------|------|
| `bitacora` | `bitacoras` | manyToOne, `inversedBy:plantas` |
| `club` | `clubs` | oneToOne |
| `cosecha` | `registrosbitacoras` | oneToOne |
| `registrobitacora` | `registrosbitacoras` | manyToOne, `inversedBy:plantas` |
| `solicitudplanta` | `solicitudplantas` | manyToOne, `inversedBy:plantas` |
| `usuario` | `up_users` | oneToOne |

### `postulaciones`

| Campo | Tabla destino | Tipo |
|-------|---------------|------|
| `cita` | `agendas` | oneToOne |
| `postulante` | `up_users` | oneToOne |

### `preguntas_productos`

| Campo | Tabla destino | Tipo |
|-------|---------------|------|
| `curso` | `cursos` | oneToOne |
| `producto` | `productos` | manyToOne, `inversedBy:preguntas_productos` |
| `store` | `stores` | manyToOne, `inversedBy:preguntas_productos` |
| `usuario` | `up_users` | oneToOne |

### `productos`

| Campo | Tabla destino | Tipo |
|-------|---------------|------|
| `preguntas_productos` | `preguntas_productos` | oneToMany, `mappedBy:producto` |
| `store_category` | `store_categories` | oneToOne |
| `store` | `stores` | oneToOne |

### `publicaciones`

| Campo | Tabla destino | Tipo |
|-------|---------------|------|
| `autor` | `up_users` | oneToOne |

### `ratings`

| Campo | Tabla destino | Tipo |
|-------|---------------|------|
| `club` | `clubs` | oneToOne |
| `curso` | `cursos` | oneToOne |
| `producto` | `productos` | oneToOne |
| `usuario` | `up_users` | oneToOne |

### `reacciones`

| Campo | Tabla destino | Tipo |
|-------|---------------|------|
| `comentario_id` | `comentarios_publicaciones` | oneToOne |
| `enlace_id` | `enlaces` | oneToOne |
| `evento_id` | `eventos` | oneToOne |

### `registrosbitacoras`

| Campo | Tabla destino | Tipo |
|-------|---------------|------|
| `club` | `clubs` | oneToOne |
| `plantas` | `plantas` | oneToMany, `mappedBy:registrobitacora` |
| `usuario` | `up_users` | oneToOne |

### `resenas`

| Campo | Tabla destino | Tipo |
|-------|---------------|------|
| `carrito` | `carritos` | oneToOne |
| `club_id` | `clubs` | oneToOne |
| `curso_id` | `cursos` | oneToOne |
| `evento_id` | `eventos` | oneToOne |
| `producto` | `productos` | oneToOne |
| `usuario` | `up_users` | oneToOne |

### `respuestas`

| Campo | Tabla destino | Tipo |
|-------|---------------|------|
| `pregunta` | `preguntas_productos` | oneToOne |

### `servicios`

| Campo | Tabla destino | Tipo |
|-------|---------------|------|
| `prestador` | `up_users` | oneToOne |

### `solicitudafiliaciones`

| Campo | Tabla destino | Tipo |
|-------|---------------|------|
| `club` | `clubs` | oneToOne |
| `pago_inicial` | `pagos` | oneToOne |
| `usuario` | `up_users` | oneToOne |

### `solicitudplantas`

| Campo | Tabla destino | Tipo |
|-------|---------------|------|
| `club` | `clubs` | oneToOne |
| `plantas` | `plantas` | oneToMany, `mappedBy:solicitudplanta` |
| `usuario` | `up_users` | oneToOne |

### `store_categories`

_Sin relaciones salientes declaradas en schema._

### `stores`

| Campo | Tabla destino | Tipo |
|-------|---------------|------|
| `direccion` | `direcciones` | oneToOne |
| `preguntas_productos` | `preguntas_productos` | oneToMany, `mappedBy:store` |
| `users_permissions_user` | `up_users` | oneToOne |

### `tareas`

| Campo | Tabla destino | Tipo |
|-------|---------------|------|
| `agencia` | `agencias` | oneToOne |
| `todo` | `todos` | oneToOne |
| `usuario` | `admin_users` | oneToOne |

### `todos`

| Campo | Tabla destino | Tipo |
|-------|---------------|------|
| `agencia` | `agencias` | oneToOne |
| `areas` | `areas` | manyToMany |
| `creador` | `up_users` | oneToOne |
| `subareas` | `areas` | manyToMany |

### `triprequests`

| Campo | Tabla destino | Tipo |
|-------|---------------|------|
| `pasajero` | `up_users` | oneToOne |

### `up_users`

| Campo | Tabla destino | Tipo |
|-------|---------------|------|
| `bitacora` | `bitacoras` | manyToOne, `inversedBy:colaboradores` |
| `club` | `clubs` | oneToOne |
| `cursos` | `cursos` | oneToMany, `mappedBy:user` |
| `direcciones` | `direcciones` | oneToMany |
| `role` | `up_roles` | manyToOne, `inversedBy:users` |

### `viajes`

| Campo | Tabla destino | Tipo |
|-------|---------------|------|
| `conductor` | `up_users` | oneToOne |
| `pasajero` | `up_users` | oneToOne |

### `world_coin_wallets`

| Campo | Tabla destino | Tipo |
|-------|---------------|------|
| `user_idd` | `admin_users` | oneToOne |
