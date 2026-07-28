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

const extractPlainText = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    return value
      .map((block) =>
        block?.children?.map((child) => child?.text || "").join("")
      )
      .join(" ");
  }
  if (typeof value === "object" && value.children) {
    return value.children.map((child) => child?.text || "").join("");
  }
  return "";
};

const Notificacion = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const ctx = useNotifications() || {};
  const notificaciones = ctx.notificaciones ?? [];
  const fetchById = ctx.fetchNotificationById ?? ctx.fetchById ?? null;
  const markAsRead = ctx.markAsRead ?? null;

  const user =
    ctx.user ??
    ctx.me ??
    ctx.currentUser ??
    ctx.authUser ??
    null;

  const [notif, setNotif] = useState(null);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);

  // buscar notificación local primero
  const localNotif = useMemo(() => {
    return notificaciones.find((n) => String(n.id) === String(id));
  }, [notificaciones, id]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setLoading(true);

        let data = localNotif;

        if (!data && typeof fetchById === "function") {
          data = await fetchById(id);
        }

        if (!data) {
          alert(`valio benyi ${id}`);
          setForbidden(true);
          return;
        }

        const attrs = data.attributes ?? data;

        // validar pertenencia al usuario
        const notifUserId =
          attrs?.user?.id ??
          attrs?.usuario?.id ??
          attrs?.userId ??
          attrs?.usuarioId ??
          null;

        const currentUserId =
          user?.id ??
          user?._id ??
          null;

        if (notifUserId && currentUserId && String(notifUserId) !== String(currentUserId)) {
          setForbidden(true);
          return;
        }

        setNotif(data);

        // marcar como leída
        const isRead =
          attrs?.leida === true ||
          attrs?.read === true ||
          attrs?.leida === "true";

        if (!isRead && typeof markAsRead === "function") {
          markAsRead(data.id).catch(() => {});
        }
      } catch (e) {
        console.error("Error cargando notificación", e);
        setForbidden(true);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [id, localNotif, fetchById, markAsRead, user]);

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
            Esta notificación no existe o no te pertenece.
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

  const attrs = notif.attributes ?? notif;

  const title =
    attrs?.titulo ??
    attrs?.title ??
    "Notificación";

  const body =
    extractPlainText(attrs?.mensaje ?? attrs?.cuerpo);

  const dateText = new Date(
    attrs?.createdAt ?? attrs?.created_at ?? Date.now()
  ).toLocaleString();

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
