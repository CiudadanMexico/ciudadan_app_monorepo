// src/pages/Notificacion.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  Button,
  Divider,
  Stack,
  Alert,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import NotificationsOffIcon from "@mui/icons-material/NotificationsOff";
import { useNotifications } from "../Contexts/NotificationsContext";

const Notificacion = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // API única (§3): la notificación llega normalizada (§12).
  const { notifications, fetchById, markAsRead } = useNotifications() || {};

  const [notif, setNotif] = useState(null);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // buscar notificación local primero
  const localNotif = useMemo(() => {
    return (notifications || []).find((n) => String(n.id) === String(id));
  }, [notifications, id]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setLoading(true);

        // 1) estado local primero, 2) si no está, backend (§16)
        let data = localNotif;
        if (!data && typeof fetchById === "function") {
          data = await fetchById(id);
        }

        if (!data) {
          // Sin alert() del navegador (§17): se muestra el estado en la UI.
          setErrorMsg("No se pudo cargar la notificación");
          setForbidden(true);
          return;
        }

        setNotif(data);

        // Marcar como leída (optimista e idempotente dentro del context).
        // La pertenencia al usuario la garantiza el backend: /mine/:id sólo
        // devuelve notificaciones propias (404 para el resto).
        if (!data.read && typeof markAsRead === "function") {
          markAsRead(data.id).catch(() => {});
        }
      } catch (e) {
        console.error("Error cargando notificación", e);
        setErrorMsg("Ocurrió un error al cargar la notificación");
        setForbidden(true);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [id, localNotif, fetchById, markAsRead]);

  // ---------------- RENDER ----------------

  if (loading) {
    return (
      <Box minHeight="60vh" display="flex" alignItems="center" justifyContent="center">
        <CircularProgress />
      </Box>
    );
  }

  if (forbidden || !notif) {
    return (
      <Box minHeight="60vh" display="flex" alignItems="center" justifyContent="center">
        <Paper
          elevation={6}
          sx={{
            p: 4,
            maxWidth: 420,
            textAlign: "center",
            borderRadius: 3,
          }}
        >
          <NotificationsOffIcon sx={{ fontSize: 48, mb: 1 }} />
          <Typography variant="h6" gutterBottom>
            Notificación no disponible
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={2}>
            {errorMsg || "Esta notificación no existe o no te pertenece."}
          </Typography>
          <Button
            variant="contained"
            onClick={() => navigate("/notificaciones")}
          >
            Volver
          </Button>
        </Paper>
      </Box>
    );
  }

  const title = notif.title || "Notificación";
  const body = notif.message || "";
  const dateText = new Date(notif.createdAt ?? Date.now()).toLocaleString();

  return (
    <Box px={{ xs: 1, sm: 2 }} py={3} display="flex" justifyContent="center">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{ width: "100%", maxWidth: 720 }}
      >
        <Paper
          elevation={10}
          sx={{
            p: { xs: 2, sm: 3 },
            borderRadius: 3,
          }}
        >
          <Stack spacing={2}>
            <Button
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate("/notificaciones")}
              sx={{ alignSelf: "flex-start" }}
            >
              Volver
            </Button>

            <Divider />

            <Typography variant="h5" fontWeight={700}>
              {title}
            </Typography>

            <Typography variant="caption" color="text.secondary">
              {dateText}
            </Typography>

            <Divider />

            {body ? (
              <Typography
                variant="body1"
                sx={{
                  whiteSpace: "pre-line",
                  lineHeight: 1.7,
                }}
              >
                {body}
              </Typography>
            ) : (
              <Alert severity="info">
                Esta notificación no tiene contenido adicional.
              </Alert>
            )}
          </Stack>
        </Paper>
      </motion.div>
    </Box>
  );
};

export default Notificacion;
