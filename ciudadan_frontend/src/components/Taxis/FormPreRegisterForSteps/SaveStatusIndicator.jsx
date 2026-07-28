import React from "react";
import { Alert } from "@mui/material";

const statusToSeverity = {
  idle: "info",
  saving: "info",
  saved: "success",
  error: "error",
};

const defaultLabel = {
  idle: "Sin cambios pendientes.",
  saving: "Guardando avance...",
  saved: "Avance guardado correctamente.",
  error: "No se pudo guardar el avance.",
};

const SaveStatusIndicator = ({ status = "idle", message = "" }) => (
  <Alert severity={statusToSeverity[status] || "info"} sx={{ borderRadius: 2 }}>
    {message || defaultLabel[status] || defaultLabel.idle}
  </Alert>
);

export default SaveStatusIndicator;
