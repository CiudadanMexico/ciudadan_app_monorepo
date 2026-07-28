import React from "react";
import { Box, Button } from "@mui/material";
import FondoImg from "../../assets/roles.png";

const ImagenInteractiva = () => {
  const botones = [
    { id: 1, label: "Universitarios/ becarios", x: 10, y: 58 },
    { id: 2, label: "Programadores /Profesores", x: 30, y: 58 },
    { id: 3, label: "Inversionistas", x: 50, y: 58 },
    { id: 4, label: "Socio-colaborador", x: 70, y: 58 },
    { id: 5, label: "Promoción", x: 90, y: 58 },
  ];

  return (
    <Box
      sx={{
        position: "relative",
        width: "100%",
        maxWidth: 1000,
        margin: "auto",
      }}
    >
      {/* Imagen de fondo */}
      <Box
        component="img"
        src={FondoImg}
        alt="Imagen base"
        sx={{
          width: "100%",
          height: "auto",
          display: "block",
          borderRadius: 2,
          boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
        }}
      />

      {/* Botones */}
      {botones.map((btn) => (
        <Button
          key={btn.id}
          variant="contained"
          sx={{
            position: "absolute",
            top: `${btn.y}%`,
            left: `${btn.x}%`,
            transform: "translate(-50%, -50%)",
            width: "20%",
            whiteSpace: "normal",
            lineHeight: 1.2,
            textAlign: "center",
            fontWeight: "bold",
            textTransform: "none",
            fontSize: "0.9rem",
            bgcolor: "rgba(0,100,0,0.85)",
            color: "white",
            borderRadius: "12px",
            boxShadow: "0 4px 10px rgba(0,0,0,0.5)",
            transition: "all 0.25s ease",
            "&:hover": {
              bgcolor: "rgba(0,80,0,1)",
              transform: "translate(-50%, -52%) scale(1.03)",
            },
          }}
          onClick={() => alert(`Hiciste clic en ${btn.label}`)}
        >
          {btn.label}
        </Button>
      ))}
    </Box>
  );
};

export default ImagenInteractiva;
