// Complementa seed-cowork-test-data.js: cubre los estados de todo que faltaban
// (asignada, pagada, cancelada) y dos casos explícitos de area_details
// (verificada vs pendiente) para poder probar la Regla 4 (estado "pendiente
// de verificación") y la Regla 3 (especializadas solo si está verificada de
// verdad, no solo capturada). Idempotente por título/nombre.
process.env.DATABASE_CLIENT = process.env.DATABASE_CLIENT || 'sqlite';
process.env.NODE_OPTIONS = '--openssl-legacy-provider';
const Strapi = require('@strapi/strapi');

(async () => {
  const app = await Strapi({ dir: process.cwd() }).load();
  const USER_UID = 'plugin::users-permissions.user';
  try {
    const demoSocio = await app.db.query(USER_UID).findOne({ where: { email: 'demo-socio@ciudadan.org' } });
    const becarioSoftware = await app.db.query(USER_UID).findOne({ where: { email: 'demo-becario@ciudadan.org' } });
    const becarioMultimedia = await app.db.query(USER_UID).findOne({ where: { email: 'demo-becario-multimedia@ciudadan.org' } });
    const agenciaLocal = await app.db.query('api::agencia.agencia').findOne({ where: { tipo: 'local' } });
    const softwareArea = await app.db.query('api::area.area').findOne({ where: { name: 'Software' } });
    const multimediaArea = await app.db.query('api::area.area').findOne({ where: { name: 'Creación multimedia' } });

    // --- 1. area_details explícito: verificada vs pendiente ---
    // demo-becario: área Software VERIFICADA de verdad (documentos revisados).
    await app.entityService.update(USER_UID, becarioSoftware.id, {
      data: {
        area_details: { [softwareArea.id]: { status: 'verified', observaciones: 'Verificado con cédula profesional.' } },
      },
    });
    console.log(`demo-becario: área Software marcada como VERIFICADA en area_details`);

    // demo-becario-multimedia: área capturada pero AÚN NO verificada -> debe
    // verse "Pendiente de verificación" en Perfil, y NO debe poder ver/tomar
    // tareas especializadas de esa área todavía.
    await app.entityService.update(USER_UID, becarioMultimedia.id, {
      data: {
        area_details: { [multimediaArea.id]: { status: 'pending', observaciones: 'Documentos en revisión.' } },
      },
    });
    console.log(`demo-becario-multimedia: área Creación multimedia marcada como PENDIENTE en area_details`);

    // --- 2. Todos que faltaban por estado ---
    async function crearTodoSiNoExiste(titulo, data) {
      const existentes = await app.entityService.findMany('api::todo.todo', {
        filters: { titulo: { $eq: titulo } },
        fields: ['id'],
      });
      if (existentes.length > 0) {
        console.log(`Todo ya existe: "${titulo}" (#${existentes[0].id})`);
        return existentes[0];
      }
      const creado = await app.entityService.create('api::todo.todo', { data: { titulo, ...data } });
      console.log(`Todo creado: "${titulo}" (#${creado.id})`);
      return creado;
    }

    // 2a. Asignada (asignador + asignado_a set) -> para ver el estado "asignada" en Gestión
    await crearTodoSiNoExiste('[DEMO] Capacitación de bienvenida a nuevos socios', {
      descripcion: 'Preparar y dar la capacitación de bienvenida del mes.',
      nivel: 'becario',
      status: 'asignada',
      reward_laborys: 14,
      agencia: agenciaLocal.id,
      creador: demoSocio.id,
      created_by: demoSocio.id,
      asignador: demoSocio.id,
      asignado_a: becarioSoftware.id,
      fecha_publicacion: new Date().toISOString(),
    });

    // 2b. Especializada asignable=true (Software) -> Asignar Tarea con especialidad real
    await crearTodoSiNoExiste('[DEMO] Migrar endpoint de pagos a v2', {
      descripcion: 'Migrar el endpoint legado de pagos a la nueva versión.',
      nivel: 'especialidad',
      status: 'publicada',
      asignable: true,
      reward_laborys: 30,
      areas: [softwareArea.id],
      agencia: agenciaLocal.id,
      creador: demoSocio.id,
      created_by: demoSocio.id,
      fecha_publicacion: new Date().toISOString(),
    });

    // 2c. Pagada (terminal, ciclo completo) -> historial de pagos
    const todoPagada = await crearTodoSiNoExiste('[DEMO] Encuesta de satisfacción trimestral', {
      descripcion: 'Levantar encuesta de satisfacción con socios activos.',
      nivel: 'general',
      status: 'publicada',
      reward_laborys: 16,
      agencia: agenciaLocal.id,
      creador: demoSocio.id,
      created_by: demoSocio.id,
      fecha_publicacion: new Date().toISOString(),
    });
    const tareasPagada = await app.entityService.findMany('api::tarea.tarea', {
      filters: { todo: todoPagada.id },
      fields: ['id'],
    });
    if (tareasPagada.length === 0) {
      const t = await app.entityService.create('api::tarea.tarea', {
        data: { usuario: becarioSoftware.id, todo: todoPagada.id, tipo: 'tarea', status: 'en_proceso' },
      });
      const completarCtrl = require('./src/api/tarea/controllers/completar');
      const calificarCtrl = require('./src/api/tarea/controllers/calificar');
      const fakeCtx = (body, user) => ({
        state: { strapiUser: user },
        request: { body },
        badRequest: (m) => { throw new Error(String(m)); },
        notFound: (m) => { throw new Error(String(m)); },
        throw: (s, m) => { throw new Error(String(m)); },
        body: undefined,
      });
      await completarCtrl.completar(fakeCtx({ tareaId: t.id }, becarioSoftware));
      await calificarCtrl.calificar(fakeCtx({ tareaId: t.id, score: 5, notes: 'Excelente trabajo.' }, demoSocio));
      console.log(`Tarea de prueba (calificada + pagada) creada para el todo #${todoPagada.id}`);
    } else {
      console.log(`Ya existe una tarea para el todo #${todoPagada.id}, se omite`);
    }

    // 2d. Cancelada -> para ver el estado "cancelada" en Gestión
    await crearTodoSiNoExiste('[DEMO] Evento de recaudación (pospuesto)', {
      descripcion: 'Evento pospuesto indefinidamente, tarea cancelada.',
      nivel: 'general',
      status: 'cancelada',
      reward_laborys: 10,
      agencia: agenciaLocal.id,
      creador: demoSocio.id,
      created_by: demoSocio.id,
      anotaciones: `Cancelada por ${demoSocio.email} el ${new Date().toISOString()}`,
      fecha_publicacion: new Date().toISOString(),
    });

    console.log('\n=== SEED EXTRA COWORK: LISTO ===');
  } catch (err) {
    console.error('ERROR EN SEED EXTRA:', err);
    process.exitCode = 1;
  } finally {
    await app.destroy();
    process.exit(process.exitCode || 0);
  }
})();
