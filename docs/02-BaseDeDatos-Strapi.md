# 02 — Base de Datos Strapi (TODAS las colecciones)

> Inventario **completo** de las colecciones/tablas y componentes de Strapi del backend.
> Generado a partir de `ciudadan_backend_26/src/api/*/content-types/*/schema.json` y
> `src/components/**/schema.json`.
>
> **Totales:** **80 colecciones** (78 collection type + 2 single type) y **4 componentes**.
>
> Los tipos de campo se resumen así:
> `string`, `text`, `richtext`, `blocks`, `email`, `password`, `integer`, `biginteger`,
> `decimal`, `float`, `date`, `datetime`, `time`, `boolean`, `enumeration`, `json`, `uid`,
> `media`, `component`, `dynamiczone`, `relation`.
> - `media(false/true)`: media simple/múltiple (con `allowedTypes`).
> - `relation(...)`: relación con `target` y `mappedBy/inversedBy` cuando existe.
> - `REQUIRED`, `UNIQUE`, `PRIVATE`: banderas del campo.

## Contenido

1. [Colecciones CoWork / economía colaborativa](#cowork)
2. [Colecciones de Mobile / Taxis y conductores](#taxis)
3. [Colecciones de Marketplace / tiendas](#market)
4. [Colecciones de Food / restaurantes](#food)
5. [Colecciones de contenido / blog / eventos](#contenido)
6. [Colecciones de club / plantas / bitácora](#club)
7. [Colecciones de pagos / wallets / membresías](#pagos)
8. [Colecciones de anuncios / beneficio / misc](#anuncios)
9. [Single Types](#single-types)
10. [Componentes](#componentes)

---

<a name="cowork"></a>
## 1. Colecciones CoWork / economía colaborativa

### `api::area.area` — Área (categoría superior) — COLLECTION
- `name`: string **REQUIRED**
- `level`: integer **REQUIRED** default=0
- `creador`: relation(oneToOne) → admin::user
- `timestamp`: datetime
- `todos`: relation(manyToMany) → api::todo.todo via subareas
- `is_active`: boolean default=true
- `ads`: relation(oneToMany) → api::ad.ad mappedBy area
- `parent_area`: relation(manyToOne) → api::area.area via subareas
- `subareas`: relation(oneToMany) → api::area.area mappedBy parent_area
- `usuarios`: relation(manyToMany) → plugin::users-permissions.user mappedBy areas

> Regla de negocio: máximo **5 áreas raíz fijas** (Administrativo, Técnico, Comercial-difusión,
> Software, Creación multimedia), forzado en `area/lifecycles.js`.

### `api::todo.todo` — Todo (tarea maestro) — COLLECTION
- `idx`: uid
- `creador`: relation(oneToOne) → plugin::users-permissions.user
- `areas`: relation(manyToMany) → api::area.area
- `subareas`: relation(manyToMany) → api::area.area mappedBy todos
- `skills`: relation(manyToMany) → api::skill.skill via todos
- `tipo`: enum[tarea|subtarea]
- `ambito`: enum[privada|plataforma]
- `nivel`: enum[general|becario|especialidad|experto|personalizada]
- `grupo`: string
- `recurrencia`: enum[unica|abierta|periodica]
- `descripcion`: text
- `enlaces`: json
- `subtareas`: string
- `status`: enum[borrador|publicada|asignada|en_proceso|pendiente_revision|corregir|corregida|calificada|pagada|cancelada]
- `recompensa`: decimal
- `minutos_desarrollo`: integer
- `fecha_publicacion`: datetime
- `fecha_entrega`: datetime
- `vence`: boolean
- `has_deadline`: boolean
- `due_date`: datetime
- `is_periodic`: boolean
- `reward_laborys`: decimal
- `reward_cash`: decimal
- `created_by`: relation(oneToOne) → plugin::users-permissions.user
- `algoritmo`: text
- `oraculos_validadores`: json
- `anotaciones`: text
- `titulo`: string
- `usuario_email`: string
- `agencia`: relation(oneToOne) → api::agencia.agencia
- `agencianombre`: string
- `tareas`: relation(oneToMany) → api::tarea.tarea mappedBy todo
- `asignador`: relation(oneToOne) → plugin::users-permissions.user
- `asignado_a`: relation(oneToOne) → plugin::users-permissions.user
- `asignable`: boolean default=false

### `api::tarea.tarea` — Tarea (resolución de un todo) — COLLECTION
- `idx`: uid
- `agencia`: relation(oneToOne) → api::agencia.agencia
- `tipo`: enum[tarea|subtarea] default=tarea
- `status`: enum[en_proceso|completada|corregir|corregida|calificada|pagada|cancelada|modificada] default=en_proceso
- `media`: json
- `notes`: text
- `score`: integer default=0
- `reviewed_by`: relation(oneToOne) → plugin::users-permissions.user
- `resolved_at`: datetime
- `payment_status`: enum[pendiente|procesado] default=pendiente
- `todo`: relation(manyToOne) → api::todo.todo via tareas
- `avances`: json
- `usuario`: relation(manyToOne) → plugin::users-permissions.user
- `enlaces`: json
- `calificaciones`: json
- `apelaciones`: json
- `pagos_laborys`: json
- `pagos_efectivo`: json
- `validaciones`: json
- `titulo`: string
- `descripcion`: text

> Máquina de estados (`tarea/lifecycles.js`): en_proceso→completada|cancelada ;
> completada→corregir|calificada|cancelada ; corregir→corregida|cancelada ;
> corregida→calificada|corregir|cancelada ; calificada→pagada ; pagada/cancelada terminal.

### `api::skill.skill` — Skill (habilidad) — COLLECTION
- `name`: string **REQUIRED**
- `description`: text
- `is_active`: boolean default=true
- `todos`: relation(manyToMany) → api::todo.todo mappedBy skills
- `usuarios`: relation(manyToMany) → plugin::users-permissions.user mappedBy skills

### `api::cartera.cartera` — Cartera (wallet laborys) — COLLECTION
- `laborysGanados`: decimal
- `laborysSaldo`: decimal
- `ciudadanTokens`: decimal
- `ciudadanRendimientos`: decimal
- `user_id`: relation(oneToOne) → plugin::users-permissions.user

### `api::agencia.agencia` — Agencia — COLLECTION
- `idx`: uid
- `localidad`: json
- `nombre`: string
- `miembros`: string
- `miembros_json`: json
- `members`: relation(oneToMany) → admin::user
- `walll`: string
- `wallet_address`: string
- `tipo`: enum[local|federal] default=local
- `socios`: relation(oneToMany) → plugin::users-permissions.user mappedBy agencia

### `api::my-agency.my-agency` — Agencia del usuario — **SINGLE TYPE** (ver single types)

### `api::configuracion-sistema.configuracion-sistema` — Configuración del sistema — COLLECTION
- `basic_set`: json
- `datos_generales`: json
- `parametro`: string

> Ej.: parámetro `tarifataxi` con `basic_set` de tarifas (consumido por socket-service).

### `api::configuracion-usuario.configuracion-usuario` — Configuración por usuario — COLLECTION
- `usuario`: relation(oneToOne) → plugin::users-permissions.user
- `email`: email
- `configuraciones`: json
- `pago_labory`: boolean

### `api::bitacora.bitacora` — Bitácora — COLLECTION
- `titulo`: string
- `slug`: string
- `usuario`: relation(oneToOne) → plugin::users-permissions.user
- `colaboradores`: relation(oneToMany) → plugin::users-permissions.user mappedBy bitacora
- `portada`: media(false)
- `imagenes`: media(true)
- `videos`: media(true)
- `archivos`: media(true)
- `fecha_inicio`: datetime
- `status`: string
- `rol`: string
- `club`: relation(oneToOne) → api::club.club
- `descripcion`: text
- `url`: string
- `plantas`: relation(oneToMany) → api::planta.planta mappedBy bitacora
- `observaciones`: text
- `metadata`: json
- `codigo`: string

### `api::registrobitacora.registrobitacora` — Registro de bitácora — COLLECTION
- `usuario_email`: string
- `club`: relation(oneToOne) → api::club.club
- `timestamp`: datetime
- `texto`: text
- `media`: media(true)
- `documentos`: media(true)
- `observaciones`: text
- `status`: string
- `tipo`: string
- `codigoplanta`: string
- `registrojardinero`: boolean
- `usuario`: relation(oneToOne) → plugin::users-permissions.user
- `plantas`: relation(oneToMany) → api::planta.planta mappedBy registrobitacora

### `api::tarea` relacionado: `api::area`/`api::skill` ya cubiertos arriba.

<a name="taxis"></a>
## 2. Colecciones Mobile / Taxis y conductores

### `api::driver.driver` — Conductor — COLLECTION
- `user`: relation(oneToOne) → plugin::users-permissions.user
- `email`: email
- `phone`: string
- `firstname`: string
- `middlename`: string
- `lastname`: string
- `birthdate`: date
- `curp`: string
- `rfc`: string
- `emergency_phone`: string
- `address`: string
- `zip_code`: string
- `state`: string
- `municipality`: string
- `profile_pic`: media(false)
- `verification_selfie`: media(false)
- `id_front`: media(false)
- `id_back`: media(false)
- `driver_license_front`: media(false)
- `driver_license_back`: media(false)
- `proof_of_address`: media(true)
- `license_number`: string
- `license_type`: string
- `license_expiration_date`: date
- `vehicle_brand`: string
- `vehicle_model`: string
- `vehicle_year`: string
- `vehicle_color`: string
- `license_plate`: string
- `vin_number`: string
- `vehicle_type`: string
- `passenger_capacity`: string
- `vehicle_front_photo`: media(true)
- `vehicle_side_photo`: media(true)
- `vehicle_back_photo`: media(true)
- `vehicle_interior_photo`: media(true)
- `vehicle_registration_card`: media(true)
- `vehicle_insurance_document`: media(true)
- `appointment_date`: datetime
- `agency`: relation(oneToOne) → api::agencia.agencia
- `reviewer`: relation(oneToOne) → plugin::users-permissions.user
- `current_step`: string
- `profile_completed`: boolean
- `documents_completed`: boolean
- `appointment_scheduled`: boolean
- `in_person_verification_completed`: boolean
- `final_approval`: boolean
- `status`: enum[draft|pending_documents|pending_appointment|pending_review|documents_rejected|approved|rejected|suspended|blocked]
- `free_trips`: integer default=5

### `api::driver-location.driver-location` — Ubicación del conductor — COLLECTION
- `coords`: json
- `driver_id`: relation(oneToOne) → plugin::users-permissions.user
- `time`: datetime

### `api::carro.carro` — Carro/vehículo del conductor — COLLECTION
- `conductoremail`: email
- `imagen`: media(false)
- `conductor`: relation(oneToOne) → plugin::users-permissions.user
- `fecharegistro`: datetime
- `marca`: string
- `nombre`: string
- `modelo`: integer
- `puertas`: integer
- `caracteristicas`: json
- `observaciones`: text
- `charla`: enum[silencio|ligera|social|indiferente] default=indiferente
- `musica`: enum[sin música|música suave|pasajero elige|indiferente] default=indiferente
- `tipo_musica`: json
- `wifi`: boolean default=false
- `agua`: boolean default=false
- `cargador`: boolean default=false
- `snacks`: boolean default=false
- `portabici`: boolean default=false
- `accesibilidad`: boolean default=false
- `mascotas`: boolean default=false
- `fumadores`: boolean default=false
- `aire_acondicionado`: boolean default=false
- `rockola`: boolean default=false
- `ambiente_inclusivo`: boolean default=false
- `otro_genero`: boolean default=false
- `ultimaverificacion`: datetime
- `verificaciones`: json
- `status`: enum[pendiente|activo|revision|suspendido] default=pendiente
- `agencia`: relation(oneToOne) → api::agencia.agencia

### `api::triprequest.triprequest` — Solicitud de viaje — COLLECTION
- `origencoords`: json
- `destinocoords`: json
- `origendireccion`: json
- `destinodireccion`: json
- `pasajeromail`: email
- `pasajero`: relation(oneToOne) → plugin::users-permissions.user
- `travelid`: string
- `timestamp`: datetime
- `status`: enum[solicitado|cancelado|tomado]

### `api::viaje.viaje` — Viaje — COLLECTION
- `origencoords`: json
- `destinocoords`: json
- `conductorcoords`: json
- `origendireccion`: json
- `destinodireccion`: json
- `pasajeromail`: email
- `conductormail`: email
- `solicitado`: datetime
- `iniciado`: datetime
- `concluido`: datetime
- `travelid`: string
- `observaciones`: text
- `costo`: decimal
- `pagadoefectivo`: decimal
- `pagadolabory`: decimal
- `calificacionconductor`: integer
- `calificacionpasajero`: integer
- `track`: json
- `status`: string
- `pasajero`: relation(oneToOne) → plugin::users-permissions.user
- `conductor`: relation(oneToOne) → plugin::users-permissions.user
- `isTripFree`: boolean
- `pincode`: string

### `api::taxi-debt.taxi-debt` — Adeudo de viaje — COLLECTION
- `viaje`: relation(oneToOne) → api::viaje.viaje
- `adeudo`: float
- `costo_viaje`: float
- `pagado`: boolean default=false
- `conductor`: relation(oneToOne) → plugin::users-permissions.user
- `pasajero`: relation(oneToOne) → plugin::users-permissions.user
- `conductor_email`: email
- `pasajero_email`: email
- `costo_efectivo`: float
- `fecha_viaje`: datetime
- `origen_direccion`: text
- `destino_direccion`: text

### `api::cars-validation.cars-validation` — Validación presencial del conductor — COLLECTION (draftAndPublish:false)
- `driver`: relation(manyToOne) → api::driver.driver
- `agency`: relation(manyToOne) → api::agencia.agencia
- `agenda`: relation(manyToOne) → api::agenda.agenda
- `reviewer`: relation(manyToOne) → plugin::users-permissions.user
- `appointment_date`: datetime
- `opened_at`, `validation_started_at`, `validation_finished_at`, `closed_at`: datetime
- `status`: enum[pending|active|completed|expired|cancelled|under_review|awaiting_resubmission] default=pending
- `result`: enum[approved|approved_with_observations|manual_review|rejected|resubmission_required] default=manual_review
- `nonce`: string
- `session_token`: string
- `risk_score`: integer default=0
- `gps_lat`, `gps_lng`, `gps_accuracy`: decimal
- `device_id`, `app_version`: string
- `checklist`: json
- `observations`: text
- `metadata`: json
- `evidences`: relation(oneToMany) → api::cars-evidence.cars-evidence mappedBy validation
- `events`: relation(oneToMany) → api::cars-validation-event.cars-validation-event mappedBy validation

### `api::cars-evidence.cars-evidence` — Evidencias de validación — COLLECTION (draftAndPublish:false)
- `validation`: relation(manyToOne) → api::cars-validation.cars-validation via evidences
- `type`: enum[selfie_live|id_front|id_back|license_front|license_back|proof_of_address|profile_photo|vehicle_front|vehicle_back|vehicle_left|vehicle_right|registration_card|insurance_document|plates|vin|interior|trunk|video_360]
- `file`: media(false)
- `review_status`: enum[pending|needs_review|approved|rejected|resub_requested|superseded] default=pending
- `reviewer_note`: text
- `reviewed_at`: datetime
- `reviewer`: relation(manyToOne) → plugin::users-permissions.user
- `source_driver_field`: string
- `source_file_id`: integer
- `version`: integer default=1
- `is_current`: boolean default=true
- `supersedes`: relation(manyToOne) → api::cars-evidence.cars-evidence
- `origin`: enum[preregister|reupload|live_capture] default=preregister
- `sha256`: string
- `perceptual_hash`: string
- `nonce`: string
- `timestamp_client`, `timestamp_server`: datetime
- `gps_lat`, `gps_lng`, `gps_accuracy`: decimal
- `device_id`, `app_version`: string
- `uploaded_from_gallery`: boolean default=false
- `is_valid`: boolean default=false
- `validation_flags`: json

### `api::cars-validation-event.cars-validation-event` — Auditoría de validación — COLLECTION (draftAndPublish:false)
- `validation`: relation(manyToOne) → api::cars-validation.cars-validation via events
- `evidence`: relation(manyToOne) → api::cars-evidence.cars-evidence
- `actor`: relation(manyToOne) → plugin::users-permissions.user
- `action`: enum[validation_created|evidence_synced|evidence_approved|evidence_rejected|evidence_resub_requested|evidence_superseded|validation_started|validation_completed|validation_cancelled|driver_status_synced|observations_updated|checklist_updated|agenda_synced|validation_status_changed|resubmission_requested]
- `payload`: json

### `api::agenda.agenda` — Agenda / citas — COLLECTION
- `titulo`: string
- `slug`: string
- `usuario`: relation(oneToOne) → plugin::users-permissions.user
- `colaboradores`: json
- `portada`: media(false)
- `ciudad`: string
- `estado`: enum[pendiente|en_revision|resubir_archivos|completada|cancelada|expirada] default=pendiente
- `fecha_inicio`: datetime
- `status`: string
- `descripcion`: text
- `url`: string
- `metadata`: json
- `observaciones`: text
- `checked`: boolean

### `api::postulacion.postulacion` — Postulación — COLLECTION
- `postulante`: relation(oneToOne) → plugin::users-permissions.user
- `fecha_solicitud`: datetime
- `posicion`: string
- `whtasapp`: string
- `email`: email
- `descripcion`: text
- `archivos`: media(false)
- `revision`: json
- `status`: string
- `revisada`: boolean
- `links`: json
- `metadata`: json
- `citada`: boolean
- `rechazada`: boolean
- `cita`: relation(oneToOne) → api::agenda.agenda
- `observaciones`: text
- `observacionesjson`: json

<a name="market"></a>
## 3. Colecciones Marketplace / tiendas

### `api::store.store` — Tienda — COLLECTION
- `name`: string
- `users_permissions_user`: relation(oneToOne) → plugin::users-permissions.user
- `email`: string
- `stripeAccountId`: string
- `stripeOnboarded`: boolean
- `stripeChargesEnabled`: boolean
- `stripePayoutsEnabled`: boolean
- `terminado`: boolean default=false
- `slug`: string
- `direccion`: relation(oneToOne) → api::direccion.direccion
- `cp`: string
- `localidad`: string
- `esquema_impuestos`: enum[sin_iva|con_iva|optativo]
- `imagen`: media(false)
- `preguntas_productos`: relation(oneToMany) → api::pregunta-producto.pregunta-producto mappedBy store
- `paso`: integer
- `nombre_bancario`: string
- `clabe_bancaria`: string
- `banco`: string

### `api::producto.producto` — Producto — COLLECTION
- `nombre`: string
- `descripcion`: string
- `precio`: decimal
- `marca`: string
- `store_category`: relation(oneToOne) → api::store-categorie.store-categorie
- `imagenes`: media(true)
- `imagen_predeterminada`: media(true)
- `activo`: boolean default=false
- `destacado`: boolean default=false
- `store_id`: string
- `store_email`: string
- `store`: relation(oneToOne) → api::store.store
- `stripe_product_id`: string
- `tags`: text
- `fecha_creacion`: datetime
- `stock`: float
- `calificacion`: integer
- `calificaciones`: integer
- `vendidos`: integer
- `cp`: string
- `slug`: string
- `largo`, `ancho`, `alto`, `peso`, `volumetrico`: decimal
- `especificaciones`: json
- `variaciones`: json
- `localidad`: string
- `estado`: string
- `preguntas_productos`: relation(oneToMany) → api::pregunta-producto.pregunta-producto mappedBy producto
- `favoritos`: relation(oneToMany) → api::favorito.favorito mappedBy producto

### `api::store-categorie.store-categorie` — Categoría de tienda — COLLECTION
- `nombre`: string
- `descripcion`: text
- `imagen`: media(false)
- `slug`: string

### `api::carrito.carrito` — Carrito de compras — COLLECTION
- `usuario`: relation(oneToOne) → plugin::users-permissions.user
- `productos`: component::carritos.producto-en-carrito (repeatable)
- `total`: decimal
- `estado`: enum[activo|pendiente_pago|pagado]
- `ultima_actualizacion`: datetime
- `log`: json
- `direccion`: relation(oneToOne) → api::direccion.direccion
- `total_envios`: decimal
- `agrupacion_de_envios`: json
- `usuario_email`: string

### `api::pedido.pedido` — Pedido — COLLECTION
- `item`: component::carritos.producto-en-carrito (repeatable)
- `tipo`: enum[tienda|curso|evento|asesoria]
- `curso_id`: relation(oneToOne) → api::curso.curso
- `evento_id`: relation(oneToOne) → api::evento.evento
- `timestamp_creacion`: datetime
- `usuario`: relation(oneToOne) → plugin::users-permissions.user
- `guia`: string
- `proveedor`: enum[Estafeta|FedEx|DHL|Redpack|Paquetexpress|Sendex|iVoy|Quiken|Carssa]
- `direccion_origen`: relation(oneToOne) → api::direccion.direccion
- `direccion_destino`: relation(oneToOne) → api::direccion.direccion
- `fecha_envio`, `fecha_entrega`: datetime
- `total_volumetrico`, `monto_envio`, `monto_total`: decimal
- `carrito_id`: relation(oneToOne) → api::carrito.carrito
- `fecha_pagado`: datetime
- `moneda`: string
- `pago_id`: relation(oneToOne) → api::pago.pago
- `status`: enum[pendiente_pago|pendiente_verificacion|pendiente_envio|enviado|en_camino|cancelado|devuelto|recibido] default=pendiente_pago
- `finalizado`: boolean default=false
- `fecha_finalizado`: datetime
- `metadata`: json
- `calificado`: boolean default=false
- `store`: relation(oneToOne) → api::store.store
- `store_email`: string

### `api::direccion.direccion` — Dirección — COLLECTION (draftAndPublish:false)
- `direccion`: json
- `coords`: json
- `cp`: string
- `ciudad`: string
- `estado`: string
- `store_id`: relation(oneToOne) → api::store.store
- `observaciones`: string
- `event_id`: relation(oneToOne) → api::evento.evento
- `activa`: boolean
- `club`: relation(oneToOne) → api::club.club
- `predeterminada`: boolean
- `user_email`: string
- `usuario_email`: string
- `restaurant_id`: relation(oneToOne) → api::food-restaurant.food-restaurant

### `api::pregunta-producto.pregunta-producto` — Pregunta de producto — COLLECTION
- `producto`: relation(manyToOne) → api::producto.producto via preguntas_productos
- `pregunta`: text
- `fechapregunta`: datetime
- `status`: enum[publicada|respondida|eliminada]
- `usuario`: relation(oneToOne) → plugin::users-permissions.user
- `store`: relation(manyToOne) → api::store.store via preguntas_productos
- `curso`: relation(oneToOne) → api::curso.curso
- `respuesta`: text
- `fecha_respuesta`: datetime

### `api::respuesta.respuesta` — Respuesta a pregunta — COLLECTION
- `pregunta`: relation(oneToOne) → api::pregunta-producto.pregunta-producto
- `respuesta`: string
- `timestamp`: datetime
- `publicada`: boolean

### `api::resena.resena` — Reseña — COLLECTION
- `usuario`: relation(oneToOne) → plugin::users-permissions.user
- `producto`: relation(oneToOne) → api::producto.producto
- `comentario`: text
- `timestamp`: datetime
- `carrito`: relation(oneToOne) → api::carrito.carrito
- `curso_id`: relation(oneToOne) → api::curso.curso
- `club_id`: relation(oneToOne) → api::club.club
- `status`: enum[publicada|eliminada|bloqueada]
- `observaciones`: text
- `evento_id`: relation(oneToOne) → api::evento.evento
- `tipo`: enum[producto|club|curso|evento|enlace|recurso]

### `api::rating.rating` — Rating — COLLECTION
- `calificacion`: integer
- `usuario`: relation(oneToOne) → plugin::users-permissions.user
- `club`: relation(oneToOne) → api::club.club
- `producto`: relation(oneToOne) → api::producto.producto
- `curso`: relation(oneToOne) → api::curso.curso
- `timestamp`: datetime
- `tipo`: string
- `resena`: text

### `api::favorito.favorito` — Favorito — COLLECTION
- `usuario`: relation(manyToOne) → plugin::users-permissions.user via favoritos
- `usuario_email`: email
- `tipo`: enum[producto|curso|contenido|club]
- `producto`: relation(manyToOne) → api::producto.producto via favoritos
- `club`: relation(oneToOne) → api::club.club
- `curso`: relation(oneToOne) → api::curso.curso
- `contenido`: relation(oneToOne) → api::contenido.contenido
- `url`: string

### `api::kitjardinero.kitjardinero` — Kit jardinero — COLLECTION
- `nombre`: string
- `texto`: text
- `precio`: decimal
- `imagen`: media(false)
- `orden`: integer
- `activo`: boolean
- `link`: string
- `cantidad`: integer
- `pack`: string
- `cantidadbasico`: integer
- `cantidadfull`: integer

### `api::shipping.*` — Módulo envíos (ver definiciones en `src/api/shipping/`)
> Existe el api `shipping` con rutas `shiping.js` y `shipping.js`. Los envíos se gestionan
> principalmente vía `pedido`, `direccion` y `pago` (guías, proveedores, comprobantes).

<a name="food"></a>
## 4. Colecciones Food / restaurantes

### `api::food-restaurant.food-restaurant` — Restaurante (Food) — COLLECTION
- `nombre`: string **REQUIRED**
- `email`: email **REQUIRED**
- `terminado`: boolean default=false
- `slug`: string **REQUIRED**
- `users_permissions_user`: relation(oneToOne) → plugin::users-permissions.user
- `direccion`: relation(oneToOne) → api::direccion.direccion
- `cp`: string
- `localidad`: string
- `esquema_impuestos`: enum[sin_iva|con_iva|optativo]
- `imagen`: media(false)
- `paso`: integer default=0
- `nombre_bancario`, `clabe_bancaria`, `banco`: string
- `food_modifier_groups`: relation(oneToMany) → api::food-modifier-group.food-modifier-group mappedBy food_restaurant
- `offers`: relation(oneToMany) → api::food-offer.food-offer mappedBy restaurant

### `api::food-categorie.food-categorie` — Categoría de comida — COLLECTION
- `nombre`: string **REQUIRED**
- `descripcion`: text
- `imagen`: media(false)
- `slug`: string

### `api::food-product.food-product` — Producto de comida — COLLECTION
- `nombre`: string **REQUIRED**
- `descripcion`: text
- `imagen_predeterminada`: media(false)
- `imagenes`: media(true)
- `precio_base`: decimal
- `activo`: boolean default=true
- `destacado`: boolean default=false
- `slug`: string
- `food_categories`: relation(oneToMany) → api::food-categorie.food-categorie
- `food_restaurant`: relation(oneToOne) → api::food-restaurant.food-restaurant
- `tiempo_preparacion`, `calorias`: integer
- `peso`: decimal
- `porciones`: decimal
- `es_picante`: boolean
- `nivel_picante`: enum[ninguno|leve|medio|alto|extremo]
- `vegetariano`, `vegano`, `sin_gluten`, `contiene_lacteos`, `contiene_mariscos`, `contiene_cerdo`: boolean
- `ingredientes`, `alergenos`: json
- `temperatura`: enum[caliente|frio|ambiente]
- `disponible`: boolean default=true
- `usa_stock`: boolean default=false
- `stock`: integer
- `calificacion`: decimal
- `calificaciones`, `vendidos`: integer
- `variantes`, `combos`, `horario_disponibilidad`: json
- `orden_minima`: decimal
- `permite_programar`: boolean
- `fecha_creacion`: datetime
- `food_product_variants`: relation(oneToMany) → api::food-product-variant.food-product-variant mappedBy food_product
- `food_modifiers`: relation(oneToMany) → api::food-modifier.food-modifier

### `api::food-product-variant.food-product-variant` — Variante de producto — COLLECTION
- `nombre`: string **REQUIRED**
- `descripcion`: text
- `precio`: decimal **REQUIRED**
- `peso`: decimal
- `calorias`, `stock`: integer
- `usa_stock`: boolean default=false
- `activo`: boolean default=true
- `orden`: integer default=0
- `food_product`: relation(manyToOne) → api::food-product.food-product via food_product_variants
- `porciones`: decimal
- `ingredientes`, `alergenos`: json
- `imagen_predeterminada`: media(false)
- `imagenes`: media(true)

### `api::food-modifier-group.food-modifier-group` — Grupo de modificadores — COLLECTION
- `nombre`: string **REQUIRED**
- `descripcion`: text
- `requerido`: boolean default=false
- `orden`: integer default=0
- `activo`: boolean default=true
- `food_restaurant`: relation(manyToOne) → api::food-restaurant.food-restaurant via food_modifier_groups
- `food_modifiers`: relation(oneToMany) → api::food-modifier.food-modifier mappedBy food_modifier_group

### `api::food-modifier.food-modifier` — Modificador (extra) — COLLECTION
- `nombre`: string **REQUIRED**
- `descripcion`: text
- `precio`: decimal default=0
- `activo`: boolean default=true
- `disponible`: boolean default=true
- `orden`: integer default=0
- `imagen`: media(false)
- `food_modifier_group`: relation(manyToOne) → api::food-modifier-group.food-modifier-group via food_modifiers

### `api::food-offer.food-offer` — Oferta de comida — COLLECTION
- `titulo`: string **REQUIRED**
- `descripcion`: text
- `precio`: decimal **REQUIRED**
- `cantidad`: integer
- `activa`: boolean
- `fecha_inicio`, `fecha_fin`: datetime
- `restaurant`: relation(manyToOne) → api::food-restaurant.food-restaurant via offers
- `items`: component::offers.offer-item (repeatable)

### `api::food-cart.food-cart` — Carrito de comida — COLLECTION
- `usuario`: relation(oneToOne) → plugin::users-permissions.user
- `items`: component::food-cart.food-cart-item (repeatable)
- `subtotal`, `monto_envio`, `monto_total`: decimal
- `moneda`: string default="MXN"
- `estado`: enum[activo|procesando|convertido|abandonado] default=activo
- `ultima_actualizacion`: datetime
- `metadata`: json

### `api::food-order.food-order` — Pedido de comida — COLLECTION
- `items`: component::orders.products-order (repeatable)
- `fecha_creacion`, `fecha_envio`, `fecha_entrega`, `fecha_pagado`, `fecha_finalizado`,
  `fecha_verificado`: datetime
- `user`: relation(oneToOne) → plugin::users-permissions.user
- `guia`: string
- `direccion_origen`: relation(oneToOne) → api::direccion.direccion
- `direccion_destino`: relation(oneToOne) → api::direccion.direccion
- `total_volumetrico`, `monto_envio`, `monto_total`: decimal
- `moneda`: string
- `pago`: relation(oneToOne) → api::pago.pago
- `status`: enum[pendiente_pago|pendiente_verificacion|pendiente_envio|enviado|en_camino|cancelado|devuelto|recibido]
- `finalizado`: boolean
- `calificado`: boolean
- `metadata`: json
- `restaurant`: relation(oneToOne) → api::food-restaurant.food-restaurant

### `api::food-delivery.food-delivery` — Delivery de comida — COLLECTION
- `food_order`: relation(oneToOne) → api::food-order.food-order
- `restaurant`: relation(oneToOne) → api::food-restaurant.food-restaurant
- `user`: relation(oneToOne) → plugin::users-permissions.user
- `provider`: string default="uber_direct"
- `quote_id`: string **REQUIRED**
- `uber_delivery_id`: string
- `status`: enum[pending|processing|pickup|in_transit|delivered|cancelled|failed] default=pending
- `fee`: decimal
- `currency`: string
- `tracking_url`: string
- `pickup`: json
- `dropoff`: json
- `metadata`: json

<a name="contenido"></a>
## 5. Colecciones de contenido / blog / eventos

### `api::publicacion.publicacion` — Publicación — COLLECTION
- `contenido`: blocks
- `autor`: relation(oneToOne) → plugin::users-permissions.user
- `archivos`: media(false)
- `timestamp`: datetime
- `publicado`: enum[publicado|borrador|eliminado|bloqueado]
- `uid`: uid

### `api::comentario-publicacion.comentario-publicacion` — Comentario — COLLECTION
- `comentario`: text
- `autor`: relation(oneToOne) → plugin::users-permissions.user
- `publicacion_id`: relation(oneToOne) → api::publicacion.publicacion
- `timestamp`: datetime
- `status`: enum[publicado|eliminado|bloqueado]
- `imagen`: media(false)
- `respuesta`: boolean
- `comentario_id`: relation(oneToOne) → api::comentario-publicacion.comentario-publicacion
- `tipo`: enum[publicacion|articulo|enlace|herramienta|evento]

### `api::reaccion.reaccion` — Reacción — COLLECTION
- `listado`: json
- `tipo`: enum[publicacion|articulo|enlace|herramienta|evento]
- `comentario`: boolean
- `respuesta`: boolean
- `evento_id`: relation(oneToOne) → api::evento.evento
- `enlace_id`: relation(oneToOne) → api::enlace.enlace
- `comentario_id`: relation(oneToOne) → api::comentario-publicacion.comentario-publicacion

### `api::contenido.contenido` — Contenido (blog) — COLLECTION
- `titulo`: string
- `slug`: uid
- `autor`: relation(oneToOne) → plugin::users-permissions.user
- `contenido_libre`: json
- `contenido_restringido`: json
- `restringido`: boolean
- `status`: enum[borrador|publicado|archivado]
- `portada`: media(false)
- `galeria_libre`: media(true)
- `galeria_restringida`: media(true)
- `tags`: text
- `fecha_publicacion`: datetime
- `resumen`: string
- `categoria`: relation(oneToOne) → api::categoria-contenido.categoria-contenido
- `autor_email`: string
- `autor_nombre`: string

### `api::categoria-contenido.categoria-contenido` — Categoría de contenido — COLLECTION
- `nombre`: string
- `activa`: boolean
- `imagen`: media(false)
- `slug`: string
- `descripcion`: string

### `api::enlace.enlace` — Enlace — COLLECTION
- `titulo`: string
- `url`: string
- `timestamp`: datetime
- `descripcion`: text
- `calificacion`: integer
- `calificaciones`: integer
- `autor`: relation(oneToOne) → plugin::users-permissions.user
- `imagen`: media(false)
- `status`: enum[borrador|publicado|eliminado|bloqueado]
- `enlace_id`: relation(oneToOne) → api::enlace.enlace

### `api::categoria-enlace.categoria-enlace` — Categoría de enlace — COLLECTION
- `titulo`: string
- `descripcion`: text
- `nivel`: integer
- `sup`: integer
- `activa`: boolean
- `imagen`: media(false)
- `slug`: uid

### `api::curso.curso` — Curso — COLLECTION
- `titulo`: string
- `modalidad`: enum[presencial|en línea tiempo real|en línea grabaciones|híbrido]
- `certificacion`: string
- `precio`: decimal
- `descripcion`: text
- `calendario_actividades`: json
- `maestro`: relation(oneToOne) → plugin::users-permissions.user
- `portada`: media(false)
- `calificacion`, `calificaciones`: integer
- `fecha_publicacion`: datetime
- `temario`: json
- `archivos`: media(true)
- `fecha_inicio`: datetime
- `slug`: string
- `categoria`: relation(oneToOne) → api::categoria-curso.categoria-curso
- `de_pago`: boolean
- `enlace_reunion`: string
- `enlaces_publicos`, `enlaces_privados`: json
- `ubicacion`: relation(oneToOne) → api::direccion.direccion
- `status`: enum[borrador|publicado|archivado|activo|ya_encurso|eliminado|bloqueado]
- `maestro_email`, `maestro_nombre`: string
- `galeria`: media(true)
- `resumen`: string
- `tags`: string
- `restringido`: boolean
- `user`: relation(manyToOne) → plugin::users-permissions.user via cursos

### `api::categoria-curso.categoria-curso` — Categoría de curso — COLLECTION
- `nombre`: string
- `nivel`: integer
- `sup`: integer
- `descripcion`: text
- `imagen`: media(false)
- `slug`: string
- `activa`: boolean

### `api::evento.evento` — Evento — COLLECTION
- `titulo`: string
- `slug`: uid
- `creador`: relation(oneToOne) → plugin::users-permissions.user
- `colaboradores`: json
- `portada`: media(false)
- `imagenes`: media(true)
- `de_pago`: boolean
- `precio`: decimal
- `ciudad`: string
- `estado`: string
- `multifecha`: boolean
- `fecha_inicio`: date
- `hora_inicio`: time
- `fechas_horarios_adicionales`: json
- `fecha_fin`: date
- `hora_fin`: time
- `modalidad`: enum[presencial|en línea|híbrido]
- `status`: string
- `direccion`: relation(oneToOne) → api::direccion.direccion
- `evento_id`: relation(oneToOne) → api::evento.evento
- `url`: string
- `descripcion`: text
- `description`: richtext

### `api::categoria-evento.categoria-evento` — Categoría de evento — COLLECTION
- `titulo`: string
- `descripcion`: text
- `imagen`: media(false)
- `nivel`: integer
- `sup`: integer
- `slug`: uid
- `activa`: boolean

### `api::herramienta` relacionado — `categoria-herramienta` (abajo)
### `api::categoria-herramienta.categoria-herramienta` — Categoría de herramienta — COLLECTION
- `titulo`: string
- `descripcion`: text
- `slug`: uid
- `imagen`: media(false)
- `nivel`: integer
- `sup`: integer
- `activa`: boolean

### `api::categoria-wikimapa.categoria-wikimapa` — Categoría wikimapa — COLLECTION
- `idx`: uid
- `nivel`: integer
- `sup`: integer
- `nombre`: string
- `enlace`: string

### `api::lista-suscripcion.lista-suscripcion` — Lista de suscripción — COLLECTION
- `suscritos`: relation(oneToMany) → plugin::users-permissions.user
- `tipo`: enum[curso|evento]
- `curso`: relation(oneToOne) → api::curso.curso
- `evento`: relation(oneToOne) → api::evento.evento

### `api::servicio.servicio` — Servicio — COLLECTION
- `titulo`: string
- `descripcion`: text
- `imagen`: media(false)
- `precio_fijo`: boolean
- `precio`: decimal
- `prestador`: relation(oneToOne) → plugin::users-permissions.user
- `slug`: uid
- `descripcion_precio`: text

<a name="club"></a>
## 6. Colecciones de club / plantas / bitácora

### `api::club.club` — Club (de cannabis) — COLLECTION
- `nombre_club`: string
- `direccion`: json
- `lat`, `lng`: float
- `nombre_titular`: string
- `status_legal`: string
- `archivos_legal`: json
- `foto_de_perfil`: media(false)
- `fotos`: media(true)
- `descripcion`: text
- `servicios`: text
- `users_permissions_user`: relation(oneToOne) → plugin::users-permissions.user
- `auth_name`: string
- `horarios`: json
- `whatsapp`: string
- `activo`: boolean
- `tipo`: enum[cultivo|consumo|ambos]
- `estatutos`: media(false)
- `acta`: media(false)
- `num_integrantes`: integer
- `documentos`: media(true)
- `productos`: text
- `observaciones`: text
- `fecha_alta`, `fecha_activado`: datetime
- `en_revision`: boolean
- `reservacion`: boolean
- `lugares`, `miembrosactivos`: integer
- `documentales`: media(true)
- `direccion_legal`, `telefono_legal`: string
- `skills`: text
- `certificados`: media(true)
- `datos_legales`: json
- `slug`: string

### `api::solicitudafiliacion.solicitudafiliacion` — Solicitud de afiliación — COLLECTION
- `usuario`: relation(oneToOne) → plugin::users-permissions.user
- `club`: relation(oneToOne) → api::club.club
- `solicitada`: datetime
- `pago_inicial`: relation(oneToOne) → api::pago.pago
- `status`: string
- `afiliacionpagada`: boolean
- `metadata`: json
- `kit_entregas`: integer
- `kit_entregados`: integer
- `luz_activada`: boolean
- `afiliado`: datetime

### `api::solicitudplanta.solicitudplanta` — Solicitud de planta — COLLECTION
- `usuario`: relation(oneToOne) → plugin::users-permissions.user
- `club`: relation(oneToOne) → api::club.club
- `timestamp`, `fechasolicitada`, `fechaentregada`: datetime
- `status`: string
- `gramos`: decimal
- `plantas`: relation(oneToMany) → api::planta.planta mappedBy solicitudplanta

### `api::planta.planta` — Planta — COLLECTION
- `usuario_email`: string
- `origen`: enum[semilla|esqueje]
- `galeria`: media(true)
- `linkvideos`: string
- `qr_text`: string
- `qr`: media(true)
- `club`: relation(oneToOne) → api::club.club
- `color`: enum[rojo|amarillo|verde|azul|rosa|plata]
- `fecha_inicia_vida`, `fecha_cortada`: datetime
- `viva`: boolean
- `semilla`: boolean
- `clasificacion`: json
- `actasemilla`: media(false)
- `codigo`: string
- `cosecha`: relation(oneToOne) → api::registrobitacora.registrobitacora
- `bitacora`: relation(manyToOne) → api::bitacora.bitacora via plantas
- `secado`, `curado`: boolean
- `usuario`: relation(oneToOne) → plugin::users-permissions.user
- `fechasolicitada`: datetime
- `status`: string
- `gramos_cosechados`, `gramos_curandose`, `gramos_en_existencia`: decimal
- `registrobitacora`: relation(manyToOne) → api::registrobitacora.registrobitacora via plantas
- `solicitudplanta`: relation(manyToOne) → api::solicitudplanta.solicitudplanta via plantas
- `entregada`: boolean

### `api::cofepristramite.cofepristramite` — Trámite COFEPRIS — COLLECTION
- `usuario`: relation(oneToOne) → plugin::users-permissions.user
- `usuario_email`: string
- `tipo`: enum[membresia|jardinero|club|usuario|gestion]
- `club`: relation(oneToOne) → api::club.club
- `observaciones`: text
- `status`: string
- `rfc`, `curp`, `nombre_completo`: string
- `email`: email
- `telefono`, `whatsapp`: string
- `ine_frente`, `ine_tras`, `acuse`, `acuse_sellado`, `resolucion`: media(false)
- `fecha_solicitud_cita`, `fecha_cita`, `fecha_resolucion`: datetime
- `concedido`, `negado`, `concluido`: boolean
- `registro_acciones`: json
- `otros_documentos`: media(true)
- `escrito_libre_generado`, `escrito_libre_firmado`: media(false)
- `club_slug`, `fecha_inicial`: datetime

### `api::credencial.credencial` — Credencial — COLLECTION
- `usuario`: relation(oneToOne) → plugin::users-permissions.user
- `usuario_email`: string
- `frente`: media(false)
- `tras`: media(false)
- `status`: string

<a name="pagos"></a>
## 7. Colecciones de pagos / wallets / membresías

### `api::pago.pago` — Pago — COLLECTION
- `Idx`: uid
- `tipo`: enum[market|curso|evento|asesoria|servicio|membresia|carrito|comida]
- `carrito_id`: relation(oneToOne) → api::carrito.carrito
- `curso_id`: relation(oneToOne) → api::curso.curso
- `evento_id`: relation(oneToOne) → api::evento.evento
- `fecha_pagado`, `fecha_aprobado`: datetime
- `usuario`: relation(oneToOne) → plugin::users-permissions.user
- `monto`: decimal
- `moneda`: string
- `stripePaymentIntentId`, `stripeInvoiceId`, `stripeCustomerId`, `stripeSubscriptionId`: string
- `status`: string
- `descripcion`: string
- `metadata`: json
- `disputa`: boolean
- `metodo_pago`: enum[stripe]
- `Observaciones`: text
- `pago_guia`, `pago_vendedor`: decimal
- `comisionStripe`, `comisionPlataforma`: decimal
- `store`: relation(oneToOne) → api::store.store
- `pedido`: relation(oneToOne) → api::pedido.pedido
- `comprobante`: media(false)
- `usuario_email`: email
- `food_restaurant`: relation(oneToOne) → api::food-restaurant.food-restaurant
- `food_order`: relation(oneToOne) → api::food-order.food-order

### `api::laborys-payment.laborys-payment` — Pago laborys — COLLECTION
- `origin_wallet`: string
- `destination_wallet`: string
- `ammount`: decimal
- `type`: string
- `timestamp`: datetime
- `metadata`: json
- `status`: string

### `api::wallet.wallet` — Wallet — COLLECTION
- `address`: string
- `user`: relation(oneToOne) → plugin::users-permissions.user
- `labory_balance`: decimal
- `cit_history`: json
- `cit_balance`: decimal
- `status`: string
- `agency`: relation(oneToOne) → api::agencia.agencia
- `isagency`: boolean

### `api::gen-wallet.gen-wallet` — Gen wallet — COLLECTION
- `WalletIdx`: string
- `Coin`: string

### `api::world-coin-wallet.world-coin-wallet` — World Coin wallet — COLLECTION
- `CarteraIdx`: string
- `ammount`: decimal
- `user_idd`: relation(oneToOne) → admin::user
- `genesis`: boolean
- `user_id`: email

### `api::membresia.membresia` — Membresía (usuario) — COLLECTION
- `usuario`: relation(oneToOne) → plugin::users-permissions.user
- `fechaInicio`, `fechaFin`: date
- `plan`: enum[mensual|semestral|anual]
- `monto_pagado`: decimal
- `activa`: boolean
- `miembroDesde`: datetime
- `observaciones`: string
- `status`: string
- `usuarioemail`: email
- `tipo`: enum[jardinero|consumo|exterior|sencilla|doble]

### `api::membresias-tipo.membresias-tipo` — Tipo de membresía — COLLECTION
- `order`: integer
- `json`: json
- `openpayid`: string
- `level`: integer
- `subtypes`: boolean
- `pic`: media(false)
- `tipo`: enum[jardinero|consumo|exterior|sencilla|doble]

### `api::codigosreferido.codigosreferido` — Código de referido — COLLECTION
- `usuario`: relation(oneToOne) → plugin::users-permissions.user
- `prefijo`: string
- `sufijo`: string
- `descuento`: decimal
- `fecha_creado`: datetime
- `metadata`: json
- `activo`: boolean
- `comision`: decimal

### `api::notificacion.notificacion` — Notificación — COLLECTION
- `cuerpo`: blocks
- `user_email`: string
- `usuario`: relation(oneToOne) → plugin::users-permissions.user
- `timestamp`: datetime
- `leida`: boolean
- `status`: enum[entregada|leida|borrada]
- `tipo`: string
- `link`: string
- `imagen`: media(true)
- `icono`: string

### `api::message.message` — Mensaje directo — COLLECTION
- `text`: text
- `sender_id`: relation(oneToOne) → plugin::users-permissions.user
- `receiver_id`: relation(oneToOne) → plugin::users-permissions.user
- `timestamp`: datetime
- `status`: enum[enviado|recibido|leido|bloqueado|eliminado]
- `archivos`: media(false)

<a name="anuncios"></a>
## 8. Colecciones de anuncios / beneficio / misc

### `api::ad.ad` — Anuncio — COLLECTION
- `tipo`: enum[texto|imagen|texto con imagen|audio|video]
- `titulo`: string
- `texto`: text
- `archivo`: media(false)
- `usuario`: relation(oneToOne) → plugin::users-permissions.user
- `fecha_subido`, `fecha_publicar`, `fecha_publicado`: datetime
- `activo`: boolean
- `periodos`: blocks
- `status`: string
- `fecha_unica`: boolean
- `link`: string
- `metadata`: json
- `observaciones`: text
- `default`: boolean
- `hora`: time
- `cuerpo`: richtext
- `porcentaje`: decimal
- `area`: relation(manyToOne) → api::area.area via ads
- `esPublicitario`: boolean default=false
- `duracion`: integer
- `recompensa`: decimal
- `decisionWindow`: integer default=5
- `thumbnail`: media(false)

### `api::ad-session.ad-session` — Sesión de anuncios — COLLECTION (draftAndPublish:false)
- `usuario`: relation(manyToOne) → plugin::users-permissions.user
- `token`: string **REQUIRED UNIQUE**
- `estado`: enum[activa|completada|expirada|abandonada] default=activa
- `inicio`: datetime **REQUIRED**
- `fin`: datetime
- `indice_actual`: integer default=0
- `recompensa_total`: decimal default=0
- `metadata`: json
- `items`: relation(oneToMany) → api::ad-session-item.ad-session-item mappedBy sesion

### `api::ad-session-item.ad-session-item` — Item de sesión de anuncios — COLLECTION (draftAndPublish:false)
- `sesion`: relation(manyToOne) → api::ad-session.ad-session via items
- `anuncio`: relation(manyToOne) → api::ad.ad
- `orden`: integer **REQUIRED**
- `estado`: enum[queued|playing|decision_window|committed|completed|skipped|abandoned|invalid] default=queued
- `cobertura`: json
- `segmentos_totales`: integer
- `tiempo_efectivo_ms`: integer default=0
- `ultimo_tick`: datetime
- `ultima_posicion_seg`, `duracion_real`, `recompensa`: decimal
- `recompensa_emitida`: boolean default=false
- `inicio`, `fin`: datetime

### `api::ad-view.ad-view` — Vista de anuncio — COLLECTION
- `ad`: relation(oneToOne) → api::ad.ad
- `tipo`: string
- `timestamp`: datetime
- `contenido`: relation(oneToOne) → api::contenido.contenido
- `usuario`: relation(oneToOne) → plugin::users-permissions.user
- `link`: string

---

<a name="single-types"></a>
## 9. Single Types (2)

### `api::my-agency.my-agency` — Agencia del usuario — SINGLE
- `agencia`: relation(oneToOne) → api::agencia.agencia

### `api::site-setting.site-setting` — Ajustes del sitio — SINGLE
- `labory_to_pesos_exchange_rate`: decimal

---

<a name="componentes"></a>
## 10. Componentes (4)

### `default.carritos.producto-en-carrito` — Carrito (marketplace) — repeatable
- `producto`: relation(oneToOne) → api::producto.producto
- `nombre`: string
- `precio_unitario`: decimal
- `cantidad`: integer
- `subtotal`: decimal
- `envio`: decimal
- `subtotal_volumetrico`: decimal
- `esquema_impuestos`: enum[sin_iva|con_iva|optativo]
- `cp`, `total`: decimal
- `comisionStripe`, `comisionPlataforma`: decimal
- `imagen_predeterminada`: media(false)
- `store`: relation(oneToOne) → api::store.store
- `calificado`: boolean default=false
- `fechacalificado`: datetime
- `status`: string

### `default.food-cart.food-cart-item` — Item food cart — repeatable
- `producto`: relation(oneToOne) → api::food-product.food-product
- `variante`: relation(oneToOne) → api::food-product-variant.food-product-variant
- `restaurante`: relation(oneToOne) → api::food-restaurant.food-restaurant
- `item_key`, `nombre`, `nombre_variante`, `imagen`: string
- `precio_base`, `precio_variante`, `precio_unitario`: decimal
- `cantidad`: integer default=1
- `subtotal`: decimal
- `modificadores`, `metadata`: json

### `default.offers.offer-item` — Item de oferta — repeatable
- `product`: relation(oneToOne) → api::food-product.food-product
- `cantidad`: integer **REQUIRED** default=1
- `precio`: decimal **REQUIRED**
- `food_modifiers`: relation(oneToMany) → api::food-modifier.food-modifier

### `default.orders.products-order` — Item de pedido food — repeatable
- `product`: relation(oneToOne) → api::food-product.food-product
- `restaurant`: relation(oneToOne) → api::food-restaurant.food-restaurant
- `nombre`: string
- `precio_unitario`: decimal
- `cantidad`: integer
- `subtotal`, `envio`, `subtotal_volumetrico`, `total`: decimal
- `comision_plataforma`: decimal
- `calificado`: boolean
- `calificacion`: decimal
- `fecha_calificado`: datetime
- `status`: string

---

## Anexo: Usuario Strapi extendido (`plugin::users-permissions.user`)

El esquema del usuario está extendido en
`src/extensions/users-permissions/content-types/user/schema.json` (tabla `up_users`).
Campos adicionales clave (además de username/email/password/role/confirmed/blocked):

- `roles`: json (array, p.ej. `["admin","socio"]`) ⚠️ **rol efectivo de la app**
- `area_details`: json (verificaciones por área + `proposed_subareas`)
- `settings`, `profile`: json
- `membresia_vigente`, `tipo_membresia` (enum mensual/semestral/anual/preferente),
  `fecha_membresia`, `fecha_fin_membresia_actual`, `subscriptionStatus`
- `membresiatipo`: enum[consumo|cultivo|jardinero|socio] ⚠️ (club, ≠ rol)
- `telefono`, `cp`, `ciudad`, `rfc`, `curp`, `nombre_completo`, `fecha_nacimiento`
- `ine_frente`, `ine_tras`, `foto_credencial`, `demandaamparo`, `escritolibrecofepris`,
  `profilepic`, `files`: media
- Stripe: `stripeCustomerId`, `stripeSubscriptionId`, `stripePriceId`, `id_stripe`
- OpenPay: `openpayid`, `openpaykey`
- Club: `isclub`, `haveclub`, `club` (relación), `clubid`
- `isJardinero`, `isclub`, `proximacosecha`, `curado`, `secado`, `registrolegal`
- Cofepris/amparo: `foliocofepris`, `esperandocofepris`, `esperandoamparo`, `tipoamparo`,
  `amparostatus`, `status_legal`
- Relaciones: `direcciones`, `cursos`, `areas` (M2M), `skills` (M2M), `favoritos`,
  `agencia`, `bitacora`, `plantas`
- `free_trip`: boolean

---

*Fin del inventario de base de datos (80 colecciones + 2 single types + 4 componentes).*