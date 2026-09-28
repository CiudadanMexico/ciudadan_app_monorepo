import { useEffect, useMemo, useState } from 'react'
import {
  Box,
  Typography,
  DialogTitle,
  DialogContent,
  Dialog,
  TextField,
  DialogActions,
  Button,
  MenuItem,
  Chip,
  Stack,
  Divider,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  fetchOfficePoints,
  crearEnvio,
} from '../../services/skydropxService';

const formatCurrency = (value) => {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '$0.00';
  return amount.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
};

const getOfficePointId = (point) => point?.id ?? point?.point_id;

const getOfficePointLabel = (point) => {
  const attrs = point?.attributes ?? point ?? {};
  const nombre = attrs.name ?? attrs.nombre ?? 'Sucursal';
  const calle = attrs.street ?? attrs.address ?? '';
  const colonia = attrs.area_level3 ?? attrs.neighborhood ?? '';
  const ciudad = attrs.area_level2 ?? attrs.city ?? '';
  return [nombre, calle, colonia, ciudad].filter(Boolean).join(' - ');
};

const GenerarGuia = ({ openGuiaModal, handleCloseGuia, selectedPagoPedido, onShipmentCreated }) => {
  const rate = selectedPagoPedido?.attributes?.skydropx_rate ?? null;
  const rateId = rate?.id ?? rate?.rate_id ?? selectedPagoPedido?.attributes?.skydropx_rate_id;

  // Reglas de la tarifa
  const requierePickupPoint = rate?.office_pickup === true && rate?.pickup_ocurre === false;
  const requiereDeliveryPoint = rate?.office_delivery_only === true;

  // Catálogos
  const [pickupPoints, setPickupPoints] = useState([]);
  const [deliveryPoints, setDeliveryPoints] = useState([]);

  // Formulario
  const [pickupPointId, setPickupPointId] = useState('');
  const [deliveryPointId, setDeliveryPointId] = useState('');

  const [cargando, setCargando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);

  // Cargar catálogos al abrir el modal
  useEffect(() => {
    if (!openGuiaModal || !selectedPagoPedido) return;

    setError(null);
    setCargando(true);

    const cargar = async () => {
      try {

        if (requierePickupPoint && rateId) {
          const points = await fetchOfficePoints(rateId, 'pickup');
          setPickupPoints(Array.isArray(points) ? points : points?.data ?? []);
        }

        if (requiereDeliveryPoint && rateId) {
          const points = await fetchOfficePoints(rateId, 'delivery');
          setDeliveryPoints(Array.isArray(points) ? points : points?.data ?? []);
        }
      } catch (err) {
        setError(err?.message ?? 'No fue posible cargar los catálogos de envío');
      } finally {
        setCargando(false);
      }
    };

    cargar();
  }, [openGuiaModal, selectedPagoPedido, rateId, requierePickupPoint, requiereDeliveryPoint]);

  const extraFees = useMemo(
    () => (Array.isArray(rate?.extra_fees) ? rate.extra_fees : []),
    [rate]
  );

  const formularioValido = useMemo(() => {
    if (requierePickupPoint && !pickupPointId) return false;
    if (requiereDeliveryPoint && !deliveryPointId) return false;
    return true;
  }, [requierePickupPoint, pickupPointId, requiereDeliveryPoint, deliveryPointId]);

  const handleSubmit = async () => {
    if (!selectedPagoPedido || !formularioValido) return;

    setEnviando(true);
    setError(null);

    try {
      const payload = {
        pedido_id: selectedPagoPedido.id,
        office_pickup: Boolean(rate?.office_pickup),
        office_delivery: Boolean(rate?.office_delivery || rate?.office_delivery_only),
      };

      if (requierePickupPoint) payload.office_pickup_point_id = pickupPointId;
      if (requiereDeliveryPoint) payload.office_delivery_point_id = deliveryPointId;

      const resultado = await crearEnvio(payload);

      if (onShipmentCreated) onShipmentCreated(resultado);
      handleCloseGuia();
    } catch (err) {
      setError(err?.message ?? 'No fue posible crear el envío');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Dialog open={openGuiaModal} onClose={handleCloseGuia} fullWidth maxWidth="sm">
      <DialogTitle>Generar envío</DialogTitle>
      <DialogContent dividers>
        {cargando ? (
          <Box display="flex" alignItems="center" gap={1} py={2}>
            <CircularProgress size={22} />
            <Typography>Cargando catálogos de envío...</Typography>
          </Box>
        ) : (
          <Box display="flex" flexDirection="column" gap={2}>
            {/* Resumen de la tarifa seleccionada */}
            {rate && (
              <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 1.5 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography fontWeight={600}>
                      {rate?.provider_display_name ?? rate?.provider_name ?? 'Paquetería'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {rate?.provider_service_name ?? 'Servicio de envío'}
                    </Typography>
                  </Box>
                  <Typography fontWeight={700}>{formatCurrency(rate?.total)}</Typography>
                </Stack>

                <Divider sx={{ my: 1 }} />

                <Typography variant="body2" color="text.secondary">
                  Tarifa de gestión (service fee): {formatCurrency(rate?.service_fee ?? 0)}
                </Typography>

                {extraFees.length > 0 && (
                  <>
                    <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
                      Cargos extra:
                    </Typography>
                    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap mt={0.5}>
                      {extraFees.map((fee, idx) => (
                        <Chip
                          key={`fee-${fee?.code ?? idx}`}
                          label={`${fee?.code ?? 'Cargo'}: ${formatCurrency(fee?.value ?? 0)}`}
                          size="small"
                          variant="outlined"
                          color="warning"
                        />
                      ))}
                    </Stack>
                  </>
                )}

                <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap mt={1}>
                  {rate?.pickup && (
                    <Chip
                      size="small"
                      variant="outlined"
                      label={rate?.pickup_ocurre === false ? 'Recolección en sucursal' : 'Recolección a domicilio'}
                    />
                  )}
                  {rate?.office_delivery_only ? (
                    <Chip size="small" variant="outlined" color="info" label="Entrega solo en sucursal" />
                  ) : rate?.office_delivery ? (
                    <Chip size="small" variant="outlined" color="info" label="Admite entrega en sucursal" />
                  ) : null}
                </Stack>
              </Box>
            )}

            {/* Punto de recolección en sucursal */}
            {requierePickupPoint && (
              <TextField
                select
                label="Sucursal de recolección (Ocurre)"
                value={pickupPointId}
                onChange={(e) => setPickupPointId(e.target.value)}
                fullWidth
                required
                helperText="Esta tarifa requiere entregar el paquete en una sucursal de la paquetería"
              >
                {pickupPoints.map((point) => {
                  const id = getOfficePointId(point);
                  return (
                    <MenuItem key={`pickup-${id}`} value={id}>
                      {getOfficePointLabel(point)}
                    </MenuItem>
                  );
                })}
              </TextField>
            )}

            {/* Punto de entrega en sucursal */}
            {requiereDeliveryPoint && (
              <TextField
                select
                label="Sucursal de entrega (Ocurre)"
                value={deliveryPointId}
                onChange={(e) => setDeliveryPointId(e.target.value)}
                fullWidth
                required
                helperText="El destinatario recogerá el paquete en esta sucursal"
              >
                {deliveryPoints.map((point) => {
                  const id = getOfficePointId(point);
                  return (
                    <MenuItem key={`delivery-${id}`} value={id}>
                      {getOfficePointLabel(point)}
                    </MenuItem>
                  );
                })}
              </TextField>
            )}

            {error && <Alert severity="error">{error}</Alert>}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCloseGuia} disabled={enviando}>Cancelar</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={cargando || enviando || !formularioValido}
          startIcon={enviando ? <CircularProgress size={18} /> : null}
        >
          {enviando ? 'Creando envío...' : 'Crear envío'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default GenerarGuia;