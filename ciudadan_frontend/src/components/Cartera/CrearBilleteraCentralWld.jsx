import React, { useState } from 'react';
import { ethers } from 'ethers';

const CrearBilleteraCentralWld = () => {
  const [walletInfo, setWalletInfo] = useState(null);

  const generarCartera = () => {
    // Generar una nueva cartera usando ethers.js
    const wallet = ethers.Wallet.createRandom();

    // Guardar la información de la cartera en el estado
    setWalletInfo({
      address: wallet.address,
      privateKey: wallet.privateKey,
    });

    // Mostrar la información en la consola
    console.log('Dirección de la nueva cartera central:', wallet.address);
    console.log('Clave privada (¡mantén esto seguro!):', wallet.privateKey);
  };

  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h2>Crear Cartera Central de Worldcoin</h2>
      <button onClick={generarCartera}>Generar Cartera</button>
      {walletInfo && (
        <div style={{ marginTop: '20px' }}>
          <p><strong>Dirección:</strong> {walletInfo.address}</p>
          <p><strong>Clave Privada:</strong> {walletInfo.privateKey}</p>
          <p style={{ color: 'red' }}>¡Asegúrate de guardar esta clave privada en un lugar seguro!</p>
        </div>
      )}
    </div>
  );
};

export default CrearBilleteraCentralWld;
