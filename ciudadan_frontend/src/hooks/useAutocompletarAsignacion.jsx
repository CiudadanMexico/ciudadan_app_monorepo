import { useMemo } from 'react';

/**
 * Autocompletar candidatos para asignación (Fase 6).
 *
 * Matriz de la Fase 6 (README_logica_cowork.md):
 *
 *  | Agencia socio | Tipo tarea   | A quién se asigna                          |
 *  |---------------|--------------|--------------------------------------------|
 *  | Local         | General      | Usuarios de ESA agencia                    |
 *  | Local         | Especializada| Usuarios de ESA agencia Y de ESA área      |
 *  | Federal       | General      | Todos los usuarios de la red               |
 *  | Federal       | Especializada| Usuarios de toda la red con ESA área       |
 *
 * @param {Array} usuarios - Lista completa de usuarios (de la red).
 * @param {Object} socio - Usuario socio en sesión (con agencia y áreas).
 * @param {Object} todo - Tarea a asignar (con nivel, agencia, areas).
 * @returns {Array} Usuarios candidatos que cumplen la matriz.
 */
export function useAutocompletarAsignacion(usuarios = [], socio = null, todo = null) {
  return useMemo(() => {
    if (!socio || !todo || !Array.isArray(usuarios) || usuarios.length === 0) {
      return [];
    }

    const socioAgencia = socio.agencia || null;
    const socioEsFederal = socioAgencia?.tipo === 'federal';

    const nivel = todo.nivel || 'general';
    const NIVELES_ESPECIALIZADA = ['especialidad', 'experto', 'personalizada'];
    const esEspecializada =
      NIVELES_ESPECIALIZADA.includes(nivel) &&
      Array.isArray(todo.areas) &&
      todo.areas.length > 0;

    const todoAreaIds = (todo.areas || []).map((a) =>
      typeof a === 'object' ? a.id : a
    );

    const candidatos = usuarios.filter((u) => {
      // (1) Filtro por agencia del socio.
      if (!socioEsFederal) {
        const uAgencia = u.agencia || null;
        const mismaAgencia =
          uAgencia &&
          socioAgencia &&
          Number(uAgencia.id) === Number(socioAgencia.id);
        if (!mismaAgencia) return false;
      }

      // (2) Filtro por área si es especializada.
      if (esEspecializada) {
        const uAreaIds = (u.areas || []).map((a) =>
          typeof a === 'object' ? a.id : a
        );
        const areaCoincide = todoAreaIds.some((aid) =>
          uAreaIds.includes(Number(aid))
        );
        if (!areaCoincide) return false;
      }

      return true;
    });

    return candidatos;
  }, [usuarios, socio, todo]);
}
