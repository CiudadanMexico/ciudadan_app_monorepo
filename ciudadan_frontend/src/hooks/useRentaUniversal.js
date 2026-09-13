// src/hooks/useRentaUniversal.js
// Hook de Renta Universal: consume el servicio (hoy MOCK) y deriva todo el
// estado con la lógica pura de `utils/rentaUniversal.js`.
// La acreditación real de los 31 Laborys corresponde al backend; aquí solo
// se representa el estado.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  REGLAS_RENTA_UNIVERSAL,
  generarPeriodos,
  periodoActual as obtenerPeriodoActual,
  diasCompletados as contarDias,
  periodoCumplido,
  periodoAunAlcanzable,
  contarPeriodosCumplidos,
  estadoMensual,
  minutosConTope,
  setDiasCompletados,
  ultimoDiaMes,
  nombreMes,
} from '../utils/rentaUniversal';
import { getEstadoRentaUniversal } from '../services/rentaUniversal/rentaUniversalService';

const claveDia = (fecha) => {
  const d = new Date(fecha);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

/**
 * Ajusta el mock para demostrar cada estado global sin tocar producción:
 * - 'pagado': marca todos los días del mes como completados + bono pagado hoy.
 * - 'calificado': marca todos los días como completados (espera corte).
 * - 'no_alcanzado': vacía los completados de un periodo ya pasado.
 */
const aplicarDemoEstado = (demoEstado, periodos, setBase, hoy) => {
  if (!demoEstado) return { set: setBase, bonoPagado: false, fechaPago: null };
  if (demoEstado === 'pagado' || demoEstado === 'calificado') {
    const todos = [];
    periodos.forEach((p) => p.dias.forEach((d) => todos.push(claveDia(d))));
    return {
      set: new Set(todos),
      bonoPagado: demoEstado === 'pagado',
      fechaPago: demoEstado === 'pagado' ? claveDia(hoy) : null,
    };
  }
  if (demoEstado === 'no_alcanzado' && periodos.length > 0) {
    const sinPrimero = new Set(setBase);
    periodos[0].dias.forEach((d) => sinPrimero.delete(claveDia(d)));
    return { set: sinPrimero, bonoPagado: false, fechaPago: null };
  }
  return { set: setBase, bonoPagado: false, fechaPago: null };
};

export const useRentaUniversal = ({ demoEstado = null } = {}) => {
  const navigate = useNavigate();
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [remoto, setRemoto] = useState(null);

  const hoy = useMemo(() => new Date(), []);
  const anio = hoy.getFullYear();
  const mesIndex = hoy.getMonth();

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const data = await getEstadoRentaUniversal({ demoEstado });
      setRemoto(data);
    } catch (err) {
      setError(err?.message || 'No se pudo cargar el estado de Renta Universal');
    } finally {
      setCargando(false);
    }
  }, [demoEstado]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const periodos = useMemo(() => generarPeriodos(anio, mesIndex), [anio, mesIndex]);

  const derivado = useMemo(() => {
    if (!remoto) return null;
    const base = setDiasCompletados(remoto.diasCompletados || []);
    const demo = aplicarDemoEstado(demoEstado || remoto.demoEstado, periodos, base, hoy);

    const actual = obtenerPeriodoActual(periodos, hoy);
    const completadosMes = contarPeriodosCumplidos(periodos, demo.set);
    const minutosHoy = minutosConTope(remoto.hoyMinutos);
    const diaCompletado = demo.set.has(claveDia(hoy)) || minutosHoy >= REGLAS_RENTA_UNIVERSAL.MINUTOS_POR_DIA;

    const periodosUi = periodos.map((p) => {
      const completados = contarDias(p, demo.set);
      return {
        ...p,
        completados,
        cumplido: periodoCumplido(p, demo.set),
        alcanzable: periodoAunAlcanzable(p, demo.set, hoy),
        esActual: actual ? actual.inicio === p.inicio && actual.fin === p.fin : false,
      };
    });

    let estado = estadoMensual(periodos, demo.set, hoy, demo.bonoPagado);
    if ((demoEstado || remoto.demoEstado) === 'periodo_cumplido' && (estado === 'en_progreso')) {
      estado = 'periodo_cumplido';
    }
    const bonoForzado = demoEstado || remoto.demoEstado;
    if (bonoForzado === 'pagado') estado = 'pagado';
    if (bonoForzado === 'calificado') estado = 'calificado';
    if (bonoForzado === 'no_alcanzado') estado = 'no_alcanzado';

    return {
      periodos: periodosUi,
      periodo: periodosUi.find((p) => p.esActual) || null,
      diasSet: demo.set,
      completadosMes,
      totalPeriodos: periodos.length,
      minutosHoy,
      minutosFaltantes: Math.max(0, REGLAS_RENTA_UNIVERSAL.MINUTOS_POR_DIA - minutosHoy),
      diaCompletado,
      estado,
      bonoPagado: demo.bonoPagado || remoto.bono?.estado === 'pagado',
      fechaPago: demo.fechaPago || remoto.bono?.fechaPago || null,
      gananciasAnuncios: Number(remoto.gananciasAnuncios) || 0,
      esMock: Boolean(remoto._mock),
    };
  }, [remoto, periodos, hoy, anio, mesIndex, demoEstado]);

  const navegarVerAnuncios = useCallback(() => {
    navigate('/gana/ver-anuncios');
  }, [navigate]);

  return {
    cargando,
    error,
    recargar: cargar,
    anio,
    mesIndex,
    mesNombre: nombreMes(mesIndex),
    corte: ultimoDiaMes(anio, mesIndex),
    reglas: REGLAS_RENTA_UNIVERSAL,
    navegarVerAnuncios,
    ...(derivado || {
      periodos: [],
      periodo: null,
      diasSet: new Set(),
      completadosMes: 0,
      totalPeriodos: 0,
      minutosHoy: 0,
      minutosFaltantes: REGLAS_RENTA_UNIVERSAL.MINUTOS_POR_DIA,
      diaCompletado: false,
      estado: 'en_progreso',
      bonoPagado: false,
      fechaPago: null,
      gananciasAnuncios: 0,
      esMock: true,
    }),
  };
};

export default useRentaUniversal;
