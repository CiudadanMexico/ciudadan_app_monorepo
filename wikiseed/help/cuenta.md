# Cuenta y Perfil

Guía detallada de crear tu cuenta, gestionar tu perfil, favoritos, referidos y preferencias.

## Contenido
- [[Cuenta#Crear una cuenta y entrar|Crear una cuenta y entrar]]
- [[Cuenta#Tu perfil|Tu perfil]]
- [[Cuenta#Ubicación y notificaciones|Ubicación y notificaciones]]
- [[Cuenta#Favoritos|Favoritos]]
- [[Cuenta#Código de referido|Código de referido]]
- [[Cuenta#Preguntas frecuentes|Preguntas frecuentes]]

---

## Crear una cuenta y entrar

Ciudadan usa **Auth0** para el inicio de sesión (cuenta social, p.ej. Google). No creas una
contraseña propia.

- **Entrar:** pulsa **Login / Entrar** en la barra superior.
- **Registrarte:** se abre la ventana de Auth0; elige tu proveedor o crea cuenta. Al terminar
  tu usuario (`up_users`) se crea solo, identificado por tu **email**.
- **Cerrar sesión:** pulsa tu avatar → **Salir / Logout**.

### Registros específicos
| Registro | Ruta |
|---|---|
| Conductor de taxi | `/taxis/conductor/registro` · `/taxis/conductor/preregistro` |
| Pasajero | `/taxis/pasajero/registro` |
| Vendedor / tienda | `/registro-vendedor` |
| Restaurante | `/comida/afiliar-restaurante` |
| Comunidad nueva | `/crear-comunidad` |
| Unirme a comunidad | `/integrarme-comunidad` |

---

## Tu perfil

- **Ver / editar:** `/perfil/:username` (o el icono de usuario). Ves y modificas tu nombre,
  email, foto, dirección/ubicación y datos de verificación.
- **QR personal:** `/miqr` muestra tu código QR (para afiliaciones y movilidad).
- **Áreas y habilidades (CoWork):** en tu perfil puedes:
  - Proponer una **subárea** nueva si no existe (carrera/oficio).
  - Subir **documentos de verificación** de tu área para que un socio/verificador la apruebe.

---

## Ubicación y notificaciones

- **Ubicación:** `/ubicacion` — indicas tu dirección con el mapa (Google). Se usa para
  envíos y para encontrar servicios/cercanía.
- **Notificaciones:** `/notificaciones` — bandeja con tus avisos; `Notificacion` para el detalle.
  Las del tiempo real llegan por socket (taxis, mensajes).

---

## Favoritos

Puedes guardar **productos, cursos, contenidos y clubs**.
- **Añadir:** en la ficha del elemento pulsa el **corazón** ❤️ (`toggleFavorito`).
- **Ver / quitar:** `/favoritos` (y `/favoritos/*`) — lista y eliminas favoritos.

---

## Código de referido

- **Generar tu enlace:** en `/referir` (o `/registrar`) obtienes tu **código de referido** y
  enlace personal.
- **Ganar comisiones:** cuando alguien se registra con tu enlace, se vuelve tu **referido**;
  en Referidos ves su historial de pagos y tus comisiones (`CodigoReferido`,
  `HistorialPagosReferidos`).
- También sirve para **invitar/vincular** a un club (`/referir/*`, `/agregar-club/:club`).

---

## Preguntas frecuentes

- **¿Necesito contraseña?** No: entras con Auth0 (cuenta social).
- **¿Qué es mi email?** Es tu ID en toda la plataforma.
- **¿Dónde gestiono mis datos?** En tu perfil y en `/ubicacion`.
- ¿Dudas generales? → [[Membresias|Membresías]], [[Marketplace|Marketplace]],
  [[Taxis|Taxis]], o vuelve al [[Indice|índice]].