#!/usr/bin/env node
/**
 * scripts/smoke-release.mjs — verificación E2E repetible del release.
 *
 * Convierte la verificación manual descrita en docs/VERIFICACION-RELEASE-2026-10-27.md
 * en un script ejecutable: solo lectura (GET), sin credenciales, con timeouts,
 * reintentos limitados y salida PASS / FAIL / WARN por punto.
 *
 * Uso:
 *   node scripts/smoke-release.mjs
 *   node scripts/smoke-release.mjs --json
 *
 * Variables de entorno (opcionales):
 *   SMOKE_FRONTEND_URL  Frontend de una instancia de agente (dev)
 *   SMOKE_API_URL       API Strapi de una instancia de agente
 *   SMOKE_MAIN_URL      Sitio público de producción
 *   SMOKE_TIMEOUT_MS    Timeout por petición (por defecto 20000)
 *   SMOKE_RETRIES       Reintentos por punto (por defecto 2)
 *
 * Código de salida: 0 si no hay FAIL, 1 si hay algún FAIL.
 */

import process from 'node:process';

const CFG = {
  frontend: (process.env.SMOKE_FRONTEND_URL ?? 'https://frontend-temporal1-agent1.ciudadan.org').replace(/\/+$/, ''),
  api: (process.env.SMOKE_API_URL ?? 'https://backend-temporal1-agent1.ciudadan.org').replace(/\/+$/, ''),
  main: (process.env.SMOKE_MAIN_URL ?? 'https://ciudadan.org').replace(/\/+$/, ''),
  timeoutMs: Number(process.env.SMOKE_TIMEOUT_MS ?? 20000),
  retries: Number(process.env.SMOKE_RETRIES ?? 2),
};

const asJson = process.argv.includes('--json');

const results = [];

async function request(url, { method = 'GET' } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CFG.timeoutMs);
  try {
    const res = await fetch(url, {
      method,
      redirect: 'follow',
      signal: controller.signal,
      headers: { accept: 'application/json, text/html;q=0.9,*/*;q=0.8' },
    });
    const text = await res.text();
    return { ok: res.ok, status: res.status, text, url };
  } finally {
    clearTimeout(timer);
  }
}

async function withRetries(fn, label) {
  let lastError;
  for (let attempt = 0; attempt <= CFG.retries; attempt += 1) {
    try {
      return await fn(attempt);
    } catch (error) {
      lastError = error;
      const wait = 750 * (attempt + 1);
      if (attempt < CFG.retries) {
        await new Promise((resolve) => setTimeout(resolve, wait));
      }
    }
  }
  throw lastError;
}

async function check(name, fn) {
  const startedAt = Date.now();
  try {
    const outcome = await withRetries(fn, name);
    results.push({ name, status: outcome.status ?? 'PASS', detail: outcome.detail ?? '', ms: Date.now() - startedAt });
  } catch (error) {
    results.push({ name, status: 'FAIL', detail: String(error?.message ?? error), ms: Date.now() - startedAt });
  }
}

function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Puntos de verificación
// ---------------------------------------------------------------------------

async function main() {
  // 0. Descubre la tienda oficial publicada desde la API pública.
  let officialSlug = null;
  await check('API Strapi responde (/api/productos)', async () => {
    const res = await request(`${CFG.api}/api/productos?pagination[pageSize]=1`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = parseJson(res.text);
    if (!json || !Array.isArray(json.data)) throw new Error('respuesta sin { data: [...] }');
    return { status: 'PASS', detail: `HTTP ${res.status}, ${json.data.length} producto(s)` };
  });

  await check('API Strapi: wiki public-config', async () => {
    const res = await request(`${CFG.api}/api/wiki/public-config`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = parseJson(res.text);
    if (!json) throw new Error('respuesta no JSON');
    return { status: 'PASS', detail: `HTTP ${res.status}` };
  });

  await check('API Strapi: tienda oficial publicada', async () => {
    const res = await request(`${CFG.api}/api/stores?filters[isOfficial][$eq]=true&pagination[pageSize]=5`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = parseJson(res.text);
    const stores = Array.isArray(json?.data) ? json.data : [];
    const official = stores.find((store) => store?.attributes?.slug && store?.attributes?.publishedAt);
    if (!official) throw new Error('ninguna tienda oficial con slug y publishedAt');
    officialSlug = official.attributes.slug;
    return { status: 'PASS', detail: `${official.attributes.name} (slug ${officialSlug})` };
  });

  // 1. Frontend de agente: raíz accesible.
  await check('Frontend de agente: raíz', async () => {
    const res = await request(`${CFG.frontend}/`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return { status: 'PASS', detail: `HTTP ${res.status}` };
  });

  // 2. Producción: SPA deep-link (deep link de la Plaza).
  await check('Producción: raíz', async () => {
    const res = await request(`${CFG.main}/`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return { status: 'PASS', detail: `HTTP ${res.status}` };
  });

  await check('Producción: deep-link SPA /comunidad', async () => {
    const res = await request(`${CFG.main}/comunidad`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return { status: 'PASS', detail: `HTTP ${res.status}` };
  });

  await check('Producción: vitrina de tienda oficial', async () => {
    if (!officialSlug) throw new Error('no se pudo resolver el slug oficial');
    const res = await request(`${CFG.main}/market/store/${officialSlug}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return { status: 'PASS', detail: `HTTP ${res.status} en /market/store/${officialSlug}` };
  });

  // 3. Instancias de agente: deep-link. Informativo: las instancias dev no
  //    siempre tienen fallback de history API, así que un 404 no es un fallo
  //    del producto (en producción el deep-link sí resuelve).
  await check('Instancia dev: deep-link /market/store/<slug>', async () => {
    if (!officialSlug) throw new Error('no se pudo resolver el slug oficial');
    const res = await request(`${CFG.frontend}/market/store/${officialSlug}`);
    if (res.ok) return { status: 'PASS', detail: `HTTP ${res.status}` };
    if (res.status === 404) {
      return {
        status: 'WARN',
        detail: 'HTTP 404 — la instancia dev no resuelve deep-links (falta fallback de history API); en producción sí resuelve',
      };
    }
    throw new Error(`HTTP ${res.status}`);
  });

  // -------------------------------------------------------------------------
  // Salida
  // -------------------------------------------------------------------------
  const failures = results.filter((r) => r.status === 'FAIL');
  const warnings = results.filter((r) => r.status === 'WARN');

  if (asJson) {
    console.log(JSON.stringify({ checks: results, failures: failures.length, warnings: warnings.length, ok: failures.length === 0 }, null, 2));
  } else {
    console.log('Smoke test del release — Ciudadan');
    console.log(`Frontend dev: ${CFG.frontend}`);
    console.log(`API:          ${CFG.api}`);
    console.log(`Producción:   ${CFG.main}`);
    console.log('');
    for (const result of results) {
      console.log(`[${result.status.padEnd(4)}] ${result.name} — ${result.detail} (${result.ms} ms)`);
    }
    console.log('');
    console.log(`Resumen: ${results.length - failures.length - warnings.length} PASS · ${warnings.length} WARN · ${failures.length} FAIL`);
  }

  process.exit(failures.length === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error('smoke-release: error no controlado:', error);
  process.exit(1);
});
