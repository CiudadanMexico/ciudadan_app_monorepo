import React, { useEffect, useState } from 'react';

const ConfirmarCancelar = ({ viajeId, open, isDriver, onSubmit, onClose, strapiConfig }) => {
    if (!open) return null;

    const userType = isDriver ? 'pasajero' : 'conductor';
    const title = `El ${userType} desea finalizar el viaje antes del destino`;

    const handleSubmit = async () => {
        if (typeof onSubmit === 'function') onSubmit('finished');
        if (strapiConfig?.baseUrl && viajeId) {
            try {
                await fetch(`${strapiConfig.baseUrl.replace(/\/$/, '')}/api/viajes/${viajeId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', ...(strapiConfig.token ? { Authorization: `Bearer ${strapiConfig.token}` } : {}) },
                    body: JSON.stringify({ data: { status: 'finished' } }),
                });
            } catch (e) { console.warn('no pudo actualizar viaje', e); }
        }
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
                        Denegar
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
                        Aceptar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmarCancelar;