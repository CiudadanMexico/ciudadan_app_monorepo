# Comunidad y Clubs

La **comunidad** es el espacio social/de difusión, y los **clubs** agrupan miembros con
gestión de plantas, bitácoras y verificación legal.

## Contenido
- [[Comunidad#Comunidad y mural|Comunidad y mural]]
- [[Comunidad#Anuncios de comunidad|Anuncios de comunidad]]
- [[Comunidad#Clubs (Marihuanas Club)|Clubs (Marihuanas Club)]]
- [[Comunidad#Plantas y bitácoras|Plantas y bitácoras]]
- [[Comunidad#Verificación legal|Verificación legal]]

---

## Comunidad y mural

- **Ver comunidad:** `/comunidad` (`ComunidadRoute`) — el feed/mural.
- **Crear una comunidad:** `/crear-comunidad`.
- **Unirme:** `/integrarme-comunidad`.
- En el mural la gente comparte **publicaciones**, con **comentarios** y **reacciones**.

## Anuncios de comunidad

- **Publicar un anuncio:** `/comunidad/nuevo-anuncio-programado` — eliges tipo
  (texto/imagen/video/audio), duración, fechas y horario de publicación.
- **Gestionar tus anuncios:** `/comunidad/mis-anuncios` con pestañas:
  - `programados` (próximos), `historial` (publicados), `configuracion`.
- **Referir/invitar:** `/referir` (ver [[Cuenta#Código de referido|referido]]).

## Clubs (Marihuanas Club)

- Un **club** agrupa a socios y tiene: nombre, foto, descripción, servicios, `horarios`,
  `whatsapp`, tipo (`cultivo`/`consumo`/`ambos`), ubicación y datos legales.
- **Afiliación / membresía:** ver [[Membresias|Membresías]]. Hay flujo de **solicitud de
  afiliación** (`solicitudafiliacion`): pago inicial, estatus, entrega de **kit jardinero**
  (kit básico/full), activación de luz, fecha de afiliación.
- **Buscar/ver clubs:** en la comunidad; cada club tiene su página con su información y
  fotos/documentos.

## Plantas y bitácoras

Dentro de un club puedes llevar el registro de **plantas** y **bitácoras**:
- **Planta:** origen (semilla/esqueje), color, fechas (inicia vida, cortada), estados
  (`secado`, `curado`), gramos (cosechados, en curación, en existencia), **QR** propio,
  fotos/videos y su **códiigo**.
- **Bitácora:** registros del club; `registrobitacora` por planta/jardinero con texto,
  media y observaciones.

## Verificación legal

- **Trámites COFEPRIS** (`cofepristramite`): subir INE frente/tras, acuse, resolución,
  escrito libre. Estado: concedido/negado/concluido.
- **Amparo** en tu perfil: autoamparo, membresía consumo/cultivo, jardinero, cliente, otro.
- Estos datos se guardan en tu usuario (`status_legal`, `foliocofepris`, documentos).

---

Volver: [[Indice|índice]] · [[Cuenta|Cuenta]] · [[Membresias|Membresías]] ·
[[Marketplace|Marketplace]].