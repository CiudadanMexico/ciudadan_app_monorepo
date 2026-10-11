# Expediente del conductor (driver ↔ vehicle + tarjeta de circulación)

Fecha: 2026-10-09 · Estado: implementado (prototipo funcional, sin mergear)

## 1. Modelo

Dos colecciones separadas, una por responsabilidad:

- `api::driver.driver` — persona conductora (datos personales, licencia,
  fotos de identidad, estado del proceso `draft…approved`, `vehicle` OneToOne).
- `api::vehicle.vehicle` — unidad operativa + documentación: tarjeta de
  circulación (`registration_card`, media múltiple frente/reverso), seguro
  (`insurance_document`), 4 fotos de la unidad, `plates`, `vin_number`,
  `brand/model/year/color/vehicle_type/passenger_capacity`,
  `concession_reference`, `status` (`preregistrado | documento_completo |
  en_revision | aprobado | suspenso | reevaluacion`, default `preregistrado`),
  `validated_by/datetime`, `observation`, `user/agency/driver`.

Relación:

```text
driver.vehicle ──oneToOne (owner, inversedBy:"driver")──▶ api::vehicle.vehicle
vehicle.driver ──oneToOne (inverse, mappedBy:"vehicle")──▶ api::driver.driver
```

Notas de Strapi 4 verificadas en vivo:

- El content-type va en `content-types/vehicle/schema.json` con
  `info.singularName/pluralName`; un `content-types/vehicle.json` suelto
  NO se carga (error "Metadata for api::vehicle.vehicle not found").
- `inversedBy:"vehicle"` en `vehicle.user/agency` rompe el arranque porque el
  user/agencia no tienen campo `vehicle` — se dejaron unidireccionales.
- `vehicle.driver` usa `mappedBy` (warning explícito de Strapi si se usa
  `inversedBy` en el lado inverso).

Los campos legacy del vehículo dentro de `driver` (`vehicle_brand`,
`license_plate`, `vin_number`, `vehicle_*_photo`, `vehicle_registration_card`,
…) se conservan para la migración (ver `scripts/migrate-driver-to-vehicle.js`).

## 2. API

| Endpoint | Policy | Quién | Qué hace |
|---|---|---|---|
| `GET /api/vehicles` | `is-authenticated-auth0` | conductor | `find` recortado a `user` propio u `agency` propia; sin sesión → vacío (nunca catálogo anónimo) |
| `GET /api/vehicles/:id` | `is-authenticated-auth0` | dueño | lectura puntual del expediente |
| `GET /api/vehicle/card/:id` | `is-verificador` | líder verificador | tarjeta + expediente solo si `status ∈ {documento_completo, en_revision, aprobado}` |
| `POST /api/vehicles/:id/open-review` | `is-verificador` | líder verificador | `documento_completo → en_revision` (+ `observation`) |
| `POST /api/vehicles/:id/close-review` | `is-verificador` | líder verificador | `en_revision → aprobado \| suspenso` (+ `validated_by/at`) |

Detalle importante de Strapi 4: `createCoreRouter(..., { controllers })` NO
crea rutas — solo ajusta config. Las rutas reales van en
`src/api/vehicle/routes/01-vehicle-custom.js` (`{ routes: [...] }`), mismo
patrón que `verification-audit`.

## 3. Frontend

| Pieza | Archivo | Rol |
|---|---|---|
| `DocumentoCarga` | `src/components/Taxiz/DocumentoCarga.jsx` | subida reutilizable a `POST /api/upload` (FormData `files`, `credentials:include`); devuelve media id vía `onUploaded` |
| `TarjetaCirculacion` | `src/components/Taxiz/TarjetaCirculacion.jsx` | frente/reverso de tarjeta + seguro + referencia de concesión; controlada (`vehicle` + `onFieldChange`) |
| `ExpedienteConductor` | `src/components/Taxiz/ExpedienteConductor.jsx` | "Mi expediente": estado, barra de avance, checklist por sección, PATCH `/api/vehicles/:id` por campo; el backend decide el estado |
| `vehicleExpedienteService` | `src/services/vehicleExpedienteService.js` | `getMyVehicles`, `getVehicleCard`, `openVehicleReview`, `closeVehicleReview` |
| Ruta `/taxis/conductor/expediente` | `src/Routes/index.jsx` | monta `ExpedienteConductor` |
| Botón "Ver mi expediente" | `src/components/Taxis/Conductor.jsx` | navega a `/taxis/conductor/expediente` (junto a "Mis viajes") |
| Widget perfil | `src/components/Usuarios/Perfil.jsx` | tarjeta "Conductor: mi expediente" → expediente + panel |
| Panel verificador | `src/Pages/Taxis/DriverVerificationPage.jsx` | bloque "Expediente vehicular — tarjeta de circulación": `VehicleDataCard` + chip de estado + abrir/aprobar/suspender vehículo vía los endpoints nuevos |

El panel documental preexistente (DocumentGrid/cars-evidences,
`DriverVerificationPage` con FinalActions/LiveCapture/external) NO se tocó:
el bloque vehicular es una columna adicional independiente.

## 4. Flujo documental (resumen)

Registro mínimo (identidad/teléfono/ciudad/placas/datos básicos) →
`driver.status=draft/pending_documents` + `vehicle.status=preregistrado` →
el conductor sube tarjeta/seguro/fotos → lifecycle `afterCreate/afterUpdate`
marca `documento_completo` → el líder abre revisión (`en_revision`), hace
captura en vivo (GPS/fecha/nonce/hash vía `LiveCaptureWizard` existente) y
cierra (`aprobado` + `validated_at` | `suspenso`).
