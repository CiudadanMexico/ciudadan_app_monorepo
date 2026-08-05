#!/usr/bin/env pwsh
# smoke-test.ps1 — Fix H
# Smoke test de endpoints CoWork (casos negativos) + happy path si hay tokens.
# Ver docs/FIX-H-SMOKE-TEST.md para prerequisitos.

[CmdletBinding()]
param(
  [string]$StrapiUrl = ($env:STRAPI_URL, 'http://localhost:33032' | Select-Object -First 1)
)

$PassCount = 0
$FailCount = 0

function Test-Endpoint {
  param(
    [string]$Method,
    [string]$Path,
    [string]$Body,
    [string]$ExpectedStatus,
    [string]$Description,
    [string]$AuthToken
  )
  $fullUrl = "$StrapiUrl/api$($Path -replace '^/api','')"
  $headers = @{ 'Content-Type' = 'application/json' }
  if ($AuthToken) { $headers['Authorization'] = "Bearer $AuthToken" }

  $params = @{
    Uri         = $fullUrl
    Method      = $Method
    Headers     = $headers
    ErrorAction = 'SilentlyContinue'
    SkipHttpErrorCheck = $true
  }
  if ($Body) { $params['Body'] = $Body }

  try {
    $resp = Invoke-WebRequest @params
    $status = [int]$resp.StatusCode
  } catch {
    if ($_.Exception.Response) { $status = [int]$_.Exception.Response.StatusCode }
    else { $status = -1 }
  }

  if ($status -eq $ExpectedStatus) {
    Write-Host "[PASA] $Method $Path -> $status ($Description)" -ForegroundColor Green
    $script:PassCount++
  } else {
    Write-Host "[FAIL] $Method $Path -> $status (esperado $ExpectedStatus) -- $Description" -ForegroundColor Red
    $script:FailCount++
  }
}

Write-Host "===== Fix H - Smoke test Negativo (sin auth) ====="
Write-Host "Strapi: $StrapiUrl"
Write-Host ""

# Lectura pública — sólo si Strapi tiene permiso Public.find en todos
Test-Endpoint -Method GET -Path '/todos' -ExpectedStatus 200 `
  -Description 'tareas generales visibles sin auth (Public.find)'

# Crear sin auth → 401 (policy corre)
Test-Endpoint -Method POST -Path '/todos' -Body '{}' -ExpectedStatus 401 `
  -Description 'sin Authorization 401 (policy is-admin-or-socio)'

# Resolver sin auth → 401
Test-Endpoint -Method POST -Path '/tareas/resolver' -Body '{}' -ExpectedStatus 401 `
  -Description 'sin Authorization 401'
Test-Endpoint -Method POST -Path '/tareas/resolver' -Body '{}' -ExpectedStatus 401 `
  -Description 'sin Authorization 401'

# Calificar sin auth → 401
Test-Endpoint -Method POST -Path '/tareas/calificar' -Body '{}' -ExpectedStatus 401 `
  -Description 'sin Authorization 401'

# Subir evidencia sin auth → 401
Test-Endpoint -Method POST -Path '/tareas/subir-evidencia' -Body '{}' -ExpectedStatus 401 `
  -Description 'sin Authorization 401'

# Verificar área sin auth → 401 (Fix D)
Test-Endpoint -Method POST -Path '/areas/verificar-area' -Body '{}' -ExpectedStatus 401 `
  -Description 'sin Authorization 401 (Fix D)'
Test-Endpoint -Method GET -Path '/areas/verificaciones' -ExpectedStatus 401 `
  -Description 'sin Authorization 401 (Fix D)'

# Resolver apelación sin auth → 401 (Fix A)
Test-Endpoint -Method POST -Path '/tareas/resolver-apelacion' -Body '{}' -ExpectedStatus 401 `
  -Description 'sin Authorization 401 (Fix A)'

Write-Host ""
Write-Host "===== Fix H - Smoke test Casos borde ====="

# Con token válido pero sin payload requerido → 400 (no 401)
if ($env:TOKEN_SOCIO) {
  Test-Endpoint -Method POST -Path '/tareas/resolver' -Body '{}' -ExpectedStatus 400 `
    -Description 'con token socio, sin todoId -> 400' -AuthToken $env:TOKEN_SOCIO
  Test-Endpoint -Method POST -Path '/tareas/calificar' -Body '{}' -ExpectedStatus 400 `
    -Description 'con token socio, sin tareaId -> 400' -AuthToken $env:TOKEN_SOCIO
} else {
  Write-Host "[SKIP] Casos borde con token socio (TOKEN_SOCIO no definido)" -ForegroundColor Yellow
}

if ($env:TOKEN_VERIFICADOR) {
  Test-Endpoint -Method POST -Path '/areas/verificar-area' -Body '{}' -ExpectedStatus 400 `
    -Description 'con token verif, sin userId -> 400' -AuthToken $env:TOKEN_VERIFICADOR
} else {
  Write-Host "[SKIP] Casos borde con token verificador (TOKEN_VERIFICADOR no definido)" -ForegroundColor Yellow
}

if ($env:TOKEN_SOCIO) {
  Test-Endpoint -Method POST -Path '/tareas/resolver-apelacion' -Body '{}' -ExpectedStatus 400 `
    -Description 'con token socio, sin tareaId -> 400' -AuthToken $env:TOKEN_SOCIO
} else {
  Write-Host "[SKIP] Casos borde con token socio (apelación)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "===== Fix H - Resumen ====="
Write-Host "PASARON: $PassCount"
Write-Host "FALLARON: $FailCount"
if ($FailCount -gt 0) { exit 1 } else { exit 0 }
