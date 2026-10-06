/**
 * Configuración central — GENERACIÓN FUNDADORA CIUDADAN 2026
 * ------------------------------------------------------------------
 * Fuente única de verdad para rutas, fechas, CIT, etapas, perfiles,
 * textos reutilizables, assets y posiciones responsive de cada hero.
 * Ningún componente debe repetir números del programa: todo se lee aquí.
 */
import heroGeneracionFundadoraWebp from '../assets/hackabot/hero-generacion-fundadora.webp';
import heroHackabotWebp from '../assets/hackabot/hero-hackabot.webp';
import hackabotEtapa2Webp from '../assets/hackabot/hackabot-etapa2.webp';
import heroVallecatnipWebp from '../assets/hackabot/hero-vallecatnip.webp';
import heroCreadoresWebp from '../assets/hackabot/hero-creadores.webp';
import heroAliadosWebp from '../assets/hackabot/hero-aliados.webp';

// ------------------------------------------------------------------
// RUTAS
// ------------------------------------------------------------------
export const GENERATION_ROUTES = {
  home: '/generacion-fundadora',
  hackabot: '/hackabot',
  vallecatnip: '/vallecatnip',
  creadores: '/creadores',
  aliados: '/aliados',
  registro: '/generacion-fundadora/registro',
};

export const buildRegistroUrl = (via, extra = {}) => {
  const params = new URLSearchParams();
  if (via) params.set('via', via);
  Object.entries(extra).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') params.set(k, String(v));
  });
  const qs = params.toString();
  return `${GENERATION_ROUTES.registro}${qs ? `?${qs}` : ''}`;
};

// ------------------------------------------------------------------
// VÍAS
// ------------------------------------------------------------------
export const GENERATION_PATHS = [
  {
    id: 'hackabot',
    route: GENERATION_ROUTES.hackabot,
    label: 'Hackabot',
    short: 'Piensa, programa, organiza y dirige agentes de IA.',
    cta: 'Entrar a Hackabot',
    priority: true, // Campaña activa: puede destacarse en navegación
  },
  {
    id: 'vallecatnip',
    route: GENERATION_ROUTES.vallecatnip,
    label: 'Vallecatnip',
    short: 'Construye, cultiva, fabrica, repara y trabaja sobre el terreno.',
    cta: 'Construir Vallecatnip',
    priority: false,
  },
  {
    id: 'creadores',
    route: GENERATION_ROUTES.creadores,
    label: 'Creadores Fundadores',
    short: 'Documenta, explica y ayuda a hacer visible lo que estamos construyendo.',
    cta: 'Soy creador',
    priority: false,
  },
  {
    id: 'aliados',
    route: GENERATION_ROUTES.aliados,
    label: 'Aliados Fundadores',
    short: 'Universidades, cooperativas, empresas, colectivos y organizaciones.',
    cta: 'Crear una alianza',
    priority: false,
  },
];

export const getGenerationPath = (id) =>
  GENERATION_PATHS.find((p) => p.id === id) || null;

// ------------------------------------------------------------------
// ASSETS + POSICIONES RESPONSIVE POR HERO (requisito 18)
// Los assets NO se renombran, ni regeneran, ni sustituyen.
// position: { desktop, tablet, mobile } se aplica como background-position.
// El overlay CSS (rgba(0,0,0,0.65) / gradient) garantiza legibilidad.
// ------------------------------------------------------------------
export const GENERATION_ASSETS = {
  home: {
    src: heroGeneracionFundadoraWebp,
    alt: 'Ciudadan: tecnología, comunidad y naturaleza — Generación Fundadora 2026',
    position: { desktop: 'center center', tablet: 'center center', mobile: 'center center' },
  },
  hackabot: {
    src: heroHackabotWebp,
    alt: 'Equipo Hackabot: agentes de IA, laboratorio y personajes de Ciudadan',
    position: { desktop: 'center center', tablet: 'center center', mobile: '65% center' },
  },
  hackabotEtapa2: {
    src: hackabotEtapa2Webp,
    alt: 'Etapa 2 Hackabot: trabajo nocturno, equipos, IA y comunidad en Discord',
    position: { desktop: 'center center', tablet: 'center center', mobile: 'center center' },
  },
  vallecatnip: {
    src: heroVallecatnipWebp,
    alt: 'Vallecatnip: bioconstrucción, ecoaldea, agricultura y trabajo en comunidad',
    position: { desktop: 'center center', tablet: 'center center', mobile: 'center center' },
  },
  creadores: {
    src: heroCreadoresWebp,
    alt: 'Creadores Fundadores: video, fotografía, streaming y producción audiovisual',
    position: { desktop: 'center center', tablet: 'center center', mobile: 'center center' },
  },
  aliados: {
    src: heroAliadosWebp,
    alt: 'Aliados Fundadores: universidades, cooperativas y organizaciones',
    position: { desktop: 'center center', tablet: 'center center', mobile: 'center center' },
  },
};

// ------------------------------------------------------------------
// CIT — unidad de participación
// ------------------------------------------------------------------
export const CIT = {
  name: 'CIT',
  description:
    'CIT es una unidad de participación dentro del proyecto. Representa tu aportación medida al trabajo de construcción, no dinero líquido garantizado.',
  keyConcept: 'ASIGNADO ≠ CONSOLIDADO',
  keyConceptDetail:
    'Una cosa es que te asignen CIT y otra que los consolides. La consolidación ocurre por tercios, sujeta a permanencia y rendimiento mínimo.',
  vesting: [
    { fraction: '1/3', at: '2 meses', label: 'Primer tercio a los 2 meses' },
    { fraction: '1/3', at: '6 meses', label: 'Segundo tercio a los 6 meses' },
    { fraction: '1/3', at: '12 meses', label: 'Tercer tercio a los 12 meses' },
  ],
  rules: [
    'La consolidación está sujeta a permanencia y rendimiento mínimo.',
    'Si alguien abandona, conserva lo que ya consolidó.',
    'Lo pendiente de consolidar vuelve al fondo correspondiente.',
    'CIT no es dinero líquido garantizado.',
  ],
  example: {
    amount: 12,
    parts: [4, 4, 4],
    note: 'Ejemplo: 12 CIT se consolidan como 4 + 4 + 4 (a los 2, 6 y 12 meses).',
  },
};

// ------------------------------------------------------------------
// HACKABOT — prioridad máxima de campaña
// ------------------------------------------------------------------
export const HACKABOT = {
  title: 'Hackabot Universitario',
  tagline: 'TUS AGENTES TRABAJANDO POR TI',
  intro: 'No importa tu carrera. Importa lo que sabes hacer.',
  whatIsIt:
    'Hackabot es una competencia y cantera permanente de talento donde participantes crean, coordinan o dirigen agentes de IA para resolver problemas reales.',
  highlights: [
    'No es sólo para programadores.',
    'Universitarios y profesionales.',
    'Abierto a cualquier disciplina.',
    'Agentes de IA.',
    'Proyectos reales.',
    'Incorporación progresiva a Ciudadan.',
  ],

  // 5 áreas generales (coinciden conceptualmente con las 5 áreas raíz de Ciudadan)
  areas: [
    {
      id: 'software',
      name: 'Software',
      description: 'Programación, automatización, agentes, plataformas y herramientas.',
      spotsStage1: 3,
    },
    {
      id: 'tecnica',
      name: 'Técnica',
      description: 'Hardware, infraestructura, redes, electrónica, datos, fabricación y solución práctica de problemas.',
      spotsStage1: 3,
    },
    {
      id: 'administracion',
      name: 'Administración',
      description: 'Organización, operaciones, coordinación, proyectos y gestión.',
      spotsStage1: 3,
    },
    {
      id: 'multimedia',
      name: 'Multimedia',
      description: 'Video, fotografía, diseño, audio, animación y producción digital.',
      spotsStage1: 3,
    },
    {
      id: 'comercial-humanidades',
      name: 'Comercial / Humanidades',
      description: 'Comunicación, ventas, investigación, marketing, derecho, relaciones, ciencias sociales y generación de impacto.',
      spotsStage1: 3,
    },
  ],

  stage1: {
    title: 'ETAPA 1',
    subtitle: 'GENERACIÓN INICIAL',
    convocatoria: '2–16 octubre 2026',
    presentacion: 'sábado 17 octubre 2026',
    lugar: 'Aura Hub · Narvarte',
    inicioOperativo: '18 octubre 2026',
    actividadRetos: '18 octubre – 13 diciembre 2026',
    evaluacion: '14–16 diciembre 2026',
    resultados: '17 diciembre 2026',
    inicioEtapa2: '18 diciembre 2026',
    duracion: '8 semanas (aproximadamente 2 meses)',
    timeline: [
      { label: 'Convocatoria', value: '2–16 octubre 2026' },
      { label: 'Presentación', value: 'sábado 17 octubre 2026' },
      { label: 'Lugar', value: 'Aura Hub · Narvarte' },
      { label: 'Inicio operativo', value: '18 octubre 2026' },
      { label: 'Actividad y retos', value: '18 octubre – 13 diciembre' },
      { label: 'Evaluación', value: '14–16 diciembre' },
      { label: 'Resultados', value: '17 diciembre' },
      { label: 'Inicio Etapa 2', value: '18 diciembre' },
    ],
  },

  stage1Spots: {
    general: 15,
    perArea: 3,
    specializedProfilesCount: 5, // aproximado — configurable, NO hardcodear carreras concretas
    specializedNote:
      'También se abrirán perfiles específicos según las necesidades actuales del proyecto.',
    specializedProfiles: [], // PENDIENTE: definir perfiles especializados definitivos
  },

  stage1Cit: {
    pool: 150,
    areaPrizes: [
      { place: '1er lugar', cit: 12 },
      { place: '2do lugar', cit: 9 },
      { place: '3er lugar', cit: 6 },
    ],
    perAreaTotal: 27,
    areasTotal: 135, // 27 × 5
    specializedCitEach: 3,
    specializedTotal: 15, // aprox. 5 perfiles × 3 CIT
  },

  activity: {
    weeklyHours: 15,
    weeklyHoursLabel: '15 HORAS SEMANALES',
    evaluationIntro: 'No se evalúa por estar conectado. Se evalúa:',
    criteria: [
      'Entregables',
      'Constancia',
      'Impacto',
      'Colaboración',
      'Seguimiento',
    ],
  },

  discord: {
    title: 'LA OFICINA SIGUE ABIERTA DE NOCHE',
    intro: 'Gran parte de la actividad continúa online mediante Discord.',
    features: [
      'Sesiones nocturnas',
      'Equipos',
      'Agentes',
      'Retos',
      'Seguimiento',
      'Avances',
      'Mentoría',
      'Apoyo',
      'Retroalimentación',
      'Comunidad',
    ],
    url: null, // PENDIENTE: no existe URL oficial de Discord en el repositorio. NO inventar.
    ctaLabel: 'Unirse al Discord',
  },

  stage2: {
    title: 'ETAPA 2',
    subtitle: 'LIGA ABIERTA',
    inicio: '18 diciembre 2026',
    duracion: 'aproximadamente 1 año',
    metaColaboradores: '120–150 colaboradores',
    citPorJornada: 'aproximadamente 1 CIT por jornada competitiva',
    poolAnual: 'aprox. 260–320 CIT',
    stats: [
      { label: 'Colaboradores objetivo', value: '120–150' },
      { label: 'CIT por jornada competitiva', value: '≈ 1' },
      { label: 'Pool objetivo anual', value: '260–320 CIT' },
    ],
  },

  stage2Eligibility: {
    intro: 'Para ser elegible en la Etapa 2 necesitas:',
    requirements: [
      'Mínimo 8 semanas de participación.',
      'Mínimo 15 horas semanales.',
      'Al menos 1 CIT ganado.',
      'Actividad vigente.',
      'Rendimiento mínimo.',
    ],
    note:
      'No necesitas esperar un cierre anual. Cuando cumples todos los requisitos, quedas elegible.',
    examples: [
      {
        steps: ['Gana CIT primero', 'Cumple 8 semanas después'],
        result: 'Quedas elegible.',
      },
      {
        steps: ['Cumple la antigüedad primero', 'Gana CIT después'],
        result: 'Quedas elegible.',
      },
    ],
  },

  careers: {
    message: 'TU CARRERA NO LIMITA LO QUE PUEDES CONSTRUIR',
    detail:
      'La categoría se relaciona principalmente con el problema que resuelve el agente, no con tu título.',
    goalIntro: 'Buscamos diversidad disciplinaria:',
    familyFamiliesTarget: '40–50', // grandes familias profesionales a lo largo de la Etapa 2
    perDisciplineNote:
      'No existe límite de una sola persona por carrera: puede haber 1, 2, 3 o más colaboradores de la misma disciplina cuando exista talento y necesidad.',
  },

  endOfFirstYear: {
    intro:
      'Si al final del primer año quedan disciplinas sin representación, la Asamblea revisa participantes, historial, actividad, finalistas, constancia y aportaciones, y puede evaluar incorporaciones extraordinarias.',
    warning: [
      'CIT ganado ≠ incorporación extraordinaria.',
      'No se regalan CIT por votación.',
    ],
  },

  finalCta: {
    text: 'TU AGENTE PUEDE EMPEZAR HOY',
    button: 'ENTRAR A HACKABOT',
  },
};

// ------------------------------------------------------------------
// VALLECATNIP
// ------------------------------------------------------------------
export const VALLECATNIP = {
  title: 'VALLECATNIP',
  tagline: 'SI SABES HACERLO, VEN A CONSTRUIRLO.',
  intro:
    'Buscamos personas capaces de construir, cultivar, fabricar, reparar, cuidar, producir y resolver problemas reales.',
  cta: 'QUIERO CONSTRUIR VALLECATNIP',
  profiles: [
    'Bioconstrucción',
    'Agricultura',
    'Veterinaria',
    'Agua',
    'Electricidad',
    'Energía',
    'Fabricación',
    'Carpintería',
    'Mantenimiento',
    'Reciclaje',
    'Cocina',
    'Producción',
    'Comunidad',
  ],
  noTitleNeeded:
    'No necesitas necesariamente un título si puedes demostrar que sabes hacerlo.',
  firstGroup: {
    target: 'aprox. 15 personas',
    levels: [
      { name: 'Perfil operativo', cit: 3 },
      { name: 'Especialista', cit: 6 },
      { name: 'Responsable / maestro', cit: 9 },
    ],
    averageCit: 6,
    pool: '~90 CIT',
  },
};

// ------------------------------------------------------------------
// CREADORES FUNDADORES
// ------------------------------------------------------------------
export const CREADORES = {
  title: 'CREADORES FUNDADORES',
  tagline:
    'NO QUEREMOS QUE PUBLIQUES UN ANUNCIO. QUEREMOS QUE DOCUMENTES LA CONSTRUCCIÓN DE ALGO.',
  cta: 'QUIERO SER CREADOR FUNDADOR',
  profiles: [
    'Video',
    'Fotografía',
    'TikTok',
    'YouTube',
    'Streaming',
    'Podcast',
    'Periodismo',
    'Divulgación',
    'Diseño',
    'Música',
    'Animación',
    'Documental',
    'Comunidades digitales',
  ],
  evaluationIntro: 'No evaluamos solamente seguidores. Métricas orientativas:',
  metrics: [
    { label: 'Calidad / producción', value: '30%' },
    { label: 'Alcance real', value: '25%' },
    { label: 'Registros / conversiones', value: '25%' },
    { label: 'Participación sostenida', value: '20%' },
  ],
  cit: {
    pool: 'hasta 120 CIT durante el primer ciclo',
    fractionsAllowed: true,
    noAutoPayments: 'No prometemos pagos automáticos.',
  },
  nextSteps: [
    'Entrar a Hackabot',
    'Integrarse a Multimedia',
    'Integrarse a Comercial / Humanidades',
    'Convertirse en colaborador',
  ],
};

// ------------------------------------------------------------------
// ALIADOS FUNDADORES
// ------------------------------------------------------------------
export const ALIADOS = {
  title: 'ALIADOS FUNDADORES',
  tagline: 'NO BUSCAMOS SOLAMENTE PATROCINADORES. BUSCAMOS CONSTRUIR JUNTOS.',
  cta: 'PROPONER UNA ALIANZA',
  allianceTypes: [
    {
      id: 'academicas',
      name: 'Académicas',
      items: ['Universidades', 'Facultades', 'Tecnológicos', 'Investigadores', 'Profesores', 'Laboratorios', 'Servicio social'],
    },
    {
      id: 'productivas',
      name: 'Productivas',
      items: ['Talleres', 'Cooperativas', 'Fabricantes', 'Productores', 'Empresas', 'Despachos'],
    },
    {
      id: 'territoriales',
      name: 'Territoriales',
      items: ['Comunidades', 'Ejidos', 'Colectivos', 'Organizaciones locales'],
    },
    {
      id: 'tecnologicas',
      name: 'Tecnológicas',
      items: ['Software', 'Hardware', 'IA', 'Servidores', 'APIs', 'Infraestructura', 'Redes'],
    },
    {
      id: 'difusion',
      name: 'Difusión y conocimiento',
      items: ['Medios', 'Asociaciones', 'Comunidades', 'Divulgadores', 'Profesionales'],
    },
  ],
  cit: {
    intro: 'No asignamos CIT sólo por firmar acuerdos: debe existir resultado o aportación verificable.',
    ranges: [
      { name: 'Microalianza', range: '1–3 CIT' },
      { name: 'Operativa', range: '3–9 CIT' },
      { name: 'Estratégica', range: '9–20 CIT' },
      { name: 'Estructural', range: '20–40 CIT' },
    ],
    bigAssignmentsNote: 'Las asignaciones grandes requieren autorización.',
    initialPool: '220 CIT',
  },
};

// ------------------------------------------------------------------
// FUNDADORES ACTUALES — DATO INTERNO, no protagonista en la web pública
// ------------------------------------------------------------------
export const CURRENT_FOUNDERS = {
  internal: true,
  count: 10,
  pool: 200,
  equalDistribution: { amount: 100, perFounder: 10 },
  performancePool: {
    amount: 100,
    period: 'distribuidos según desempeño durante 2 meses',
    metrics: [
      { label: 'Entregables aceptados', value: '40%' },
      { label: 'Impacto / prioridad', value: '25%' },
      { label: 'Constancia', value: '20%' },
      { label: 'Colaboración / documentación', value: '15%' },
    ],
    formula: 'CIT desempeño = 100 × puntos individuales / puntos totales',
  },
};

// ------------------------------------------------------------------
// REGISTRO — un único formulario dinámico según ?via=
// ------------------------------------------------------------------
export const REGISTRATION = {
  validVias: ['hackabot', 'vallecatnip', 'creadores', 'aliados', 'general'],
  defaultVia: 'general',

  viaMeta: {
    hackabot: {
      label: 'Hackabot',
      title: 'Registro · Hackabot',
      subtitle:
        'Postula a Hackabot Universitario: crea, coordina o dirige agentes de IA en problemas reales.',
      backTo: { label: 'Volver a Hackabot', route: GENERATION_ROUTES.hackabot },
    },
    vallecatnip: {
      label: 'Vallecatnip',
      title: 'Registro · Vallecatnip',
      subtitle:
        'Postula al primer grupo de construcción: bioconstrucción, agricultura, fabricación y comunidad.',
      backTo: { label: 'Volver a Vallecatnip', route: GENERATION_ROUTES.vallecatnip },
    },
    creadores: {
      label: 'Creadores Fundadores',
      title: 'Registro · Creadores Fundadores',
      subtitle:
        'Documenta la construcción de Ciudadan y forma parte del equipo que lo hace visible.',
      backTo: { label: 'Volver a Creadores', route: GENERATION_ROUTES.creadores },
    },
    aliados: {
      label: 'Aliados Fundadores',
      title: 'Registro · Aliados Fundadores',
      subtitle:
        'Propón una alianza entre tu organización y Ciudadan para construir juntos.',
      backTo: { label: 'Volver a Aliados', route: GENERATION_ROUTES.aliados },
    },
    general: {
      label: 'Generación Fundadora',
      title: 'Registro · Generación Fundadora',
      subtitle:
        'Cuéntanos qué sabes hacer y encontramos juntos la mejor vía para que participes.',
      backTo: { label: 'Volver a Generación Fundadora', route: GENERATION_ROUTES.home },
    },
  },

  // Campos comunes a todas las vías (spec 11.1).
  // Si el usuario ya está autenticado (Auth0), email y nombre se prellenan y se marcan como sólo lectura.
  commonFields: [
    { name: 'nombre', label: 'Nombre completo', type: 'text', required: true, half: true },
    { name: 'email', label: 'Correo electrónico', type: 'email', required: true, half: true },
    { name: 'telefono', label: 'Teléfono', type: 'tel', half: true },
    { name: 'estado', label: 'Estado', type: 'text', half: true },
    { name: 'ciudad', label: 'Ciudad', type: 'text', half: true },
    { name: 'discord', label: 'Usuario de Discord (opcional)', type: 'text', half: true },
    {
      name: 'disponibilidad',
      label: 'Disponibilidad',
      type: 'select',
      required: true,
      half: true,
      options: [
        'Menos de 10 horas por semana',
        '10 a 15 horas por semana',
        '15 horas por semana o más',
        'Fines de semana',
        'Horario flexible / nocturno',
      ],
    },
    {
      name: 'descripcion',
      label: 'Cuéntanos qué sabes hacer',
      type: 'textarea',
      required: true,
      placeholder:
        'Cuentos con qué habilidades, experiencia y motivación llegas a este proyecto.',
    },
    {
      name: 'portfolio',
      label: 'Portfolio / enlaces (opcional)',
      type: 'textarea',
      placeholder: 'GitHub, Behance, canal de YouTube, sitio, fotos de trabajo previo…',
    },
    {
      name: 'comoSeEntero',
      label: '¿Cómo te enteraste del proyecto?',
      type: 'select',
      half: true,
      options: [
        'Flyer o campaña física',
        'Redes sociales',
        'Un conocido / invitación',
        'Universidad o escuela',
        'Discord o comunidad',
        'Otro',
      ],
    },
    {
      name: 'consentimiento',
      label:
        'Acepto que Ciudadan use estos datos para evaluar mi incorporación a la Generación Fundadora 2026.',
      type: 'consent',
      required: true,
    },
  ],

  // Campos adicionales por vía (spec 11.2–11.5).
  // Se renderizan tras los campos comunes, agrupados bajo el encabezado de la vía.
  extraFields: {
    hackabot: [
      {
        name: 'area',
        label: 'Área',
        type: 'select',
        required: true,
        half: true,
        options: [
          'Software',
          'Técnica',
          'Administración',
          'Multimedia',
          'Comercial / Humanidades',
        ],
      },
      { name: 'carrera', label: 'Carrera', type: 'text', half: true },
      { name: 'universidad', label: 'Universidad o escuela', type: 'text', half: true },
      { name: 'semestre', label: 'Semestre (si aplica)', type: 'text', half: true },
      { name: 'habilidades', label: 'Habilidades principales', type: 'textarea', required: true },
      {
        name: 'experienciaIA',
        label: 'Experiencia con agentes de IA',
        type: 'select',
        half: true,
        options: ['Ninguna', 'Básica', 'Intermedia', 'Avanzada'],
      },
      {
        name: 'programacion',
        label: '¿Programas?',
        type: 'select',
        half: true,
        options: ['Sí', 'No', 'Un poco'],
      },
      { name: 'herramientas', label: 'Herramientas que usas', type: 'text' },
      {
        name: 'disponibilidadSemanal',
        label: 'Disponibilidad semanal (horas)',
        type: 'select',
        required: true,
        half: true,
        options: ['Menos de 15', '15', '15 a 25', 'Más de 25'],
      },
      {
        name: 'queConstruir',
        label: '¿Qué podría construir tu agente?',
        type: 'textarea',
        required: true,
        placeholder: 'Describe un problema real que tu agente podría resolver.',
      },
      { name: 'github', label: 'GitHub (opcional)', type: 'url', half: true },
      { name: 'portfolioHackabot', label: 'Portfolio (opcional)', type: 'url', half: true },
    ],
    vallecatnip: [
      { name: 'oficio', label: 'Oficio / profesión', type: 'text', required: true, half: true },
      {
        name: 'experienciaPractica',
        label: 'Experiencia práctica (años)',
        type: 'select',
        half: true,
        options: ['Sin experiencia formal', 'Menos de 1', '1 a 3', '3 a 5', 'Más de 5'],
      },
      { name: 'tecnicas', label: 'Técnicas que dominas', type: 'textarea', required: true },
      { name: 'herramientasVc', label: 'Herramientas / equipos que manejas', type: 'text' },
      {
        name: 'presencial',
        label: '¿Puedes trabajar presencial?',
        type: 'select',
        half: true,
        options: ['Sí', 'No', 'Parcialmente'],
      },
      {
        name: 'portfolioVc',
        label: 'Portfolio / fotos / enlaces de trabajos (opcional)',
        type: 'textarea',
      },
    ],
    creadores: [
      {
        name: 'plataforma',
        label: 'Plataforma principal',
        type: 'select',
        required: true,
        half: true,
        options: ['YouTube', 'TikTok', 'Instagram', 'X / Twitter', 'Twitch', 'Podcast', 'Otra'],
      },
      {
        name: 'tipoContenido',
        label: 'Tipo de contenido',
        type: 'text',
        required: true,
        half: true,
        placeholder: 'Video, fotografía, divulgación, documental…',
      },
      {
        name: 'enlacesCreador',
        label: 'Enlaces a tus contenidos',
        type: 'textarea',
        required: true,
        placeholder: 'Canal, cuenta, podcast, reel destacado…',
      },
      {
        name: 'alcance',
        label: 'Alcance aproximado',
        type: 'select',
        half: true,
        options: [
          'Menos de 1,000',
          '1,000 a 5,000',
          '5,000 a 20,000',
          '20,000 a 100,000',
          'Más de 100,000',
        ],
      },
      { name: 'tematica', label: 'Temática principal', type: 'text', half: true },
      { name: 'experienciaCreador', label: 'Experiencia', type: 'textarea' },
    ],
    aliados: [
      { name: 'organizacion', label: 'Organización', type: 'text', required: true, half: true },
      {
        name: 'tipoOrganizacion',
        label: 'Tipo de alianza',
        type: 'select',
        required: true,
        half: true,
        options: ['Académica', 'Productiva', 'Territorial', 'Tecnológica', 'Difusión y conocimiento'],
      },
      { name: 'cargo', label: 'Cargo', type: 'text', half: true },
      { name: 'contactoOrganizacion', label: 'Contacto', type: 'text', half: true },
      { name: 'queAporta', label: '¿Qué puede aportar tu organización?', type: 'textarea', required: true },
      { name: 'queBusca', label: '¿Qué busca de Ciudadan?', type: 'textarea', required: true },
      { name: 'sitio', label: 'Sitio web', type: 'url', half: true },
      {
        name: 'tamano',
        label: 'Tamaño',
        type: 'select',
        half: true,
        options: ['1–5 personas', '6–20', '21–50', '51–200', 'Más de 200'],
      },
      { name: 'propuesta', label: 'Propuesta de colaboración', type: 'textarea' },
    ],
  },
};

// ------------------------------------------------------------------
// LANDING PRINCIPAL (/generacion-fundadora)
// ------------------------------------------------------------------
export const GENERATION_HOME = {
  title: 'GENERACIÓN FUNDADORA',
  subtitle: 'CIUDADAN 2026',
  intro:
    'Estamos formando a las personas, equipos y organizaciones que construirán Ciudadan, Vallecatnip y Cáñamo Valley.',
  ctaPrimary: 'QUIERO PARTICIPAR',
  ctaSecondary: 'CONOCE LAS 4 VÍAS',
  buildingTitle: 'QUÉ ESTAMOS CONSTRUYENDO',
  buildingBlocks: [
    {
      name: 'CIUDADAN',
      description: 'Ecosistema digital, productivo y cooperativo.',
    },
    {
      name: 'CÁÑAMO VALLEY',
      description: 'Comunidad productiva, educativa y tecnológica de largo plazo.',
    },
    {
      name: 'VALLECATNIP',
      description:
        'Ecoaldea piloto donde se prueban bioconstrucción, agricultura, fabricación, energía y vida comunitaria.',
    },
  ],
  pathsTitle: 'ELIGE CÓMO PARTICIPAR',
  howTitle: 'CÓMO FUNCIONA',
  howFlow: [
    'ELIGE TU VÍA',
    'REGÍSTRATE',
    'PARTICIPA',
    'TRABAJA EN PROYECTOS REALES',
    'CONSTRUYE HISTORIAL',
    'INCORPÓRATE A CIUDADAN',
  ],
  finalCtaText: 'Hay muchas maneras de construir.',
  finalCtaButton: 'ENCUENTRA TU VÍA',
};

// ------------------------------------------------------------------
// FAQ (spec 17) — explicación de CIT compartida
// ------------------------------------------------------------------
export const GENERATION_FAQ = [
  {
    question: '¿Necesito programar?',
    answer: 'No. Cada vía necesita distintas capacidades y Hackabot está abierto a cualquier disciplina.',
  },
  {
    question: '¿Necesito ser universitario?',
    answer:
      'Hackabot tiene foco universitario, pero pueden participar profesionales según convocatoria.',
  },
  {
    question: '¿Mi carrera limita lo que puedo construir?',
    answer: 'No. La categoría se relaciona con el problema que resuelves, no con tu título.',
  },
  {
    question: '¿Cuántas horas necesito?',
    answer: 'Referencia mínima: 15 horas semanales.',
  },
  {
    question: '¿Todo es presencial?',
    answer: 'No. Gran parte de la actividad continúa en línea.',
  },
  {
    question: '¿Qué es CIT?',
    answer:
      'CIT es una unidad de participación dentro del proyecto. Lo asignado no es lo consolidado: se consolida por tercios a los 2, 6 y 12 meses, sujeto a permanencia y rendimiento mínimo. No es dinero líquido garantizado.',
  },
  {
    question: '¿Puedo participar en varias vías?',
    answer: 'Sí, cuando sea compatible con tus responsabilidades.',
  },
  {
    question: '¿Puedo convertirme en colaborador permanente?',
    answer: 'Sí. La Generación Fundadora es la puerta de entrada a la incorporación progresiva.',
  },
];

// ------------------------------------------------------------------
// SEO (spec 21)
// ------------------------------------------------------------------
export const GENERATION_SEO = {
  baseSiteName: 'Ciudadan',
  pages: {
    home: {
      title: 'Generación Fundadora Ciudadan 2026',
      description:
        'Únete a la Generación Fundadora de Ciudadan 2026: Hackabot, Vallecatnip, Creadores y Aliados Fundadores. Participa en la construcción de un ecosistema cooperativo real.',
      ogImageKey: 'home',
    },
    hackabot: {
      title: 'Hackabot Universitario | Ciudadan',
      description:
        'Hackabot: competencia y cantera permanente de talento. Crea, coordina o dirige agentes de IA para resolver problemas reales. Convocatoria: 2–16 octubre 2026.',
      ogImageKey: 'hackabot',
    },
    vallecatnip: {
      title: 'Vallecatnip | Ciudadan',
      description:
        'Vallecatnip: ecoaldea piloto de Ciudadan. Bioconstrucción, agricultura, fabricación y vida comunitaria. Si sabes hacerlo, ven a construirlo.',
      ogImageKey: 'vallecatnip',
    },
    creadores: {
      title: 'Creadores Fundadores | Ciudadan',
      description:
        'Creadores Fundadores: documenta la construcción de Ciudadan. Video, fotografía, streaming, podcast y divulgación.',
      ogImageKey: 'creadores',
    },
    aliados: {
      title: 'Aliados Fundadores | Ciudadan',
      description:
        'Aliados Fundadores: universidades, cooperativas, empresas y organizaciones construyendo junto a Ciudadan.',
      ogImageKey: 'aliados',
    },
    registro: {
      title: 'Registro | Generación Fundadora Ciudadan 2026',
      description:
        'Regístrate a la Generación Fundadora 2026 de Ciudadan: un solo formulario, cuatro vías de participación.',
      ogImageKey: 'home',
    },
  },
};

// ------------------------------------------------------------------
// ANALYTICS (spec 14) — infraestructura existente: dataLayer / gtag si
// el entorno los define; sin inicializar nada nuevo por ahora.
// ------------------------------------------------------------------
export const GENERATION_ANALYTICS_EVENTS = {
  generationView: 'generation_view',
  pathSelected: 'generation_path_selected',
  hackabotView: 'hackabot_view',
  vallecatnipView: 'vallecatnip_view',
  creadoresView: 'creadores_view',
  aliadosView: 'aliados_view',
  registrationStarted: 'registration_started',
  registrationCompleted: 'registration_completed',
};

export const GENERATION_DEFAULT = {
  routes: GENERATION_ROUTES,
  paths: GENERATION_PATHS,
  assets: GENERATION_ASSETS,
  cit: CIT,
  hackabot: HACKABOT,
  vallecatnip: VALLECATNIP,
  creadores: CREADORES,
  aliados: ALIADOS,
  currentFounders: CURRENT_FOUNDERS,
  registration: REGISTRATION,
  home: GENERATION_HOME,
  faq: GENERATION_FAQ,
  seo: GENERATION_SEO,
  analytics: GENERATION_ANALYTICS_EVENTS,
};
