import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import RatingModal from './RatingModal';

describe('RatingModal', () => {
  it('renders driver-specific copy and submits a rating', () => {
    const onSubmit = jest.fn();
    render(
      <RatingModal
        open={true}
        isDriver={true}
        onSubmit={onSubmit}
        onClose={() => {}}
      />
    );

    expect(screen.getByText(/califica al pasajero/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /calificar con 5 estrellas/i }));
    fireEvent.click(screen.getByRole('button', { name: /guardar calificación/i }));

    expect(onSubmit).toHaveBeenCalledWith(5);
  });
});
