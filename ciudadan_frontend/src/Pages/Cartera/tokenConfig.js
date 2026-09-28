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
 *   status                     → 'activo' | 'informativo' | 'desarrollo'
 *   panel                      → bloque de datos reales que renderiza Billetera
 *                                ('resumen' | 'pesos' | 'labory' | 'itoken'
 *                                 | 'evaluation' | 'skills' | 'info')
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
      'Tu referencia en pesos mexicanos: cuánto representan tus Laborys y tus pagos en efectivo.',
    status: 'informativo',
    panel: 'pesos',
    action: null,
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
    id: 'itoken',
    slug: 'i-token',
    aliases: ['i-token', 'itoken', 'ciudadan-i-token', 'ciudadan-itoken'],
    nombre: 'Ciudadan I-Token',
    imagen: CiudadanImg,
    resumen: 'Tokens de inversión y rendimientos del ecosistema Ciudadan.',
    status: 'desarrollo',
    panel: 'itoken',
    action: { label: 'Ver catálogo de I-Tokens', to: '/cartera/itokens' },
    descripcion: TOKEN_CONTENT.itoken,
  },
  {
    id: 'publia',
    slug: 'publia',
    aliases: ['publia', 'publia-token'],
    nombre: 'Publia',
    imagen: PubliaImg,
    resumen: 'El ecosistema de publicidad y recompensas por atención e interacción.',
    status: 'informativo',
    panel: 'info',
    action: { label: 'Ver anuncios remunerados', to: '/gana/ver-anuncios' },
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
