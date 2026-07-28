import React from "react";
import {
  Box,
  TextField,
  Button,
  Slider,
  Select,
  MenuItem,
} from "@mui/material";

export default function BuscadorMarket({
  value,
  onChange,
  filtros,
  onFiltersChange,
  onSearch,
}) {
  return (
    <Box p={2}>
      <Box display="flex" gap={1}>
        <TextField
          fullWidth
          placeholder="Buscar productos..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSearch()}
        />

        <Button variant="contained" onClick={onSearch}>
          Buscar
        </Button>
      </Box>

      <Box mt={2}>
        <Slider
          value={filtros.precio}
          min={0}
          max={5000}
          onChange={(_, v) =>
            onFiltersChange({ ...filtros, precio: v })
          }
        />

        <Select
          fullWidth
          value={filtros.marca}
          onChange={(e) =>
            onFiltersChange({ ...filtros, marca: e.target.value })
          }
        >
          <MenuItem value="">Todas las marcas</MenuItem>
          <MenuItem value="Nike">Nike</MenuItem>
          <MenuItem value="Adidas">Adidas</MenuItem>
        </Select>
      </Box>
    </Box>
  );
}
