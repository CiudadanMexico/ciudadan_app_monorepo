import React, { useState } from 'react';
import { Box, Button, Typography } from '@mui/material';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import { useNavigate } from 'react-router-dom';
import { ethers } from 'ethers';
import { useAuth0 } from '@auth0/auth0-react';
import { STRAPI_URL } from '../../utils/request.utils';

const CrearBilleteraCentralWld = () => {
  const [walletInfo, setWalletInfo] = useState(null);
  const [status, setStatus] = useState('');
  const [mostrarPrivada, setMostrarPrivada] = useState(false);
  const [confirmado, setConfirmado] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const navigate = useNavigate();
  const { getAccessTokenSilently, isAuthenticated } = useAuth0();

  const generarCartera = async () => {
    try {
      setStatus('Generando wallet...');
      const wallet = ethers.Wallet.createRandom();
      setWalletInfo({
        address: wallet.address,
        privateKey: wallet.privateKey,
      });
      // No loguear privada en prod, solo debug
      console.log('Dirección:', wallet.address);
      // privateKey solo visible bajo demanda, no en log persistente

      if (isAuthenticated) {
        setStatus('Vinculando wallet a tu usuario...');
        const token = await getAccessTokenSilently({
          authorizationParams: { audience: 'https://api.ciudadan.org' },
        });
        const res = await fetch(`${STRAPI_URL}/api/cartera/vincular-wallet`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ wallet_address: wallet.address }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error?.message || data?.message || 'Error vinculando');
        setStatus(`✅ Wallet vinculada a tu usuario (cartera id ${data.cartera?.id})`);
      } else {
        setStatus('⚠️ Wallet generada local (inicia sesión para vincularla a tu usuario)');
      }
    } catch (e) {
      setStatus(`❌ Error: ${e.message}`);
      console.error(e);
    }
  };

  const copiar = (texto) => {
    if (!navigator.clipboard) return;
    navigator.clipboard
      .writeText(texto)
      .then(() => {
        setCopiado(true);
        setTimeout(() => setCopiado(false), 1600);
      })
      .catch(() => {});
  };

  return (
    <div style={{ padding: '20px', textAlign: 'center', maxWidth: 640, margin: '0 auto' }}>
      <h2>Crear Cartera Central — Bankchain Provisional</h2>
      <p style={{ color: '#666' }}>Genera tu wallet con ethers.js y la vinculamos a tu usuario (cartera.wallet_address ↔ user_id)</p>
      <button onClick={generarCartera} style={{ padding: '12px 24px', borderRadius: 999, background: '#8A5CF5', color: 'white', border: 'none', fontWeight: 700, cursor: 'pointer' }}>
        Generar y Vincular Cartera
      </button>
      {status && <p style={{ marginTop: 12, fontWeight: 600 }}>{status}</p>}
      {walletInfo && (
        <Box sx={{ mt: '20px', textAlign: 'left', width: '100%', bgcolor: 'rgba(138,92,245,0.08)', p: 2, borderRadius: 3 }}>
          {/* Dirección — clic en el campo para copiar */}
          <Typography variant="subtitle2" sx={{ color: 'rgba(255,255,255,0.66)', mb: 0.4 }}>
            Dirección de tu wallet
          </Typography>
          <Box
            onClick={() => copiar(walletInfo.address)}
            sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, bgcolor: 'rgba(0,0,0,0.35)', border: '1px solid rgba(138,92,245,0.3)', borderRadius: 2, px: 1.5, py: 1, cursor: 'pointer', '&:hover': { borderColor: '#8A5CF5' } }}
          >
            <Typography sx={{ fontFamily: 'monospace', fontSize: '0.82rem', wordBreak: 'break-all', color: '#e8e0ff' }}>{walletInfo.address}</Typography>
            <ContentCopyRoundedIcon sx={{ fontSize: 18, color: '#a78bfa' }} />
          </Box>

          {/* Clave privada — oculta con distorsión; "Mostrar" la deja ver nítida */}
          <Typography variant="subtitle2" sx={{ color: 'rgba(255,255,255,0.66)', mb: 0.4, mt: 1.5 }}>
            Clave privada{' '}
            <Box component="button" onClick={() => setMostrarPrivada(!mostrarPrivada)} sx={{ background: 'none', border: 'none', p: 0, color: '#a78bfa', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer', '&:hover': { color: '#c9b4ff' } }}>
              {mostrarPrivada ? '(Ocultar)' : '(Mostrar)'}
            </Box>
          </Typography>
          <Box
            onClick={() => { if (mostrarPrivada) copiar(walletInfo.privateKey); }}
            sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, bgcolor: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,120,120,0.35)', borderRadius: 2, px: 1.5, py: 1, cursor: mostrarPrivada ? 'pointer' : 'default', '&:hover': { borderColor: '#ff7878' } }}
          >
            {mostrarPrivada ? (
              <Typography sx={{ fontFamily: 'monospace', fontSize: '0.72rem', wordBreak: 'break-all', color: '#ffd2d2' }}>{walletInfo.privateKey}</Typography>
            ) : (
              <Typography sx={{ fontFamily: 'monospace', fontSize: '0.72rem', filter: 'blur(8px)', userSelect: 'none', color: '#ffd2d2' }}>••••••••••••••••••••••••••••••••</Typography>
            )}
            <ContentCopyRoundedIcon sx={{ fontSize: 18, color: '#ff9d9d' }} />
          </Box>

          {copiado && (
            <Typography sx={{ color: '#2ee6c8', fontSize: '0.85rem', mt: 1 }}>✓ Copiado al portapapeles</Typography>
          )}

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
            <input type="checkbox" checked={confirmado} onChange={e => setConfirmado(e.target.checked)} /> He guardado mi clave en lugar seguro
          </label>
          <p style={{ color: confirmado ? '#2ee6c8' : '#ffb3b3', fontSize: 12, marginTop: 8 }}>
            {confirmado ? '✅ No se guarda en servidor, solo en tu navegador. Ya puedes usar tu wallet.' : '⚠️ Solo se muestra una vez. Guárdala en un lugar seguro antes de continuar.'}
          </p>
          {confirmado && (
            <Button
              onClick={() => { setWalletInfo(null); setStatus(''); setConfirmado(false); setMostrarPrivada(false); navigate('/cartera'); }}
              size="small"
              sx={{ mt: 1, bgcolor: '#333', color: 'white' }}
            >
              Borrar de pantalla
            </Button>
          )}
        </Box>
      )}
    </div>
  );
};

export default CrearBilleteraCentralWld;
