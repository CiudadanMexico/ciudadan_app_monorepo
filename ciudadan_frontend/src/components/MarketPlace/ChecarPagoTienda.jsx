import React, { useState } from 'react'
import { Box, Typography, DialogTitle, DialogContent, Dialog, DialogActions, Button, Divider, Chip, TextField, } from '@mui/material';
import productoImg from '../../assets/placeholders/producto.png';
import { transformImageStrapi } from '../../utils/strapiHelpers';
import { Stack } from '@mui/system';
import { enqueueSnackbar } from 'notistack';
import CheckCircleOutlineOutlinedIcon from '@mui/icons-material/CheckCircleOutlineOutlined';
import PersonOutlineOutlinedIcon from '@mui/icons-material/PersonOutlineOutlined';
import PhoneOutlinedIcon from '@mui/icons-material/PhoneOutlined';
import NotesOutlinedIcon from '@mui/icons-material/NotesOutlined';

const DEFAULT_STATUS_PAGO = {
  'pendiente_verificacion': { label: 'Pendiente verificación', color: 'warning' },
  'verificado': { label: 'Verificado', color: 'success' },
  'rechazado': { label: 'Rechazado', color: 'error' },
  'reembolsado': { label: 'Reembolsado', color: 'secondary' },
  'cancelado': { label: 'Cancelado', color: 'error' },
};

const ChecarPagoTienda = ({
  openPagoModal,
  handleClosePago,
  selectedPagoPedido,
  handleRejectPago,
  apiLoading,
  handleConfirmPago,
}) => {
  const [openPickupForm, setOpenPickupForm] = useState(false);
  const [pickupData, setPickupData] = useState({ name: '', phone: '', notes: '' });

  const handleChangePickupData = (campo, valor) => {
    setPickupData((prev) => ({
      ...prev,
      [campo]: valor ?? ''
    }));
  };

  const clearPickupForm = () => setPickupData({ name: '', phone: '', notes: '' });

  const handleOpenPickupForm = () => {
    clearPickupForm();
    setOpenPickupForm(true);
  };

  const handleClosePickupForm = () => {
    setOpenPickupForm(false);
    clearPickupForm();
  };

  const handleConfirmarRecogida = async () => {
    const name = pickupData.name.trim();
    const phone = pickupData.phone.trim();
    const notes = pickupData.notes;

    if (!name) {
      enqueueSnackbar('Ingresa el nombre del remitente.', { variant: 'warning', });
      return;
    }

    if (!phone) {
      enqueueSnackbar('Ingresa el número de teléfono de contacto.', { variant: 'warning', });
      return;
    }

    if (notes && notes.length > 70) {
      enqueueSnackbar('La información adicional no debe superar los 70 caracteres.', { variant: 'warning' });
      return;
    }

    try {
      await handleConfirmPago({
        name,
        phone,
        further_information: notes,
      });
      handleClosePickupForm();
    } catch (error) {
      console.error('Error confirmando datos de recogida:', error);
      enqueueSnackbar(error?.message || 'No fue posible verificar el pago.', { variant: 'error', });
    }
  };

  const getStatusLabelPago = (status = '') => {
    if (!status) return DEFAULT_STATUS_PAGO['pendiente_verificacion'].label;
    const defaultStatus = DEFAULT_STATUS_PAGO[status] ?? DEFAULT_STATUS_PAGO['pendiente_verificacion'];
    return defaultStatus.label;
  }

  const getStatusColorPago = (status = '') => {
    if (!status) return DEFAULT_STATUS_PAGO['pendiente_verificacion'].color;
    const defaultStatus = DEFAULT_STATUS_PAGO[status] ?? DEFAULT_STATUS_PAGO['pendiente_verificacion'];
    return defaultStatus.color;
  }

  const pago_id = selectedPagoPedido?.attributes?.pago_id ?? {};
  const hasComprobante = !!pago_id?.data?.attributes?.comprobante;
  const comprobante = transformImageStrapi(pago_id?.data?.attributes?.comprobante);

  return (
    <>
      <Dialog open={openPagoModal} onClose={handleClosePago} fullWidth maxWidth="sm">
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between' }}>
          Verificar pago

          <Box sx={{ width: 100 }}>
            <Chip
              size="small"
              color={getStatusColorPago(pago_id?.data?.attributes?.status)}
              label={getStatusLabelPago(pago_id?.data?.attributes?.status)}
              sx={{
                height: 'auto',
                '& .MuiChip-label': {
                  display: 'block',
                  whiteSpace: 'normal',
                  textAlign: 'center'
                },
              }}
            />
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {selectedPagoPedido ? (
            <>
              <Typography variant="subtitle2">Pedido #{selectedPagoPedido.id}</Typography>
              <Box mt={1}>
                {/* Presentación más limpia de datos de pago (similar al estilo de PedidosEntregados) */}
                <Typography variant="body2"><strong>Monto total:</strong> {selectedPagoPedido.attributes.monto_total ?? '-'}</Typography>
                <Typography variant="body2"><strong>Moneda:</strong> {selectedPagoPedido.attributes.moneda || '—'}</Typography>
                <Divider sx={{ my: 1 }} />
                <Typography variant="subtitle2">Datos del pago:</Typography>
                {
                  hasComprobante ? (
                    <img src={comprobante.urls?.original ?? productoImg} alt='comprobante-img' width="95%" />
                  ) :
                    (
                      <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12 }}>
                        {JSON.stringify(
                          selectedPagoPedido.attributes.pago?.data?.attributes
                          || selectedPagoPedido.attributes.metadata?.payment
                          || { nota: 'No hay datos explícitos de pago' },
                          null,
                          2
                        )}
                      </pre>
                    )
                }
              </Box>
            </>
          ) : (
            <Typography>No hay pedido seleccionado.</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleRejectPago} color="inherit" disabled={apiLoading}>Rechazar</Button>
          <Button onClick={() => handleOpenPickupForm()} variant="contained" disabled={apiLoading}>Aceptar pago</Button>
        </DialogActions>
      </Dialog>
      {/* Modal de datos de contacto de remitente */}
      <Dialog
        open={openPickupForm}
        onClose={() => { }}
        fullWidth
        maxWidth="xs"
        PaperProps={{
          sx: {
            borderRadius: { xs: 0, sm: 3, },
            m: { xs: 0, sm: 2, },
          },
        }}
      >
        <DialogTitle>
          <Stack spacing={0.5}>
            <Typography variant="h6" fontWeight={700} >
              Información de contacto del remitente
            </Typography>

            <Typography variant="body2" color="text.secondary" >
              Confirma los datos de contacto que se utilizarán para el envío para finalizar la verificación del pago del pedido
            </Typography>
          </Stack>
        </DialogTitle>

        <DialogContent dividers>
          <Stack spacing={2.5}>

            <TextField
              fullWidth
              required
              label="Nombre completo del remitente"
              value={pickupData.name}
              onChange={(e) => {
                handleChangePickupData('name', e.target.value)
              }}
              placeholder="Homero Simpson"
              InputProps={{
                startAdornment: (
                  <PersonOutlineOutlinedIcon
                    sx={{
                      mr: 1,
                      color: 'text.secondary',
                    }}
                  />
                ),
              }}
            />

            <TextField
              fullWidth
              required
              label="Teléfono de contacto"
              value={pickupData.phone}
              onChange={(e) => {
                handleChangePickupData('phone', e.target.value ?? '');
              }}
              placeholder="+52 231 123 4567"
              type="tel"
              helperText="Se utilizará este número para comunicarse con la paquetería del envío."
              InputProps={{
                startAdornment: (
                  <PhoneOutlinedIcon
                    sx={{
                      mr: 1,
                      color: 'text.secondary',
                    }}
                  />
                ),
              }}
              slotProps={{
                htmlInput: {
                  type: 'tel'
                }
              }}
            />

            <TextField
              fullWidth
              multiline
              minRows={2}
              label="Información adicional para la entrega"
              value={pickupData.notes}
              onChange={(e) => {
                handleChangePickupData('notes', e.target.value)
              }}
              placeholder="Ej. Preguntar por Carlos en recepción..."
              helperText="Opcional.  Se imprime en la guía cuando está habilitado para la paquetería."
              InputProps={{
                startAdornment: (
                  <NotesOutlinedIcon
                    sx={{
                      mr: 1,
                      mt: 0.5,
                      color: 'text.secondary',
                    }}
                  />
                ),
              }}
            />

          </Stack>
        </DialogContent>

        <DialogActions sx={{ p: 2, gap: 1, }}>
          <Button
            fullWidth
            onClick={() => handleClosePickupForm()}
          >
            Cancelar
          </Button>

          <Button
            fullWidth
            variant="contained"
            color="success"
            startIcon={
              <CheckCircleOutlineOutlinedIcon />
            }
            onClick={handleConfirmarRecogida}
          >
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

export default ChecarPagoTienda