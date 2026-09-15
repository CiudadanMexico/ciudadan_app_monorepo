import React, { useState } from "react";
import { Box, Button, Alert, CircularProgress, Typography, Stack } from "@mui/material";

export default function MercadoPagoBoton({ order, subtypeKey = null, email, precioMostrado }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const socketUrl = (process.env.REACT_APP_SOCKET_URL || "http://localhost:33035").replace(/\/$/, "");

  const irAMercadoPago = async () => {
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`${socketUrl}/api/mp/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order, subtypeKey, email }),
      });

      const text = await res.text().catch(() => "");
      let body;
      try {
        body = JSON.parse(text);
      } catch {
        body = text;
      }

      if (!res.ok) {
        throw new Error(body?.error || `El servidor respondió ${res.status}`);
      }

      if (!body?.init_point) {
        throw new Error("Mercado Pago no devolvió una URL de pago");
      }

      try {
        sessionStorage.setItem("mp_ultima_referencia", body.external_reference);
      } catch {}

      window.location.href = body.init_point;
    } catch (err) {
      console.error("❌ Error iniciando checkout de Mercado Pago:", err);
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <Box>
      <Stack spacing={2}>
        <Button
          fullWidth
          variant="contained"
          onClick={irAMercadoPago}
          disabled={loading || !email}
          sx={{
            backgroundColor: "#009EE3",
            color: "#fff",
            py: 1.4,
            borderRadius: "14px",
            fontWeight: 800,
            textTransform: "none",
            fontSize: "1rem",
            "&:hover": { backgroundColor: "#0084BD" },
          }}
        >
          {loading ? (
            <>
              <CircularProgress size={18} sx={{ mr: 1, color: "#fff" }} />
              Redirigiendo a Mercado Pago...
            </>
          ) : (
            `Pagar con Mercado Pago${precioMostrado ? ` · ${precioMostrado}` : ""}`
          )}
        </Button>

        <Typography variant="caption" color="text.secondary">
          Te llevaremos al sitio seguro de Mercado Pago para completar el pago. Puedes pagar con
          tarjeta, efectivo en tiendas, transferencia SPEI o saldo en tu cuenta. Al terminar
          regresarás automáticamente a Ciudadan.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ whiteSpace: "pre-wrap" }}>
            {error}
          </Alert>
        )}
      </Stack>
    </Box>
  );
}
