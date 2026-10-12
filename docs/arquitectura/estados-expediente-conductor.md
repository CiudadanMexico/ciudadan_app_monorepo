# Estados del expediente del conductor

Fecha: 2026-10-09

## vehicle.status (unidad + documentación)

```text
preregistrado
  │  lifecycle afterCreate/afterUpdate: todos los REQUIRED_DOC_FIELDS con archivo
  ▼
documento_completo
  │  POST /vehicles/:id/open-review  (verificador)
  ▼
en_revision ──┬── POST close-review {aprobado} ──▶ aprobado (validated_by/at)
              └── POST close-review {suspenso}  ──▶ suspenso
aprobado ──(incidencia futura)──▶ suspenso ──▶ reevaluacion ──▶ aprobado
```

`REQUIRED_DOC_FIELDS` (service): `registration_card`, `insurance_document`,
`vehicle_front_photo`, `vehicle_side_photo`, `vehicle_back_photo`,
`vehicle_interior_photo`.

## driver.status (persona, preexistente — referencia)

`draft → pending_documents → pending_appointment → pending_review →
approved | documents_rejected | rejected | suspended | blocked`.
El expediente vehicular corre en paralelo; la activación para viajes exige
ambos: `driver.approved` + `vehicle.aprobado`.

## Gates

| Transición | Quién decide | Dónde |
|---|---|---|
| `preregistrado → documento_completo` | servidor (lifecycles) | `vehicle/content-types/vehicle/lifecycles.js` |
| `documento_completo → en_revision` | verificador | service `openReview` |
| `en_revision → aprobado/suspenso` | verificador | service `closeReview` |
