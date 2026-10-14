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
  // NUEVO: distinguir "wallet generada local" vs "vinculada en backend".
  // El botón de continuar solo aparece tras confirmación exitosa del servidor.
  const [vinculada, setVinculada] = useState(false);
  const navigate = useNavigate();
  const { getAccessTokenSilently, isAuthenticated } = useAuth0();

  const vincularWallet = async (address) => {
    setStatus('Vinculando wallet a tu usuario...');
    let token;
    try {
      token = await getAccessTokenSilently({
        authorizationParams: { audience: 'https://api.ciudadan.org', scope: 'openid profile email offline_access' },
      });
    } catch (e) {
      if (e.error === 'missing_refresh_token' || e.message?.includes('Missing Refresh Token')) {
        throw new Error('Sesión expirada: cierra sesión y vuelve a iniciar sesión con Auth0');
      }
      throw e;
    }
    const res = await fetch(`${STRAPI_URL}/api/cartera/vincular-wallet`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ wallet_address: address }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error?.message || data?.message || 'Error vinculando');
    return data?.cartera?.id;
  };

  const generarCartera = async () => {
    try {
      setStatus('Generando wallet...');
      setVinculada(false);
      const wallet = ethers.Wallet.createRandom();
      setWalletInfo({
        address: wallet.address,
        privateKey: wallet.privateKey,
      });
      // No loguear privada en prod, solo debug
      console.log('Dirección:', wallet.address);
      // privateKey solo visible bajo demanda, no en log persistente

      if (!isAuthenticated) {
        setStatus('⚠️ Wallet generada local (inicia sesión para vincularla a tu usuario)');
        return;
      }
      const carteraId = await vincularWallet(wallet.address);
      setVinculada(true);
      setStatus(`✅ Wallet vinculada a tu usuario (cartera id ${carteraId})`);
    } catch (e) {
      // No se limpia walletInfo: el usuario conserva su clave y puede reintentar
      setVinculada(false);
      setStatus(`❌ Error: ${e.message}`);
      console.error(e);
    }
  };

  // Reintenta SOLO la vinculación con la misma dirección (sin regenerar).
  const reintentarVinculacion = async () => {
    if (!walletInfo?.address) return;
    try {
      const carteraId = await vincularWallet(walletInfo.address);
      setVinculada(true);
      setStatus(`✅ Wallet vinculada a tu usuario (cartera id ${carteraId})`);
    } catch (e) {
      setVinculada(false);
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

          {/* Si falló la vinculación (pero la clave existe), permitir reintentar
              sin regenerar. Solo se muestra cuando NO está vinculada. */}
          {walletInfo && !vinculada && isAuthenticated && (
            <Button
              onClick={reintentarVinculacion}
              size="small"
              sx={{ mt: 1.5, bgcolor: '#8A5CF5', color: 'white', fontWeight: 700 }}
            >
              Reintentar vinculación
            </Button>
          )}

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
            <input type="checkbox" checked={confirmado} onChange={e => setConfirmado(e.target.checked)} /> He guardado mi clave en lugar seguro
          </label>
          <p style={{ color: confirmado ? '#2ee6c8' : '#ffb3b3', fontSize: 12, marginTop: 8 }}>
            {confirmado ? '✅ No se guarda en servidor, solo en tu navegador. Ya puedes usar tu wallet.' : '⚠️ Solo se muestra una vez. Guárdala en un lugar seguro antes de continuar.'}
          </p>
          {/* Continuar solo si el backend confirmó la vinculación.
              Antes este botón limpiaba el estado y mandaba a /cartera aunque
              la vinculación hubiera fallado, lo que provocaba el ciclo
              "me regresa a crear cartera". */}
          {confirmado && (
            vinculada ? (
              <Button
                onClick={() => { setWalletInfo(null); setStatus(''); setConfirmado(false); setMostrarPrivada(false); setVinculada(false); navigate('/cartera'); }}
                size="small"
                sx={{ mt: 1, bgcolor: '#2ee6c8', color: '#06231f', fontWeight: 700 }}
              >
                Continuar a mi cartera
              </Button>
            ) : (
              <p style={{ color: '#ffb3b3', fontSize: 12, marginTop: 8 }}>
                ⚠️ Tu wallet aún no quedó vinculada en el servidor. Usa «Reintentar vinculación» antes de continuar.
              </p>
            )
          )}
        </Box>
      )}
    </div>
  );
};

export default CrearBilleteraCentralWld;
