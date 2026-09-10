import React, { useEffect } from 'react';

const ConfirmarCancelar = ({ status, open, setOpen, isDriver, onSubmit }) => {
    // Mostrar componente durante 15 segundos
    useEffect(() => {
        if (status?.includes('fin_solicitado')) {
            const timer = setTimeout(() => {
                if (typeof onSubmit === 'function') onSubmit('finalizado');
                setOpen(false);
            }, 15000);
            // Limpia el temporizador si el componente se desmonta antes
            return () => clearTimeout(timer);
        }
    }, [status]);

    if (!open) return null;

    const userType = isDriver ? 'pasajero' : 'conductor';
    const title = `El ${userType} desea finalizar el viaje antes del destino`;

    const handleSubmit = async () => {
        if (typeof onSubmit === 'function') onSubmit('finalizado');
        setOpen(false);
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
                <div style={{
                    fontSize: 16,
                    textAlign: 'center',
                    marginBottom: 16,
                    fontWeight: 700
                }}>
                    {title}
                </div>

                <button
                    type="button"
                    onClick={handleSubmit}
                    style={{
                        width: '100%',
                        padding: '12px 14px',
                        borderRadius: 10,
                        border: 'none',
                        background: '#2f6fed',
                        color: '#fff',
                        fontWeight: 700,
                        cursor: 'pointer',
                    }}
                >
                    Aceptar
                </button>
            </div>
        </div>
    );
};

export default ConfirmarCancelar;