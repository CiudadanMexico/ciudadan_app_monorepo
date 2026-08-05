import React from 'react'
import {
  Box,
  Typography,
  DialogTitle,
  DialogContent,
  Dialog,
  DialogActions,
  Button,
  Divider,
  Chip,
} from '@mui/material';
import productoImg from '../../assets/placeholders/producto.png';
import { transformImageStrapi } from '../../utils/strapiHelpers';

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
  const  pago_id = selectedPagoPedido?.attributes?.pago_id ?? {};
  const hasPago = !!pago_id?.data;
  const hasComprobante = !!pago_id?.data?.attributes?.comprobante;
  const comprobante = transformImageStrapi(pago_id?.data?.attributes?.comprobante);

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
  return (
    <>
      <Dialog open={openPagoModal} onClose={handleClosePago} fullWidth maxWidth="sm">
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between' }}>
          Checar pago

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
                    <img src={comprobante.urls?.thumbnail ?? productoImg} alt='comprobante-img' width="95%" />
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
          <Button onClick={handleConfirmPago} variant="contained" disabled={apiLoading}>Confirmar pago</Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

export default ChecarPagoTienda