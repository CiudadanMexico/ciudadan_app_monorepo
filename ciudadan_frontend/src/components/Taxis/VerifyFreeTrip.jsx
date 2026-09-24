import { useAuth0 } from "@auth0/auth0-react";
import { Box, Button, Typography, } from "@mui/material";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from 'react-router-dom';

const VerifyFreeTrip = () => {
    const { user, isAuthenticated } = useAuth0();
    const navigate = useNavigate();
    const [freeTrip, setFreeTrip] = useState(null);
    console.log('[ViajeGratis] autenticado:', isAuthenticated)

    const strapiUrl = process.env.REACT_APP_STRAPI_URL || '';
    const strapiToken = process.env.REACT_APP_STRAPI_TOKEN || '';

    // 1. Definir useCallback primero (Unconditional Hook)
    const loadFreeTripStatus = useCallback(async () => {
        if (!user?.email || !isAuthenticated) return;

        try {
            const url = `${strapiUrl}/api/configuraciones-usuarios?filters[email][$eq]=${encodeURIComponent(user.email)}&populate=*`;
            const headers = { 'Content-Type': 'application/json' };
            if (strapiToken) {
                headers.Authorization = `Bearer ${strapiToken}`;
            }

            const response = await fetch(url, { headers });
            if (!response.ok) {
                throw new Error('No se pudo cargar');
            }

            const userData = await response.json();
            const freeTripStatus = userData?.data?.[0]?.attributes?.free_trip || false;
            setFreeTrip(freeTripStatus);

            if (freeTripStatus === 'pendiente') {
                const res = await fetch(
                    `${strapiUrl}/api/configuraciones-usuarios?filters[email][$eq]=${encodeURIComponent(user.email)}`,
                    { headers }
                );
                const findData = await res.json();
                const existing = findData?.data?.[0];

                await fetch(
                    `${strapiUrl}/api/configuraciones-usuarios/${existing.id}`,
                    {
                        method: 'PUT',
                        headers,
                        body: JSON.stringify({
                            data: { free_trip: 'disponible' }
                        }),
                    }
                );
            }
        } catch (err) {
            console.warn('[Pasajero] no se pudo cargar:', err);
        }
    }, [strapiToken, strapiUrl, user?.email, isAuthenticated]);

    // 2. Definir useEffect después de la función que manda a llamar
    useEffect(() => {
        loadFreeTripStatus();
    }, [loadFreeTripStatus]);

    // 3. Los retornos condicionales van AL FINAL de la zona de Hooks
    if (!isAuthenticated) {
        return <h1>Inicia sesión primero</h1>;
    }

    // 4. Lógica de renderizado corregida
    const hasFreeTrip = freeTrip === 'pendiente' || freeTrip === 'disponible';

    return (
        <div
            style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                padding: 30,
                maxWidth: 600,
                margin: '20px auto',
                background: hasFreeTrip ? '#b9ffb9' : '#fcbaba',
                border: `1px solid ${hasFreeTrip ? '#066906' : '#a10d0d'}`,
                borderRadius: 8
            }}
        >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Typography variant='h5' sx={{
                    color: hasFreeTrip ? '#066906' : '#a10d0d',
                    marginBottom: 1
                }}>
                    {hasFreeTrip
                        ? '¡Tienes un viaje gratis disponible!'
                        : 'Ya has pedido tu viaje gratis'
                    }
                </Typography>
                {hasFreeTrip &&
                    <Typography sx={{ mb: 1 }}>Pide un viaje gratis ahora mismo</Typography>
                }

                <Button
                    variant='contained'
                    color={hasFreeTrip ? 'success' : 'error'}
                    sx={{ width: '100%', mt: 2 }}
                    onClick={() => { navigate(-1) }}
                    target='_blank'
                    rel='noreferrer'>
                    OK
                </Button>
            </div>
        </div>
    )
}

export default VerifyFreeTrip;