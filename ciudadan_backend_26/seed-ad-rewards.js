// Seed para el módulo de anuncios remunerados (/gana/ver-anuncios).
// Crea:
//  - 1 usuario demo (socio) con cartera de laborys (si no existe).
//  - N anuncios publicitarios (tipo video) con duración, recompensa,
//    decisionWindow, thumbnail y archivo URL de test.
// Idempotente: no duplica por título ni email.
//
// Uso:   node seed-ad-rewards.js   (desde ciudadan_backend_26/)
// Nota: NO setear NODE_OPTIONS=--openssl-legacy-provider (roto en Node >=22).
process.env.DATABASE_CLIENT = process.env.DATABASE_CLIENT || 'sqlite';
const Strapi = require('@strapi/strapi');
const fs = require('fs');

// Log de errores para leerlos pese a que la consola de PowerShell se cuelgue.
const ERR_LOG = 'C:/Users/elyiz/AppData/Local/Temp/cline/seed_err.txt';
function logErr(msg) {
  try { fs.appendFileSync(ERR_LOG, msg + '\n'); } catch (e) { /* noop */ }
}

const USUARIO_DEMO = {
  email: 'demo-ads@ciudadan.org',
  username: 'demo-ads',
  roles: ['socio'],
};

const ANUNCIOS = [
  // Duración = duración REAL del mp4 de muestra (la cobertura se valida
  // contra la duración declarada; deben coincidir).
  {
    titulo: 'Descubre Ciudadan en 15s',
    texto: 'Conoce la plataforma que te premia por aprender y contribuir.',
    duracion: 15,
    recompensa: 1.5,
    decisionWindow: 5,
    archivo_url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    thumbnail_url: 'https://via.placeholder.com/320x180/0d6efd/ffffff?text=A1',
  },
  {
    titulo: 'Gana laborys viendo anuncios',
    texto: 'Cada video visto completo te paga laborys para usar en la plataforma.',
    duracion: 47,
    recompensa: 5.0,
    decisionWindow: 8,
    archivo_url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4',
    thumbnail_url: 'https://via.placeholder.com/320x180/198754/ffffff?text=A2',
  },
  {
    titulo: 'Tus aportes impulsan la comunidad',
    texto: 'Visualiza y ayuda a proyectos reales en tu agencia.',
    duracion: 60,
    recompensa: 6.0,
    decisionWindow: 8,
    archivo_url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    thumbnail_url: 'https://via.placeholder.com/320x180/dc3545/ffffff?text=A3',
  },
];

(async () => {
  logErr('--- seed-ad-rewards INICIO ' + new Date().toISOString() + ' ---');
  const app = await Strapi({ dir: process.cwd() }).load();
  logErr('Strapi cargado OK');
  const USER_UID = 'plugin::users-permissions.user';
  const CARTERA_UID = 'api::cartera.cartera';
  const AD_UID = 'api::ad.ad';

  try {
    // --- 1. Usuario demo + cartera ---
    let user = await app.db.query(USER_UID).findOne({ where: { email: USUARIO_DEMO.email } });
    if (!user) {
      user = await app.entityService.create(USER_UID, {
        data: {
          email: USUARIO_DEMO.email,
          username: USUARIO_DEMO.username,
          confirmed: true,
          blocked: false,
          provider: 'auth0',
          roles: { extra: USUARIO_DEMO.roles },
        },
      });
      console.log(`Usuario creado: ${USUARIO_DEMO.email} (#${user.id})`);
    } else {
      console.log(`Usuario ya existe: ${USUARIO_DEMO.email} (#${user.id})`);
    }

    // Cartera (oneToOne user_id → join table carteras_user_id_links).
    // 1) Patrón calificar.js (db.query escalar). 2) Fallback knex raw:
    // insertar fila + link (replica las filas que el sistema ya creó).
    // No bloqueante: si falla, los anuncios se crean igual.
    let cartera = await app.db.query(CARTERA_UID).findOne({ where: { user_id: user.id } });
    if (!cartera) {
      logErr('paso: crear cartera para user #' + user.id);
      try {
        cartera = await app.db.query(CARTERA_UID).create({
          data: {
            laborysGanados: 0,
            laborysSaldo: 0,
            ciudadanTokens: 0,
            ciudadanRendimientos: 0,
            user_id: user.id,
          },
        });
        logErr('paso: cartera creada (db.query escalar) #' + cartera.id);
      } catch (e1) {
        logErr('cartera db.query escalar falló: ' + e1.message);
        const conn = app.db.connection;
        const now = new Date().toISOString();
        const nuevaId = await conn('carteras').insert({
          laborys_ganados: 0,
          laborys_saldo: 0,
          ciudadan_tokens: 0,
          ciudadan_rendimientos: 0,
          created_at: now,
          updated_at: now,
          published_at: now,
        });
        await conn('carteras_user_id_links').insert({ cartera_id: nuevaId[0], user_id: user.id });
        cartera = await app.db.query(CARTERA_UID).findOne({ where: { user_id: user.id } });
        logErr('paso: cartera creada vía knex raw #' + (cartera && cartera.id));
      }
      console.log(`Cartera creada para usuario #${user.id}`);
    } else {
      console.log(`Cartera existe para usuario #${user.id}`);
    }
  } catch (errUser) {
    // Usuario/cartera no bloquean la creación de anuncios.
    logErr('WARN usuario/cartera: ' + (errUser && errUser.stack ? errUser.stack : String(errUser)));
    console.error('WARN usuario/cartera:', errUser.message);
  }

  try {

    // --- 2. Anuncios publicitarios ---
    const existentes = await app.entityService.findMany(AD_UID, {
      filters: { esPublicitario: true },
      fields: ['id', 'titulo'],
    });
    const existentesPorTitulo = new Map(existentes.map((a) => [a.titulo, a]));

    for (const a of ANUNCIOS) {
      const ex = existentesPorTitulo.get(a.titulo);
      if (ex) {
        await app.entityService.update(AD_UID, ex.id, {
          data: {
            texto: a.texto,
            esPublicitario: true,
            activo: true,
            tipo: 'video',
            duracion: a.duracion,
            recompensa: a.recompensa,
            decisionWindow: a.decisionWindow,
            metadata: { archivo_url: a.archivo_url, thumbnail_url: a.thumbnail_url },
          },
        });
        console.log(`Anuncio actualizado: ${a.titulo} (#${ex.id})`);
      } else {
        const creado = await app.entityService.create(AD_UID, {
          data: {
            titulo: a.titulo,
            texto: a.texto,
            esPublicitario: true,
            activo: true,
            tipo: 'video',
            duracion: a.duracion,
            recompensa: a.recompensa,
            decisionWindow: a.decisionWindow,
            metadata: { archivo_url: a.archivo_url, thumbnail_url: a.thumbnail_url },
            publishedAt: new Date().toISOString(),
          },
        });
        console.log(`Anuncio creado: ${a.titulo} (#${creado.id}) -> ${a.duracion}s / ${a.recompensa} laborys`);
      }
    }

    console.log('\n=== Seed de anuncios remunerados completado ===');
    logErr('SEED COMPLETADO OK');
    console.log(`Usuario demo: ${USUARIO_DEMO.email}`);
    console.log(`Anuncios disponibles: ${ANUNCIOS.length}`);
  } catch (err) {
    logErr('ERROR seed-ad-rewards: ' + (err && err.stack ? err.stack : String(err)));
    console.error('Error en seed ad-rewards:', err);
  } finally {
    await app.destroy();
  }
})();

