// Numero animado con Framer Motion (transform/opacity-safe: solo texto).
// Anima fluidamente entre valor anterior y nuevo sin acumular errores.
import React, { useEffect } from 'react';
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'framer-motion';

export default function NumeroAnimado({ valor, formato, ...rest }) {
  const reduceMotion = useReducedMotion();
  const mv = useMotionValue(valor);
  const texto = useTransform(mv, (v) => formato(v));

  useEffect(() => {
    if (reduceMotion) {
      mv.set(valor);
      return undefined;
    }
    const controles = animate(mv, valor, { duration: 0.45, ease: 'easeOut' });
    return () => controles.stop();
  }, [valor, mv, reduceMotion]);

  return <motion.span {...rest}>{texto}</motion.span>;
}
