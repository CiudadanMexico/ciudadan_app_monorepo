import React, { useEffect } from "react";
import { Box, Paper, Typography, List, ListItem, ListItemText } from "@mui/material";
import { motion } from "framer-motion";
import { useAgencia } from "../../hooks/useAgencia.jsx";

export default function Agencia() {
  const { socios, fetchSocios, loading, error } = useAgencia();

  useEffect(() => {
    console.log("🌞🌞🌞 [Agencia] useEffect ejecutado, llamando fetchSocios...");
    fetchSocios("cdmx").then(res => {
      console.log("🌞🌞🌞 [Agencia] fetchSocios terminó con:", res);
    });
  }, []);

  console.log("🌞🌞🌞 [Agencia] render, socios:", socios, "loading:", loading, "error:", error);

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        bgcolor: "#003300",
        p: 3,
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{ width: "100%", maxWidth: 600 }}
      >
        <Paper
          elevation={6}
          sx={{
            p: 6,
            borderRadius: 3,
            bgcolor: "#002200",
            color: "#fff",
          }}
        >
          <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>
            🌟🌟🌟 Miembros de la Agencia CDMX
          </Typography>

          {loading && <Typography>Cargando socios...</Typography>}
          {error && <Typography color="error">Error: {error.message}</Typography>}

          {!loading && socios.length === 0 && (
            <Typography>No se encontraron miembros.</Typography>
          )}

          {!loading && socios.length > 0 && (
            <List>
              {socios.map((nombre, idx) => (
                <ListItem key={idx} sx={{ bgcolor: "#003300", mb: 1, borderRadius: 1 }}>
                  <ListItemText primary={nombre} />
                </ListItem>
              ))}
            </List>
          )}
        </Paper>
      </motion.div>
    </Box>
  );
}
