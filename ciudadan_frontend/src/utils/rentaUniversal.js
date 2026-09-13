// src/utils/rentaUniversal.js
// Lógica pura y centralizada del programa Renta Universal.
// Concepto: bono mensual ADICIONAL de 31 Laborys por constancia.
// NO sustituye ni incluye las ganancias normales por visualizar anuncios:
//   Ganancias por anuncios + 31 Laborys EXTRA por constancia mensual.
//
// Reglas (modulares: cambiar aquí propaga a toda la UI):
// - Máximo 1 hora (60 min) de publicidad al día para esta mecánica.
// - Cada mes se divide en bloques desde el día 1: 1–7, 8–14, 15–21, 22–28, 29–fin.
// - Bloque completo (7 días) → mínimo 6 días completados.
// - Bloque parcial final (29–fin): requisito = días disponibles - 1,
//   excepto si queda 1 solo día → requisito 1.
//   Ejemplos: 3 restantes → 2; 2 restantes → 1; 1 restante → 1.

export const REGLAS_RENTA_UNIVERSAL = {
  BONO_MENSUAL_LABORYS: 31,
  MINUTOS_POR_DIA: 60,
  DIAS_MINIMOS_BLOQUE_COMPLETO: 6,
  TAMANO_BLOQUE: 7,
};

const MESES_ES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

const DIAS_SEMANA_CORTO = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

const aMedianoche = (fecha) => {
  const d = new Date(fecha);
  d.setHours(0, 0, 0, 0);
  return d;
};

const claveDia = (fecha) => {
  const d = new Date(fecha);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

/** Número de días del mes (año, mesIndex 0-11). */
export const diasDelMes = (anio, mesIndex) => new Date(anio, mesIndex + 1, 0).getDate();

/** Último día del mes como Date (para "Próximo corte"). */
export const ultimoDiaMes = (anio, mesIndex) => new Date(anio, mesIndex, diasDelMes(anio, mesIndex));

/** Nombre del mes en español (mesIndex 0-11). */
export const nombreMes = (mesIndex) => MESES_ES[mesIndex];

/**
 * Requisito de días completados de un bloque.
 * Bloque completo → 6. Bloque parcial de n días → max(1, n - 1).
 */
export const requisitoPeriodo = (
  periodo,
  diasMinimosCompleto = REGLAS_RENTA_UNIVERSAL.DIAS_MINIMOS_BLOQUE_COMPLETO,
) => {
  const n = periodo.dias.length;
  if (!periodo.esParcial) return diasMinimosCompleto;
  return Math.max(1, n - 1);
};

/**
 * Genera los bloques del mes desde el día 1.
 * Cada bloque: { inicio, fin, dias: [Date...], esParcial, requisito }.
 */
export const generarPeriodos = (anio, mesIndex, tamanoBloque = REGLAS_RENTA_UNIVERSAL.TAMANO_BLOQUE) => {
  const total = diasDelMes(anio, mesIndex);
  const periodos = [];
  let inicio = 1;
  while (inicio <= total) {
    const fin = Math.min(inicio + tamanoBloque - 1, total);
    const dias = [];
    for (let d = inicio; d <= fin; d += 1) {
      dias.push(new Date(anio, mesIndex, d));
    }
    const esParcial = dias.length < tamanoBloque;
    const bloque = { inicio, fin, dias, esParcial };
    bloque.requisito = requisitoPeriodo(bloque);
    periodos.push(bloque);
    inicio = fin + 1;
  }
  return periodos;
};

/** Cuenta cuántos días del periodo están en el set de completados (claves 'yyyy-mm-dd'). */
export const diasCompletados = (periodo, setCompletados) => {
  if (!periodo || !setCompletados) return 0;
  let count = 0;
  periodo.dias.forEach((dia) => {
    if (setCompletados.has(claveDia(dia))) count += 1;
  });
  return count;
};

/** ¿El periodo ya cumplió su requisito? */
export const periodoCumplido = (periodo, setCompletados) => (
  diasCompletados(periodo, setCompletados) >= periodo.requisito
);

/**
 * ¿El periodo todavía puede cumplirse? (completados + restantes alcanzan el requisito).
 * `hoy` permite inyectar la fecha para pruebas.
 */
export const periodoAunAlcanzable = (periodo, setCompletados, hoy = new Date()) => {
  if (periodoCumplido(periodo, setCompletados)) return true;
  const hoyMid = aMedianoche(hoy).getTime();
  const restantes = periodo.dias.filter((dia) => aMedianoche(dia).getTime() >= hoyMid).length;
  return diasCompletados(periodo, setCompletados) + restantes >= periodo.requisito;
};

/** Periodo que contiene a `hoy` (o null si ninguno). */
export const periodoActual = (periodos, hoy = new Date()) => {
  const hoyMid = aMedianoche(hoy).getTime();
  return periodos.find((p) => p.dias.some((dia) => aMedianoche(dia).getTime() === hoyMid)) || null;
};

/** ¿Todos los periodos están cumplidos? → mes calificado, espera corte. */
export const mesCalificado = (periodos, setCompletados) => (
  periodos.length > 0 && periodos.every((p) => periodoCumplido(p, setCompletados))
);

/**
 * ¿Matemáticamente ya no puede alcanzar el bono del mes?
 * Algún periodo incumplido que ya no es alcanzable.
 */
export const mesPerdido = (periodos, setCompletados, hoy = new Date()) => (
  periodos.some((p) => !periodoCumplido(p, setCompletados) && !periodoAunAlcanzable(p, setCompletados, hoy))
);

export const contarPeriodosCumplidos = (periodos, setCompletados) => (
  periodos.filter((p) => periodoCumplido(p, setCompletados)).length
);

/**
 * Estado mensual global para la UI.
 * 'pagado' lo define el backend (bono); aquí se derivan los estados por progreso.
 * Prioridad: pagado > no_alcanzado > calificado > periodo_cumplido > en_progreso.
 */
export const estadoMensual = (periodos, setCompletados, hoy = new Date(), bonoPagado = false) => {
  if (bonoPagado) return 'pagado';
  if (mesPerdido(periodos, setCompletados, hoy)) return 'no_alcanzado';
  if (mesCalificado(periodos, setCompletados)) return 'calificado';
  const actual = periodoActual(periodos, hoy);
  if (actual && periodoCumplido(actual, setCompletados)) return 'periodo_cumplido';
  return 'en_progreso';
};

/** Etiqueta corta del día de semana (Dom..Sáb) para una fecha. */
export const etiquetaDiaSemana = (fecha) => DIAS_SEMANA_CORTO[new Date(fecha).getDay()];

/** Estado visual de un día: 'completado' | 'hoy' | 'pendiente' | 'no_completado'. */
export const estadoDia = (fecha, setCompletados, hoy = new Date()) => {
  const key = claveDia(fecha);
  if (setCompletados.has(key)) return 'completado';
  const f = aMedianoche(fecha).getTime();
  const h = aMedianoche(hoy).getTime();
  if (f === h) return 'hoy';
  if (f > h) return 'pendiente';
  return 'no_completado';
};

/** Minutos de hoy con tope de 60 (la mecánica no contabiliza más de 1 hora diaria). */
export const minutosConTope = (minutos, tope = REGLAS_RENTA_UNIVERSAL.MINUTOS_POR_DIA) => (
  Math.max(0, Math.min(Number(minutos) || 0, tope))
);

/** Construye un Set de claves 'yyyy-mm-dd' a partir de un arreglo. */
export const setDiasCompletados = (arregloClaves = []) => new Set(arregloClaves);

/** Rango "15–21 de septiembre" para un periodo. */
export const etiquetaRangoPeriodo = (periodo, mesIndex) => (
  `${periodo.inicio}–${periodo.fin} de ${nombreMes(mesIndex)}`
);
