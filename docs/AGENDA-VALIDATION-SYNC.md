# Sincronización Agenda ↔ Validación

## Campo canónico de agenda

- **`agendas.estado`** (enumeration, español) es la fuente para listados y UI.
- Valores: `pendiente`, `en_revision`, `resubir_archivos`, `completada`, `cancelada`, `expirada`.
- Constantes: `src/api/agenda/constants/agenda-estado.js`.
- `agendas.status` (string legacy): no escribir en código nuevo; lectura fallback temporal en migraciones.

## Relación

- `cars_validation.agenda` → `manyToOne` → `agendas`
- Fuente de negocio del ciclo: `cars_validation.status` + `result`
- Proyección operativa en listados: `agendas.estado`

## Mapeo validación → agenda.estado

| `cars_validation.status` | `agendas.estado` |
| ------------------------ | ---------------- |
| `pending` / `active` | `pendiente` (al crear cita) |
| `under_review` | `en_revision` |
| `awaiting_resubmission` | `resubir_archivos` |
| `completed` | `completada` |
| `cancelled` | `cancelada` |
| `expired` | `expirada` |

## Implementación

- Servicio: `src/api/cars-validation/services/agenda-sync.js`
- Reenvío: `src/api/cars-validation/services/resubmission-workflow.js`
- API conductor: `GET /api/cars-validations/resubmission-context?driverId=`
- Evento: `agenda_synced` en `cars_validation_events`

## Migración de datos legacy

Antes de desplegar el enum, normalizar registros:

```sql
UPDATE agendas
SET estado = COALESCE(NULLIF(estado, ''), NULLIF(status, ''), 'pendiente')
WHERE estado IS NULL OR estado = '' OR estado NOT IN (
  'pendiente', 'en_revision', 'resubir_archivos', 'completada', 'cancelada', 'expirada'
);
```
