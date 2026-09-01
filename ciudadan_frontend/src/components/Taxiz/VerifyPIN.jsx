import { useRef, useState } from "react";

export default function VerifyPIN({ open, setOpen, tripPin, onStatusChange }) {
    const [inputPin, setInputPin] = useState(['', '', '', '']);
    const [pin, setPin] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const inputsRef = useRef([]);

    const handlePinComplete = (pin) => {
        setPin(pin);
    };

    if (!open) return null;

    const handleChange = (value, index) => {
        setError('');
        // Solo permitir números
        if (!/^\d?$/.test(value)) {
            return;
        }
        const newPin = [...inputPin];
        newPin[index] = value;
        setInputPin(newPin);

        // Avanzar automáticamente al siguiente campo
        if (value && index < 3) {
            inputsRef.current[index + 1]?.focus();
        }

        // PIN completo
        const completePin = newPin.join("");
        handlePinComplete(completePin);
    };

    const handleKeyDown = (e, index) => {
        // Retroceder con Backspace
        if (
            e.key === "Backspace" &&
            !inputPin[index] &&
            index > 0
        ) {
            inputsRef.current[index - 1]?.focus();
        }
    };

    const handlePaste = (e) => {
        e.preventDefault();
        setError('');

        const pasted = e.clipboardData
            .getData("text")
            .replace(/\D/g, "")
            .slice(0, 4);

        if (!pasted) return;

        const newPin = [...inputPin];

        pasted.split("").forEach((digit, index) => {
            newPin[index] = digit;
        });

        setInputPin(newPin);

        if (pasted.length === 4) {
            handlePinComplete(pasted);
        } else {
            inputsRef.current[pasted.length]?.focus();
        }
    };

    const handleStartTrip = () => {
        if (pin.length !== 4) return;
        try {
            /*const response = await fetch(
                `/api/trips/${tripId}/verify-pin`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        pin
                    }),
                }
            );
            const data = await response.json();

            if (!response.ok) {
                console.error(data.message);
                return;
            }*/
            console.log("[VerifyPIN] trip PIN:", tripPin, typeof tripPin);
            console.log("[VerifyPIN] input PIN:", pin, typeof pin);

            if (pin !== tripPin) {
                setError('El código PIN no corresponde al viaje');
                setLoading(false);
                return;
            }
            onStatusChange('en_curso');
            setOpen(false);
        } catch (e) {
            console.warn('No se pudo verificar el PIN');
        } finally {
            setLoading(false);
        }
    };

    const canSend = pin.length === 4;

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
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)'
            }}
            >
                <h4 style={{ marginBottom: 12, textAlign: 'center' }}>
                    Solicite al pasajero su PIN para iniciar el viaje
                </h4>
                <div style={{ display: 'flex', gap: 12, padding: 12, justifyContent: 'center' }}>
                    {inputPin.map((digit, index) => (
                        <input
                            key={index}
                            ref={(element) => {
                                inputsRef.current[index] = element;
                            }}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            onChange={(e) =>
                                handleChange(e.target.value, index)
                            }
                            onKeyDown={(e) =>
                                handleKeyDown(e, index)
                            }
                            onPaste={handlePaste}
                            style={{
                                width: '55px',
                                height: '65px',
                                textAlign: 'center',
                                fontSize: '24px',
                                fontWeight: 'bold',
                                borderRadius: 12,
                                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)'
                            }}
                            autoComplete="one-time-code"
                        />
                    ))}
                </div>
                {error &&
                    <h5 style={{ color: '#f80e0e', textAlign: 'center' }}>
                        {error}
                    </h5>
                }
                <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                    <button
                        type="button"
                        onClick={() => setOpen(false)}
                        style={{
                            flex: 1,
                            padding: '12px 14px',
                            borderRadius: 10,
                            border: '1px solid #ddd',
                            background: '#fff',
                            fontWeight: 600,
                            cursor: 'pointer'
                        }}
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        disabled={!canSend}
                        style={{
                            flex: 1,
                            borderRadius: 10,
                            background: '#2f6fed',
                            opacity: !canSend && .5,
                            color: '#fff',
                            border: 'none',
                            fontWeight: 700,
                            padding: '12px 14px',
                            cursor: canSend ? 'pointer' : 'not-allowed'
                        }}
                        onClick={handleStartTrip}
                    >
                        {loading ? 'Verificando' : 'Verificar PIN'}
                    </button>
                </div>
            </div>
        </div>
    );
}