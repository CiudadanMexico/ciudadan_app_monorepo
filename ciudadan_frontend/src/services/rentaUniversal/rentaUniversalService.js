// src/services/rentaUniversal/rentaUniversalService.js
// Servicio de Renta Universal — CAPA MOCK (frontend solamente).
//
// ⚠️ TODO BACKEND: reemplazar `getEstadoRentaUniversal` por:
//   GET /api/renta-universal/estado  → {
//     hoyMinutos, diasCompletados: ['yyyy-mm-dd'],
//     gananciasAnuncios, bono: { estado, fechaPago }
//   }
// La validación definitiva del cumplimiento y la acreditación de los
// 31 Laborys DEBE realizarse en backend. El frontend solo representa estado.
// No simular acreditaciones reales ni crear endpoints arbitrarios aquí.

const MOCK = true;

/**
 * Estado mock de Renta Universal para el mes en curso.
 * Forma del objeto:
 * {
 *   hoyMinutos: number,            // minutos de publicidad de hoy (se aplica tope de 60)
 *   diasCompletados: string[],     // claves 'yyyy-mm-dd' con la hora diaria cumplida
 *   gananciasAnuncios: number,     // acumulado mock de recompensas normales por anuncios
 *   bono: { estado, fechaPago },   // estado: 'en_progreso' | 'periodo_cumplido' |
 *                                  // 'calificado' | 'pagado' | 'no_alcanzado'
 *   demoEstado: string | null,     // solo demo UI: fuerza un estado global visible
 * }
 */
export const getEstadoRentaUniversal = async ({ demoEstado = null } = {}) => {
  if (!MOCK) {
    throw new Error('Servicio real de Renta Universal no implementado (falta backend).');
  }

  const ahora = new Date();
  const y = ahora.getFullYear();
  const m = String(ahora.getMonth() + 1).padStart(2, '0');
  const clave = (d) => `${y}-${m}-${String(d).padStart(2, '0')}`;
  const diaHoy = ahora.getDate();

  // Mock: días 1..hoy-1 completados salvo uno (para mostrar progreso realista),
  // más minutos de hoy en 37/60.
  const diasCompletados = [];
  for (let d = 1; d < diaHoy; d += 1) {
    if (d !== 3) diasCompletados.push(clave(d));
  }

  return {
    hoyMinutos: 37,
    diasCompletados,
    gananciasAnuncios: 128,
    bono: {
      estado: 'en_progreso',
      fechaPago: null,
    },
    // La demo de estados se resuelve en el hook (necesita los periodos del mes).
    demoEstado,
    _mock: true,
  };
};

export const RENTA_UNIVERSAL_MOCK = MOCK;
