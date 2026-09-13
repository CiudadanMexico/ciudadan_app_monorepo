#!/usr/bin/env node
/**
 * set-roles.js — Gestiona `roles.extra` (JSON libre que usa el frontend para el
 * gateo de UI) de un usuario de Strapi, escribiendo directo a la base de datos
 * (mismo enfoque que assign-roles.js: knex + sqlite3, sin depender de la API).
 *
 * ⚠️ Cada instancia tiene SU PROPIA base SQLite (ciudadan_backend_26/.tmp/data.db),
 *    así que los roles se gestionan POR INSTANCIA. Pushear código no sincroniza
 *    datos entre instancias.
 *
 * ¿Por qué directo a la BD y no vía API? El STRAPI_API_TOKEN de este proyecto
 * solo tiene permisos de LECTURA sobre /api/users (PUT = 403). Este es el patrón
 * que ya usa assign-roles.js.
 *
 * Uso (desde ciudadan_backend_26/):
 *   node scripts/set-roles.js <email> <rol1> <rol2> ...   # REEMPLAZA la lista
 *   node scripts/set-roles.js <email> +socio -conductor   # agrega/quita (incremental)
 *   node scripts/set-roles.js <email> reset               # vacía roles.extra
 *
 * Ejemplo:
 *   node scripts/set-roles.js abrahamyisus420@gmail.com admin socio conductor
 */
const path = require('path');
const knex = require('knex');

// ---------- util: leer .env sin dependencias ----------
function loadEnv(file) {
  const out = {};
  if (!require('fs').existsSync(file)) return out;
  for (const raw of require('fs').readFileSync(file, 'utf8').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const m = line.match(/^([A-Za-z0-9_]+)\s*=\s*(.*)$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return out;
}

const envFile = path.join(__dirname, '..', '.env');
const env = { ...loadEnv(envFile), ...process.env };

// ---------- config DB (sqlite, el standard dev del runbook) ----------
const client = (env.DATABASE_CLIENT || 'sqlite').toLowerCase();
if (client !== 'sqlite') {
  console.error(`❌ Este script soporta solo DATABASE_CLIENT=sqlite (tienes "${client}").`);
  console.error('   ¿Necesitas mysql/postgres? Extiende la sección de conexión del script.');
  process.exit(1);
}
const dbPath = path.join(__dirname, '..', env.DATABASE_FILENAME || '.tmp/data.db');
if (!require('fs').existsSync(dbPath)) {
  console.error(`❌ No existe la BD en ${dbPath}. ¿Estás en el directorio correcto y ya arrancó Strapi alguna vez?`);
  process.exit(1);
}

const db = knex({ client: 'sqlite3', connection: { filename: dbPath }, useNullAsDefault: true });

const [email, ...ops] = process.argv.slice(2);
if (!email || !ops.length) {
  console.log(`Uso:
  node scripts/set-roles.js <email> <rol1> <rol2> ...   # REEMPLAZA la lista
  node scripts/set-roles.js <email> +socio -conductor   # agrega/quita (incremental)
  node scripts/set-roles.js <email> reset               # vacía roles.extra
Ejemplo:
  node scripts/set-roles.js abrahamyisus420@gmail.com admin socio conductor`);
  process.exit(1);
}

function parseRoles(raw) {
  if (!raw) return [];
  try {
    const p = JSON.parse(raw);
    return Array.isArray(p.extra) ? p.extra : [];
  } catch {
    return [];
  }
}

(async () => {
  const user = await db('up_users').select('id', 'email', 'roles').where({ email }).first();
  if (!user) {
    console.error(`❌ El usuario "${email}" no existe en ESTA instancia (${dbPath}).`);
    console.error('   Cada instancia tiene su propia BD. Crea la cuenta logueándote en el frontend local.');
    process.exit(1);
  }

  const prev = parseRoles(user.roles);

  // modo incremental si algún op empieza con +/- o es reset; si no, reemplazo total
  const incremental = ops.some((o) => o.startsWith('+') || o.startsWith('-') || o === 'reset');
  let next;
  if (incremental) {
    next = [...prev];
    for (const op of ops) {
      if (op === 'reset') next = [];
      else if (op.startsWith('+')) { const r = op.slice(1); if (r && !next.includes(r)) next.push(r); }
      else if (op.startsWith('-')) next = next.filter((r) => r !== op.slice(1));
    }
  } else {
    next = ops;
  }

  await db('up_users').where({ id: user.id }).update({ roles: JSON.stringify({ extra: next }) });

  const check = await db('up_users').select('roles').where({ id: user.id }).first();

  console.log(`✅ roles.extra actualizado para ${email} (id ${user.id})`);
  console.log('   BD    :', dbPath);
  console.log('   antes :', JSON.stringify(prev));
  console.log('   ahora :', JSON.stringify(parseRoles(check.roles)));
  await db.destroy();
})().catch((e) => {
  console.error('❌', e.message);
  try { db.destroy(); } catch {}
  process.exit(1);
});
