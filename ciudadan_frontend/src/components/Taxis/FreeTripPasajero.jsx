import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from "@mui/material";

const FreeTripPasajero = ({ open, setOpen }) => {
    return (
        <Dialog
            open={open}
            onClose={() => setOpen(false)}
            role="alertdialog"
        >
            <DialogTitle id="alert-dialog-title">
                ¡Viaje gratis!
            </DialogTitle>
            <DialogContent>
                <DialogContentText id="alert-dialog-description">
                    Al ser tu primer viaje en Ciudadan MX, tienes derecho a un viaje GRATIS. ¡Pide uno ahora!
                </DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button
                    onClick={() => setOpen(false)}
                    variant="contained"
                    color="success"
                    autoFocus
                >
                    OK
                </Button>
            </DialogActions>
        </Dialog>
    )
}

export default FreeTripPasajero;