import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ViajeUsuario from './ViajeUsuario';

describe('ViajeUsuario', () => {
  it('muestra los datos del conductor en la tarjeta del taxi', () => {
    render(
      <ViajeUsuario
        viaje={{
          id: 42,
          attributes: {
            status: 'accepted',
            origendireccion: { label: 'Calle 1' },
            destinodireccion: { label: 'Calle 2' },
            costo: 180,
          },
        }}
        driverData={{
          user: {
            name: 'Luis Pérez',
            foto: { url: '/foto-conductor.jpg' },
            vehiculo: {
              modelo: 'Toyota Corolla',
              color: 'Blanco',
              placa: 'ABC-123',
            },
          },
        }}
        socket={null}
        userCoords={null}
        setUserCoords={() => {}}
        mapRef={{ current: null }}
        setConsultedTravel={() => {}}
      />
    );

    expect(screen.getByText('Luis Pérez')).toBeInTheDocument();
    expect(screen.getByAltText(/foto de luis pérez/i)).toBeInTheDocument();
    expect(screen.getByText(/Toyota Corolla/i)).toBeInTheDocument();
    expect(screen.getByText(/ABC-123/i)).toBeInTheDocument();
  });
});
