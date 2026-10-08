import React, { useEffect, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Stack,
} from "@mui/material";

const INTENTOS_MAX = 10;
const ESPERA_MS = 2000;

export default function MercadoPagoRetorno() {
  const location = useLocation();
  const navigate = useNavigate();

  const params = new URLSearchParams(location.search);
  const estadoUrl = params.get("estado");
  const estadoMp = params.get("collection_status") || params.get("status");

  const refDeUrl = params.get("ref") || params.get("external_reference");
  let refGuardada = null;
  try {
    refGuardada = sessionStorage.getItem("mp_ultima_referencia");
  } catch {}
  const ref = refDeUrl || refGuardada;

  const [consultando, setConsultando] = useState(true);
  const [intentos, setIntentos] = useState(0);
  const [estado, setEstado] = useState(null);
  const [error, setError] = useState(null);

  const socketUrl = (process.env.REACT_APP_SOCKET_URL || "http://localhost:33035").replace(/\/$/, "");

  const consultar = useCallback(async () => {
    if (!ref) {
      setError("No recibimos la referencia del pago.");
      setConsultando(false);
      return;
    }

    try {
      const res = await fetch(`${socketUrl}/api/mp/estado/${encodeURIComponent(ref)}`);
      const body = await res.json().catch(() => null);

      if (res.ok && body) {
        setEstado(body);

        if (body.activa || ["rechazado", "cancelado"].includes(body.status)) {
          setConsultando(false);
          return;
        }
      }
    } catch (err) {
      console.error("Error consultando el estado del pago:", err);
    }

    setIntentos((n) => n + 1);
  }, [ref, socketUrl]);

  useEffect(() => {
    if (!consultando) return;

    if (intentos === 0) {
      consultar();
      return;
    }

    if (intentos >= INTENTOS_MAX) {
      setConsultando(false);
      return;
    }

    const t = setTimeout(consultar, ESPERA_MS);
    return () => clearTimeout(t);
  }, [intentos, consultando, consultar]);

  const fallo = estadoUrl === "failure" || estadoMp === "rejected" || estado?.status === "rechazado";

  const exito = estado?.activa === true;

  const titulo = () => {
    if (exito) return "🎉 ¡Listo, ya eres miembro!";
    if (fallo) return "No pudimos procesar tu pago";
    if (consultando) return "Confirmando tu pago...";
    return "Tu pago está en proceso";
  };

  return (
    <Box sx={{ maxWidth: 640, mx: "auto", py: 6, px: 2 }}>
      <Card elevation={3} sx={{ borderRadius: "24px" }}>
        <CardContent sx={{ p: 4, textAlign: "center" }}>
          <Typography variant="h5" sx={{ fontWeight: 800, mb: 2 }}>
            {titulo()}
          </Typography>

          {consultando && (
            <Stack alignItems="center" spacing={2} sx={{ my: 3 }}>
              <CircularProgress />
              <Typography variant="body2" color="text.secondary">
                Estamos esperando la confirmación de Mercado Pago. Esto suele tardar unos segundos.
              </Typography>
            </Stack>
          )}

          {!consultando && exito && (
            <Alert severity="success" sx={{ textAlign: "left", mb: 3 }}>
              Tu membresía quedó activa
              {estado?.fechaFin ? ` hasta el ${estado.fechaFin}` : ""}. Ya puedes usar todos los
              beneficios.
            </Alert>
          )}

          {!consultando && fallo && (
            <Alert severity="error" sx={{ textAlign: "left", mb: 3 }}>
              El pago no se completó. No se te cobró nada. Puedes intentarlo de nuevo con otro
              método de pago.
            </Alert>
          )}

          {!consultando && !exito && !fallo && (
            <Alert severity="info" sx={{ textAlign: "left", mb: 3 }}>
              Tu pago quedó registrado pero todavía no lo confirma Mercado Pago. Si pagaste en
              efectivo o por transferencia, esto puede tardar hasta 24 horas. Tu membresía se
              activará sola en cuanto se acredite.
            </Alert>
          )}

          {error && (
            <Alert severity="warning" sx={{ textAlign: "left", mb: 3 }}>
              {error}
            </Alert>
          )}

          {ref && (
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 3 }}>
              Referencia: {ref}
            </Typography>
          )}

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} justifyContent="center">
            {exito ? (
              <Button variant="contained" onClick={() => navigate("/mi-membresia")}>
                Ver mi membresía
              </Button>
            ) : (
              <Button variant="contained" onClick={() => navigate("/membresias")}>
                Volver a membresías
              </Button>
            )}

            {!consultando && !exito && !fallo && (
              <Button
                variant="outlined"
                onClick={() => {
                  setIntentos(0);
                  setConsultando(true);
                }}
              >
                Volver a consultar
              </Button>
            )}
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
