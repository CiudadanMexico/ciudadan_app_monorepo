import { Box, Button, Typography } from '@mui/material';
import alertIcon from '../../assets/alert.png';
import { useEffect, useState } from 'react';

const strapiUrl = process.env.REACT_APP_STRAPI_URL || '';
const strapiToken = process.env.REACT_APP_STRAPI_TOKEN || '';

const formatDate = (date) => {
    console.log('fecha de viaje deuda', date);
    try {
        return new Date(date).toLocaleString('es-MX', {
            dateStyle: 'medium',
            timeStyle: 'short',
        });
    } catch (e) {
        return date;
    }
};

const AdeudoWarning = ({ debt }) => {
    const [phone, setPhone] = useState(null);

    useEffect(() => {
        (async () => {
            try {
                const url = `${strapiUrl.replace(/\/$/, '')}/api/site-setting`;

                const resp = await fetch(url, {
                    headers: {
                        'Content-Type': 'application/json',
                        ...(strapiToken ? { Authorization: `Bearer ${strapiToken}` } : {}),
                    },
                });

                if (!resp.ok) throw new Error('Error consultando site settings');
                const json = await resp.json();

                const phoneNumber = json
                    ? json.data?.attributes?.whatsapp_number
                    : null;
                setPhone(phoneNumber);
            } catch (err) {
                console.error('Error consultando número de WhatsApp de site settings', err)
            }
        })();
    }, []);

    if (!debt || !debt.attributes) return null;

    const a = debt.attributes;
    const conductor = a.conductor && a.conductor.data && a.conductor.data.attributes ? a.conductor.data.attributes : null;
    const conductorName = conductor?.nombre_completo || a.conductor_email || 'Conductor';
    const costoViaje = a.costo_viaje != null ? a.costo_viaje : a.costo_efectivo || 0;
    const adeudo = a.adeudo != null ? a.adeudo : costoViaje;
    const fecha = a.fecha_viaje ? formatDate(a.fecha_viaje) : a.createdAt ? formatDate(a.createdAt) : '';
    const origen = a.origen_direccion || '-';
    const destino = a.destino_direccion || '-';

    // Intentar obtener teléfono para WhatsApp
    //const phone = conductor && (conductor.telefono || conductor.phone || conductor.celular || '52 961 245 7926');
    const message = `Hola ${conductorName}, tengo un pago pendiente de un viaje.`;

    const whatsappLink = phone
        ? `https://wa.me/${String(phone).replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`
        : null;

    return (
        <div
            className='adeudo-warning'
            style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                padding: 20,
                maxWidth: 900,
                margin: '20px auto',
                background: '#fff6f6',
                border: '1px solid #ffb3b3',
                borderRadius: 8
            }}
        >
            <div>
                <Typography variant='h6' sx={{ color: '#a10d0d', marginBottom: 1 }}>Tienes un adeudo pendiente</Typography>
                <Typography sx={{ mb: 1 }}>No podrás pedir otro viaje hasta resolver este adeudo.</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', mt: 1, mb: 1, gap: 1 }}>
                    <div><strong>Costo del viaje:</strong> ${Intl.NumberFormat('es-MX').format(costoViaje)}</div>
                    <div><strong>Adeudo:</strong> ${Intl.NumberFormat('es-MX').format(adeudo)}</div>
                    <div><strong>Fecha del viaje:</strong> {fecha}</div>
                    <div><strong>Conductor:</strong> {conductorName}</div>
                    <div><strong>Origen:</strong> {origen}</div>
                    <div><strong>Destino:</strong> {destino}</div>
                </Box>
                <Box sx={{ mt: 2 }}>
                    {whatsappLink ? (
                        <Button className='button-debt' variant='contained' color='success' href={whatsappLink} target='_blank' rel='noreferrer'>Contactar por WhatsApp</Button>
                    ) : (
                        <Button variant='outlined' color='primary' href={`mailto:${a.conductor_email || ''}`}>Contactar por email</Button>
                    )}
                </Box>
            </div>
            <img
                src={alertIcon}
                alt='alert-icon'
                style={{
                    width: 200,
                    height: 200,
                    padding: 20,
                }}
            />
        </div>
    );
};

export default AdeudoWarning;