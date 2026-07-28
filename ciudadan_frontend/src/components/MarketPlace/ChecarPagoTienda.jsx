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
} from '@mui/material';


const ChecarPagoTienda = ({
    openPagoModal,
    handleClosePago, 
    selectedPagoPedido,
    handleRejectPago,
    apiLoading, 
    handleConfirmPago,
}) => {
  return (
    <>
        <Dialog open={openPagoModal} onClose={handleClosePago} fullWidth maxWidth="sm">
        <DialogTitle>Checar pago</DialogTitle>
        <DialogContent dividers>
          {selectedPagoPedido ? (
            <>
              <Typography variant="subtitle2">Pedido #{selectedPagoPedido.id}</Typography>
              <Box mt={2}>
                {/* Presentación más limpia de datos de pago (similar al estilo de PedidosEntregados) */}
                <Typography variant="body2"><strong>Monto total:</strong> {selectedPagoPedido.attributes.monto_total ?? '-'}</Typography>
                <Typography variant="body2"><strong>Moneda:</strong> {selectedPagoPedido.attributes.moneda || '—'}</Typography>
                <Divider sx={{ my: 1 }} />
                <Typography variant="subtitle2">Datos del pago (si existen):</Typography>
                <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12 }}>
                  {JSON.stringify(
                    selectedPagoPedido.attributes.pago?.data?.attributes
                      || selectedPagoPedido.attributes.metadata?.payment
                      || { nota: 'No hay datos explícitos de pago' },
                    null,
                    2
                  )}
                </pre>
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