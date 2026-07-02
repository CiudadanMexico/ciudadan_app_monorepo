// src/pages/WikiHome.jsx
import React from "react";
import { Box, Typography } from "@mui/material";

const WikiHome = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Bienvenido a la Wiki.Ciuddan.Org 📚
      </Typography>
      <Typography variant="body1">
        Aquí encontrarás documentación, guías y recursos sobre los proyectos.
      </Typography>
    </Box>
  );
};

export default WikiHome;
