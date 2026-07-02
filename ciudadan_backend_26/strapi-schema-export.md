# 📘 Estructura de Colecciones Strapi

## 📦 a
- **a** → `string`
- **demandaamparo** → `media`
- **escritolibrecofepris** → `media`
- **otrosarchivoslegales** → `media`
- **club** → `relation` (relación con api::club.club)

## 📦 agencia
- **idx** → `uid`
- **localidad** → `json`
- **nombre** → `string`
- **miembros** → `string`
- **miembros_json** → `json`
- **members** → `relation` (relación con admin::user)

## 📦 Area
- **nombre** → `string`
- **nivel** → `integer`
- **sup** → `integer`
- **creador** → `relation` (relación con admin::user)
- **timestamp** → `datetime`
- **todo** → `relation` (relación con api::todo.todo)

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

## 📦 Cartera
- **laborysGanados** → `decimal`
- **laborysSaldo** → `decimal`
- **ciudadanTokens** → `decimal`
- **ciudadanRendimientos** → `decimal`
- **user_id** → `relation` (relación con admin::user)

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
- **status_legal** → `integer`
- **archivos_legal** → `json`
- **foto_de_perfil** → `media`
- **fotos** → `media`
- **descripcion** → `text`
- **servicios** → `json`
- **users_permissions_user** → `relation` (relación con plugin::users-permissions.user)
- **auth_name** → `string`
- **horarios** → `json`
- **whatsapp** → `string`
- **activo** → `boolean`
- **tipo** → `enumeration`

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

## 📦 configuraciones_usuarios
- **usuario** → `relation` (relación con plugin::users-permissions.user)
- **email** → `email`
- **configuraciones** → `json`

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

## 📦 Direcciones
- **direccion** → `json`
- **coords** → `json`
- **cp** → `string`
- **ciudad** → `string`
- **estado** → `string`
- **user_email** → `email`
- **store_id** → `relation` (relación con api::store.store)
- **observaciones** → `string`
- **event_id** → `relation` (relación con api::evento.evento)
- **activa** → `boolean`
- **club** → `relation` (relación con api::club.club)

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

## 📦 GenWallet
- **WalletIdx** → `string`
- **Coin** → `string`

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

## 📦 messages
- **text** → `text`
- **sender_id** → `relation` (relación con plugin::users-permissions.user)
- **receiver_id** → `relation` (relación con plugin::users-permissions.user)
- **timestamp** → `datetime`
- **status** → `enumeration`
- **archivos** → `media`

## 📦 Notificaciones
- **cuerpo** → `blocks`
- **user_email** → `string`
- **usuario** → `relation` (relación con plugin::users-permissions.user)
- **timestamp** → `datetime`
- **leida** → `boolean`
- **status** → `enumeration`
- **tipo** → `string`

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

## 📦 PreguntasProductos
- **producto** → `relation` (relación con api::producto.producto)
- **pregunta** → `text`
- **respuesta** → `text`
- **fechapregunta** → `datetime`
- **fecharespuesta** → `datetime`
- **status** → `enumeration`
- **usuario** → `relation` (relación con plugin::users-permissions.user)
- **store** → `relation` (relación con api::store.store)

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

## 📦 Publicaciones
- **contenido** → `blocks`
- **autor** → `relation` (relación con plugin::users-permissions.user)
- **archivos** → `media`
- **timestamp** → `datetime`
- **publicado** → `enumeration`
- **uid** → `uid`

## 📦 Reacciones
- **listado** → `json`
- **tipo** → `enumeration`
- **comentario** → `boolean`
- **respuesta** → `boolean`
- **evento_id** → `relation` (relación con api::evento.evento)
- **enlace_id** → `relation` (relación con api::enlace.enlace)
- **comentario_id** → `relation` (relación con api::comentario-publicacion.comentario-publicacion)

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

## 📦 Servicios
- **titulo** → `string`
- **descripcion** → `text`
- **imagen** → `media`
- **precio_fijo** → `boolean`
- **precio** → `decimal`
- **prestador** → `relation` (relación con plugin::users-permissions.user)
- **slug** → `uid`
- **descripcion_precio** → `text`

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

## 📦 store-categories
- **nombre** → `string`
- **descripcion** → `text`
- **imagen** → `media`
- **slug** → `string`

## 📦 tarea
- **idx** → `uid`
- **agencia** → `relation` (relación con api::agencia.agencia)
- **tipo** → `enumeration`
- **todo** → `relation` (relación con api::todo.todo)
- **avances** → `json`
- **usuario** → `relation` (relación con admin::user)
- **enlaces** → `json`
- **calificaciones** → `json`
- **apelaciones** → `json`
- **pagos_laborys** → `json`
- **pagos_efectivo** → `json`
- **validaciones** → `json`
- **titulo** → `string`
- **descripcion** → `text`

## 📦 todo
- **idx** → `uid`
- **creador** → `relation` (relación con admin::user)
- **areas** → `relation` (relación con api::area.area)
- **subareas** → `relation` (relación con api::area.area)
- **tipo** → `enumeration`
- **ambito** → `enumeration`
- **nivel** → `enumeration`
- **grupo** → `string`
- **habilidades** → `json`
- **recurrencia** → `enumeration`
- **descripcion** → `text`
- **enlaces** → `json`
- **subtareas** → `string`
- **status** → `enumeration`
- **pagos_laborys** → `decimal`
- **pagos_efectivo** → `decimal`
- **recompensa** → `decimal`
- **minutos_desarrollo** → `integer`
- **fecha_publicacion** → `datetime`
- **fecha_entrega** → `datetime`
- **vence** → `boolean`
- **algoritmo** → `text`
- **oraculos_validadores** → `json`
- **anotaciones** → `text`
- **titulo** → `string`
- **usuario_email** → `string`
- **agencia** → `relation` (relación con api::agencia.agencia)
- **area** → `string`
- **agencianombre** → `string`

## 📦 WorldCoinWallet
- **CarteraIdx** → `string`
- **ammount** → `decimal`
- **user_idd** → `relation` (relación con admin::user)
- **genesis** → `boolean`
- **user_id** → `email`

