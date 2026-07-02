# Ciudadan Frontend

## Visión general

Este proyecto es la interfaz web de la plataforma Ciudadan. Está desarrollado con React y ofrece una experiencia de usuario orientada a múltiples servicios: movilidad, marketplace, comunidad, membresías, contenidos, pagos y más.

El frontend está pensado para consumir un backend Strapi y otros servicios auxiliares, integrando autenticación, mapas, sockets, pagos, carga de archivos y navegación por secciones de negocio.

## Stack principal

- React 18
- Create React App con CRACO
- React Router
- Material UI / Emotion
- Bootstrap
- Socket.IO Client
- Auth0
- React Hook Form
- Google Maps / Places APIs
- Capacitor para aplicaciones móviles

## Estructura del proyecto

- [src/App.js](../src/App.js): punto de entrada principal de la aplicación.
- [src/Routes](../src/Routes): definición de rutas y navegación.
- [src/Pages](../src/Pages): páginas de negocio y módulos principales.
- [src/components](../src/components): componentes reutilizables y vistas específicas.
- [src/Contexts](../src/Contexts): contextos globales para autenticación, notificaciones y carrito.
- [src/hooks](../src/hooks): hooks para integrar APIs, mapas, sockets y lógica reutilizable.
- [src/services](../src/services): clientes y servicios para llamadas externas.
- [src/utils](../src/utils): utilidades para Strapi, usuarios, peticiones y helpers varios.
- [src/styles](../src/styles): estilos y recursos visuales.
- [public](../public): assets estáticos y archivos públicos.
- [android](../android): proyecto Android generado para Capacitor.

## Requisitos

Antes de correr el proyecto, asegúrate de tener instalado:

- Node.js 18 o superior
- npm 8 o superior

## Inicio rápido

1. Entrar al directorio del proyecto:

```bash
cd ciudadan_frontend
```

2. Instalar dependencias:

```bash
npm install
```

3. Crear un archivo `.env` con las variables de entorno necesarias.

4. Iniciar la aplicación en modo desarrollo:

```bash
npm start
```

La aplicación quedará disponible normalmente en:

```text
http://localhost:3000
```

## Variables de entorno

El frontend depende de varias variables para conectarse a APIs y servicios externos. Algunas de las más relevantes son:

```env
REACT_APP_STRAPI_URL=http://localhost:1337
REACT_APP_STRAPI_TOKEN=tu_token
REACT_APP_SOCKET_URL=http://localhost:3033
REACT_APP_GOOGLE_MAPS_API_KEY=tu_clave
REACT_APP_GEOCODING_KEY=tu_clave
REACT_APP_AI_URL=http://localhost:5000
```

## Funcionalidades principales

El frontend incluye secciones para:

- autenticación y perfiles de usuario,
- registro de pasajeros y conductores,
- viajes y movilidad,
- marketplace y carrito,
- membresías y pagos,
- contenidos y cursos,
- comunidad y referidos,
- notificaciones en tiempo real,
- integración con mapas y geolocalización.

## Flujo general

1. El usuario accede a la interfaz desde la ruta principal.
2. El frontend consume la API del backend Strapi para cargar contenido y datos dinámicos.
3. Algunas vistas utilizan sockets para actualizar información en tiempo real.
4. El sistema integra servicios externos como Google Maps, Auth0 y pagos.

## Desarrollo mobile

El proyecto también soporta compilación para dispositivos móviles mediante Capacitor.

```bash
npx cap sync
```

Y para Android:

```bash
npx cap open android
```

## Scripts disponibles

```bash
npm start
npm run build
npm test
npm run dev
```

## Notas importantes

- La aplicación usa rutas muy amplias y modulares, con múltiples vistas agrupadas por dominio de negocio.
- Gran parte de la lógica se encuentra en hooks y contextos, lo que facilita la reutilización.
- Para trabajar correctamente, es importante tener el backend Strapi corriendo y configuradas las variables de entorno adecuadas.
