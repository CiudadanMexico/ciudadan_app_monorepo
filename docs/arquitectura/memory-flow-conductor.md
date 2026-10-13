# Expediente del conductor — memoria de la sesión (2026-10-08/09)

## Contexto

Opción 1 Backend aprobada: prototipo funcional (backend + frontend mínimo,
sin mergear) + documentación en paralelo. Rutas `/taxis/conductor/*` ya
apuntaban a `PreRegistroConductor2`; faltaba expediente, tarjeta vinculada
al vehículo, verificación documental y activación.

## Lo que se encontró al arrancar Strapi (errores reales, en orden)

1. `Metadata for "api::vehicle.vehicle" not found` — el content-type estaba
   en `content-types/vehicle.json` suelto; Strapi 4 exige
   `content-types/vehicle/schema.json`. Fix: mover el archivo.
2. `The key of the content-type should be the same as its singularName` —
   faltaba `info.singularName/pluralName` en el schema. Fix: agregarlos.
3. `inversedBy attribute vehicle not found target
   plugin::users-permissions.user` — `vehicle.user/agency` declaraban
   inversa inexistente. Fix: unidireccionales.
4. Warning `rename inversedBy → mappedBy` en `vehicle.driver`. Fix:
   `mappedBy:"vehicle"` (el owner es `driver.vehicle`).
5. `controllers: { vehicle: { getCard } }` en el router NO crea la ruta —
   `/api/vehicle/card/1` daba 404 de "ruta no encontrada". Fix: archivo
   `routes/01-vehicle-custom.js` con las 3 rutas reales + policies.

Verificación final: Strapi arranca, `GET /api/vehicles` y
`GET /api/vehicle/card/1` responden 403 sin token (policies activas).

## Lo que se implementó

- Backend: relación `driver.vehicle ↔ vehicle.driver`, controller `find`
  recortado + `getCard/openReview/closeReview`, service con máquina de
  estados, lifecycles, routes CRUD + custom.
- Frontend: `DocumentoCarga`, `TarjetaCirculacion`, `ExpedienteConductor`,
  `vehicleExpedienteService`, ruta `/taxis/conductor/expediente`, botón en
  `Conductor.jsx`, widget en `Perfil.jsx`, bloque vehicular en
  `DriverVerificationPage.jsx` (reusa `VehicleDataCard`). ESLint: 0 errores.
- Docs: estos 4 archivos en `docs/arquitectura/`.
- Migración: `ciudadan_backend_26/scripts/migrate-driver-to-vehicle.js`
  (idempotente, dry-run por defecto; crea `vehicle` desde campos legacy de
  cada `driver` y enlaza ambas puntas).

## Pendiente (fuera de este prototipo)

- ~~Ejecutar la migración en staging con backup~~ — NO APLICA (2026-10-09):
  confirmado que no hay conductores ni en producción ni en dev. El script
  queda como seguro para datos legacy futuros.
- ~~Gate de propiedad en `findOne`~~ — IMPLEMENTADO (2026-10-09): override en
  `vehicle/controllers/vehicle.js` que valida dueño (`vehicle.user`) o misma
  agencia, 403 en otro caso. Verificado: `GET /api/vehicles/999999` sin token
  → 403.
- ~~Gate en dispatch~~ — IMPLEMENTADO frontend (2026-10-09):
  `resolveTripEligibility` en `vehicleExpedienteService.js` + llamada en
  `handleAcceptTrip` (`Conductor.jsx`). Exige `driver.status==='approved'` +
  `vehicle.status==='aprobado'`; si no, `alert` con el motivo y no emite la
  oferta. Pendiente recomendado: replicar el gate en el backend del dispatch
  (socket/`/api/ofertas`), hoy sin tests.
