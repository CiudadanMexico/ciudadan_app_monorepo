import { useState, useEffect } from 'react';

export function useMembresia() {
  const [tieneMembresia, setTieneMembresia] = useState(false);

  useEffect(() => {
    // Simulación de lógica de membresía, por ahora solo maqueta
    setTieneMembresia(true);
  }, []);

  return tieneMembresia;
}
