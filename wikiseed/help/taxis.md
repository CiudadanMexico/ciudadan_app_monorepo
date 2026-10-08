# Taxis y Movilidad

El módulo de **taxis** conecta **pasajeros** y **conductores** en tiempo real (Socket.IO):
pedir viajes, calcular tarifas, verificar conductores y realizar el trayecto.

## Contenido
- [[Taxis#Cómo funciona|Cómo funciona]]
- [[Taxis#Como pasajero|Como pasajero]]
- [[Taxis#Como conductor|Como conductor]]
- [[Taxis#Pre-registro paso a paso|Pre-registro paso a paso]]
- [[Taxis#Verificación presencial|Verificación presencial]]
- [[Taxis#Operar como conductor|Operar como conductor]]
- [[Taxis#Tarifas y pago|Tarifas y pago]]

---

## Cómo funciona

- Pasajeros y conductores se conectan por **Socket.IO**. El **socket-service** maneja ofertas
  de viaje (`ofertaviaje`), ubicación en vivo (`driver-location`) y actualizaciones
  (`trip-update`).
- Todo viaje queda registrado en Strapi (`viaje`, `triprequest`).

## Como pasajero

1. **Entra:** `/taxis` (`TaxisRoute`).
2. **Registra tus datos:** `/taxis/pasajero/registro`.
3. **Pide un viaje:** indicas **origen** y **destino** (mapa). Se **calcula la tarifa** en vivo.
4. Un conductor acepta tu **oferta**. Sigues el avance en tiempo real (mapa, posición).
5. Al llegar confirmas el **pago** (efectivo, laboris u otro) y **calificas** al conductor.
- También puedes dejarte **invitar** (viaje gratis promocional, `free_trips`).

## Como conductor

1. **Pre-regístrate:** `/taxis/conductor/preregistro` (o `/taxis/conductor/registro`).
2. Completa el **formulario por pasos** (cuenta, documentos, vehículo, cita).
3. Asiste a la **cita presencial** de **verificación** (ver más abajo).
4. Cuando estés **aprobado**, **entras en línea**: `/taxis/conductor/esperando`.
5. Recibes/aceptas **ofertas**, realizas el viaje y al llegar confirmas pago y calificación.

## Pre-registro paso a paso

El pre-registro (`FormPreRegisterForSteps` / `PreRegistroConductor2`) te guía por pasos:

1. **Cuenta:** email/whatsapp + **código de verificación** (WhatsApp).
2. **Datos personales:** nombre(s), apellidos, fecha de nacimiento, **CURP**, **RFC**,
   teléfono de emergencia, dirección, CP, estado, municipio.
3. **Documentos personales:** foto de perfil, **selfie de verificación**, **INE frente/tras**,
   **licencia frente/tras**, comprobante de domicilio.
4. **Vehículo:** marca, modelo, año, color, **placa**, **VIN**, tipo, capacidad.
   **Fotos del vehículo**: frente, lateral, atrás, interior; **tarjeta de circulación** y
   **seguro**.
5. **Cita presencial:** eliges fecha para la verificación en persona.

Puedes guardar avances y continuar luego (borrador persistente).

## Verificación presencial

- Un **verificador** revisa tu perfil en `/validations/:validationId/review`
  (`DriverVerificationPage`).
- Compara: **biométrico** (selfie), **documentos** (INE, licencia, comprobante), **datos del
  vehículo** y evidencia. Lleva un **checklist** y puede aceptar, pedir reenvío o rechazar.
- Se guarda un **historial de auditoría** (`cars-validation`, `cars-evidence`,
  `cars-validation-event`).

## Operar como conductor

- En `Conductor` (esperando viaje) recibes **ofertas**. Aceptas y vas por el pasajero.
- Confirmas **inicio** y **fin** del viaje.
- Al llegar: confirmas pago, y ambos se **califican**.

## Tarifas y pago

- La tarifa se calcula con: **costo base + por km + por min** (+ mínimo) sobre la ruta
  (Google Directions) con respaldo Haversine. Se lee de la config de tarifas en Strapi.
- Pago en **efectivo**, **laborys** (`pagadolabory`) o tarjeta, según el viaje.
- Hay manejo de **adeudos** (`taxi-debt`) si el pasajero no paga al momento.

---

Volver: [[Indice|índice]] · [[Cuenta|Cuenta]] · [[Gana|Gana]] · [[Cartera|Cartera]].