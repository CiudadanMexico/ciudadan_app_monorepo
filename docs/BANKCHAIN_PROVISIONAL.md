# Documento de arquitectura backend provisional - Ciudadan / Bankchain

**Proyecto:** Ciudadan / Bankchain / backend provisional  
**Fecha:** 10/06/2026  
**Estado:** Borrador operativo implementado (provisional)  
**Base:** Este documento convive con la blockchain actual (ethers.js) como puente temporal

## Alcance implementado

Capa provisional en `ciudadan_backend_26` que convive con blockchain actual:
- **Strapi 4.25.9** + **microservicio ledger temporal** (`api::transaccion`)
- **Pagos programados** pendientes (estado `pendiente`/`validado`/`ejecutado`)
- **Puente integración** con `ethers.js` (frontend firma, backend valida)

## Cambios de schema

### `api::agencia` (`src/api/agencia/content-types/agencia/schema.json`)
- **Nuevo:** `nivel_subsidio: decimal` (default 0) - nivel de subsidio de la agencia
- **Nuevo:** `propiedad: string` - campo solicitado por Betza
- Existente: `wallet_address: string`, `tipo: local|federal`

### `api::cartera` (`src/api/cartera/content-types/cartera/schema.json`)
- **Nuevo:** `wallet_address: string (unique)` - para lookup por dirección
- Existente: `laborysSaldo`, `laborysGanados`, `user_id`

### `api::transaccion` (NUEVO - ledger temporal)
`src/api/transaccion/content-types/transaccion/schema.json`
- `tipo: taxi|marketplace|tarea|anuncio`
- `porcentaje_labory: decimal`
- `direccion_origen, direccion_destino, direccion_agencia: string`
- `monto_laborys, subsidio, monto_total: decimal`
- `origin_id: string` (para earn_laborys)
- `timestamp: datetime`
- `digital_signature: text`
- `estado: pendiente|validado|ejecutado|rechazado`
- `hash_transaccion: string`

## Endpoints provisionales

Todos usan `auth: false` + `policies: ['global::is-authenticated-auth0']` (Bearer Auth0)

### 1. POST /api/pago-con-subsidio
**También:** `/api/transaccion/pago-con-subsidio`
```json
{
  "tipo": "taxi | marketplace",
  "porcentaje_labory": 25,
  "direccion_origen": "0xabc...",
  "direccion_destino": "0xdef...",
  "direccion_agencia": "0xagencia...",
  "monto_laborys": 15,
  "subsidio": 45,
  "timestamp": "2026-06-10T12:00:00.000Z",
  "digital_signature": "0x..."
}
```
**Validaciones:**
- `tipo` debe ser taxi/marketplace
- `direccion_agencia` debe existir en `agencias.wallet_address`
- **Regla subsidio:** `nivel_subsidio == subsidio / monto_laborys` (ej 45/15=3, tolerancia 0.01)
- `timestamp` ±5min warning, `digital_signature` >=10 chars (en prod: verificar con ethers.verifyMessage)

**Respuesta:** `{ message, transaccion, validacion: { nivel_subsidio_agencia, nivel_calculado }, hash }`

### 2. GET /api/direcciones?tipo=agencia|usuario
**También:** `/api/transaccion/direcciones`
- `?tipo=agencia` -> `{ agencias: [{ id, nombre, wallet_address, nivel_subsidio, propiedad }] }`
- `?tipo=usuario` -> `{ usuarios: [{ id, wallet_address, laborysSaldo, user_id }] }`
- sin param -> ambos

### 3. GET /api/saldo?direccion=0x...
**También:** `/api/transaccion/saldo`
```json
{ "direccion": "0x...", "fuente": "cartera|agencia", "laborysSaldo": 100 }
```

### 4. POST /api/earn-laborys
**También:** `/api/transaccion/earn-laborys`
```json
{
  "tipo": "tarea | anuncio",
  "monto": 100,
  "cartera_agencia": "0xagencia...",
  "cartera_destino": "0xdestino...",
  "origin_id": "tarea_123",
  "timestamp": "2026-06-10T12:00:00.000Z",
  "digital_signature": "0x..."
}
```
- Valida agencia existe
- Crea transaccion `estado: ejecutado` y **acredita** `laborysSaldo`/`laborysGanados` en cartera destino si existe

## Frontend integración

`src/services/bankchain/bankchainService.js`
```js
import { pagoConSubsidio, earnLaborys, consultarDirecciones, consultarSaldo } from '@/services/bankchain/bankchainService'
import { useAuth0 } from '@auth0/auth0-react'

// con token Auth0:
await pagoConSubsidio({ tipo:'taxi', direccion_origen:'0x...', direccion_destino:'0x...', direccion_agencia:'0x...', monto_laborys:15, subsidio:45, timestamp:new Date().toISOString(), digital_signature:'0x...' }, token)

// firmado con ethers:
import { ethers } from 'ethers'
const wallet = ethers.Wallet.createRandom()
const { timestamp, digital_signature } = await generarPayloadFirmado(wallet, { monto:15 })
```

**Crear cartera ya existente:** `src/Pages/Cartera/CrearCarteraPage.jsx` usa `ethers.Wallet.createRandom()` + `POST /api/cartera` con Auth0

## Flujo de prueba (3 terminales)

**Backend:**
```bash
cd ciudadan_backend_26
npm install --legacy-peer-deps
mkdir -p public/uploads .tmp
# .env ya creado con STRIPE_SECRET_KEY dummy y APP_KEYS
npm run develop # http://localhost:1337/admin
```

**Test sin Auth0 (401 esperado):**
```bash
curl http://localhost:1337/api/direcciones
curl -X POST http://localhost:1337/api/pago-con-subsidio -H "Content-Type: application/json" -d '{...}'
```

**Test con Auth0 token:**
```bash
curl -H "Authorization: Bearer <Auth0_token>" http://localhost:1337/api/direcciones?tipo=agencia
```

## Migración futura

1. Reemplazar validación dummy de `digital_signature` por `ethers.verifyMessage`
2. Mover ledger de Strapi sqlite a blockchain real (Bankchain)
3. Pagos programados: migrar `estado: pendiente` a cron + contrato inteligente
4. `nivel_subsidio` y `propiedad` ya quedan en schema para migración sin breaking change

## Archivos tocados

- `ciudadan_backend_26/src/api/agencia/content-types/agencia/schema.json` (nivel_subsidio, propiedad)
- `ciudadan_backend_26/src/api/cartera/content-types/cartera/schema.json` (wallet_address)
- `ciudadan_backend_26/src/api/transaccion/**` (nuevo)
- `ciudadan_frontend/src/services/bankchain/bankchainService.js` (nuevo)
- `docs/BANKCHAIN_PROVISIONAL.md` (este doc)
