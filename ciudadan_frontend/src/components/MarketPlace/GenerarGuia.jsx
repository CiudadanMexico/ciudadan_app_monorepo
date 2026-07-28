import React from 'react'
import {
  Box,
  Typography,
  DialogTitle,
  DialogContent,
  Dialog,
  TextField,
  DialogActions,
  Button,
} from '@mui/material';

const GenerarGuia = ({openGuiaModal, handleCloseGuia, guiaDraft, setGuiaDraft, handleGenerateAndSaveGuia, apiLoading}) => {
  return (
    <>
        <Dialog open={openGuiaModal} onClose={handleCloseGuia} fullWidth maxWidth="sm">
            <DialogTitle>Generar guía</DialogTitle>
            <DialogContent dividers>
            <Box display="flex" flexDirection="column" gap={2}>
                <TextField
                label="Proveedor"
                value={guiaDraft.proveedor}
                onChange={(e) => setGuiaDraft(d => ({ ...d, proveedor: e.target.value }))}
                placeholder="Estafeta, DHL, etc."
                fullWidth
                />
                <TextField
                label="Número de guía (opcional)"
                value={guiaDraft.guia}
                onChange={(e) => setGuiaDraft(d => ({ ...d, guia: e.target.value }))}
                placeholder="Si no pones nada se generará uno simulado"
                fullWidth
                />
                <Typography variant="caption" color="text.secondary">
                Esta sección está maquetada para integrar con la API de tu transportista (ej. EnviaYa) cuando lo conectes.
                Por ahora se guarda un número de guía simulado si no lo proporcionas.
                </Typography>
            </Box>
            </DialogContent>
            <DialogActions>
            <Button onClick={handleCloseGuia}>Cancelar</Button>
            <Button onClick={handleGenerateAndSaveGuia} variant="contained" disabled={apiLoading}>Generar y guardar</Button>
            </DialogActions>
        </Dialog>
    </>
  )
}

export default GenerarGuia