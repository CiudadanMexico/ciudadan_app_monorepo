// Repara textos corruptos (carácter de reemplazo U+FFFD u otros artefactos)
// en titulo/descripcion de todos y tareas — datos viejos, de antes de esta
// sesión, donde los acentos/ñ se perdieron al guardarse (probablemente un
// insert directo a la DB con encoding incorrecto, bypaseando Strapi).
process.env.DATABASE_CLIENT = process.env.DATABASE_CLIENT || 'sqlite';
process.env.NODE_OPTIONS = '--openssl-legacy-provider';
const Strapi = require('@strapi/strapi');

const TODOS_FIX = {
  3: {
    titulo: 'Revisar documento legal de fundación',
    descripcion: 'Validar redacción y formato del acta constitutiva.',
  },
  4: {
    descripcion: 'Diseñar 3 propuestas de banner para campaña de difusión.',
  },
  5: {
    titulo: 'Auditar configuración SSL del dominio',
  },
  6: {
    titulo: 'Traducir landing page EN→ES',
  },
  7: {
    titulo: 'Crear guía de onboarding para nuevos socios',
    descripcion: 'Esquema y redacción de documento de bienvenida.',
  },
  8: {
    descripcion: "Revisar índices en tabla 'tareas' y proponer mejoras.",
  },
  9: {
    descripcion: 'Cortar y montar video de presentación.',
  },
  11: {
    titulo: 'Compilar métricas mensuales del team',
  },
  12: {
    descripcion: 'Comparar 3 planes y redactar recomendación.',
  },
};

const TAREAS_FIX = {
  3: { titulo: 'Resolución de tarea', descripcion: 'Tomé la tarea para traducir la landing.' },
  4: { titulo: 'Resolución de tarea', descripcion: 'Tomé la tarea para traducir la landing.' },
  6: { titulo: 'Resolución de tarea' },
  7: { titulo: 'Resolución de tarea' },
  8: { titulo: 'Resolución de tarea', descripcion: 'Dashboard enviado, pendiente revisión.' },
  9: { titulo: 'Resolución de tarea', descripcion: 'Auditoría SSL completada, recomendaciones aplicadas.' },
};

(async () => {
  const app = await Strapi({ dir: process.cwd() }).load();
  try {
    for (const [id, data] of Object.entries(TODOS_FIX)) {
      const actualizado = await app.entityService.update('api::todo.todo', Number(id), { data });
      console.log(`todo #${id} -> titulo="${actualizado.titulo}"`);
    }
    for (const [id, data] of Object.entries(TAREAS_FIX)) {
      const actualizado = await app.entityService.update('api::tarea.tarea', Number(id), { data });
      console.log(`tarea #${id} -> titulo="${actualizado.titulo}", descripcion="${actualizado.descripcion}"`);
    }
    console.log('\n=== TEXTOS CORREGIDOS ===');
  } catch (err) {
    console.error('ERROR:', err.message);
    process.exitCode = 1;
  } finally {
    await app.destroy();
    process.exit(process.exitCode || 0);
  }
})();
