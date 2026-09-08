# 📘 Estructura de Colecciones Strapi

## 📦 ad
- **tipo** → `enumeration`
- **titulo** → `string`
- **texto** → `text`
- **archivo** → `media`
- **usuario** → `relation` (relación con plugin::users-permissions.user)
- **fecha_subido** → `datetime`
- **fecha_publicar** → `datetime`
- **fecha_publicado** → `datetime`
- **activo** → `boolean`
- **periodos** → `blocks`
- **status** → `string`
- **fecha_unica** → `boolean`
- **link** → `string`
- **metadata** → `json`
- **observaciones** → `text`
- **default** → `boolean`
- **hora** → `time`
- **cuerpo** → `richtext`
- **porcentaje** → `decimal`
- **area** → `relation` (relación con api::area.area)
- **esPublicitario** → `boolean`
- **duracion** → `integer`
- **recompensa** → `decimal`
- **decisionWindow** → `integer`
- **thumbnail** → `media`

## 📦 Sesiones de Anuncios
- **usuario** → `relation` *(requerido)* (relación con plugin::users-permissions.user)
- **token** → `string` *(requerido)*
- **estado** → `enumeration`
- **inicio** → `datetime` *(requerido)*
- **fin** → `datetime`
- **indice_actual** → `integer`
- **recompensa_total** → `decimal`
- **metadata** → `json`
- **items** → `relation` (relación con api::ad-session-item.ad-session-item)

## 📦 Items de Sesión de Anuncios
- **sesion** → `relation` *(requerido)* (relación con api::ad-session.ad-session)
- **anuncio** → `relation` *(requerido)* (relación con api::ad.ad)
- **orden** → `integer` *(requerido)*
- **estado** → `enumeration`
- **cobertura** → `json`
- **segmentos_totales** → `integer`
- **tiempo_efectivo_ms** → `integer`
- **ultimo_tick** → `datetime`
- **ultima_posicion_seg** → `decimal`
- **recompensa** → `decimal`
- **recompensa_emitida** → `boolean`
- **inicio** → `datetime`
- **fin** → `datetime`

## 📦 ad-view
- **ad** → `relation` (relación con api::ad.ad)
- **tipo** → `string`
- **timestamp** → `datetime`
- **contenido** → `relation` (relación con api::contenido.contenido)
- **usuario** → `relation` (relación con plugin::users-permissions.user)
- **link** → `string`

## 📦 agencia
- **idx** → `uid`
- **localidad** → `json`
- **nombre** → `string`
- **miembros** → `string`
- **miembros_json** → `json`
- **members** → `relation` (relación con admin::user)
- **walll** → `string`
- **wallet_address** → `string`
- **tipo** → `enumeration`
- **socios** → `relation` (relación con plugin::users-permissions.user)

## 📦 Agenda
- **titulo** → `string`
- **slug** → `string`
- **usuario** → `relation` (relación con plugin::users-permissions.user)
- **colaboradores** → `json`
- **portada** → `media`
- **ciudad** → `string`
- **estado** → `enumeration`
- **fecha_inicio** → `datetime`
- **status** → `string`
- **descripcion** → `text`
- **url** → `string`
- **metadata** → `json`
- **observaciones** → `text`
- **checked** → `boolean`

## 📦 Area
- **name** → `string` *(requerido)*
- **level** → `integer` *(requerido)*
- **creador** → `relation` (relación con admin::user)
- **timestamp** → `datetime`
- **todos** → `relation` (relación con api::todo.todo)
- **is_active** → `boolean`
- **ads** → `relation` (relación con api::ad.ad)
- **parent_area** → `relation` (relación con api::area.area)
- **subareas** → `relation` (relación con api::area.area)
- **usuarios** → `relation` (relación con plugin::users-permissions.user)

## 📦 bitacora
- **titulo** → `string`
- **slug** → `string`
- **usuario** → `relation` (relación con plugin::users-permissions.user)
- **colaboradores** → `relation` (relación con plugin::users-permissions.user)
- **portada** → `media`
- **imagenes** → `media`
- **videos** → `media`
- **archivos** → `media`
- **fecha_inicio** → `datetime`
- **status** → `string`
- **rol** → `string`
- **club** → `relation` (relación con api::club.club)
- **descripcion** → `text`
- **url** → `string`
- **plantas** → `relation` (relación con api::planta.planta)
- **observaciones** → `text`
- **metadata** → `json`
- **codigo** → `string`

## 📦 carritos
- **usuario** → `relation` (relación con plugin::users-permissions.user)
- **productos** → `component`
- **total** → `decimal`
- **estado** → `enumeration`
- **ultima_actualizacion** → `datetime`
- **log** → `json`
- **direccion** → `relation` (relación con api::direccion.direccion)
- **total_envios** → `decimal`
- **agrupacion_de_envios** → `json`
- **usuario_email** → `string`

## 📦 carros
- **conductoremail** → `email`
- **imagen** → `media`
- **conductor** → `relation` (relación con plugin::users-permissions.user)
- **fecharegistro** → `datetime`
- **marca** → `string`
- **nombre** → `string`
- **modelo** → `integer`
- **puertas** → `integer`
- **caracteristicas** → `json`
- **observaciones** → `text`
- **charla** → `enumeration`
- **musica** → `enumeration`
- **tipo_musica** → `json`
- **wifi** → `boolean`
- **agua** → `boolean`
- **cargador** → `boolean`
- **snacks** → `boolean`
- **portabici** → `boolean`
- **accesibilidad** → `boolean`
- **mascotas** → `boolean`
- **fumadores** → `boolean`
- **aire_acondicionado** → `boolean`
- **rockola** → `boolean`
- **ambiente_inclusivo** → `boolean`
- **otro_genero** → `boolean`
- **ultimaverificacion** → `datetime`
- **verificaciones** → `json`
- **status** → `enumeration`
- **agencia** → `relation` (relación con api::agencia.agencia)

## 📦 Cars Evidence
- **validation** → `relation` (relación con api::cars-validation.cars-validation)
- **type** → `enumeration`
- **file** → `media` *(requerido)*
- **review_status** → `enumeration`
- **reviewer_note** → `text`
- **reviewed_at** → `datetime`
- **reviewer** → `relation` (relación con plugin::users-permissions.user)
- **source_driver_field** → `string`
- **source_file_id** → `integer`
- **version** → `integer`
- **is_current** → `boolean`
- **supersedes** → `relation` (relación con api::cars-evidence.cars-evidence)
- **origin** → `enumeration`
- **sha256** → `string`
- **perceptual_hash** → `string`
- **nonce** → `string`
- **timestamp_client** → `datetime`
- **timestamp_server** → `datetime`
- **gps_lat** → `decimal`
- **gps_lng** → `decimal`
- **gps_accuracy** → `decimal`
- **device_id** → `string`
- **app_version** → `string`
- **uploaded_from_gallery** → `boolean`
- **is_valid** → `boolean`
- **validation_flags** → `json`

## 📦 Cars Validation
- **driver** → `relation` (relación con api::driver.driver)
- **agency** → `relation` (relación con api::agencia.agencia)
- **agenda** → `relation` (relación con api::agenda.agenda)
- **reviewer** → `relation` (relación con plugin::users-permissions.user)
- **appointment_date** → `datetime`
- **opened_at** → `datetime`
- **validation_started_at** → `datetime`
- **validation_finished_at** → `datetime`
- **closed_at** → `datetime`
- **status** → `enumeration`
- **result** → `enumeration`
- **nonce** → `string`
- **session_token** → `string`
- **risk_score** → `integer`
- **gps_lat** → `decimal`
- **gps_lng** → `decimal`
- **gps_accuracy** → `decimal`
- **device_id** → `string`
- **app_version** → `string`
- **checklist** → `json`
- **observations** → `text`
- **metadata** → `json`
- **evidences** → `relation` (relación con api::cars-evidence.cars-evidence)
- **events** → `relation` (relación con api::cars-validation-event.cars-validation-event)

## 📦 Cars Validation Event
- **validation** → `relation` (relación con api::cars-validation.cars-validation)
- **evidence** → `relation` (relación con api::cars-evidence.cars-evidence)
- **actor** → `relation` (relación con plugin::users-permissions.user)
- **action** → `enumeration`
- **payload** → `json`

## 📦 Cartera
- **laborysGanados** → `decimal`
- **laborysSaldo** → `decimal`
- **ciudadanTokens** → `decimal`
- **ciudadanRendimientos** → `decimal`
- **user_id** → `relation` (relación con plugin::users-permissions.user)

## 📦 Categorias_Contenidos
- **nombre** → `string`
- **activa** → `boolean`
- **imagen** → `media`
- **slug** → `string`
- **descripcion** → `string`

## 📦 categorias_cursos
- **nombre** → `string`
- **nivel** → `integer`
- **sup** → `integer`
- **descripcion** → `text`
- **imagen** → `media`
- **slug** → `string`
- **activa** → `boolean`

## 📦 Categorias_Enlaces
- **titulo** → `string`
- **descripcion** → `text`
- **nivel** → `integer`
- **sup** → `integer`
- **activa** → `boolean`
- **imagen** → `media`
- **slug** → `uid`

## 📦 Categorias_Eventos
- **titulo** → `string`
- **descripcion** → `text`
- **imagen** → `media`
- **nivel** → `integer`
- **sup** → `integer`
- **slug** → `uid`
- **activa** → `boolean`

## 📦 Categorias_Herramientas
- **titulo** → `string`
- **descripcion** → `text`
- **slug** → `uid`
- **imagen** → `media`
- **nivel** → `integer`
- **sup** → `integer`
- **activa** → `boolean`

## 📦 categoria-wikimapa
- **idx** → `uid`
- **nivel** → `integer`
- **sup** → `integer`
- **nombre** → `string`
- **enlace** → `string`

## 📦 Clubs
- **nombre_club** → `string`
- **direccion** → `json`
- **lat** → `float`
- **lng** → `float`
- **nombre_titular** → `string`
- **status_legal** → `string`
- **archivos_legal** → `json`
- **foto_de_perfil** → `media`
- **fotos** → `media`
- **descripcion** → `text`
- **servicios** → `text`
- **users_permissions_user** → `relation` (relación con plugin::users-permissions.user)
- **auth_name** → `string`
- **horarios** → `json`
- **whatsapp** → `string`
- **activo** → `boolean`
- **tipo** → `enumeration`
- **estatutos** → `media`
- **acta** → `media`
- **num_integrantes** → `integer`
- **documentos** → `media`
- **productos** → `text`
- **observaciones** → `text`
- **fecha_alta** → `datetime`
- **fecha_activado** → `datetime`
- **en_revision** → `boolean`
- **reservacion** → `boolean`
- **lugares** → `integer`
- **miembrosactivos** → `integer`
- **documentales** → `media`
- **direccion_legal** → `string`
- **telefono_legal** → `string`
- **skills** → `text`
- **certificados** → `media`
- **datos_legales** → `json`
- **slug** → `string`

## 📦 codigosreferido
- **usuario** → `relation` (relación con plugin::users-permissions.user)
- **prefijo** → `string`
- **sufijo** → `string`
- **descuento** → `decimal`
- **fecha_creado** → `datetime`
- **metadata** → `json`
- **activo** → `boolean`
- **comision** → `decimal`

## 📦 cofepristramite
- **usuario** → `relation` (relación con plugin::users-permissions.user)
- **usuario_email** → `string`
- **tipo** → `enumeration`
- **club** → `relation` (relación con api::club.club)
- **observaciones** → `text`
- **status** → `string`
- **rfc** → `string`
- **curp** → `string`
- **nombre_completo** → `string`
- **email** → `email`
- **telefono** → `string`
- **whatsapp** → `string`
- **ine_frente** → `media`
- **ine_tras** → `media`
- **acuse** → `media`
- **acuse_sellado** → `media`
- **resolucion** → `media`
- **fecha_solicitud_cita** → `datetime`
- **fecha_cita** → `datetime`
- **fecha_resolucion** → `datetime`
- **concedido** → `boolean`
- **negado** → `boolean`
- **concluido** → `boolean`
- **registro_acciones** → `json`
- **otros_documentos** → `media`
- **escrito_libre_generado** → `media`
- **escrito_libre_firmado** → `media`
- **club_slug** → `string`
- **fecha_inicial** → `datetime`

## 📦 Comentarios_Publicaciones
- **comentario** → `text`
- **autor** → `relation` (relación con plugin::users-permissions.user)
- **publicacion_id** → `relation` (relación con api::publicacion.publicacion)
- **timestamp** → `datetime`
- **status** → `enumeration`
- **imagen** → `media`
- **respuesta** → `boolean`
- **comentario_id** → `relation` (relación con api::comentario-publicacion.comentario-publicacion)
- **tipo** → `enumeration`

## 📦 Configuraciones_Sistema
- **basic_set** → `json`
- **datos_generales** → `json`
- **parametro** → `string`

## 📦 configuraciones_usuarios
- **usuario** → `relation` (relación con plugin::users-permissions.user)
- **email** → `email`
- **configuraciones** → `json`
- **pago_labory** → `boolean`

## 📦 Contenidos
- **titulo** → `string`
- **slug** → `uid`
- **autor** → `relation` (relación con plugin::users-permissions.user)
- **contenido_libre** → `json`
- **contenido_restringido** → `json`
- **restringido** → `boolean`
- **status** → `enumeration`
- **portada** → `media`
- **galeria_libre** → `media`
- **galeria_restringida** → `media`
- **tags** → `text`
- **fecha_publicacion** → `datetime`
- **resumen** → `string`
- **categoria** → `relation` (relación con api::categoria-contenido.categoria-contenido)
- **autor_email** → `string`
- **autor_nombre** → `string`

## 📦 credencial
- **usuario** → `relation` (relación con plugin::users-permissions.user)
- **usuario_email** → `string`
- **frente** → `media`
- **tras** → `media`
- **status** → `string`

## 📦 Cursos
- **titulo** → `string`
- **modalidad** → `enumeration`
- **certificacion** → `string`
- **precio** → `decimal`
- **descripcion** → `text`
- **calendario_actividades** → `json`
- **maestro** → `relation` (relación con plugin::users-permissions.user)
- **portada** → `media`
- **calificacion** → `integer`
- **calificaciones** → `integer`
- **fecha_publicacion** → `datetime`
- **temario** → `json`
- **archivos** → `media`
- **fecha_inicio** → `datetime`
- **slug** → `string`
- **categoria** → `relation` (relación con api::categoria-curso.categoria-curso)
- **de_pago** → `boolean`
- **enlace_reunion** → `string`
- **enlaces_publicos** → `json`
- **enlaces_privados** → `json`
- **ubicacion** → `relation` (relación con api::direccion.direccion)
- **status** → `enumeration`
- **maestro_email** → `string`
- **maestro_nombre** → `string`
- **galeria** → `media`
- **resumen** → `string`
- **tags** → `string`
- **restringido** → `boolean`
- **user** → `relation` (relación con plugin::users-permissions.user)

## 📦 Direcciones
- **direccion** → `json`
- **coords** → `json`
- **cp** → `string`
- **ciudad** → `string`
- **estado** → `string`
- **store_id** → `relation` (relación con api::store.store)
- **observaciones** → `string`
- **event_id** → `relation` (relación con api::evento.evento)
- **activa** → `boolean`
- **club** → `relation` (relación con api::club.club)
- **predeterminada** → `boolean`
- **user_email** → `string`
- **usuario_email** → `string`
- **restaurant_id** → `relation` (relación con api::food-restaurant.food-restaurant)

## 📦 Driver
- **user** → `relation` (relación con plugin::users-permissions.user)
- **email** → `email`
- **phone** → `string`
- **firstname** → `string`
- **middlename** → `string`
- **lastname** → `string`
- **birthdate** → `date`
- **curp** → `string`
- **rfc** → `string`
- **emergency_phone** → `string`
- **address** → `string`
- **zip_code** → `string`
- **state** → `string`
- **municipality** → `string`
- **profile_pic** → `media`
- **verification_selfie** → `media`
- **id_front** → `media`
- **id_back** → `media`
- **driver_license_front** → `media`
- **driver_license_back** → `media`
- **proof_of_address** → `media`
- **license_number** → `string`
- **license_type** → `string`
- **license_expiration_date** → `date`
- **vehicle_brand** → `string`
- **vehicle_model** → `string`
- **vehicle_year** → `string`
- **vehicle_color** → `string`
- **license_plate** → `string`
- **vin_number** → `string`
- **vehicle_type** → `string`
- **passenger_capacity** → `string`
- **vehicle_front_photo** → `media`
- **vehicle_side_photo** → `media`
- **vehicle_back_photo** → `media`
- **vehicle_interior_photo** → `media`
- **vehicle_registration_card** → `media`
- **vehicle_insurance_document** → `media`
- **appointment_date** → `datetime`
- **agency** → `relation` (relación con api::agencia.agencia)
- **reviewer** → `relation` (relación con plugin::users-permissions.user)
- **current_step** → `string`
- **profile_completed** → `boolean`
- **documents_completed** → `boolean`
- **appointment_scheduled** → `boolean`
- **in_person_verification_completed** → `boolean`
- **final_approval** → `boolean`
- **status** → `enumeration`
- **free_trips** → `integer`

## 📦 DriverLocations
- **coords** → `json`
- **driver_id** → `relation` (relación con plugin::users-permissions.user)
- **time** → `datetime`

## 📦 Enlaces
- **titulo** → `string`
- **url** → `string`
- **timestamp** → `datetime`
- **descripcion** → `text`
- **calificacion** → `integer`
- **calificaciones** → `integer`
- **autor** → `relation` (relación con plugin::users-permissions.user)
- **imagen** → `media`
- **status** → `enumeration`
- **enlace_id** → `relation` (relación con api::enlace.enlace)

## 📦 Eventos
- **titulo** → `string`
- **slug** → `uid`
- **creador** → `relation` (relación con plugin::users-permissions.user)
- **colaboradores** → `json`
- **portada** → `media`
- **imagenes** → `media`
- **de_pago** → `boolean`
- **precio** → `decimal`
- **ciudad** → `string`
- **estado** → `string`
- **multifecha** → `boolean`
- **fecha_inicio** → `date`
- **hora_inicio** → `time`
- **fechas_horarios_adicionales** → `json`
- **fecha_fin** → `date`
- **hora_fin** → `time`
- **modalidad** → `enumeration`
- **status** → `string`
- **direccion** → `relation` (relación con api::direccion.direccion)
- **evento_id** → `relation` (relación con api::evento.evento)
- **url** → `string`
- **descripcion** → `text`
- **description** → `richtext`

## 📦 favorito
- **usuario** → `relation` (relación con plugin::users-permissions.user)
- **usuario_email** → `email`
- **tipo** → `enumeration`
- **producto** → `relation` (relación con api::producto.producto)
- **club** → `relation` (relación con api::club.club)
- **curso** → `relation` (relación con api::curso.curso)
- **contenido** → `relation` (relación con api::contenido.contenido)
- **url** → `string`

## 📦 Food Carts
- **usuario** → `relation` (relación con plugin::users-permissions.user)
- **items** → `component`
- **subtotal** → `decimal`
- **monto_envio** → `decimal`
- **monto_total** → `decimal`
- **moneda** → `string`
- **estado** → `enumeration`
- **ultima_actualizacion** → `datetime`
- **metadata** → `json`

## 📦 Food Categories
- **nombre** → `string` *(requerido)*
- **descripcion** → `text`
- **imagen** → `media`
- **slug** → `string`

## 📦 Food Modifier
- **nombre** → `string` *(requerido)*
- **descripcion** → `text`
- **precio** → `decimal`
- **activo** → `boolean`
- **disponible** → `boolean`
- **orden** → `integer`
- **imagen** → `media`
- **food_modifier_group** → `relation` (relación con api::food-modifier-group.food-modifier-group)

## 📦 Food Modifier Group
- **nombre** → `string` *(requerido)*
- **descripcion** → `text`
- **requerido** → `boolean`
- **orden** → `integer`
- **activo** → `boolean`
- **food_restaurant** → `relation` (relación con api::food-restaurant.food-restaurant)
- **food_modifiers** → `relation` (relación con api::food-modifier.food-modifier)

## 📦 Food Offers
- **titulo** → `string` *(requerido)*
- **descripcion** → `text`
- **precio** → `decimal` *(requerido)*
- **cantidad** → `integer`
- **activa** → `boolean`
- **fecha_inicio** → `datetime`
- **fecha_fin** → `datetime`
- **restaurant** → `relation` (relación con api::food-restaurant.food-restaurant)
- **items** → `component` *(requerido)*

## 📦 Food Orders
- **items** → `component`
- **fecha_creacion** → `datetime`
- **user** → `relation` (relación con plugin::users-permissions.user)
- **guia** → `string`
- **direccion_origen** → `relation` (relación con api::direccion.direccion)
- **direccion_destino** → `relation` (relación con api::direccion.direccion)
- **fecha_envio** → `datetime`
- **fecha_entrega** → `datetime`
- **fecha_pagado** → `datetime`
- **fecha_finalizado** → `datetime`
- **total_volumetrico** → `decimal`
- **monto_envio** → `decimal`
- **monto_total** → `decimal`
- **moneda** → `string`
- **pago** → `relation` (relación con api::pago.pago)
- **status** → `enumeration`
- **finalizado** → `boolean`
- **calificado** → `boolean`
- **metadata** → `json`
- **restaurant** → `relation` (relación con api::food-restaurant.food-restaurant)
- **fecha_verificado** → `datetime`

## 📦 Food Products
- **nombre** → `string` *(requerido)*
- **descripcion** → `text`
- **imagen_predeterminada** → `media`
- **imagenes** → `media`
- **precio_base** → `decimal`
- **activo** → `boolean`
- **destacado** → `boolean`
- **slug** → `string`
- **food_categories** → `relation` (relación con api::food-categorie.food-categorie)
- **food_restaurant** → `relation` (relación con api::food-restaurant.food-restaurant)
- **tiempo_preparacion** → `integer`
- **calorias** → `integer`
- **peso** → `decimal`
- **porciones** → `decimal`
- **es_picante** → `boolean`
- **nivel_picante** → `enumeration`
- **vegetariano** → `boolean`
- **vegano** → `boolean`
- **sin_gluten** → `boolean`
- **contiene_lacteos** → `boolean`
- **contiene_mariscos** → `boolean`
- **contiene_cerdo** → `boolean`
- **ingredientes** → `json`
- **alergenos** → `json`
- **temperatura** → `enumeration`
- **disponible** → `boolean`
- **usa_stock** → `boolean`
- **stock** → `integer`
- **calificacion** → `decimal`
- **calificaciones** → `integer`
- **vendidos** → `integer`
- **variantes** → `json`
- **combos** → `json`
- **horario_disponibilidad** → `json`
- **orden_minima** → `decimal`
- **permite_programar** → `boolean`
- **fecha_creacion** → `datetime`
- **food_product_variants** → `relation` (relación con api::food-product-variant.food-product-variant)
- **food_modifiers** → `relation` (relación con api::food-modifier.food-modifier)

## 📦 Food Product Variants
- **nombre** → `string` *(requerido)*
- **descripcion** → `text`
- **precio** → `decimal` *(requerido)*
- **peso** → `decimal`
- **calorias** → `integer`
- **stock** → `integer`
- **usa_stock** → `boolean`
- **activo** → `boolean`
- **orden** → `integer`
- **food_product** → `relation` (relación con api::food-product.food-product)
- **porciones** → `decimal`
- **ingredientes** → `json`
- **alergenos** → `json`
- **imagen_predeterminada** → `media`
- **imagenes** → `media`

## 📦 Food Restaurants
- **nombre** → `string` *(requerido)*
- **email** → `email` *(requerido)*
- **terminado** → `boolean`
- **slug** → `string` *(requerido)*
- **users_permissions_user** → `relation` (relación con plugin::users-permissions.user)
- **direccion** → `relation` (relación con api::direccion.direccion)
- **cp** → `string`
- **localidad** → `string`
- **esquema_impuestos** → `enumeration`
- **imagen** → `media`
- **paso** → `integer`
- **nombre_bancario** → `string`
- **clabe_bancaria** → `string`
- **banco** → `string`
- **food_modifier_groups** → `relation` (relación con api::food-modifier-group.food-modifier-group)
- **offers** → `relation` (relación con api::food-offer.food-offer)

## 📦 GenWallet
- **WalletIdx** → `string`
- **Coin** → `string`

## 📦 kitjardinero
- **nombre** → `string`
- **texto** → `text`
- **precio** → `decimal`
- **imagen** → `media`
- **orden** → `integer`
- **activo** → `boolean`
- **link** → `string`
- **cantidad** → `integer`
- **pack** → `string`
- **cantidadbasico** → `integer`
- **cantidadfull** → `integer`

## 📦 laborys_payment
- **origin_wallet** → `string`
- **destination_wallet** → `string`
- **ammount** → `decimal`
- **type** → `string`
- **timestamp** → `datetime`
- **metadata** → `json`
- **status** → `string`

## 📦 listas_suscripciones
- **suscritos** → `relation` (relación con plugin::users-permissions.user)
- **tipo** → `enumeration`
- **curso** → `relation` (relación con api::curso.curso)
- **evento** → `relation` (relación con api::evento.evento)

## 📦 Membresías
- **usuario** → `relation` (relación con plugin::users-permissions.user)
- **fechaInicio** → `date`
- **fechaFin** → `date`
- **plan** → `enumeration`
- **monto_pagado** → `decimal`
- **activa** → `boolean`
- **miembroDesde** → `datetime`
- **observaciones** → `string`
- **status** → `string`
- **usuarioemail** → `email`
- **tipo** → `enumeration`

## 📦 MembresiasTipo
- **order** → `integer`
- **json** → `json`
- **openpayid** → `string`
- **level** → `integer`
- **subtypes** → `boolean`
- **pic** → `media`
- **tipo** → `enumeration`

## 📦 messages
- **text** → `text`
- **sender_id** → `relation` (relación con plugin::users-permissions.user)
- **receiver_id** → `relation` (relación con plugin::users-permissions.user)
- **timestamp** → `datetime`
- **status** → `enumeration`
- **archivos** → `media`

## 📦 My-agency
- **agencia** → `relation` (relación con api::agencia.agencia)

## 📦 Notificaciones
- **cuerpo** → `blocks`
- **user_email** → `string`
- **usuario** → `relation` (relación con plugin::users-permissions.user)
- **timestamp** → `datetime`
- **leida** → `boolean`
- **status** → `enumeration`
- **tipo** → `string`
- **link** → `string`
- **imagen** → `media`
- **icono** → `string`

## 📦 Pagos
- **Idx** → `uid`
- **tipo** → `enumeration`
- **carrito_id** → `relation` (relación con api::carrito.carrito)
- **curso_id** → `relation` (relación con api::curso.curso)
- **evento_id** → `relation` (relación con api::evento.evento)
- **fecha_pagado** → `datetime`
- **usuario** → `relation` (relación con plugin::users-permissions.user)
- **monto** → `decimal`
- **moneda** → `string`
- **stripePaymentIntentId** → `string`
- **stripeInvoiceId** → `string`
- **stripeCustomerId** → `string`
- **stripeSubscriptionId** → `string`
- **status** → `string`
- **descripcion** → `string`
- **metadata** → `json`
- **disputa** → `boolean`
- **metodo_pago** → `enumeration`
- **Observaciones** → `text`
- **pago_guia** → `decimal`
- **pago_vendedor** → `decimal`
- **comisionStripe** → `decimal`
- **comisionPlataforma** → `decimal`
- **store** → `relation` (relación con api::store.store)
- **pedido** → `relation` (relación con api::pedido.pedido)
- **comprobante** → `media` *(requerido)*
- **usuario_email** → `email`
- **fecha_aprobado** → `datetime`
- **food_restaurant** → `relation` (relación con api::food-restaurant.food-restaurant)
- **food_order** → `relation` (relación con api::food-order.food-order)

## 📦 pedidos
- **item** → `component`
- **tipo** → `enumeration`
- **curso_id** → `relation` (relación con api::curso.curso)
- **evento_id** → `relation` (relación con api::evento.evento)
- **timestamp_creacion** → `datetime`
- **usuario** → `relation` (relación con plugin::users-permissions.user)
- **guia** → `string`
- **proveedor** → `enumeration`
- **direccion_origen** → `relation` (relación con api::direccion.direccion)
- **direccion_destino** → `relation` (relación con api::direccion.direccion)
- **fecha_envio** → `datetime`
- **fecha_entrega** → `datetime`
- **total_volumetrico** → `decimal`
- **monto_envio** → `decimal`
- **monto_total** → `decimal`
- **carrito_id** → `relation` (relación con api::carrito.carrito)
- **fecha_pagado** → `datetime`
- **moneda** → `string`
- **pago_id** → `relation` (relación con api::pago.pago)
- **status** → `enumeration`
- **finalizado** → `boolean`
- **fecha_finalizado** → `datetime`
- **metadata** → `json`
- **calificado** → `boolean`
- **store** → `relation` (relación con api::store.store)
- **store_email** → `string`

## 📦 planta
- **usuario_email** → `string`
- **origen** → `enumeration`
- **galeria** → `media`
- **linkvideos** → `string`
- **qr_text** → `string`
- **qr** → `media`
- **club** → `relation` (relación con api::club.club)
- **color** → `enumeration`
- **fecha_inicia_vida** → `datetime`
- **fecha_cortada** → `datetime`
- **viva** → `boolean`
- **semilla** → `boolean`
- **clasificacion** → `json`
- **actasemilla** → `media`
- **codigo** → `string`
- **cosecha** → `relation` (relación con api::registrobitacora.registrobitacora)
- **bitacora** → `relation` (relación con api::bitacora.bitacora)
- **secado** → `boolean`
- **curado** → `boolean`
- **usuario** → `relation` (relación con plugin::users-permissions.user)
- **fechasolicitada** → `datetime`
- **status** → `string`
- **gramos_cosechados** → `decimal`
- **gramos_curandose** → `decimal`
- **gramos_en_existencia** → `decimal`
- **registrobitacora** → `relation` (relación con api::registrobitacora.registrobitacora)
- **solicitudplanta** → `relation` (relación con api::solicitudplanta.solicitudplanta)
- **entregada** → `boolean`

## 📦 postulacion
- **postulante** → `relation` (relación con plugin::users-permissions.user)
- **fecha_solicitud** → `datetime`
- **posicion** → `string`
- **whtasapp** → `string`
- **email** → `email`
- **descripcion** → `text`
- **archivos** → `media`
- **revision** → `json`
- **status** → `string`
- **revisada** → `boolean`
- **links** → `json`
- **metadata** → `json`
- **citada** → `boolean`
- **rechazada** → `boolean`
- **cita** → `relation` (relación con api::agenda.agenda)
- **observaciones** → `text`
- **observacionesjson** → `json`

## 📦 Preguntas
- **producto** → `relation` (relación con api::producto.producto)
- **pregunta** → `text`
- **fechapregunta** → `datetime`
- **status** → `enumeration`
- **usuario** → `relation` (relación con plugin::users-permissions.user)
- **store** → `relation` (relación con api::store.store)
- **curso** → `relation` (relación con api::curso.curso)
- **respuesta** → `text`
- **fecha_respuesta** → `datetime`

## 📦 productos
- **nombre** → `string`
- **descripcion** → `string`
- **precio** → `decimal`
- **marca** → `string`
- **store_category** → `relation` (relación con api::store-categorie.store-categorie)
- **imagenes** → `media`
- **imagen_predeterminada** → `media`
- **activo** → `boolean`
- **destacado** → `boolean`
- **store_id** → `string`
- **store_email** → `string`
- **store** → `relation` (relación con api::store.store)
- **stripe_product_id** → `string`
- **tags** → `text`
- **fecha_creacion** → `datetime`
- **stock** → `float`
- **calificacion** → `integer`
- **calificaciones** → `integer`
- **vendidos** → `integer`
- **cp** → `string`
- **slug** → `string`
- **largo** → `decimal`
- **ancho** → `decimal`
- **alto** → `decimal`
- **peso** → `decimal`
- **volumetrico** → `decimal`
- **especificaciones** → `json`
- **variaciones** → `json`
- **localidad** → `string`
- **estado** → `string`
- **preguntas_productos** → `relation` (relación con api::pregunta-producto.pregunta-producto)
- **favoritos** → `relation` (relación con api::favorito.favorito)

## 📦 Publicaciones
- **contenido** → `blocks`
- **autor** → `relation` (relación con plugin::users-permissions.user)
- **archivos** → `media`
- **timestamp** → `datetime`
- **publicado** → `enumeration`
- **uid** → `uid`

## 📦 rating
- **calificacion** → `integer`
- **usuario** → `relation` (relación con plugin::users-permissions.user)
- **club** → `relation` (relación con api::club.club)
- **producto** → `relation` (relación con api::producto.producto)
- **curso** → `relation` (relación con api::curso.curso)
- **timestamp** → `datetime`
- **tipo** → `string`
- **resena** → `text`

## 📦 Reacciones
- **listado** → `json`
- **tipo** → `enumeration`
- **comentario** → `boolean`
- **respuesta** → `boolean`
- **evento_id** → `relation` (relación con api::evento.evento)
- **enlace_id** → `relation` (relación con api::enlace.enlace)
- **comentario_id** → `relation` (relación con api::comentario-publicacion.comentario-publicacion)

## 📦 registrobitacora
- **usuario_email** → `string`
- **club** → `relation` (relación con api::club.club)
- **timestamp** → `datetime`
- **texto** → `text`
- **media** → `media`
- **documentos** → `media`
- **observaciones** → `text`
- **status** → `string`
- **tipo** → `string`
- **codigoplanta** → `string`
- **registrojardinero** → `boolean`
- **usuario** → `relation` (relación con plugin::users-permissions.user)
- **plantas** → `relation` (relación con api::planta.planta)

## 📦 resenas
- **usuario** → `relation` (relación con plugin::users-permissions.user)
- **producto** → `relation` (relación con api::producto.producto)
- **comentario** → `text`
- **timestamp** → `datetime`
- **carrito** → `relation` (relación con api::carrito.carrito)
- **curso_id** → `relation` (relación con api::curso.curso)
- **club_id** → `relation` (relación con api::club.club)
- **status** → `enumeration`
- **observaciones** → `text`
- **evento_id** → `relation` (relación con api::evento.evento)
- **tipo** → `enumeration`

## 📦 respuesta
- **pregunta** → `relation` (relación con api::pregunta-producto.pregunta-producto)
- **respuesta** → `string`
- **timestamp** → `datetime`
- **publicada** → `boolean`

## 📦 Servicios
- **titulo** → `string`
- **descripcion** → `text`
- **imagen** → `media`
- **precio_fijo** → `boolean`
- **precio** → `decimal`
- **prestador** → `relation` (relación con plugin::users-permissions.user)
- **slug** → `uid`
- **descripcion_precio** → `text`

## 📦 Site_setting
- **labory_to_pesos_exchange_rate** → `decimal`

## 📦 Skill
- **name** → `string` *(requerido)*
- **description** → `text`
- **is_active** → `boolean`
- **todos** → `relation` (relación con api::todo.todo)
- **usuarios** → `relation` (relación con plugin::users-permissions.user)

## 📦 solicitudafiliacion
- **usuario** → `relation` (relación con plugin::users-permissions.user)
- **club** → `relation` (relación con api::club.club)
- **solicitada** → `datetime`
- **pago_inicial** → `relation` (relación con api::pago.pago)
- **status** → `string`
- **afiliacionpagada** → `boolean`
- **metadata** → `json`
- **kit_entregas** → `integer`
- **kit_entregados** → `integer`
- **luz_activada** → `boolean`
- **afiliado** → `datetime`

## 📦 solicitudplanta
- **usuario** → `relation` (relación con plugin::users-permissions.user)
- **club** → `relation` (relación con api::club.club)
- **timestamp** → `datetime`
- **fechasolicitada** → `datetime`
- **status** → `string`
- **gramos** → `decimal`
- **fechaentregada** → `datetime`
- **plantas** → `relation` (relación con api::planta.planta)

## 📦 Stores
- **name** → `string`
- **users_permissions_user** → `relation` (relación con plugin::users-permissions.user)
- **email** → `string`
- **stripeAccountId** → `string`
- **stripeOnboarded** → `boolean`
- **stripeChargesEnabled** → `boolean`
- **stripePayoutsEnabled** → `boolean`
- **terminado** → `boolean`
- **slug** → `string`
- **direccion** → `relation` (relación con api::direccion.direccion)
- **cp** → `string`
- **localidad** → `string`
- **esquema_impuestos** → `enumeration`
- **imagen** → `media`
- **preguntas_productos** → `relation` (relación con api::pregunta-producto.pregunta-producto)
- **paso** → `integer`
- **nombre_bancario** → `string`
- **clabe_bancaria** → `string`
- **banco** → `string`

## 📦 store-categories
- **nombre** → `string`
- **descripcion** → `text`
- **imagen** → `media`
- **slug** → `string`

## 📦 tasks-completed
- **idx** → `uid`
- **agencia** → `relation` (relación con api::agencia.agencia)
- **tipo** → `enumeration`
- **status** → `enumeration`
- **media** → `json`
- **notes** → `text`
- **score** → `integer`
- **reviewed_by** → `relation` (relación con plugin::users-permissions.user)
- **resolved_at** → `datetime`
- **payment_status** → `enumeration`
- **todo** → `relation` (relación con api::todo.todo)
- **avances** → `json`
- **usuario** → `relation` (relación con plugin::users-permissions.user)
- **enlaces** → `json`
- **calificaciones** → `json`
- **apelaciones** → `json`
- **pagos_laborys** → `json`
- **pagos_efectivo** → `json`
- **validaciones** → `json`
- **titulo** → `string`
- **descripcion** → `text`

## 📦 Taxi-debt
- **viaje** → `relation` (relación con api::viaje.viaje)
- **adeudo** → `float`
- **costo_viaje** → `float`
- **pagado** → `boolean`
- **conductor** → `relation` (relación con plugin::users-permissions.user)
- **pasajero** → `relation` (relación con plugin::users-permissions.user)
- **conductor_email** → `email`
- **pasajero_email** → `email`
- **costo_efectivo** → `float`
- **fecha_viaje** → `datetime`
- **origen_direccion** → `text`
- **destino_direccion** → `text`

## 📦 Tasks
- **idx** → `uid`
- **creador** → `relation` (relación con plugin::users-permissions.user)
- **areas** → `relation` (relación con api::area.area)
- **subareas** → `relation` (relación con api::area.area)
- **skills** → `relation` (relación con api::skill.skill)
- **tipo** → `enumeration`
- **ambito** → `enumeration`
- **nivel** → `enumeration`
- **grupo** → `string`
- **recurrencia** → `enumeration`
- **descripcion** → `text`
- **enlaces** → `json`
- **subtareas** → `string`
- **status** → `enumeration`
- **recompensa** → `decimal`
- **minutos_desarrollo** → `integer`
- **fecha_publicacion** → `datetime`
- **fecha_entrega** → `datetime`
- **vence** → `boolean`
- **has_deadline** → `boolean`
- **due_date** → `datetime`
- **is_periodic** → `boolean`
- **reward_laborys** → `decimal`
- **reward_cash** → `decimal`
- **created_by** → `relation` (relación con plugin::users-permissions.user)
- **algoritmo** → `text`
- **oraculos_validadores** → `json`
- **anotaciones** → `text`
- **titulo** → `string`
- **usuario_email** → `string`
- **agencia** → `relation` (relación con api::agencia.agencia)
- **agencianombre** → `string`
- **tareas** → `relation` (relación con api::tarea.tarea)
- **asignador** → `relation` (relación con plugin::users-permissions.user)
- **asignado_a** → `relation` (relación con plugin::users-permissions.user)
- **asignable** → `boolean`

## 📦 triprequest
- **origencoords** → `json`
- **destinocoords** → `json`
- **origendireccion** → `json`
- **destinodireccion** → `json`
- **pasajeromail** → `email`
- **pasajero** → `relation` (relación con plugin::users-permissions.user)
- **travelid** → `string`
- **timestamp** → `datetime`
- **status** → `enumeration`

## 📦 viaje
- **origencoords** → `json`
- **destinocoords** → `json`
- **conductorcoords** → `json`
- **origendireccion** → `json`
- **destinodireccion** → `json`
- **pasajeromail** → `email`
- **conductormail** → `email`
- **solicitado** → `datetime`
- **iniciado** → `datetime`
- **concluido** → `datetime`
- **travelid** → `string`
- **observaciones** → `text`
- **costo** → `decimal`
- **pagadoefectivo** → `decimal`
- **pagadolabory** → `decimal`
- **calificacionconductor** → `integer`
- **calificacionpasajero** → `integer`
- **track** → `json`
- **status** → `string`
- **pasajero** → `relation` (relación con plugin::users-permissions.user)
- **conductor** → `relation` (relación con plugin::users-permissions.user)
- **isTripFree** → `boolean`

## 📦 wallet
- **address** → `string`
- **user** → `relation` (relación con plugin::users-permissions.user)
- **labory_balance** → `decimal`
- **cit_history** → `json`
- **cit_balance** → `decimal`
- **status** → `string`
- **agency** → `relation` (relación con api::agencia.agencia)
- **isagency** → `boolean`

## 📦 WorldCoinWallet
- **CarteraIdx** → `string`
- **ammount** → `decimal`
- **user_idd** → `relation` (relación con admin::user)
- **genesis** → `boolean`
- **user_id** → `email`

