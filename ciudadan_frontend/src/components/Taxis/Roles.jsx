import React, { useState, useEffect, useRef } from 'react';
import { Alert, AlertTitle, Button, Link } from '@mui/material';


const RolConductor = ({ handlePasajero, handleConductor, rol }) => {
    return (
      <Alert
        severity="info"
        icon={
          <span 
            className="material-icons" 
            style={{ fontSize: "inherit", cursor: "pointer" }} 
            onClick={handleConductor}
          >
            visibility_off
          </span>
        }
        sx={{
          backgroundColor: "#d2d2a6", // Amarillo del logo
          color: "#6d6e71"            // Gris del borde de la moneda
        }}
      >
        <AlertTitle>¿Ocultar Módulo de Pasajero?</AlertTitle>
      </Alert>
    );
  };
  
  
  const RolPasajero = ({ handlePasajero, handleConductor, rol }) => {
    return (
      <Alert
        severity="info"
        icon={
          <span 
            className="material-icons" 
            style={{ fontSize: "inherit", cursor: "pointer" }} 
            onClick={handlePasajero}
          >
            visibility
          </span>
        }
        sx={{
          backgroundColor: "#c1f3a6", // Amarillo del logo
          color: "#6d6e71"            // Gris del borde de la moneda
        }}
      >
        <AlertTitle>¿Mostrar Módulo de Pasajero?</AlertTitle>
      </Alert>
    );
  };

  export { RolPasajero, RolConductor };