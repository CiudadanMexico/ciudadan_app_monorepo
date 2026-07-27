# Ciudadan Backend 26

## Visión general

Este proyecto corresponde al backend principal de la plataforma Ciudadan. Está construido sobre Strapi 4 y sirve como punto central para gestionar contenido, usuarios, módulos de negocio, integraciones de pagos y servicios auxiliares para experiencias en tiempo real.

El repositorio combina:
- un backend principal basado en Strapi,
- un servicio de middleware para proxy de archivos y APIs,
- un servicio de sockets para eventos y comunicación en tiempo real,
- un subproyecto de comercio basado en Vendure.

## Stack principal

- Node.js 18 LTS
- Strapi 4.25
- Express
- Socket.IO
- Stripe
- Vendure
- MySQL / PostgreSQL / SQLite
- Docker

## Herramientas y tecnologías utilizadas

Este proyecto usa una combinación de herramientas para cubrir backend, integraciones, archivos y servicios auxiliares:

- Strapi: CMS y API headless para gestionar contenido y modelos de negocio.
- Node.js y npm: entorno de ejecución y gestión de dependencias.
- Express: servidor base para servicios auxiliares y proxy de peticiones.
- Socket.IO: comunicación en tiempo real para eventos, notificaciones y flujos interactivos.
- Stripe: procesamiento de pagos y suscripciones.
- Vendure: motor de comercio para la parte de marketplace.
- Docker: contenedorización para despliegue y ejecución del backend.
- MySQL / PostgreSQL / SQLite: sistemas de base de datos soportados según el entorno.
- GraphQL: integración disponible a través del plugin de Strapi.

## Estructura del proyecto

- [src/api](../src/api): módulos y recursos de negocio del backend. Aquí se encuentran entidades como publicaciones, viajes, pagos, productos, usuarios y otros flujos específicos de la plataforma.
- [config](../config): configuración de Strapi, base de datos, middlewares y servidor.
- [middleware/src](../middleware/src): servicio Express para proxy de uploads, media y rutas auxiliares.
- [socket-service](../socket-service): servicio independiente para sockets, chatbot, rutas de viaje y lógica de integración.
- [market](../market): proyecto de e-commerce basado en Vendure.
- [seed](../seed): scripts de carga y actualización de datos.
- [docs](./): documentación específica del proyecto.

## Requisitos

Antes de iniciar el proyecto asegúrate de tener instalado:

- Node.js 18 o superior
- npm 6 o superior
- Una base de datos disponible (o usar SQLite para desarrollo rápido)

## Inicio rápido

1. Entrar al directorio del proyecto:

```bash
cd ciudadan_backend_26
```

2. Instalar dependencias:

```bash
npm install
```

3. Crear un archivo de variables de entorno `.env` con los valores necesarios para tu entorno.

4. Iniciar Strapi en modo desarrollo:

```bash
npm run develop
```

El backend quedará disponible normalmente en:

```text
http://localhost:1337
```

## Variables de entorno

El proyecto espera varias variables de entorno para funcionar correctamente. Algunas de las más importantes son:

```env
HOST=0.0.0.0
PORT=1337
APP_KEYS=key1,key2

DATABASE_CLIENT=sqlite
DATABASE_FILENAME=.tmp/data.db

# Si usas MySQL/PostgreSQL, ajusta estas variables:
# DATABASE_HOST=localhost
# DATABASE_PORT=3306
# DATABASE_NAME=ciudadan
# DATABASE_USERNAME=usuario
# DATABASE_PASSWORD=contraseña
# DATABASE_URL=mysql://usuario:contraseña@localhost:3306/ciudadan

STRAPI_URL=http://localhost:1337
STRAPI_API_TOKEN=tu_token

STRIPE_SECRET_KEY=tu_clave
STRIPE_PRICE_ID=tu_precio
STRIPE_SUCCESS_URL=http://localhost:3000/success
STRIPE_CANCEL_URL=http://localhost:3000/cancel
```

> Si el proyecto se ejecuta con SQLite, no es necesario configurar la conexión MySQL/PostgreSQL.

## Servicios complementarios

### Middleware

Este servicio actúa como capa intermedia para proxy de uploads y archivos.

```bash
cd middleware
npm install
node src/index.js
```

### Socket service

Sirve para integraciones en tiempo real, notificaciones, chatbot y manejo de eventos de viaje.

```bash
cd socket-service
npm install
node server.js
```

### Market

Subproyecto de comercio electrónico basado en Vendure.

```bash
cd market
npm install
npm run dev
```

## Despliegue

También se incluye un Dockerfile para ejecutar el backend en contenedores.

```bash
docker build -t ciudadan-backend .
docker run -p 1337:1337 ciudadan-backend
```

## Documentación relacionada

- [AGENDA-VALIDATION-SYNC.md](AGENDA-VALIDATION-SYNC.md)
- [DATABASE-SCHEMA.md](DATABASE-SCHEMA.md)
- [TAREAS-CRUD-PERMISOS.md](TAREAS-CRUD-PERMISOS.md)

## Notas importantes

- Este backend no es un starter básico de Strapi; incluye lógica de negocio propia y módulos específicos de la plataforma.
- La estructura modular en [src/api](../src/api) facilita extender funcionalidades sin modificar el núcleo de Strapi.
- Para cambios de esquema o integraciones de terceros, conviene revisar la documentación de base de datos y los scripts de seed.
