// src/components/Notifications/AllNotificaciones.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Paper,
  Grid,
  Typography,
  IconButton,
  InputBase,
  Button,
  Divider,
  List,
  ListItem,
  ListItemAvatar,
  Avatar,
  ListItemText,
  ListItemSecondaryAction,
  Chip,
  Tooltip,
  CircularProgress,
  Stack,
  FormControlLabel,
  Switch,
  Select,
  MenuItem,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import RefreshIcon from "@mui/icons-material/Refresh";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import MarkEmailReadIcon from "@mui/icons-material/MarkEmailRead";
import MailOutlineIcon from "@mui/icons-material/MailOutline";
import NotificationsOffIcon from "@mui/icons-material/NotificationsOff";
import FilterListIcon from "@mui/icons-material/FilterList";
import { useNotifications } from "../Contexts/NotificationsContext";
import notificationIcon from "../assets/notification.png";

const MAIN_DOMAIN = (process.env.REACT_APP_MAIN_DOMAIN || "").replace(/\/$/, "");

const MAX_PAGE_SIZE = 25;

const buildLink = (rawLink) => {
  if (!rawLink) return null;
  if (/^https?:\/\//i.test(rawLink)) return rawLink;
  const r = rawLink.startsWith("/") ? rawLink : `/${rawLink}`;
  return MAIN_DOMAIN ? `${MAIN_DOMAIN}${r}` : r;
};

export default function AllNotificaciones() {
  const navigate = useNavigate();
  // API única (§3): todo llega ya normalizado (§12).
  const {
    notifications = [],
    loading = false,
    unreadCount = 0,
    refresh: refreshFn,
    markAsRead: markAsReadFn,
    markAsUnread: markAsUnreadFn,
    markAllAsRead: markAllAsReadFn,
    toast,
  } = useNotifications() || {};

  // UI state
  const [query, setQuery] = useState("");
  const [onlyUnreadToggle, setOnlyUnreadToggle] = useState(false);
  const [sortBy, setSortBy] = useState("newest"); // 'newest' | 'oldest'
  const [pageSize, setPageSize] = useState(MAX_PAGE_SIZE);
  const [page, setPage] = useState(1);

  // reinicia la paginación cuando cambia la lista (el estado de lectura ya
  // vive en el context: aquí NO se mantiene un mapa local duplicado)
  useEffect(() => {
    setPage(1);
  }, [notifications]);

  // derived & filtered list (todo normalizado §12)
  const filteredSorted = useMemo(() => {
    const list = Array.isArray(notifications) ? [...notifications] : [];

    const q = (query || "").trim().toLowerCase();
    const filteredByQuery = q
      ? list.filter(
          (n) =>
            (n.title || "").toLowerCase().includes(q) ||
            (n.message || "").toLowerCase().includes(q)
        )
      : list;

    const filteredByUnread = onlyUnreadToggle
      ? filteredByQuery.filter((n) => !n.read)
      : filteredByQuery;

    filteredByUnread.sort((a, b) => {
      const aDate = new Date(a?.createdAt ?? 0).getTime();
      const bDate = new Date(b?.createdAt ?? 0).getTime();
      return sortBy === "newest" ? bDate - aDate : aDate - bDate;
    });

    return filteredByUnread;
  }, [notifications, query, onlyUnreadToggle, sortBy]);

  const totalCount = (notifications || []).length;

  const visibleNotifications = filteredSorted.slice(0, page * pageSize);

  // actions
  const handleRefresh = async () => {
    if (typeof refreshFn === "function") {
      try {
        await refreshFn();
      } catch (e) {
        console.error("refresh error", e);
      }
    }
  };

  const handleMarkAllRead = async () => {
    if (!unreadCount) return;
    try {
      // Endpoint masivo del backend que sólo toca este usuario (§20).
      await markAllAsReadFn();
      toast?.success?.("Todas las notificaciones quedaron como leídas");
    } catch (e) {
      console.error("mark all read error", e);
      toast?.error?.("No se pudieron marcar las notificaciones");
    }
  };

  const handleToggleRead = async (notifId, currentlyRead) => {
    try {
      if (typeof currentlyRead === "boolean") {
        // el context hace la actualización optimista y revierte si falla (§19)
        if (currentlyRead) {
          if (typeof markAsUnreadFn === "function") await markAsUnreadFn(notifId);
        } else if (typeof markAsReadFn === "function") {
          await markAsReadFn(notifId);
        }
        return;
      }
      if (typeof markAsReadFn === "function") await markAsReadFn(notifId);
    } catch (e) {
      console.error("toggle read error", e);
      toast?.error?.("No se pudo actualizar la notificación");
    }
  };

  const handleOpenNotification = async (notif) => {
    const { id, read, link } = notif;

    if (!read && typeof markAsReadFn === "function") {
      try {
        await markAsReadFn(id);
      } catch (e) {
        console.error("markAsRead error", e);
      }
    }

    const finalLink = buildLink(link);
    if (finalLink) {
      if (/^https?:\/\//i.test(finalLink)) {
        window.location.href = finalLink;
      } else {
        navigate(finalLink);
      }
    } else {
      navigate(`/notificacion/${id}`);
    }
  };

  return (
    <Box sx={{ p: { xs: 1.5, sm: 4 }, maxWidth: 1200, mx: "auto", overflowX: "hidden" }}>
      <Paper elevation={6} sx={{ borderRadius: 2, overflow: "hidden" }}>
        {/* Header */}
        <Box sx={{ p: { xs: 1.25, sm: 3 } }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6}>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                Todas las notificaciones
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Total: {totalCount} — No leídas: {unreadCount}
              </Typography>
            </Grid>

            <Grid item xs={12} sm={6}>
              {/* responsive container: intenta 1 línea; si no, wrap en 2 */}
              <Box
                sx={{
                  display: "flex",
                  gap: 1,
                  alignItems: "center",
                  justifyContent: "flex-end",
                  flexWrap: "wrap",
                }}
              >
                {/* Search box: flexible, se encoge hasta minWidth */}
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    bgcolor: "rgba(0,0,0,0.03)",
                    px: 1,
                    py: 0.5,
                    borderRadius: 1,
                    flex: { xs: "1 1 140px", sm: "0 0 320px" },
                    minWidth: { xs: 120, sm: 320 },
                    maxWidth: { xs: "100%", sm: 320 },
                  }}
                >
                  <SearchIcon sx={{ mr: 1, color: "text.secondary", flex: "0 0 auto" }} />
                  <InputBase
                    placeholder="Buscar por título o contenido..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    sx={{ flex: 1, minWidth: 0 }}
                    inputProps={{ "aria-label": "buscar notificaciones" }}
                  />
                  {query && (
                    <Button size="small" onClick={() => setQuery("")}>
                      Limpiar
                    </Button>
                  )}
                </Box>

                {/* On xs: compact icon toggle */}
                <Tooltip title="Solo no leídas" sx={{ display: { xs: "inline-flex", sm: "none" } }}>
                  <IconButton
                    onClick={() => setOnlyUnreadToggle((v) => !v)}
                    color={onlyUnreadToggle ? "primary" : "default"}
                    size="small"
                    sx={{ borderRadius: 1 }}
                  >
                    <FilterListIcon />
                  </IconButton>
                </Tooltip>

                {/* On sm+: show the full labeled switch */}
                <Box sx={{ display: { xs: "none", sm: "inline-flex" } }}>
                  <FormControlLabel
                    control={<Switch checked={onlyUnreadToggle} onChange={(_, val) => setOnlyUnreadToggle(val)} />}
                    label="Solo no leídas"
                  />
                </Box>

                <Select
                  size="small"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  sx={{ minWidth: { xs: 100, sm: 140 } }}
                >
                  <MenuItem value="newest">Más recientes</MenuItem>
                  <MenuItem value="oldest">Más antiguas</MenuItem>
                </Select>

                <Tooltip title="Refrescar">
                  <IconButton onClick={handleRefresh} size="small" sx={{ flex: "0 0 auto" }}>
                    <RefreshIcon />
                  </IconButton>
                </Tooltip>

                <Tooltip title="Marcar todas como leídas">
                  <IconButton onClick={handleMarkAllRead} size="small" color="inherit" sx={{ flex: "0 0 auto" }}>
                    <DoneAllIcon />
                  </IconButton>
                </Tooltip>
              </Box>
            </Grid>
          </Grid>
        </Box>

        <Divider />

        {/* Content */}
        <Box sx={{ p: { xs: 1.5, sm: 2 }, minHeight: 220 }}>
          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
              <CircularProgress />
            </Box>
          ) : notifications.length === 0 ? (
            <Box sx={{ textAlign: "center", py: 6 }}>
              <NotificationsOffIcon sx={{ fontSize: 48, color: "text.secondary", mb: 1 }} />
              <Typography color="text.secondary">No hay notificaciones</Typography>
            </Box>
          ) : (
            <>
              <List disablePadding>
                {visibleNotifications.map((notif) => {
                  const { id, title, read: isRead, createdAt } = notif;
                  const snippet = (notif.message || "").slice(0, 280);
                  const dateText = createdAt
                    ? new Date(createdAt).toLocaleString()
                    : new Date().toLocaleString();

                  return (
                    <React.Fragment key={id}>
                      <ListItem
                        alignItems="flex-start"
                        sx={{
                          bgcolor: isRead ? "transparent" : "rgba(0,255,128,0.02)",
                          "&:hover": { bgcolor: isRead ? "rgba(255,255,255,0.02)" : "rgba(0,255,128,0.04)" },
                        }}
                        secondaryAction={
                          <ListItemSecondaryAction>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Chip label={isRead ? "Leída" : "No leída"} size="small" />
                              <Tooltip title={isRead ? "Marcar como no leída" : "Marcar como leída"}>
                                <IconButton edge="end" onClick={() => handleToggleRead(id, isRead)} size="small">
                                  {isRead ? <MailOutlineIcon /> : <MarkEmailReadIcon />}
                                </IconButton>
                              </Tooltip>
                              {notif.link && (
                                <Tooltip title="Abrir enlace">
                                  <IconButton edge="end" onClick={() => handleOpenNotification(notif)} size="small">
                                    <OpenInNewIcon />
                                  </IconButton>
                                </Tooltip>
                              )}
                            </Stack>
                          </ListItemSecondaryAction>
                        }
                      >
                        <ListItemAvatar>
                          <Avatar src={notificationIcon} alt="n" />
                        </ListItemAvatar>

                        <ListItemText
                          primary={
                            <Box display="flex" alignItems="center" justifyContent="space-between" gap={2}>
                              <Typography
                                variant="body1"
                                sx={{
                                  fontWeight: isRead ? 500 : 800,
                                  wordBreak: "break-word",
                                  overflowWrap: "anywhere",
                                  maxWidth: { xs: "65%", sm: "75%" },
                                }}
                              >
                                {title}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: "nowrap" }}>
                                {dateText}
                              </Typography>
                            </Box>
                          }
                          secondary={
                            snippet ? (
                              <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{ mt: 0.5, wordBreak: "break-word", overflowWrap: "anywhere" }}
                              >
                                {snippet}
                              </Typography>
                            ) : null
                          }
                        />
                      </ListItem>

                      <Divider component="li" sx={{ borderColor: "rgba(255,255,255,0.04)" }} />
                    </React.Fragment>
                  );
                })}
              </List>

              {/* Load more / pagination */}
              {visibleNotifications.length < filteredSorted.length && (
                <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
                  <Button
                    variant="outlined"
                    onClick={() => setPage((p) => p + 1)}
                    sx={{ textTransform: "none" }}
                  >
                    Cargar más
                  </Button>
                </Box>
              )}

              {/* If we filtered to show only unread but there are none in the filtered list, show friendly message */}
              {filteredSorted.length === 0 && (
                <Box sx={{ textAlign: "center", py: 4 }}>
                  <Typography variant="body1">No se encontraron notificaciones que coincidan.</Typography>
                </Box>
              )}
            </>
          )}
        </Box>

        <Divider />

        {/* Footer */}
        <Box sx={{ p: { xs: 1, sm: 2 }, display: "flex", justifyContent: "space-between", gap: 2, flexWrap: "wrap" }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Button size="small" onClick={() => { setOnlyUnreadToggle(false); setQuery(""); setPage(1); }} sx={{ textTransform: "none" }}>
              Reset
            </Button>
            <Button
              size="small"
              onClick={() => {
                // volver a la UI principal (si hace falta)
                navigate(-1);
              }}
              sx={{ textTransform: "none" }}
            >
              Volver
            </Button>
          </Stack>

          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Mostrando {visibleNotifications.length} / {filteredSorted.length} resultados
            </Typography>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}
