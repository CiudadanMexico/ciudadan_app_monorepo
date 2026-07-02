import React from 'react';
import { Grid, Typography, Box } from '@mui/material';
import CursoCard from './CursoCard';

const CursosImpartidos = ({ cursos = [] }) => {
  console.log('🎓 CursosImpartidos → cursos:', cursos);

  if (!Array.isArray(cursos) || cursos.length === 0) {
    return (
      <Box sx={{ mt: 4 }}>
        <Typography align="center">
          No tienes cursos impartidos aún.
        </Typography>
      </Box>
    );
  }

  return (
    <Grid container spacing={2} sx={{ mt: 2 }}>
      {cursos.map((curso) => {
        const { id, categoria, portada, ...rest } = curso;

        return (
          <Grid
            key={id}
            item
            xs={12}
            sm={6}
            md={4}
            className="curso-card"
          >
            <CursoCard
              {...rest}
              id={id}
              portada={portada ?? null}
              categoria={categoria?.nombre ?? null}
            />
          </Grid>
        );
      })}
    </Grid>
  );
};

export default CursosImpartidos;
