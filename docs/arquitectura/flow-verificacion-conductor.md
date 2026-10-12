# Flujo de verificación del conductor (documental + física)

Fecha: 2026-10-09 · Complementa a `expediente-conductor.md` y a
`docs/TAXIS-VERIFICACION-CONDUCTORES-FASES.md` (no lo sustituye).

## Actores

- **Conductor**: sube documentos desde `/taxis/conductor/expediente`.
- **Líder Verificador** (roles `admin|verificador|socio`, policy
  `global::is-verificador`): lee tarjeta, abre/cierra revisión, hace captura
  en vivo, registra consultas oficiales, ejecuta acciones finales.

## Paso 1 — Revisión documental

1. El líder abre `/validations/:validationId/review` (`DriverVerificationPage`).
2. El bloque nuevo "Expediente vehicular" llama
   `GET /api/vehicle/card/:driverId` con su token Auth0. Solo responde si el
   expediente está en `documento_completo|en_revision|aprobado`; en
   `preregistrado|suspenso|reevaluacion` devuelve 403 y la UI muestra
   "aún no auditable".
3. El botón "Abrir revisión vehicular" (`POST .../open-review`) pone el
   expediente en `en_revision` (`documento_completo` requerido).

## Paso 2 — Verificación física (en persona, preexistente)

Sin cambios: `LiveCaptureWizard` (5 fotos + video 15–30 s + GPS/fecha/nonce/
hash), `ExternalVerificationDialog` (INE/REPUVE/licencia),
`RiskAssessmentPanel`, `DocumentGrid` (aprueba/rechaza cada evidencia
`cars-evidences/:id/review`), `ReviewerObservations`, `OperativeChecklist`.

## Paso 3 — Cierre

- Vehículo: "Aprobar vehículo" / "Suspender vehículo"
  (`POST .../close-review {outcome, observation}`) → `aprobado|suspenso` con
  `validated_by/at`. Botones habilitados solo en `en_revision` y validación
  no cerrada.
- Conductor: `FinalActions` (`POST .../complete {approve|reject|
  request_resub}`) — flujo preexistente, intacto.

## Reglas de seguridad

- El conductor jamás ve `card/` de otros: `find` recorta a su usuario/agencia.
- Solo verificadores leen `card/` (policy + gate de estado auditable).
- El frontend nunca envía estados: `open/closeReview` validan la transición
  en el service (`documento_completo→en_revision→aprobado|suspenso`).
