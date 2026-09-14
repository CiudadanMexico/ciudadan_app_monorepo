import React, { useEffect, useMemo, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    Box,
    Button,
    CircularProgress,
    Paper,
    Typography,
} from '@mui/material';

const ALLOWED_STATUS = new Set(['iniciando', 'en_curso', 'finalizado', 'cerrado']);

const getNestedEmail = (relation) => {
    if (!relation) return '';

    if (Array.isArray(relation)) {
        const firstMatch = relation.find(Boolean);
        return getNestedEmail(firstMatch);
    }

    if (typeof relation === 'object') {
        const attrs = relation.attributes || relation;
        if (attrs?.email) return String(attrs.email).trim().toLowerCase();
        if (relation?.email) return String(relation.email).trim().toLowerCase();
    }

    return String(relation).trim().toLowerCase();
};

const getStringValue = (value) => {
    if (value == null) return '';

    if (typeof value === 'string') return value.trim();

    if (Array.isArray(value)) {
        const first = value.find((item) => getStringValue(item));
        return getStringValue(first);
    }

    if (typeof value === 'object') {
        if (typeof value.label === 'string' && value.label.trim()) return value.label.trim();
        if (typeof value.name === 'string' && value.name.trim()) return value.name.trim();
        return '';
    }

    return String(value).trim();
};

const normalizeTravel = (entry) => {
    const attrs = entry?.attributes || entry || {};
    const travelId = attrs.travelid ?? attrs.travelId ?? attrs.travelID ?? entry?.id ?? null;
    const status = String(attrs.status || '').trim().toLowerCase();
    const passengerEmail = getNestedEmail(
        attrs.pasajero_data || attrs.pasajeroData || attrs.pasajeroEmail || attrs.pasajeromail,
    );
    const conductorEmail = getNestedEmail(
        attrs.conductor_data || attrs.conductorData || attrs.conductormail || attrs.driverEmail,
    );

    return {
        id: entry?.id ?? null,
        travelId,
        status,
        passengerEmail,
        conductorEmail,
        origin:
            getStringValue(attrs.originAdress) ||
            getStringValue(attrs.origendireccion) ||
            getStringValue(attrs.originAddress) ||
            getStringValue(attrs.origin) ||
            'Sin origen',
        destination:
            getStringValue(attrs.destinationAdress) ||
            getStringValue(attrs.destinodireccion) ||
            getStringValue(attrs.destinationAddress) ||
            getStringValue(attrs.destination) ||
            'Sin destino',
        updatedAt: attrs.updatedAt || attrs.createdAt || attrs.solicitado || null,
    };
};

const getStatusLabel = (status) => {
    const labels = {
        iniciando: 'Iniciando',
        en_curso: 'En curso',
        finalizado: 'Finalizado',
        cerrado: 'Cerrado',
    };

    return labels[status] || status || 'Sin estado';
};

const HistorialViajes = () => {
    const { user } = useAuth0();
    const navigate = useNavigate();
    const location = useLocation();
    const role = location?.state?.role === 'conductor' ? 'conductor' : 'pasajero';

    const [trips, setTrips] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const baseUrl = process.env.REACT_APP_STRAPI_URL || '';
    const token = process.env.REACT_APP_STRAPI_TOKEN || '';

    useEffect(() => {
        let ignore = false;

        const fetchTrips = async () => {
            setLoading(true);
            setError('');

            if (!user?.email) {
                setTrips([]);
                setLoading(false);
                setError('No se pudo determinar tu usuario para consultar viajes.');
                return;
            }

            if (!baseUrl) {
                setTrips([]);
                setLoading(false);
                setError('Falta REACT_APP_STRAPI_URL para consultar viajes.');
                return;
            }

            try {
                const headers = { 'Content-Type': 'application/json' };
                if (token) headers.Authorization = `Bearer ${token}`;

                const response = await fetch(`${baseUrl.replace(/\/$/, '')}/api/viajes?populate=*`, { headers });

                if (!response.ok) {
                    const text = await response.text();
                    throw new Error(text || 'Error consultando viajes');
                }

                const json = await response.json();
                const rawTrips = Array.isArray(json?.data) ? json.data : [];

                const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

                const normalizedTrips = rawTrips
                    .map(normalizeTravel)
                    .filter((trip) => {
                        if (!trip.travelId || !trip.updatedAt || !ALLOWED_STATUS.has(trip.status)) {
                            return false;
                        }

                        const tripDate = new Date(trip.updatedAt).getTime();
                        if (Number.isNaN(tripDate) || tripDate < oneWeekAgo) {
                            return false;
                        }

                        if (role === 'conductor') {
                            return trip.conductorEmail === user.email.toLowerCase();
                        }

                        return trip.passengerEmail === user.email.toLowerCase();
                    })
                    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

                if (!ignore) {
                    setTrips(normalizedTrips);
                }
            } catch (err) {
                console.error('[HistorialViajes] error', err);
                if (!ignore) {
                    setError(err?.message || 'No se pudieron cargar los viajes recientes.');
                }
            } finally {
                if (!ignore) {
                    setLoading(false);
                }
            }
        };

        fetchTrips();

        return () => {
            ignore = true;
        };
    }, [baseUrl, role, token, user?.email]);

    const title = useMemo(
        () => (role === 'conductor' ? 'Viajes realizados en la última semana' : 'Viajes pedidos en la última semana'),
        [role],
    );

    return (
        <Box sx={{ width: '100%', minHeight: '100vh', background: '#f5f5f5', p: 2, pb: 10 }}>
            <Box sx={{ maxWidth: 1100, mx: 'auto' }}>
                <Typography variant='h5' sx={{ fontWeight: 700, mb: 2 }}>
                    {title}
                </Typography>

                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
                        <CircularProgress />
                    </Box>
                ) : error ? (
                    <Paper sx={{ p: 3, borderRadius: 3 }}>
                        <Typography color='error'>{error}</Typography>
                    </Paper>
                ) : trips.length === 0 ? (
                    <Paper sx={{ p: 3, borderRadius: 3 }}>
                        <Typography>
                            No hay viajes {role === 'conductor' ? 'realizados' : 'pedidos'} durante la última semana.
                        </Typography>
                    </Paper>
                ) : (
                    <Box sx={{ display: 'grid', gap: 2 }}>
                        {trips.map((trip) => (
                            <Paper key={trip.travelId ?? trip.id} sx={{ borderRadius: 3, overflow: 'hidden' }}>
                                <Button
                                    fullWidth
                                    sx={{
                                        justifyContent: 'flex-start',
                                        p: 2,
                                        textTransform: 'none',
                                        color: 'inherit',
                                    }}
                                    onClick={() =>
                                        navigate(`/taxis/viaje/${trip.travelId}`, {
                                            state: { isDriver: role === 'conductor' },
                                        })
                                    }
                                >
                                    <Box sx={{ width: '100%' }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, mb: 1 }}>
                                            <Typography variant='subtitle1' sx={{ fontWeight: 700 }}>
                                                Viaje #{trip.id}
                                            </Typography>
                                            <Box
                                                sx={{
                                                    px: 1.5,
                                                    py: 0.5,
                                                    borderRadius: 999,
                                                    background: role === 'conductor' ? '#e6f4ea' : '#fff2cc',
                                                    color: '#1f1f1f',
                                                    fontWeight: 600,
                                                    fontSize: 12,
                                                }}
                                            >
                                                {getStatusLabel(trip.status)}
                                            </Box>
                                        </Box>

                                        <Typography variant='body2' color='text.secondary' sx={{ mb: 0.5, textAlign: 'left' }}>
                                            Origen: {trip.origin}
                                        </Typography>
                                        <Typography variant='body2' color='text.secondary' sx={{ mb: 0.5, textAlign: 'left' }}>
                                            Destino: {trip.destination}
                                        </Typography>
                                        <Typography variant='body1' color='text.secondary'
                                            sx={{ mt: 0.5, color: '#2a32cd', fontWeight: 600, textAlign: 'right' }}
                                        >
                                            {new Date(trip.updatedAt).toLocaleString('es-MX', {
                                                dateStyle: 'medium',
                                                timeStyle: 'short',
                                            })}
                                        </Typography>
                                    </Box>
                                </Button>
                            </Paper>
                        ))}
                    </Box>
                )}
            </Box>
        </Box>
    );
};

export default HistorialViajes;
