import React, { useEffect, useState } from 'react';

const ConfirmPayment = ({ tripData, cashAmount, open, onClose, onSubmit, strapiConfig }) => {
    const [monto, setMonto] = useState(0);
    if (!open) return null;

    const status = tripData?.attributes?.status || 'esperando';
    console.log('ConfirmPayment status', status, 'tripData', tripData);

    let contenido = '';
    switch (status) {
        case 'paid':
            contenido = '¿Está seguro de confirmar el pago como completado?';
            break;
        case 'partial':
            contenido = 'Por favor, ingrese el monto que ha pagado el usuario';
            break;
        case 'unpaid':
            contenido = '¿Está seguro de marcar como no pagado?';
            break;
        default:
            contenido = null;
            break;
    }

    const handleSubmit = async () => {
        if (status === 'paid') {
            onSubmit('cerrado');
            onClose();
            return;
        }

        if (strapiConfig?.baseUrl && tripData) {
            try {
                const payload = {
                    adeudo: cashAmount - monto,
                    costo_efectivo: cashAmount,
                    costo_viaje: tripData.attributes.costo,
                    pasajero: tripData.attributes.pasajero.data.id,
                    pasajero_email: tripData.attributes.pasajeromail,
                    conductor: tripData.attributes.conductor.data.id,
                    conductor_email: tripData.attributes.conductormail,
                    fecha_viaje: new Date().toISOString(),
                    origen_direccion: tripData.attributes.origendireccion.label,
                    destino_direccion: tripData.attributes.destinodireccion.label,
                    viaje: tripData.id,
                };
                await fetch(`${strapiConfig.baseUrl.replace(/\/$/, '')}/api/taxi-debts`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', ...(strapiConfig.token ? { Authorization: `Bearer ${strapiConfig.token}` } : {}) },
                    body: JSON.stringify({ data: payload }),
                });
            } catch (e) { console.error('no pudo agregar deuda', e); }
        }
        if (typeof onSubmit === 'function') onSubmit('cerrado');
        if (typeof onClose === 'function') onClose();
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
                maxWidth: 450,
                padding: 20,
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
            }}>
                <div style={{ fontSize: 16, color: '#333', fontWeight: 600, marginBottom: 16 }}>
                    {contenido}
                </div>
                {status === 'partial' &&
                    <div style={{ marginBottom: 16 }}>
                        <label style={{ display: 'block', marginBottom: 8 }}>Monto:</label>
                        <input
                            type="number"
                            value={monto}
                            onChange={(e) => setMonto(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '8px 12px',
                                borderRadius: 8,
                                border: '1px solid #ccc',
                            }}
                        />
                    </div>
                }
                <div style={{ display: 'flex', gap: 10 }}>
                    <button
                        type="button"
                        onClick={() => {
                            if (typeof onSubmit === 'function') onSubmit('finalizado');
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
                        Cancelar
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
                        Confirmar pago
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmPayment;