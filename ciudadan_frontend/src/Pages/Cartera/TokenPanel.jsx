import React from 'react';
import { Box, Button, Typography } from '@mui/material';
import IngresosInfo from '../../components/Cartera/IngresosInfo.jsx';
import TokenEvaluation from './TokenEvaluation.jsx';
import TokenSkills from './TokenSkills.jsx';
import PurpleButton from '../../components/common/PurpleButton.jsx';

/**
 * Paneles de datos REALES de cada ficha de Cartera.
 *
 * Se separó de `Billetera.jsx` (spec sección 28) para que el shell no siga
 * creciendo con una cadena de condicionales: aquí vive sólo la lógica de los
 * paneles que leen la cartera o la información del usuario, y `Billetera` se
 * encarga de la selección (URL), la estética y los CTA.
 *
 * `panel` viene de la configuración central (tokenConfig.js):
 *   'resumen' | 'pesos' | 'labory' | 'itoken'  → requieren cartera
 *   'evaluation' | 'skills'                    → información del usuario
 *   'info'                                     → sin panel propio (CTA + explicación)
 */

// Equivalencia de referencia usada en la ficha de Pesos MXN (no es un tipo de
// cambio operado por la plataforma). Se conserva el valor que ya mostraba la app.
export const FACTOR_LABORY_MXN = 80;

const PANELES_CON_CARTERA = ['resumen', 'pesos', 'labory', 'itoken'];

const lby = (valor) => Number(valor || 0).toFixed(2);
const mxn = (valor) => (Number(valor || 0) * FACTOR_LABORY_MXN).toFixed(2);

const Aviso = ({ children }) => (
  <Typography
    sx={{
      mt: 1.5,
      fontSize: 11,
      color: 'rgba(255,255,255,0.65)',
      bgcolor: 'rgba(255,255,255,0.05)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 2,
      p: 1,
      textAlign: 'left',
    }}
  >
    {children}
  </Typography>
);

const Cargando = ({ texto = 'Cargando...' }) => (
  <Typography sx={{ fontSize: 12, opacity: 0.8 }}>{texto}</Typography>
);

/** Historial de movimientos de Laborys (mismo comportamiento que ya existía). */
const HistorialLabory = ({ historial, cargandoHist, onRefresh }) => (
  <Box sx={{ mt: 2, width: '100%', textAlign: 'left' }}>
    <Typography sx={{ fontWeight: 700, mb: 1, fontSize: 13 }}>
      📜 Movimientos ({historial.length})
    </Typography>
    <Box
      sx={{
        bgcolor: 'rgba(255,255,255,0.06)',
        p: 1.5,
        borderRadius: 2,
        maxHeight: 200,
        overflowY: 'auto',
      }}
    >
      {cargandoHist ? (
        <Cargando texto="Cargando movimientos..." />
      ) : historial.length === 0 ? (
        <Typography sx={{ fontSize: 12, opacity: 0.7 }}>
          Sin movimientos todavía. Los Laborys se acreditan automáticamente cuando tu trabajo se
          califica.
        </Typography>
      ) : (
        historial.slice(0, 3).map((tx) => {
          const attrs = tx.attributes || tx;
          return (
            <Box
              key={tx.id}
              sx={{
                fontSize: 11,
                py: 0.5,
                borderBottom: '1px solid rgba(255,255,255,0.08)',
                fontFamily: 'monospace',
              }}
            >
              #{tx.id} · {attrs.tipo || 'movimiento'} · {lby(attrs.monto_laborys)} LBY ·{' '}
              {attrs.hash_transaccion
                ? `${String(attrs.hash_transaccion).slice(0, 12)}…`
                : 'sin hash'}
            </Box>
          );
        })
      )}
      {historial.length > 3 && (
        <Typography sx={{ fontSize: 11, mt: 1, opacity: 0.7 }}>
          Mostrando los 3 movimientos más recientes de {historial.length}.
        </Typography>
      )}
    </Box>
    <Button
      onClick={onRefresh}
      size="small"
      sx={{ mt: 1, border: '1px solid #f0c040', color: '#f0c040' }}
    >
      Refrescar
    </Button>
  </Box>
);

const TokenPanel = ({
  token,
  cartera,
  cargando,
  historial,
  cargandoHist,
  onRefresh,
  userId,
  email,
  isAuthenticated,
}) => {
  const panel = token?.panel;

  if (panel === 'evaluation') {
    return <TokenEvaluation userId={userId} isAuthenticated={isAuthenticated} />;
  }

  if (panel === 'skills') {
    return <TokenSkills email={email} isAuthenticated={isAuthenticated} />;
  }

  if (!PANELES_CON_CARTERA.includes(panel)) return null;

  if (cargando) return <Cargando texto="Cargando tu cartera..." />;

  if (!cartera) {
    return (
      <Box>
        <Typography sx={{ color: 'rgba(255,255,255,0.85)' }}>
          Aún no tienes cartera activa.
        </Typography>
        <PurpleButton href="/cartera/crear" sx={{ mt: 2 }}>
          Crear cartera →
        </PurpleButton>
      </Box>
    );
  }

  if (panel === 'resumen') {
    return (
      <>
        <Typography sx={{ opacity: 0.9, fontSize: '1.05rem' }}>
          🔒 <strong>Laborys:</strong> {lby(cartera.laborysSaldo)} LBY
        </Typography>
        <Typography sx={{ opacity: 0.9, mt: 0.5 }}>
          💰 <strong>Equivalente (1 LBY = {FACTOR_LABORY_MXN} MXN):</strong> $
          {mxn(cartera.laborysSaldo)} MXN
        </Typography>
        <Typography sx={{ opacity: 0.9, mt: 0.5 }}>
          📈 <strong>Laborys ganados:</strong> {lby(cartera.laborysGanados)}
        </Typography>
        <Typography sx={{ opacity: 0.9, mt: 0.5, wordBreak: 'break-all' }}>
          🔗 <strong>Wallet:</strong> {cartera.wallet_address || 'sin vincular'}
        </Typography>
        <Aviso>El historial de movimientos está en la ficha de Labory.</Aviso>
      </>
    );
  }

  if (panel === 'pesos') {
    return (
      <>
        <Typography sx={{ opacity: 0.9, fontSize: '1.3rem' }}>
          ${mxn(cartera.laborysSaldo)} MXN
        </Typography>
        <Typography sx={{ opacity: 0.7, fontSize: 12 }}>
          Equivalente de referencia de tus {lby(cartera.laborysSaldo)} LBY (1 LBY ={' '}
          {FACTOR_LABORY_MXN} MXN). No es un tipo de cambio operado por la plataforma.
        </Typography>
        <Box sx={{ mt: 2, width: '100%' }}>
          <IngresosInfo />
        </Box>
      </>
    );
  }

  if (panel === 'labory') {
    return (
      <>
        <Typography sx={{ opacity: 0.9, fontSize: '1.4rem', fontWeight: 700 }}>
          {lby(cartera.laborysSaldo)} LBY
        </Typography>
        <Typography sx={{ opacity: 0.9 }}>≈ ${mxn(cartera.laborysSaldo)} MXN</Typography>
        <Typography sx={{ mt: 1, opacity: 0.9 }}>
          📊 Ganados totales: {lby(cartera.laborysGanados)} LBY
        </Typography>
        <HistorialLabory historial={historial} cargandoHist={cargandoHist} onRefresh={onRefresh} />
      </>
    );
  }

  // panel === 'itoken'
  return (
    <>
      <Typography sx={{ opacity: 0.9 }}>
        🪙 <strong>Ciudadan I-Token:</strong> {Number(cartera?.ciudadanTokens || 0).toFixed(2)}
      </Typography>
      <Typography sx={{ opacity: 0.9, mt: 0.5 }}>
        📈 <strong>Rendimientos:</strong> {Number(cartera?.ciudadanRendimientos || 0).toFixed(2)}
      </Typography>
      <Aviso>
        Estos dos campos de la cartera son marcadores de posición: están a la espera de la colección
        y de los campos definitivos del backend. El catálogo de I-Tokens sí está disponible.
      </Aviso>
    </>
  );
};

export default TokenPanel;

