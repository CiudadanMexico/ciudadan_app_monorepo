# CIUDADAN — Contrato backend del MVP de repartidores (as-built, Fase B1 del Agente 1)

- **Rama:** `feature/backend-repartidores-mvp`
- **Vigencia:** documenta el contrato TAL COMO ESTÁ IMPLEMENTADO (commits `d8d8fe2`, `3814ff6`); el código prevalece ante cualquier divergencia futura de este documento.
- **Consumidor principal:** Agente 2 (frontend) — ya integrado en Fases C/D; este documento consolida los nombres, estados, transiciones y errores definitivos.

---

## 1. Entidades y nombres finales

La spec usaba nombres provisionales (`delivery-profile`, `repartidor`, etc.). Los nombres definitivos siguen la convención real del repo (prefijo `delivery-`, singular kebab-case, valores de enum en inglés como `driver`/`food-delivery`). **La semántica es la de la spec; los nombres son los de abajo.**

| Entidad (UID Strapi) | Rol | Relaciones clave |
|---|---|---|
| `api::delivery-profile.delivery-profile` | Expediente del repartidor (1 por usuario) | `user` oneToOne → up_users; `agency` manyToOne → agencia; `vehicles` oneToMany |
| `api::delivery-vehicle.delivery-vehicle` | Vehículo (MVP: 1 por expediente, escalable) | `delivery_profile` manyToOne |
| `api::delivery-verification-event.delivery-verification-event` | Bitácora append-only | `profile`, `vehicle?`, `agency`, `actor` |
| `api::delivery-training-attempt.delivery-training-attempt` | Intentos de examen | `profile` |
| `api::delivery-waitlist-entry.delivery-waitlist-entry` | Lista de espera (creada nueva: ningún modelo equivalente — auditoría §1.2) | `user?` |
| `api::delivery-risk-signal.delivery-risk-signal` | Señales de riesgo (baja/media/alta) | `profile`, `resolved_by?` |

**Caso federal:** NO se creó una entidad `federal_audit_case` separada (la spec permitía reutilizar): el "caso" ES el expediente en estado `pending_federal_audit` + sus señales `alta` activas (`delivery-risk-signal`). La bandeja federal consulta `GET /federal/cases` (perfiles en ese estado o con señales altas activas) y resuelve señales por id. Justificación: `verification-audit` (taxi) está cableado a UIDs taxi y duplicarlo añadiría una tercera bitácora; las señales ya son auditables y tienen `resolved_by/at/resolution`.

**CRUD core:** los seis routers usan `except: ['find','findOne','create','update','delete']` — no existe REST público de colección; todo pasa por rutas numeradas `auth:false` + policy.

## 2. Estados y bloqueo federal

`delivery-profile.status` ∈ `draft · pending_documents · pending_review · corrections_required · eligible_for_video_review · pending_federal_audit · approved · rejected · suspended`.

**Decisión de diseño (B1):** el bloqueo federal es **ambas cosas**: estado (`pending_federal_audit`, para la bandeja y el flujo) **y** condición (`approve` exige 0 señales `alta` activas, `gates.senales_altas`). Doble cerradura: ni un estado manipulado ni una señal resuelta a medias habilitan la aprobación. `approved` (cualificación) y el bloqueo operativo (`suspended`) son el mismo campo; el rol **se conserva** durante la suspensión (spec §8).

## 3. Matriz de transiciones (actor · precondiciones · efectos · evento)

Actores: **S** = solicitante autenticado (policy `is-authenticated-auth0`), **R** = revisor (policy `is-delivery-reviewer` + `verificarAmbito`: socio/admin/root de la MISMA agencia; socio exige `membresia_vigente || verificado`; `verificarNoEsPropio` en toda acción de revisión), **F** = federal (policy `is-delivery-federal`: agencia `tipo='federal'` o root), **SYS** = motor de señales.

| # | Desde → Hasta | Actor | Precondiciones | Efectos | Evento |
|---|---|---|---|---|---|
| 1 | `draft → pending_documents` | S | primer guardado de datos/vehículo/evidencia | `current_step` avanza | `profile_updated` / `vehicle_registered` / `evidence_attached` |
| 2 | `draft|pending_documents|corrections_required → pending_review` | S | `prechecksEnvio` completo: identidad (CURP válida + ≥18 + docs propios o INE reutilizada + selfie), CLABE `formato_valido` + titular, vehículo completo por tipo (vigencias futuras en moto), examen ≥8/10, términos/privacidad | `submitted_at`; se limpian `correction_requests`; señales del motor (duplicidad contra aprobado=alta, en curso=media; eléctrica sin clasificar=baja); si alta → destino `pending_federal_audit` | `submitted` (+`identity_reused_from_user` si aplica, `risk_signal_raised`, `federal_block_activated` si alta) |
| 3 | `pending_review → corrections_required` | R | 1–20 correcciones `{document_id?|campo?, motivo}` | `correction_requests` estructurado + notificación al solicitante | `corrections_requested` |
| 4 | `corrections_required → pending_review` | S | reenvío tras corrección (mismos prechecks que #2) | `submitted_at` nuevo | `submitted` |
| 5 | `pending_review → eligible_for_video_review` | R | matriz documental completa (cotejo `verified` por cada documento requerido; cotejo "oficial" exige URL) + eléctrica clasificada + vehículo vigente | `reviewed_at`, `reviewer` | `marked_video_eligible` |
| 6 | `eligible_for_video_review → approved` | R | 8 gates de `aprobar` (ver §5) | `approved_at`, `approval_version+1`, concesión idempotente del rol | `approved` + `role_granted`/`role_grant_skipped_idempotent` |
| 7 | `pending_review|eligible_for_video_review → rejected` | R | motivo ≥ 20 chars | `rejected_at` | `rejected` |
| 8 | `rejected → pending_review` | R | motivo ≥ 10 (apelación) | `reviewed_at` | `reopened` |
| 9 | `approved → suspended` | R | motivo ≥ 10 | `suspended_at`; el rol se conserva | `suspended` |
| 10 | `suspended → approved` | R | — | `last_revalidated_at`, `approval_version+1` | `revalidated` |
| 11 | `pending_review|corrections_required|eligible_for_video_review → pending_federal_audit` | R/SYS | cotejo `mismatch|reported` (R, vía `registrarCotejo`) o duplicidad contra aprobado (SYS, en `submitted`) | congelación de la concesión | `risk_signal_raised` + `federal_block_activated` |
| 12 | `pending_federal_audit → pending_review` | F | señal alta resuelta (`devolver_agencia`) con hallazgo ≥ 10 | señal `resuelta` + `resolved_by/at/resolution` | `federal_resolved` |
| 13 | `pending_federal_audit → eligible_for_video_review` | F | señal alta resuelta (`habilitar_aprobacion`) con hallazgo | ídem; `approve` revalida todos los gates igualmente | `federal_resolved` |
| 14 | `pending_federal_audit` (sin cambio) | F | `mantener_bloqueo` + hallazgo | solo huella; la señal SIGUE activa | `federal_resolved` (decision=mantener) |

Invariante transversal: **ninguna transición la dispara el payload del cliente**; los `status` del body se ignoran (prueba: `tests/delivery-payload-seguro.test.js`).

## 4. Contratos de endpoints (as-built)

Prefijo `/api/delivery-registration`. Errores: Strapi `{ error: { message } }` con `status` 400 (validación), 403 (policy/ámbito), 404 (no existe/ámbito oculto), 409 (conflicto/duplicado/concurrencia), 429 (rate limit). Los mensajes son explicables y en español.

**Solicitante** (`is-authenticated-auth0`; identidad SIEMPRE de `ctx.state.strapiUser`):
| Método/ruta | Request | Response ok | Errores notables |
|---|---|---|---|
| `GET /coverage?territory=` | — | `{ ok, territory, coverage_version, data:[{id,nombre}], waitlist }` | 400 ciudad no habilitada (CDMX única) |
| `POST /waitlist` | `{ city, municipality?, consent:true }` (email de la sesión) | `{ ok, creado, reactivado, mensaje }` | 400 sin consentimiento; 409 ya suscrito; 429 ráfaga |
| `POST /waitlist/unsubscribe` | — | `{ ok, estado:'dada_de_baja' }` | idempotente |
| `POST /` | `{ agency_id, territory }` | `{ ok, creado, profile:{id,status,agency,territory_ref} }` | 400 agencia no elegible / id arbitrario |
| `GET /me` | — | `{ exists, data }` con `faltantes[]`, `payout.clabe_last4` (sin CLABE completa), `identity.curp_masked`, slots por file_id, `correction_requests` | — |
| `PATCH /me` | `{ phone?, curp?, birthdate?, emergency_contact_*?, account_holder_name?, payout_clabe?, accept_terms? }` | `{ ok, data:{id,status} }` | 400 CURP/CLABE/edad inválidos, estado no editable; **whitelist: cualquier otro campo se ignora** |
| `POST /me/vehicles` | `{ type, brand, model, color, year?, serial_or_vin?, plate?, motor_power?, max_assisted_speed?, license_number?, license_/insurance_expiration? }` (condicional por tipo; bici no guarda placa) | `{ ok, vehicle:{id,type,validation_status} }` | 400 tipo no permitido / campos por tipo / vencidos |
| `POST /me/evidence` | `{ slot, file_id, vehicle_id? }` (archivo subido antes por `/api/upload`) | `{ ok, slot, file_id, sha256 }` | 400 slot/MIME/tamaño; 400 archivo ajeno o ya usado |
| `GET /me/evidence/:fileId` | — | stream binario (streaming autenticado; sin URL pública) | 404 si no es del propio expediente |
| `GET /me/training` | — | `{ version, aprobado_con, preguntas[] (sin respuestas), intentos[], estado }` | — |
| `POST /me/training` | `{ respuestas: { [preguntaId]: índice } }` | `{ ok, score, total, passed }` | 400 estado no editable; `passed/score` del body se ignoran |
| `POST /me/submit` | — | `{ ok, status, senales[] }` | 400 con `faltantes` detallados |

**Revisión de agencia** (`is-delivery-reviewer` + `verificarAmbito` + `verificarNoEsPropio` en cada acción): `GET /agency/queue?status&limit&start`, `GET /agency/:id` (CLABE enmascarada, `documentos_requeridos`, `eventos`, `senales`), `GET /agency/:id/evidence/:fileId` (streaming), `POST .../document-checks` `{ document_id, check_type, result, source_name?, official_source_url?, evidence_file_id?, data_contrastada?, notes? }` (oficial ⇒ fuente+URL obligatorias; mismatch/reported ⇒ señal alta + bloqueo), `POST .../vehicle-classification` `{ classification, motivo }`, `POST .../request-corrections` `{ corrections:[...] }`, `POST .../mark-video-eligible`, `POST .../video-validation` `{ zoom_session_url, attendance_result, validated_at? }`, `POST .../approve`, `.../reject` `{ motivo }`, `.../suspend` `{ motivo }`, `.../revalidate`, `.../reopen` `{ motivo }`.

**Federal** (`is-delivery-federal`): `GET /federal/cases`, `POST /federal/cases/:signalId/resolve` `{ decision, hallazgo, plazo? }` con `decision ∈ devolver_agencia | habilitar_aprobacion | mantener_bloqueo`.

## 5. Gates de aprobación (B6, verificados en servidor en cada intento)

`approve` exige simultáneamente: estado `eligible_for_video_review` (con **update condicional** `where:{id,status:'eligible_for_video_review'}` como bloqueo optimista ⇒ 409 ante doble/concurrente) · agencia publicada (`publishedAt != null`) · no auto-aprobación · CLABE `formato_valido` + sobre cifrado + titular · examen `aprobado` · Zoom `validado` + URL + fecha · matriz documental completa (cotejos `verified`; "oficial" sin URL no cuenta) · vehículo completo y vigente según clasificación · 0 señales `alta` activas. El rol se concede con **merge aditivo** de `roles.extra` (preserva otras claves del JSON y el resto de roles) e **idempotencia**; fallo de escritura ⇒ evento `role_grant_failed` + 409 (recuperación: el estado quedó `approved` con huella; la revalidación o soporte reintentan el otorgamiento idempotente — Strapi 4 `db.query` no ofrece transacción multi-escritura y así se documenta).

**Refresco de sesión post-aprobación:** la notificación (`delivery.status.changed`, canal existente) lleva al usuario a `/repartidor/estado`, que al ver `approved` llama `fetchRolesYMembresia(true)` (RolesContext) ⇒ `isRepartidor()` activo sin recargar. La denegación server-side es inmediata en cada request; el desfase de UI solo dura el TTL de caché (5 min) si no se abre la pantalla.

## 6. Privacidad, almacenamiento y acceso

- **CLABE:** AES-256-GCM, clave derivada por `scrypt` de `APP_KEYS` (secreto ya obligatorio de Strapi; **sin clave fija en código**, fail-closed sin `APP_KEYS`). Persistida solo `payout_clabe_encrypted` (privado) + `last4`; jamás en respuestas, logs ni eventos.
- **CURP:** campo `private` (sanitizado por Strapi en REST); en las API solo sale enmascarada (4+2). **No se declara cotejo oficial RENAPO** sin consulta real; `officially_checked` exige fuente+URL.
- **Evidencias:** subida por `/api/upload` (override Auth0) y registro por slot con MIME/tamaño (img 15MB/video 150MB) + SHA-256 del archivo real; unicidad de adjunto (un file_id vive en un solo expediente — mitigación de enumeración, riesgo residual documentado). Descarga **solo** por streaming autenticado del titular o revisor de la misma agencia; `file.url` jamás sale del backend.
- **Retención:** bitácora append-only (`review_version` monotónico); correcciones son eventos nuevos; suspensión no borra rol ni historial. Los eventos del solicitante (`GET /me`) no exponen `notes` de revisor, revisor ni eventos.

## 7. Migraciones / despliegue

Sin archivos de migración: Strapi 4 sincroniza el schema al arrancar (DDDL aditivo — solo colecciones nuevas; el gate de CI de schema destructivo no aplica). Instrucción reproducible: arrancar el backend contra la BD objetivo; verificar `GET /api/delivery-registration/coverage` responde 403 sin token (política activa) y que `/api/delivery-profiles` responde 404 (CRUD cerrado).

## 8. Pendientes documentados (no bloqueantes)

Fase E de QA (e2e con Auth0/MySQL reales, móvil/PWA); excepción Zoom justificada (§12D) y obligatoriedad del contacto de emergencia (§4.1) como decisiones de producto; federal sin descarga de evidencias en el MVP (solo casos/señales); rate-limit in-memory single-instance; URLs estáticas de `/uploads` como riesgo de plataforma (fuera del módulo).

---

*Contrato generado por el Agente 1. Coherente con: `docs/REPARTIDORES-MVP-FASE-A-AUDITORIA.md` (B0), `docs/REPARTIDORES-MVP-INFORME-FASES-A-B.md` (B2–B7), `docs/REPARTIDORES-MVP-INFORME-FASES-C-D.md` (integración) y el código en `src/api/delivery-registration/`.*
