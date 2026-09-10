import React, { useState } from 'react';

const ConfirmPayment = ({
    tripData,
    statusPayment,
    setStatusPayment,
    cashAmount,
    laboryAmount,
    open,
    onClose,
    onSubmit,
    strapiConfig
}) => {
    const [monto, setMonto] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    if (!open) return null;

    let contenido = '';
    switch (statusPayment) {
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

    const confirmPayment = async () => {
        if (!strapiConfig?.baseUrl || !tripData) return;

        try {
            await fetch(`${strapiConfig.baseUrl.replace(/\/$/, '')}/api/viajes/${tripData?.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    ...(strapiConfig.token ? { Authorization: `Bearer ${strapiConfig.token}` } : {})
                },
                body: JSON.stringify({
                    data: {
                        pagadoefectivo: Number(cashAmount),
                        pagadolabory: Number(laboryAmount),
                        concluido: new Date().toISOString()
                    }
                }),
            });
        } catch (error) {
            console.error('Error al confirmar el pago:', error);
            setError('Ocurrió un error al confirmar el pago. Por favor, inténtelo de nuevo.');
            setIsSubmitting(false);
            return;
        }
    }

    const handleSubmit = async () => {
        setIsSubmitting(true);

        if (!strapiConfig?.baseUrl || !tripData) return;

        if (statusPayment === 'paid') {
            await confirmPayment();
            onSubmit('cerrado');
            onClose();
            setIsSubmitting(false);
            return;
        }

        if (monto <= 0) {
            setError('Por favor, ingrese un monto válido');
            setIsSubmitting(false);
            return;
        }
        if (monto > Number(cashAmount)) {
            setError('El monto ingresado supera el monto en efectivo');
            setIsSubmitting(false);
            return;
        }

        try {
            const payload = {
                adeudo: Number(cashAmount) - monto,
                costo_efectivo: Number(cashAmount),
                costo_viaje: Number(tripData.attributes.costo),
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
                headers: {
                    'Content-Type': 'application/json',
                    ...(strapiConfig.token ? { Authorization: `Bearer ${strapiConfig.token}` } : {})
                },
                body: JSON.stringify({ data: payload }),
            });
        } catch (e) { console.error('no pudo agregar deuda', e); }

        await confirmPayment();
        if (typeof onSubmit === 'function') onSubmit('cerrado');
        if (typeof onClose === 'function') onClose();
        setIsSubmitting(false);
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
                padding: '8px 20px',
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
            }}>
                <h4 style={{ color: '#333', textAlign: 'center' }}>
                    {contenido}
                </h4>
                {statusPayment === 'partial' &&
                    <div style={{ marginBottom: 16 }}>
                        <label style={{ display: 'block', marginBottom: 8 }}>Monto:</label>
                        <input
                            type="number"
                            value={monto}
                            onChange={(e) => {
                                setMonto(e.target.value);
                                setError('');
                            }}
                            style={{
                                width: '100%',
                                padding: '8px 12px',
                                borderRadius: 8,
                                border: '1px solid #ccc',
                                fontSize: 16,
                            }}
                        />
                    </div>
                }

                {error && (
                    <h5 style={{ color: 'red', textAlign: 'center', marginBottom: 16 }}>
                        {error}
                    </h5>
                )}
                <div style={{ display: 'flex', gap: 10, paddingBottom: 16 }}>
                    {!isSubmitting && (
                        <button
                            type="button"
                            onClick={() => {
                                setStatusPayment(null);
                                if (typeof onClose === 'function') onClose();
                            }}
                            style={{
                                flex: 1,
                                padding: '12px 14px',
                                borderRadius: 10,
                                border: '1px solid #ddd',
                                background: '#fff',
                                fontWeight: 600,
                                cursor: 'pointer',
                            }}
                        >
                            Cancelar
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        style={{
                            flex: 1,
                            padding: '12px 14px',
                            borderRadius: 10,
                            border: 'none',
                            background: '#2f6fed',
                            opacity: isSubmitting ? 0.5 : 1,
                            color: '#fff',
                            fontWeight: 700,
                            cursor: isSubmitting ? 'not-allowed' : 'pointer',
                        }}
                    >
                        {isSubmitting ? 'Confirmando...' : 'Confirmar pago'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmPayment;