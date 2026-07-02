import React, { useState } from "react";
import { Box, Button, Typography, IconButton, Tooltip, Paper } from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CheckIcon from "@mui/icons-material/Check";
import { useAuth0 } from "@auth0/auth0-react";

const TestToken = () => {
  const { getAccessTokenSilently } = useAuth0();

  const [token, setToken] = useState("");
  const [copiado, setCopiado] = useState(false);
  const [loading, setLoading] = useState(false);

  const obtenerToken = async () => {
    setLoading(true);
    try {
      const t = await getAccessTokenSilently();
      setToken(t);
    } catch (err) {
      console.error(err);
      alert("Error obteniendo token");
    }
    setLoading(false);
  };

  const copiarToken = async () => {
    if (!token) return;
    await navigator.clipboard.writeText(token);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  return (
    <Box sx={{ p: 2 }}>
      <Button
        variant="contained"
        onClick={obtenerToken}
        disabled={loading}
        sx={{ mb: 2 }}
      >
        {loading ? "Obteniendo..." : "Obtener token"}
      </Button>

      {token && (
        <Paper
          sx={{
            p: 2,
            backgroundColor: "#f5f5f5",
            borderRadius: 2,
            wordBreak: "break-all",
            position: "relative",
          }}
        >
          <Typography
            variant="body2"
            sx={{
              fontFamily: "monospace",
              pr: 5,
            }}
          >
            {token}
          </Typography>

          <Tooltip title={copiado ? "Copiado" : "Copiar"}>
            <IconButton
              onClick={copiarToken}
              sx={{
                position: "absolute",
                top: 8,
                right: 8,
              }}
            >
              {copiado ? <CheckIcon color="success" /> : <ContentCopyIcon />}
            </IconButton>
          </Tooltip>
        </Paper>
      )}
    </Box>
  );
};

export default TestToken;