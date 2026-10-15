import React, { useEffect, useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useLocation } from "react-router-dom";
import { Box, Button, Alert, CircularProgress, Typography, Stack } from "@mui/material";
import "../../styles/membresias.css";

export default function MercadoPagoBoton({
  order,
  subtypeKey = null,
  email,
  precioMostrado,
  label = "Adquirir Ahora",
  labelCargando = "Redirigiendo a Mercado Pago...",
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { isAuthenticated, loginWithRedirect } = useAuth0();
  const location = useLocation();

  // Si el usuario vuelve con el botón "atrás" del navegador (Chrome
  // restaura la página desde bfcache con el estado previo: el botón seguía
  // en "Redirigiendo a Mercado Pago..." y deshabilitado). Con `pageshow`
  // con persisted=true reseteamos el estado a listo.
  useEffect(() => {
    const resetOnShow = (event) => {
      if (event.persisted) {
        setLoading(false);
        setError(null);
      }
    };
    window.addEventListener("pageshow", resetOnShow);
    return () => window.removeEventListener("pageshow", resetOnShow);
  }, []);

  const socketUrl = (process.env.REACT_APP_SOCKET_URL || "http://localhost:33035").replace(/\/$/, "");

  const handleClick = () => {
    // Sin sesión (o sin email): en vez de dejar el botón muerto, mandar a
    // iniciar sesión y regresar a esta misma pantalla al terminar.
    if (!isAuthenticated || !email) {
      loginWithRedirect({
        // Conserva la opción elegida: ruta + query + ancla de la sección.
        appState: { returnTo: location.pathname + location.search + location.hash },
      });
      return;
    }
    irAMercadoPago();
  };

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
          className="mg-btn"
          onClick={handleClick}
          disabled={loading}
          aria-busy={loading || undefined}
          sx={{ py: 1.45, fontSize: "1rem" }}
        >
          {loading ? (
            <>
              <CircularProgress size={18} sx={{ mr: 1, color: "var(--mg-berenjena, #2A0B4D)" }} />
              {labelCargando}
            </>
          ) : (
            `${label}${precioMostrado ? ` · ${precioMostrado}` : ""}`
          )}
        </Button>

        <Typography variant="caption" sx={{ color: "var(--mg-lila, #CE93D8)", fontSize: "0.82rem", lineHeight: 1.55 }}>
          Te llevaremos al sitio seguro de Mercado Pago para completar el pago. Puedes pagar con
          tarjeta, efectivo en tiendas, transferencia SPEI o saldo en tu cuenta. Al terminar
          regresarás automáticamente a Ciudadan.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ whiteSpace: "pre-wrap", bgcolor: "rgba(124, 29, 40, 0.35)", color: "#FFDAD6" }}>
            {error}
          </Alert>
        )}
      </Stack>
    </Box>
  );
}
