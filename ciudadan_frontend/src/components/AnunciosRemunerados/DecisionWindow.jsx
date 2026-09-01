import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Stack,
} from '@mui/material';

/**
 * Overlay de ventana de decisión (0 a `decisionWindow` segundos).
 * Durante este tiempo el usuario puede:
 *  - Continuar viendo (el anuncio pasa a estado `committed`).
 *  - Pasar al siguiente (`skipped`, sin recompensa): el padre decide cómo
 *    saltar (el componente NO compromete el anuncio al saltar).
 * Al terminar el tiempo sin acción, se pasa a `committed` automáticamente.
 */
export const DecisionWindow = ({
  decisionWindow = 5,
  onContinuar,
  onNext,
}) => {
  const [restante, setRestante] = useState(decisionWindow);

  // Callbacks en ref: evitan que el countdown se reinicie en cada render del padre.
  const cbRef = useRef({ onContinuar, onNext });
  cbRef.current = { onContinuar, onNext };

  useEffect(() => {
    setRestante(decisionWindow);
    const t = setInterval(() => {
      setRestante((prev) => {
        if (prev <= 1) {
          clearInterval(t);
          cbRef.current.onContinuar(); // timeout → se compromete el anuncio
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [decisionWindow]);

  return (
    <Paper
      sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.7)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        zIndex: 10,
      }}
    >
      <Box sx={{ textAlign: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight="bold" gutterBottom>
          ¿Quieres ver este anuncio?
        </Typography>
        <Typography variant="body1" color="inherit">
          Tienes <strong>{restante}s</strong> para decidir.
        </Typography>
        <Typography variant="body2" color="inherit" sx={{ mt: 1, opacity: 0.85 }}>
          Si continúas hasta el final, ganas la recompensa.
        </Typography>
      </Box>

      <Stack direction="row" spacing={3} sx={{ gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
        <Button variant="contained" color="success" size="large" onClick={onContinuar}>
          Continuar
        </Button>
        <Button
          variant="outlined"
          color="inherit"
          size="large"
          onClick={() => {
            // Saltar NO compromete el anuncio: el padre decide (skipped o aviso).
            onNext();
          }}
        >
          Pasar al siguiente
        </Button>
      </Stack>
    </Paper>
  );
};
