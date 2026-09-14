import React, { useState } from 'react';
import { Button } from '@mui/material';
import { ethers } from 'ethers';
import { useAuth0 } from '@auth0/auth0-react';
import { STRAPI_URL } from '../../utils/request.utils';

const CrearBilleteraCentralWld = () => {
  const [walletInfo, setWalletInfo] = useState(null);
  const [status, setStatus] = useState('');
  const [mostrarPrivada, setMostrarPrivada] = useState(false);
  const [confirmado, setConfirmado] = useState(false);
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

  const copiar = (txt) => navigator.clipboard?.writeText(txt);

  return (
    <div style={{ padding: '20px', textAlign: 'center', maxWidth: 640, margin: '0 auto' }}>
      <h2>Crear Cartera Central — Bankchain Provisional</h2>
      <p style={{ color: '#666' }}>Genera tu wallet con ethers.js y la vinculamos a tu usuario (cartera.wallet_address ↔ user_id)</p>
      <button onClick={generarCartera} style={{ padding: '12px 24px', borderRadius: 999, background: '#8A5CF5', color: 'white', border: 'none', fontWeight: 700, cursor: 'pointer' }}>
        Generar y Vincular Cartera
      </button>
      {status && <p style={{ marginTop: 12, fontWeight: 600 }}>{status}</p>}
      {walletInfo && (
        <div style={{ marginTop: '20px', textAlign: 'left', background: 'rgba(138,92,245,0.08)', padding: 16, borderRadius: 12 }}>
          <p><strong>Dirección:</strong> {walletInfo.address} <button onClick={() => copiar(walletInfo.address)}>Copiar</button></p>
          <p>
            <strong>Clave Privada:</strong>{' '}
            {mostrarPrivada ? (
              <span style={{ wordBreak: 'break-all', filter: confirmado ? 'none' : 'blur(6px)' }}>{walletInfo.privateKey}</span>
            ) : (
              <span style={{ filter: 'blur(8px)', userSelect: 'none' }}>••••••••••••••••••••••••••••••••</span>
            )}{' '}
            <button onClick={() => setMostrarPrivada(!mostrarPrivada)}>{mostrarPrivada ? 'Ocultar' : 'Mostrar'}</button>
            {mostrarPrivada && <button onClick={() => copiar(walletInfo.privateKey)} style={{ marginLeft: 8 }}>Copiar</button>}
          </p>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
            <input type="checkbox" checked={confirmado} onChange={e => setConfirmado(e.target.checked)} /> He guardado mi clave en lugar seguro
          </label>
          <p style={{ color: confirmado ? 'green' : 'red', fontSize: 12, marginTop: 8 }}>
            {confirmado ? '✅ No se guarda en servidor, solo en tu navegador. Ya puedes usar tu wallet.' : '⚠️ Solo se muestra una vez. Activa el check tras guardarla para desbloquear el blur.'}
          </p>
          {confirmado && <Button onClick={() => setWalletInfo(null)} size="small" sx={{ mt: 1, bgcolor: '#333', color: 'white' }}>Borrar de pantalla</Button>}
        </div>
      )}
    </div>
  );
};

export default CrearBilleteraCentralWld;
