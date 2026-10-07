import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Alert,
  Button,
  Stack,
  Divider,
} from '@mui/material';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import PrintIcon from '@mui/icons-material/Print';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { obtenerTrackingPedido } from '../../services/skydropxService';

const statusLabels = {
  pending: 'Pendiente',
  processing: 'Procesando',
  ready: 'Listo',
  picked_up: 'Recolectado',
  in_transit: 'En tránsito',
  out_for_delivery: 'En reparto',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
  returned: 'Devuelto',
  failed: 'Fallido',
  labeled: 'Etiquetado',
};

const statusColors = {
  pending: 'warning',
  processing: 'info',
  ready: 'info',
  picked_up: 'primary',
  in_transit: 'primary',
  out_for_delivery: 'primary',
  delivered: 'success',
  cancelled: 'error',
  returned: 'secondary',
  failed: 'error',
  labeled: 'info',
};

/**
 * TrackingPedido:
 * Vista de tracking para el comprador. Consulta el backend de Ciudadan
 * (nunca Skydropx directamente) y muestra:
 * - Estado del pedido
 * - Shipment (master tracking, carrier, estado)
 * - Paquetes con tracking individual, etiqueta y estado
 */
const TrackingPedido = ({ pedidoId }) => {
  const [data, setData] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!pedidoId) return;

    const cargar = async () => {
      setCargando(true);
      setError(null);
      try {
        const resultado = await obtenerTrackingPedido(pedidoId);
        setData(resultado);
      } catch (err) {
        setError(err?.message ?? 'No fue posible cargar el tracking');
      } finally {
        setCargando(false);
      }
    };

    cargar();
  }, [pedidoId]);

  if (cargando) {
    return (
      <Box display="flex" justifyContent="center" py={3}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  if (!data) return null;

  const { pedido, shipment, packages } = data;

  return (
    <Box>
      {/* Estado del pedido */}
      <Box display="flex" alignItems="center" gap={1} mb={2}>
        <Typography variant="subtitle1" fontWeight={600}>
          Pedido #{pedido?.id}
        </Typography>
        <Chip
          size="small"
          label={statusLabels[pedido?.status] ?? pedido?.status}
          color={statusColors[pedido?.status] ?? 'default'}
        />
      </Box>

      {/* Shipment */}
      {shipment ? (
        <Card variant="outlined" sx={{ mb: 2 }}>
          <CardContent>
            <Box display="flex" alignItems="center" gap={1} mb={1}>
              <LocalShippingIcon color="action" />
              <Typography fontWeight={600}>
                {shipment.carrier_name ?? 'Paquetería'}
              </Typography>
              {shipment.status && (
                <Chip
                  size="small"
                  label={statusLabels[shipment.status] ?? shipment.status}
                  color={statusColors[shipment.status] ?? 'default'}
                  variant="outlined"
                />
              )}
            </Box>

            {shipment.master_tracking_number && (
              <Typography variant="body2" color="text.secondary">
                <strong>Master tracking:</strong> {shipment.master_tracking_number}
              </Typography>
            )}

            {shipment.pickup_status && (
              <Typography variant="body2" color="text.secondary">
                <strong>Recolección:</strong> {statusLabels[shipment.pickup_status] ?? shipment.pickup_status}
                {shipment.pickup_scheduled_at && ` — ${new Date(shipment.pickup_scheduled_at).toLocaleDateString()}`}
              </Typography>
            )}
          </CardContent>
        </Card>
      ) : (
        <Alert severity="info" sx={{ mb: 2 }}>
          El envío aún no ha sido generado.
        </Alert>
      )}

      {/* Paquetes */}
      {packages.length > 0 && (
        <>
          <Typography variant="subtitle2" fontWeight={600} mb={1}>
            Paquetes ({packages.length})
          </Typography>

          {packages.map((pkg) => (
            <Card key={pkg.id ?? pkg.package_number} variant="outlined" sx={{ mb: 1.5 }}>
              <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.5}>
                  <Typography variant="body2" fontWeight={600}>
                    Paquete {pkg.package_number}
                  </Typography>
                  {pkg.status && (
                    <Chip
                      size="small"
                      label={statusLabels[pkg.status] ?? pkg.status}
                      color={statusColors[pkg.status] ?? 'default'}
                      variant="outlined"
                    />
                  )}
                </Stack>

                <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                  {pkg.length}×{pkg.width}×{pkg.height} cm · {pkg.weight} kg
                  {pkg.declared_value ? ` · Valor: $${Number(pkg.declared_value).toFixed(2)}` : ''}
                  {pkg.package_protected ? ' · Protegido' : ''}
                </Typography>

                {pkg.tracking_number && (
                  <Typography variant="body2" mb={0.5}>
                    <strong>Tracking:</strong> {pkg.tracking_number}
                  </Typography>
                )}

                {/* Contenido del paquete */}
                {pkg.items?.length > 0 && (
                  <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                    Contenido: {pkg.items.map((i) => `${i.nombre} ×${i.quantity}`).join(', ')}
                  </Typography>
                )}

                <Stack direction="row" spacing={1} mt={0.5}>
                  {pkg.label_url && (
                    <Button
                      size="small"
                      variant="text"
                      startIcon={<PrintIcon />}
                      onClick={() => window.open(pkg.label_url, '_blank', 'noopener,noreferrer')}
                    >
                      Etiqueta
                    </Button>
                  )}
                  {pkg.tracking_url && (
                    <Button
                      size="small"
                      variant="text"
                      startIcon={<OpenInNewIcon />}
                      onClick={() => window.open(pkg.tracking_url, '_blank', 'noopener,noreferrer')}
                    >
                      Seguimiento
                    </Button>
                  )}
                </Stack>
              </CardContent>
            </Card>
          ))}
        </>
      )}
    </Box>
  );
};

export default TrackingPedido;
