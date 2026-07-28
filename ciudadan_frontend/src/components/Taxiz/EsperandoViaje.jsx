import React from "react";
import { motion } from "framer-motion";
import { Alert, AlertTitle, Button } from "@mui/material";
import '../../styles/taxis.css';

const EsperandoViaje = ({ handleConductor }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.6, ease: "easeInOut" }}
      className="esperando-viaje"
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
        className="esperando-viaje-icon"
      >
        <svg width="100" height="100" viewBox="0 0 24 24" fill="none">
          <circle
            cx="12"
            cy="12"
            r="10"
            className="esperando-viaje-clock-circle"
            strokeWidth="2"
            fill="none"
          />
          <motion.line
            x1="12"
            y1="12"
            x2="12"
            y2="6"
            className="esperando-viaje-clock-line"
            strokeWidth="2"
            initial={{ rotate: 0, originX: "12px", originY: "12px" }}
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 13, ease: "linear" }}
          />
          <motion.line
            x1="12"
            y1="12"
            x2="16"
            y2="12"
            className="esperando-viaje-clock-line"
            strokeWidth="2"
            initial={{ rotate: 0, originX: "12px", originY: "12px" }}
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
          />
        </svg>
      </motion.div>

      <Alert severity="info" className="esperando-viaje-alert">
        <AlertTitle>Esperando viajes...</AlertTitle>
        Estamos buscando un pasajero para ti. ⏳
      </Alert>

      <Button variant="contained" color="primary" onClick={handleConductor}>
        Cerrar
      </Button>
    </motion.div>
  );
};

export default EsperandoViaje;
