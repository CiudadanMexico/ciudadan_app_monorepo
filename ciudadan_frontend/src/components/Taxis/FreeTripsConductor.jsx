import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from "@mui/material";

const FreeTripConductor = ({ open, setOpen, freeTrips }) => {
    return (
        <Dialog
            open={open}
            onClose={() => setOpen(false)}
            fullWidth={true}
            maxWidth="xs"
            role="alertdialog"
        >
            <DialogTitle id="alert-dialog-title">
                Viaje gratis
            </DialogTitle>
            <DialogContent>
                {freeTrips === 5 &&
                    <DialogContentText id="alert-dialog-description">
                        Al iniciar como conductor en Ciudadan MX, los cinco primeros viajes se ofrecerán de forma gratuita a los usuarios.
                    </DialogContentText>
                }
                <DialogContentText id="alert-dialog-description">
                    Te quedan {freeTrips} viajes gratis por realizar
                </DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button
                    onClick={() => setOpen(false)}
                    variant="contained"
                    autoFocus
                >
                    OK
                </Button>
            </DialogActions>
        </Dialog>
    )
}

export default FreeTripConductor;