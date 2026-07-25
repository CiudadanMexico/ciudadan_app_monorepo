import React, { useEffect, useState } from 'react';

const RatingModal = ({ open, isDriver, onSubmit, onClose }) => {
  const [selectedRating, setSelectedRating] = useState(0);

  useEffect(() => {
    if (!open) setSelectedRating(0);
  }, [open]);

  if (!open) return null;

  const title = isDriver ? 'Califica al pasajero' : 'Califica al conductor';
  const description = isDriver
    ? 'Tu valoración ayuda a mejorar la experiencia del viaje.'
    : 'Tu valoración ayuda a reconocer el servicio del conductor.';

  const handleSubmit = () => {
    if (typeof onSubmit === 'function') onSubmit(selectedRating || null);
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.45)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 4000,
      padding: 16,
    }}>
      <div style={{
        background: '#fff',
        borderRadius: 16,
        width: '100%',
        maxWidth: 420,
        padding: 20,
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
      }}>
        <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>{title}</div>
        <div style={{ color: '#666', fontSize: 14, marginBottom: 16 }}>{description}</div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 18 }}>
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setSelectedRating(value)}
              aria-label={`Calificar con ${value} estrellas`}
              style={{
                border: 'none',
                background: 'transparent',
                fontSize: 32,
                cursor: 'pointer',
                color: value <= selectedRating ? '#f4b400' : '#d9d9d9',
                padding: 2,
              }}
            >
              ★
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            type="button"
            onClick={() => {
              if (typeof onClose === 'function') onClose();
            }}
            style={{
              flex: 1,
              padding: '12px 14px',
              borderRadius: 10,
              border: '1px solid #ddd',
              background: '#fff',
              fontWeight: 600,
            }}
          >
            Omitir
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            style={{
              flex: 1,
              padding: '12px 14px',
              borderRadius: 10,
              border: 'none',
              background: '#2f6fed',
              color: '#fff',
              fontWeight: 700,
            }}
          >
            {selectedRating ? 'Guardar calificación' : 'Guardar sin calificación'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RatingModal;
