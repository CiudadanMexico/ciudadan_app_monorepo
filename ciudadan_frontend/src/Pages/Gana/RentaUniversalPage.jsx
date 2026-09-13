// src/Pages/Gana/RentaUniversalPage.jsx
// Página /gana/renta-universal — programa Renta Universal (+31 Laborys EXTRA).
// Composición mobile-first con MUI v6 + PurpleButton.
// Datos: hook useRentaUniversal (hoy MOCK separado en services/rentaUniversal).
import React, { useState } from 'react';
import { Alert, Box, CircularProgress, Container, FormControl, InputLabel, MenuItem, Select, Stack, Typography } from '@mui/material';
import useRentaUniversal from '../../hooks/useRentaUniversal';
import RentaUniversalHero from '../../components/RentaUniversal/RentaUniversalHero.jsx';
import RentaUniversalMes from '../../components/RentaUniversal/RentaUniversalMes.jsx';
import RentaUniversalGanancias from '../../components/RentaUniversal/RentaUniversalGanancias.jsx';
import RentaUniversalHoy from '../../components/RentaUniversal/RentaUniversalHoy.jsx';
import RentaUniversalPeriodo from '../../components/RentaUniversal/RentaUniversalPeriodo.jsx';
import RentaUniversalResumenMes from '../../components/RentaUniversal/RentaUniversalResumenMes.jsx';
import RentaUniversalComoFunciona from '../../components/RentaUniversal/RentaUniversalComoFunciona.jsx';
import RentaUniversalEstado from '../../components/RentaUniversal/RentaUniversalEstado.jsx';

const DEMO_OPCIONES = [
  { valor: '', etiqueta: 'Estado real (mock base)' },
  { valor: 'periodo_cumplido', etiqueta: 'Demo: periodo cumplido' },
  { valor: 'calificado', etiqueta: 'Demo: mes calificado' },
  { valor: 'pagado', etiqueta: 'Demo: pagado (mock)' },
  { valor: 'no_alcanzado', etiqueta: 'Demo: no alcanzado' },
];

export default function RentaUniversalPage() {
  const [demoEstado, setDemoEstado] = useState('');
  const {
    cargando, error, mesNombre, corte,
    periodos, periodo, diasSet, completadosMes, totalPeriodos,
    minutosHoy, minutosFaltantes, diaCompletado,
    estado, fechaPago, gananciasAnuncios, esMock,
    navegarVerAnuncios, mesIndex,
  } = useRentaUniversal({ demoEstado: demoEstado || null });

  return (
    <Container maxWidth="md" sx={{ py: { xs: 3, md: 5 } }}>
      <Stack spacing={2.5}>
        <RentaUniversalHero />

        {esMock && (
          <Alert severity="info" sx={{ borderRadius: 3 }}>
            Vista previa con datos de muestra. La validación y acreditación de los 31 Laborys la
            realiza el backend al corte mensual.
          </Alert>
        )}

        {cargando ? (
          <Box sx={{ display: 'grid', placeItems: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ borderRadius: 3 }}>{error}</Alert>
        ) : (
          <>
            <RentaUniversalEstado estado={estado} fechaPago={fechaPago} />
            <RentaUniversalMes
              mesNombre={mesNombre}
              completados={completadosMes}
              total={totalPeriodos}
              corte={corte}
            />
            <RentaUniversalGanancias gananciasAnuncios={gananciasAnuncios} estado={estado} esMock={esMock} />
            <RentaUniversalHoy
              minutosHoy={minutosHoy}
              minutosFaltantes={minutosFaltantes}
              diaCompletado={diaCompletado}
              onVerAnuncios={navegarVerAnuncios}
            />
            <RentaUniversalPeriodo periodo={periodo} mesIndex={mesIndex} diasSet={diasSet} />
            <RentaUniversalResumenMes periodos={periodos} mesIndex={mesIndex} />
            <RentaUniversalComoFunciona />

            <Box sx={{ borderRadius: 3, border: '1px dashed', borderColor: 'divider', p: 2 }}>
              <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600, mb: 1 }}>
                Demostración de estados (solo UI, datos mock):
              </Typography>
              <FormControl fullWidth size="small">
                <InputLabel id="demo-estado-label">Ver estado</InputLabel>
                <Select
                  inputId="demo-estado-label"
                  value={demoEstado}
                  onChange={(e) => setDemoEstado(e.target.value)}
                >
                  {DEMO_OPCIONES.map((o) => (
                    <MenuItem key={o.valor} value={o.valor}>{o.etiqueta}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </>
        )}
      </Stack>
    </Container>
  );
}
