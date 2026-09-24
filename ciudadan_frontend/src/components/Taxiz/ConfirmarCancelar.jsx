import React, { useEffect } from 'react';

const ConfirmarCancelar = ({ open, setOpen, isDriver, isCancelled }) => {
    // Mostrar componente durante 15 segundos
    useEffect(() => {
        if (isCancelled) {
            const timer = setTimeout(() => {
                setOpen(false);
            }, 15000);
            // Limpia el temporizador si el componente se desmonta antes
            return () => clearTimeout(timer);
        }
    }, [isCancelled]);

    if (!open) return null;

    const userType = isDriver ? 'pasajero' : 'conductor';
    const title = `El ${userType} desea finalizar el viaje antes del destino`;

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
                    onClick={() => { setOpen(false); }}
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