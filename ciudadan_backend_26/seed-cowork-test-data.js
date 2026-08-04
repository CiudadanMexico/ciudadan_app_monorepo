// Datos de prueba para el módulo CoWork: subáreas, skills, una agencia
// federal, usuarios con área/agencia asignada, y todos/tareas en distintos
// estados para poder probar manualmente cada pantalla (Tareas Generales/
// Especializadas, Agregar/Asignar/Calificar/Corregir Tarea, Apelaciones).
// Idempotente: si ya corriste esto antes, no vuelve a duplicar por nombre/email.
process.env.DATABASE_CLIENT = process.env.DATABASE_CLIENT || 'sqlite';
process.env.NODE_OPTIONS = '--openssl-legacy-provider';
const Strapi = require('@strapi/strapi');

const SUBAREAS_POR_ROOT = {
  Administrativo: ['Lic. Administración de Empresas', 'Lic. en Derecho'],
  'Técnico': ['Técnico en Electrónica', 'Técnico en Redes'],
  'Comercial-difusión': ['Marketing Digital', 'Community Management'],
  Software: ['Desarrollo Backend', 'Desarrollo Frontend'],
  'Creación multimedia': ['Diseño Gráfico', 'Edición de Video'],
};

const SKILLS = ['Excel avanzado', 'Redacción técnica', 'Fotografía', 'Atención al cliente'];

const NUEVOS_USUARIOS = [
  { email: 'demo-socio-federal@ciudadan.org', username: 'demo-socio-federal', roles: ['socio'] },
  { email: 'demo-becario@ciudadan.org', username: 'demo-becario', roles: [] },
  { email: 'demo-becario-multimedia@ciudadan.org', username: 'demo-becario-multimedia', roles: [] },
];

(async () => {
  const app = await Strapi({ dir: process.cwd() }).load();
  const USER_UID = 'plugin::users-permissions.user';
  try {
    // --- 1. Áreas raíz (ya deben existir con nombre, ver seed-root-areas.js) ---
    const rootAreas = await app.entityService.findMany('api::area.area', {
      filters: { level: 0 },
      fields: ['id', 'name'],
    });
    const rootByName = new Map(rootAreas.map((a) => [a.name, a]));
    console.log('Áreas raíz:', rootAreas.map((a) => `${a.name}(#${a.id})`).join(', '));

    // --- 2. Subáreas ---
    const existingAreas = await app.entityService.findMany('api::area.area', {
      fields: ['id', 'name'],
    });
    const existingNames = new Set(existingAreas.map((a) => a.name));
    const subareaByName = new Map(existingAreas.map((a) => [a.name, a]));

    for (const [rootName, subNames] of Object.entries(SUBAREAS_POR_ROOT)) {
      const root = rootByName.get(rootName);
      if (!root) {
        console.log(`Aviso: no existe el área raíz "${rootName}", se omiten sus subáreas`);
        continue;
      }
      for (const subName of subNames) {
        if (existingNames.has(subName)) {
          console.log(`Subárea ya existe: ${subName}`);
          continue;
        }
        const creada = await app.entityService.create('api::area.area', {
          data: { name: subName, level: 1, is_active: true, parent_area: root.id },
        });
        subareaByName.set(subName, creada);
        console.log(`Subárea creada: ${subName} (#${creada.id}) bajo ${rootName}`);
      }
    }

    // --- 3. Skills ---
    const existingSkills = await app.entityService.findMany('api::skill.skill', { fields: ['id', 'name'] });
    const existingSkillNames = new Set(existingSkills.map((s) => s.name));
    const skillByName = new Map(existingSkills.map((s) => [s.name, s]));
    for (const name of SKILLS) {
      if (existingSkillNames.has(name)) {
        console.log(`Skill ya existe: ${name}`);
        continue;
      }
      const creada = await app.entityService.create('api::skill.skill', {
        data: { name, description: `Habilidad de prueba: ${name}`, is_active: true },
      });
      skillByName.set(name, creada);
      console.log(`Skill creada: ${name} (#${creada.id})`);
    }

    // --- 4. Agencia federal (además de la local existente) ---
    const agencias = await app.entityService.findMany('api::agencia.agencia', { fields: ['id', 'nombre', 'tipo'] });
    let agenciaLocal = agencias.find((a) => a.tipo === 'local') || agencias[0];
    let agenciaFederal = agencias.find((a) => a.tipo === 'federal');
    if (!agenciaFederal) {
      agenciaFederal = await app.entityService.create('api::agencia.agencia', {
        data: { nombre: 'Agencia Federal Ciudadan', tipo: 'federal', localidad: { country: 'Mexico', locality: 'CDMX (federal)' } },
      });
      console.log(`Agencia federal creada: #${agenciaFederal.id}`);
    } else {
      console.log(`Agencia federal ya existe: #${agenciaFederal.id}`);
    }
    console.log(`Agencia local: #${agenciaLocal.id} (${agenciaLocal.nombre})`);

    // --- 5. Usuarios nuevos ---
    const usuarios = {};
    for (const u of NUEVOS_USUARIOS) {
      let existing = await app.db.query(USER_UID).findOne({ where: { email: u.email } });
      if (!existing) {
        existing = await app.entityService.create(USER_UID, {
          data: {
            email: u.email,
            username: u.username,
            confirmed: true,
            blocked: false,
            provider: 'auth0',
            roles: { extra: u.roles },
          },
        });
        console.log(`Usuario creado: ${u.email} (#${existing.id})`);
      } else {
        console.log(`Usuario ya existe: ${u.email} (#${existing.id})`);
      }
      usuarios[u.username] = existing;
    }

    const softwareArea = rootByName.get('Software');
    const multimediaArea = rootByName.get('Creación multimedia');

    // demo-socio-federal: agencia federal + área Software
    await app.entityService.update(USER_UID, usuarios['demo-socio-federal'].id, {
      data: { agencia: agenciaFederal.id, areas: { set: [{ id: softwareArea.id }] } },
    });
    // demo-becario: sin agencia, área Software (para resolver tareas especializadas de software)
    await app.entityService.update(USER_UID, usuarios['demo-becario'].id, {
      data: { agencia: agenciaLocal.id, areas: { set: [{ id: softwareArea.id }] } },
    });
    // demo-becario-multimedia: área Creación multimedia
    await app.entityService.update(USER_UID, usuarios['demo-becario-multimedia'].id, {
      data: { agencia: agenciaLocal.id, areas: { set: [{ id: multimediaArea.id }] } },
    });
    console.log('Áreas/agencia asignadas a los usuarios nuevos.');

    // demo-socio (id existente) -> agencia local + área Software (para poder calificar/asignar especializadas de software)
    const demoSocio = await app.db.query(USER_UID).findOne({ where: { email: 'demo-socio@ciudadan.org' } });
    if (demoSocio) {
      await app.entityService.update(USER_UID, demoSocio.id, {
        data: { agencia: agenciaLocal.id, areas: { set: [{ id: softwareArea.id }] } },
      });
      console.log('demo-socio actualizado con agencia local + área Software.');
    }

    // --- 6. Todos / Tareas de prueba ---
    const creador = demoSocio || usuarios['demo-socio-federal'];
    const becarioSoftware = usuarios['demo-becario'];
    const becarioMultimedia = usuarios['demo-becario-multimedia'];

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

    // 6a. General publicada
    await crearTodoSiNoExiste('[DEMO] Recolectar firmas para censo comunitario', {
      descripcion: 'Recolectar al menos 20 firmas de vecinos para el censo.',
      nivel: 'general',
      status: 'publicada',
      reward_laborys: 10,
      agencia: agenciaLocal.id,
      creador: creador.id,
      created_by: creador.id,
      fecha_publicacion: new Date().toISOString(),
    });

    // 6b. Especializada Software publicada
    await crearTodoSiNoExiste('[DEMO] Corregir bug en formulario de registro', {
      descripcion: 'El formulario de registro no valida el correo correctamente.',
      nivel: 'especialidad',
      status: 'publicada',
      reward_laborys: 25,
      areas: [softwareArea.id],
      agencia: agenciaLocal.id,
      creador: creador.id,
      created_by: creador.id,
      fecha_publicacion: new Date().toISOString(),
    });

    // 6c. Especializada Creación multimedia publicada
    await crearTodoSiNoExiste('[DEMO] Diseñar flyer para evento comunitario', {
      descripcion: 'Flyer digital para el evento del próximo mes.',
      nivel: 'especialidad',
      status: 'publicada',
      reward_laborys: 15,
      areas: [multimediaArea.id],
      agencia: agenciaLocal.id,
      creador: creador.id,
      created_by: creador.id,
      fecha_publicacion: new Date().toISOString(),
    });

    // 6d. General publicada + asignable (para probar "Asignar Tarea")
    await crearTodoSiNoExiste('[DEMO] Reporte mensual de agencia', {
      descripcion: 'Preparar el reporte mensual de actividades de la agencia.',
      nivel: 'general',
      status: 'publicada',
      asignable: true,
      reward_laborys: 20,
      agencia: agenciaLocal.id,
      creador: creador.id,
      created_by: creador.id,
      fecha_publicacion: new Date().toISOString(),
    });

    // 6e. Pendiente de calificación (tarea ya completada) -> para "Calificar Tarea"
    const todoCalificar = await crearTodoSiNoExiste('[DEMO] Actualizar directorio de contactos', {
      descripcion: 'Actualizar el directorio con los nuevos contactos de la red.',
      nivel: 'general',
      status: 'publicada',
      reward_laborys: 12,
      agencia: agenciaLocal.id,
      creador: creador.id,
      created_by: creador.id,
      fecha_publicacion: new Date().toISOString(),
    });
    const tareasCalificar = await app.entityService.findMany('api::tarea.tarea', {
      filters: { todo: todoCalificar.id },
      fields: ['id'],
    });
    if (tareasCalificar.length === 0) {
      const t = await app.entityService.create('api::tarea.tarea', {
        data: { usuario: becarioSoftware.id, todo: todoCalificar.id, tipo: 'tarea', status: 'en_proceso' },
      });
      const completarCtrl = require('./src/api/tarea/controllers/completar');
      await completarCtrl.completar({
        state: { strapiUser: becarioSoftware },
        request: { body: { tareaId: t.id } },
        throw: (s, m) => { throw new Error(String(m)); },
        body: undefined,
      });
      console.log(`Tarea de prueba (completada, lista para calificar) creada para el todo #${todoCalificar.id}`);
    } else {
      console.log(`Ya existe una tarea para el todo #${todoCalificar.id}, se omite`);
    }

    // 6f. En corrección (tarea en estado 'corregir') -> para "Corregir Tarea"
    const todoCorregir = await crearTodoSiNoExiste('[DEMO] Revisar ortografía de comunicado oficial', {
      descripcion: 'Revisar y corregir el comunicado antes de publicarlo.',
      nivel: 'general',
      status: 'publicada',
      reward_laborys: 8,
      agencia: agenciaLocal.id,
      creador: creador.id,
      created_by: creador.id,
      fecha_publicacion: new Date().toISOString(),
    });
    const tareasCorregir = await app.entityService.findMany('api::tarea.tarea', {
      filters: { todo: todoCorregir.id },
      fields: ['id'],
    });
    if (tareasCorregir.length === 0) {
      const t = await app.entityService.create('api::tarea.tarea', {
        data: { usuario: becarioMultimedia.id, todo: todoCorregir.id, tipo: 'tarea', status: 'en_proceso' },
      });
      const completarCtrl = require('./src/api/tarea/controllers/completar');
      const corregirCtrl = require('./src/api/tarea/controllers/corregir');
      const fakeCtx = (body) => ({
        state: { strapiUser: creador },
        request: { body },
        throw: (s, m) => { throw new Error(String(m)); },
        body: undefined,
      });
      await completarCtrl.completar({ ...fakeCtx({ tareaId: t.id }), state: { strapiUser: becarioMultimedia } });
      await corregirCtrl.corregir(fakeCtx({ tareaId: t.id, notes: 'Falta revisar ortografía en el segundo párrafo.' }));
      console.log(`Tarea de prueba (en corrección) creada para el todo #${todoCorregir.id}`);
    } else {
      console.log(`Ya existe una tarea para el todo #${todoCorregir.id}, se omite`);
    }

    // 6g. Calificada con score bajo + apelación abierta -> para "Resolver Apelaciones"
    const todoApelar = await crearTodoSiNoExiste('[DEMO] Traducir documento al inglés', {
      descripcion: 'Traducir el documento adjunto al inglés.',
      nivel: 'general',
      status: 'publicada',
      reward_laborys: 18,
      agencia: agenciaLocal.id,
      creador: creador.id,
      created_by: creador.id,
      fecha_publicacion: new Date().toISOString(),
    });
    const tareasApelar = await app.entityService.findMany('api::tarea.tarea', {
      filters: { todo: todoApelar.id },
      fields: ['id'],
    });
    if (tareasApelar.length === 0) {
      const t = await app.entityService.create('api::tarea.tarea', {
        data: { usuario: becarioSoftware.id, todo: todoApelar.id, tipo: 'tarea', status: 'en_proceso' },
      });
      const completarCtrl = require('./src/api/tarea/controllers/completar');
      const calificarCtrl = require('./src/api/tarea/controllers/calificar');
      const apelarCtrl = require('./src/api/tarea/controllers/apelar');
      const fakeCtx = (body, user) => ({
        state: { strapiUser: user },
        request: { body },
        badRequest: (m) => { throw new Error(String(m)); },
        notFound: (m) => { throw new Error(String(m)); },
        forbidden: (m) => { throw new Error(String(m)); },
        unauthorized: (m) => { throw new Error(String(m)); },
        throw: (s, m) => { throw new Error(String(m)); },
        body: undefined,
      });
      await completarCtrl.completar(fakeCtx({ tareaId: t.id }, becarioSoftware));
      await calificarCtrl.calificar(fakeCtx({ tareaId: t.id, score: 2, notes: 'Traducción con varios errores.' }, creador));
      await apelarCtrl.apelar(fakeCtx(
        { tareaId: t.id, motivo: 'La traducción cumple con lo solicitado, pido revisión de la calificación.' },
        becarioSoftware
      ));
      console.log(`Tarea de prueba (calificada + apelación abierta) creada para el todo #${todoApelar.id}`);
    } else {
      console.log(`Ya existe una tarea para el todo #${todoApelar.id}, se omite`);
    }

    console.log('\n=== SEED DE DATOS DE PRUEBA COWORK: LISTO ===');
  } catch (err) {
    console.error('ERROR EN SEED:', err);
    process.exitCode = 1;
  } finally {
    await app.destroy();
    process.exit(process.exitCode || 0);
  }
})();
