import React, { useEffect, useState } from 'react';

const SolicitudCancelar = ({ open, isDriver, onSubmit, onClose }) => {
    const [selectedReason, setSelectedReason] = useState(null);

    useEffect(() => {
        if (!open) setSelectedReason(null);
    }, [open]);

    if (!open) return null;

    const title = '¿Por qué deseas finalizar el viaje antes del destino?';
    const reasons = isDriver
        ? ['Emergencia', 'Fallas mecánicas', 'Problema con el pasajero', 'Ruta bloqueada', 'Por seguridad', 'Acuerdo mutuo', 'Otro']
        : ['Emergencia', 'Deseo bajar antes', 'Cambio de planes', 'Problema con el conductor', 'Incomodidad', 'Por seguridad', 'Otro'];

    const handleSubmit = () => {
        if (typeof onSubmit === 'function') onSubmit(selectedReason || null);
    };

    const handleChange = (event) => {
        setSelectedReason(event.target.value);
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
                maxWidth: 500,
                padding: 20,
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
            }}>
                <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>{title}</div>

                <div style={{ gap: 8, marginBottom: 18 }}>
                    {reasons.map((reason, index) => (
                        <label key={index} style={{ display: 'block', marginBottom: '12px' }}>
                            <input
                                type="radio"
                                name="reason"
                                value={reason}
                                checked={selectedReason === reason}
                                onChange={handleChange}
                            />
                            {reason}
                        </label>
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
                        disabled={!selectedReason}
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
                        Finalizar viaje
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SolicitudCancelar;