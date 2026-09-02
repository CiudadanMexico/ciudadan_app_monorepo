import { Box, Button, Typography } from '@mui/material';
import alertIcon from '../../assets/alert.png';

const formatDate = (iso) => {
    try {
        return new Date(iso).toLocaleString();
    } catch (e) {
        return iso;
    }
};

const AdeudoWarning = ({ debt }) => {
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
    const phone = conductor && (conductor.telefono || conductor.phone || conductor.celular);
    /*const whatsappLink = phone
      ? `https://wa.me/${String(phone).replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
        `Hola ${conductorName}, respecto al adeudo del viaje. Mi email: ${user?.email || ''}`,
      )}`
      : null;*/
    const whatsappLink = '+52 55 1234 5678'; // Reemplaza con el número de WhatsApp real del conductor o soporte

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