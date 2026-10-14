import { TOKEN_CONTENT } from './tokenContent';

import PesosImg from '../../assets/monedas/mxn.png';
import LaboryImg from '../../assets/monedas/labory.png';
import CiudadanImg from '../../assets/monedas/ciudadan_logo_public.png';
import PubliaImg from '../../assets/monedas/publia.png';
import ObjectImg from '../../assets/monedas/object.png';
import TaskImg from '../../assets/monedas/task.png';
import TodoImg from '../../assets/monedas/todo.png';
import EvaluationImg from '../../assets/monedas/evaluation.png';
import VoteImg from '../../assets/monedas/vote.png';
import IdImg from '../../assets/monedas/idtoken.png';
import SkillImg from '../../assets/monedas/skill.png';
import SocialImg from '../../assets/monedas/social.png';

/**
 * Configuración central de las monedas/tokens de la Cartera.
 *
 * Antes, `Billetera.jsx` decidía todo con una cadena larga de
 * `selected === 'Nombre'` y varios tokens terminaban enviando al mismo
 * `/coowork` sin importar la moneda. Aquí cada token declara explícitamente:
 *
 *   id / slug / aliases        → identificación y deep-links (/cartera/:moneda)
 *   nombre / imagen / resumen  → ficha breve (siempre visible)
 *   descripcion                → explicación larga desplegable (tokenContent.js)
 *   action { label, to, hint } → CTA con destino REAL (o null si no aplica)
 *   simuladores                → destinos futuros declarados, NO operativos
 *   status                     → 'activo' | 'informativo' | 'desarrollo'
 *   panel                      → bloque de datos reales que renderiza Billetera
 *                                ('resumen' | 'pesos' | 'labory' | 'itoken'
 *                                 | 'evaluation' | 'skills' | 'info')
 *
 * REGLA — NO INVENTAR (bloque 1, cartera integral):
 *   - `action.to` sólo apunta a rutas que EXISTEN en `src/Routes/index.jsx`.
 *     Si una función no está implementada, no se declara acción: se declara en
 *     `simuladores` con `estado: 'pendiente'` y la UI lo anuncia sin botón.
 *   - Los `slug` se conservan y se amplían con `aliases` para que los enlaces
 *     antiguos sigan abriendo (compatibilidad hacia atrás).
 *   - Fichas incorporadas en este bloque: CIT (antes "Ciudadan I-Token",
 *     con alias 'cit') y PROOF (resoluciones, que no existía).
 */

export const STATUS_LABELS = {
  activo: 'Activo',
  informativo: 'Informativo',
  desarrollo: 'En desarrollo',
};

export const DEFAULT_TOKEN_ID = 'resumen';

export const TOKENS = [
  {
    id: 'resumen',
    slug: null, // sin slug: /cartera
    aliases: ['resumen', 'inicio', 'cartera'],
    nombre: 'Resumen',
    imagen: null,
    resumen: 'Vista general de tus saldos, tu wallet y el historial de movimientos.',
    status: 'activo',
    panel: 'resumen',
    action: null,
    descripcion: TOKEN_CONTENT.resumen,
  },
  {
    id: 'pesos',
    slug: 'pesos-mxn',
    aliases: ['pesos', 'mxn', 'pesos-mxn', 'pesosmxn'],
    nombre: 'Pesos MXN',
    imagen: PesosImg,
    resumen:
      'Cómo se gana y se cobra dinero en efectivo dentro de Ciudadan, y punto de acceso a los simuladores de ingresos.',
    status: 'informativo',
    panel: 'pesos',
    action: null,
    // Destinos futuros de simuladores. `estado: 'pendiente'` = todavía no
    // existe, así que TokenPanel NO renderiza botón: sólo anuncia el destino.
    // No se declaran fórmulas ni cifras: se definirán en su bloque.
    simuladores: [
      { rol: 'Socio de agencia', estado: 'pendiente' },
      { rol: 'Colaborador', estado: 'pendiente' },
      { rol: 'Conductor', estado: 'pendiente' },
      { rol: 'Repartidor', estado: 'pendiente' },
      { rol: 'Líder / promotor', estado: 'pendiente' },
      { rol: 'Comercio / restaurante', estado: 'pendiente' },
      { rol: 'Agencia completa', estado: 'pendiente' },
    ],
    descripcion: TOKEN_CONTENT.pesos,
  },
  {
    id: 'labory',
    slug: 'labory',
    aliases: ['labory', 'laborys', 'lby', 'labory-token'],
    nombre: 'Labory',
    imagen: LaboryImg,
    resumen:
      'La moneda interna de Ciudadan: se acredita en tu cartera cuando tu trabajo se califica.',
    status: 'activo',
    panel: 'labory',
    action: { label: 'Comprar Labory', to: '/market' },
    descripcion: TOKEN_CONTENT.labory,
  },
  {
    // CIT — Ciudadan Investment Token.
    // Antes esta ficha se llamaba "Ciudadan I-Token" (id 'itoken'). Se conserva
    // el id para no romper nada interno y se agrega el alias 'cit' porque
    // `Ganar.jsx` ya enlazaba a `/cartera/cit` y ese slug no resolvía (la app
    // redirigía en silencio a /cartera). Ahora /cartera/cit abre esta ficha.
    id: 'itoken',
    slug: 'cit',
    aliases: ['cit', 'ciudadan-investment-token', 'i-token', 'itoken', 'ciudadan-i-token', 'ciudadan-itoken'],
    nombre: 'CIT — Ciudadan Investment Token',
    imagen: CiudadanImg,
    resumen:
      'Participación económica en el ecosistema Ciudadan: fuentes, series, documentos, plazos y distribuciones de cada emisión.',
    status: 'desarrollo',
    panel: 'itoken',
    action: { label: 'Ver catálogo de I-Tokens', to: '/cartera/itokens' },
    descripcion: TOKEN_CONTENT.cit,
  },
  {
    id: 'publia',
    slug: 'publia',
    aliases: ['publia', 'publia-token'],
    nombre: 'Publia',
    imagen: PubliaImg,
    resumen:
      'La publicidad de la plataforma Ciudadan: se adquiere con Labory (comprar LAB → contratar publicidad → publicación y medición → recompra).',
    status: 'informativo',
    panel: 'info',
    // CTA principal acordada: "Comprar Labory". Reutiliza el destino real de
    // compra de Labory que ya existe (/market); no se inventa un checkout.
    action: { label: 'Comprar Labory', to: '/market' },
    descripcion: TOKEN_CONTENT.publia,
  },
  {
    id: 'object',
    slug: 'object-token',
    aliases: ['object', 'objeto', 'object-token'],
    nombre: 'Object-Token',
    imagen: ObjectImg,
    resumen: 'Objetos y activos registrados dentro del ecosistema Ciudadan.',
    status: 'desarrollo',
    panel: 'info',
    action: { label: 'Ver objetos', to: '/objetos' },
    descripcion: TOKEN_CONTENT.object,
  },
  {
    id: 'task',
    slug: 'task-token',
    aliases: ['task', 'task-token', 'tareas'],
    nombre: 'TaskToken',
    imagen: TaskImg,
    resumen: 'Obtén recompensas resolviendo tareas abiertas de la comunidad Ciudadan.',
    status: 'activo',
    panel: 'info',
    action: { label: 'Ver tareas disponibles', to: '/coowork?tab=generales' },
    descripcion: TOKEN_CONTENT.task,
  },
  {
    // PROOF — la aportación/resolución de un encargo.
    // No existía como ficha: sólo había TaskToken y TodoToken. Se incorpora en
    // este bloque para nombrar correctamente las resoluciones. NO cambia los
    // identificadores internos `todo`/`tarea` ni sus estados: apunta al mismo
    // tablero real del CoWork que ya funcionaba.
    id: 'proof',
    slug: 'proof-token',
    aliases: ['proof', 'proof-token', 'proofs', 'resoluciones', 'aportaciones', 'tarea'],
    nombre: 'ProofToken',
    imagen: TaskImg,
    resumen:
      'Tu aportación o resolución de un encargo: el trabajo entregado contra un TaskToken publicado. Un encargo puede tener varias resoluciones.',
    status: 'activo',
    panel: 'info',
    action: { label: 'Ver tareas disponibles', to: '/coowork?tab=generales' },
    descripcion: TOKEN_CONTENT.proof,
  },
  {
    id: 'todo',
    slug: 'todo-token',
    aliases: ['todo', 'todo-token', 'mi-agencia'],
    nombre: 'TodoToken',
    imagen: TodoImg,
    resumen: 'Publica y gestiona las tareas que generas como socio de una Agencia Ciudadan.',
    status: 'activo',
    panel: 'info',
    action: { label: 'Mis tareas publicadas', to: '/coowork/mi-agencia/tareas' },
    descripcion: TOKEN_CONTENT.todo,
  },
  {
    id: 'evaluation',
    slug: 'evaluation-token',
    aliases: ['evaluation', 'evaluation-token', 'evaluaciones'],
    nombre: 'Evaluation-Token',
    imagen: EvaluationImg,
    resumen: 'Registra las evaluaciones obtenidas por el trabajo que realizas dentro de Ciudadan.',
    status: 'activo',
    panel: 'evaluation',
    action: null,
    descripcion: TOKEN_CONTENT.evaluation,
  },
  {
    id: 'vote',
    slug: 'vote-token',
    aliases: ['vote', 'vote-token', 'votaciones', 'voto'],
    nombre: 'Vote-Token',
    imagen: VoteImg,
    resumen: 'Tu participación y tu voz en la gobernanza de la comunidad Ciudadan.',
    status: 'desarrollo',
    panel: 'info',
    action: { label: 'Ver votaciones', to: '/votaciones' },
    descripcion: TOKEN_CONTENT.vote,
  },
  {
    id: 'id',
    slug: 'id-token',
    aliases: ['id', 'id-token', 'identidad', 'cidid'],
    nombre: 'Id-Token',
    imagen: IdImg,
    resumen:
      'Tu identidad digital dentro del ecosistema Ciudadan y la base para vincular participación, reputación, habilidades y actividad.',
    status: 'desarrollo',
    panel: 'info',
    action: { label: 'Ver mi identidad', to: '/identidad' },
    descripcion: TOKEN_CONTENT.id,
  },
  {
    id: 'skill',
    slug: 'skill-token',
    aliases: ['skill', 'skill-token', 'habilidades'],
    nombre: 'Skill-Token',
    imagen: SkillImg,
    resumen:
      'Representa habilidades y conocimientos demostrados y verificables dentro del ecosistema Ciudadan.',
    status: 'informativo',
    panel: 'skills',
    action: null,
    descripcion: TOKEN_CONTENT.skill,
  },
  {
    id: 'social',
    slug: 'social-token',
    aliases: ['social', 'social-token', 'comunidad'],
    nombre: 'Social-Token',
    imagen: SocialImg,
    resumen: 'Tu aporte a la comunidad Ciudadan más allá del trabajo remunerado.',
    status: 'informativo',
    panel: 'info',
    action: { label: 'Ir a la comunidad', to: '/comunidad' },
    descripcion: TOKEN_CONTENT.social,
  },

];

const normalizar = (valor) => String(valor ?? '').trim().toLowerCase();

/** Token por id (uso interno del panel). */
export const getTokenById = (id) => TOKENS.find((token) => token.id === id) || null;

/**
 * Resuelve `/cartera/:moneda` → token.
 * - sin parámetro → resumen (como antes en /cartera)
 * - slug/id/alias desconocido → null (la vista vuelve al resumen sin romper)
 */
export const findTokenByParam = (param) => {
  const buscado = normalizar(param);
  if (!buscado) return getTokenById(DEFAULT_TOKEN_ID);

  const token = TOKENS.find(
    (item) =>
      normalizar(item.slug) === buscado ||
      normalizar(item.id) === buscado ||
      (item.aliases || []).some((alias) => normalizar(alias) === buscado)
  );

  return token || null;
};

/** URL de la ficha de un token (el resumen vive en /cartera sin slug). */
export const getTokenPath = (token) => (token?.slug ? `/cartera/${token.slug}` : '/cartera');
