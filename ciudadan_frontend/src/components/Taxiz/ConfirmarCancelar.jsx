import React, { useEffect, useState } from 'react';

const ConfirmarCancelar = ({ viajeId, status, open, setOpen, isDriver, onSubmit, onClose, strapiConfig }) => {
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
                <div style={{ fontSize: 16, marginBottom: 16 }}>{title}</div>

                <div style={{ display: 'flex', gap: 10 }}>
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
                        Aceptar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmarCancelar;