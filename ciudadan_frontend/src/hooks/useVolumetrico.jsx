import { useMemo } from 'react';

/**
 * Hook para calcular peso volumétrico
 * @param {number} largo - en centímetros
 * @param {number} ancho - en centímetros
 * @param {number} alto - en centímetros
 * @param {number} peso - en kilogramos
 * @returns {object} resultado con peso real, volumétrico y cuál se cobra
 */
export function useVolumetrico({ largo, ancho, alto, peso }) {
  const resultado = useMemo(() => {
    const volumenCm = largo * ancho * alto;
    const volumetrico = volumenCm / 5000; // factor estándar
    const pesoCobrado = Math.max(peso, volumetrico); // se cobra el mayor

    return {
      pesoReal: parseFloat(peso.toFixed(2)),
      volumetrico: parseFloat(volumetrico.toFixed(2)),
      pesoCobrado: parseFloat(pesoCobrado.toFixed(2)),
    };
  }, [largo, ancho, alto, peso]);

  return resultado;
}