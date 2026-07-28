// src/components/Notifications/AllNotificaciones.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";
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

const extractPlainText = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    return value
      .map((block) => block?.children?.map((child) => child?.text || "").join(""))
      .join(" ");
  }
  if (typeof value === "object" && value.children) {
    return value.children.map((child) => child?.text || "").join("");
  }
  return "";
};

const buildLink = (rawLink) => {
  if (!rawLink) return null;
  if (/^https?:\/\//i.test(rawLink)) return rawLink;
  const r = rawLink.startsWith("/") ? rawLink : `/${rawLink}`;
  return MAIN_DOMAIN ? `${MAIN_DOMAIN}${r}` : r;
};

export default function AllNotificaciones() {
  const navigate = useNavigate();
  const ctx = useNotifications() || {};
  const notificaciones = ctx.notificaciones ?? ctx.notifications ?? [];
  const loading = ctx.loading ?? false;
  const refreshFn =
    ctx.refreshNotificaciones ??
    ctx.refreshNotifications ??
    ctx.fetchNotifications ??
    ctx.fetchNotificaciones ??
    ctx.refresh;
  const markAsReadFn = ctx.markAsRead ?? ctx.markRead ?? null;
  const markAsUnreadFn = ctx.markAsUnread ?? ctx.markAsUnread ?? ctx.markAsUnread ?? null;

  // UI state
  const [query, setQuery] = useState("");
  const [onlyUnreadToggle, setOnlyUnreadToggle] = useState(false);
  const [sortBy, setSortBy] = useState("newest"); // 'newest' | 'oldest'
  const [pageSize, setPageSize] = useState(MAX_PAGE_SIZE);
  const [page, setPage] = useState(1);

  // optimistic local read overrides (id => boolean)
  const [localReadMap, setLocalReadMap] = useState({});
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // sync localReadMap when notifications list changes (preserve manual toggles)
  useEffect(() => {
    const map = {};
    (Array.isArray(notificaciones) ? notificaciones : []).forEach((n) => {
      const a = n?.attributes ?? n;
      const isRead = a?.leida === true || a?.read === true || a?.leida === "true";
      map[n.id] = isRead;
    });
    // merge with existing local overrides but prefer server values for new ids
    setLocalReadMap((prev) => ({ ...map, ...prev }));
    // reset paging when data changes
    setPage(1);
  }, [JSON.stringify(notificaciones)]); // stringify to detect changes in deep arrays

  // derived & filtered list
  const filteredSorted = useMemo(() => {
    const list = Array.isArray(notificaciones) ? [...notificaciones] : [];

    // filter by query
    const q = (query || "").trim().toLowerCase();
    const filteredByQuery = q
      ? list.filter((n) => {
          const a = n?.attributes ?? n;
          const title = (a?.titulo || a?.title || "").toString().toLowerCase() || "";
          const mensaje = extractPlainText(a?.mensaje || a?.cuerpo || "").toLowerCase();
          return title.includes(q) || mensaje.includes(q);
        })
      : list;

    // apply unread filter
    const filteredByUnread = onlyUnreadToggle
      ? filteredByQuery.filter((n) => {
          const read = localReadMap[n.id];
          const a = n?.attributes ?? n;
          const serverRead = a?.leida === true || a?.read === true || a?.leida === "true";
          // prefer local override if present (boolean), otherwise serverRead
          const isRead = typeof read === "boolean" ? read : serverRead;
          return !isRead;
        })
      : filteredByQuery;

    // sort
    filteredByUnread.sort((a, b) => {
      const at = a?.attributes ?? a;
      const bt = b?.attributes ?? b;
      const aDate = new Date(at?.timestamp ?? at?.createdAt ?? at?.created_at ?? 0).getTime();
      const bDate = new Date(bt?.timestamp ?? bt?.createdAt ?? bt?.created_at ?? 0).getTime();
      return sortBy === "newest" ? bDate - aDate : aDate - bDate;
    });

    return filteredByUnread;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notificaciones, query, onlyUnreadToggle, sortBy, localReadMap]);

  const totalCount = (Array.isArray(notificaciones) ? notificaciones : []).length;
  const unreadCount = (Array.isArray(notificaciones) ? notificaciones : []).filter((n) => {
    const a = n?.attributes ?? n;
    return !(a?.leida === true || a?.read === true || a?.leida === "true");
  }).length;

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
    const unreadIds = (Array.isArray(notificaciones) ? notificaciones : [])
      .filter((n) => {
        const a = n?.attributes ?? n;
        return !(a?.leida === true || a?.read === true || a?.leida === "true");
      })
      .map((n) => n.id);

    if (unreadIds.length === 0) return;
    if (typeof markAsReadFn === "function") {
      try {
        await markAsReadFn(unreadIds);
        // optimistic update
        setLocalReadMap((prev) => {
          const copy = { ...prev };
          unreadIds.forEach((id) => (copy[id] = true));
          return copy;
        });
      } catch (e) {
        console.error("mark all read error", e);
      }
    } else if (typeof refreshFn === "function") {
      await refreshFn();
    }
  };

  const handleToggleRead = async (notifId) => {
    const current = !!localReadMap[notifId];
    // if we have an "unread" function and want to unmark, use it
    if (current && typeof markAsUnreadFn === "function") {
      try {
        await markAsUnreadFn(notifId);
        if (!mountedRef.current) return;
        setLocalReadMap((p) => ({ ...p, [notifId]: false }));
        return;
      } catch (e) {
        console.error("mark as unread error", e);
      }
    }

    // otherwise, mark as read
    if (!current && typeof markAsReadFn === "function") {
      try {
        await markAsReadFn(notifId);
        if (!mountedRef.current) return;
        setLocalReadMap((p) => ({ ...p, [notifId]: true }));
        return;
      } catch (e) {
        console.error("mark as read error", e);
      }
    }

    // fallback: optimistic toggle locally (if no server functions)
    setLocalReadMap((p) => ({ ...p, [notifId]: !current }));
  };

  const handleOpenNotification = async (notif) => {
    const id = notif.id;
    const attrs = notif?.attributes ?? notif;
    const isRead = localReadMap[id] ?? (attrs?.leida === true || attrs?.read === true || attrs?.leida === "true");

    // mark as read if unread
    if (!isRead && typeof markAsReadFn === "function") {
      try {
        await markAsReadFn(id);
        if (mountedRef.current) setLocalReadMap((p) => ({ ...p, [id]: true }));
      } catch (e) {
        console.error("markAsRead error", e);
      }
    } else {
      // optimistic
      if (!isRead) setLocalReadMap((p) => ({ ...p, [id]: true }));
    }

    // navigate / open link
    const rawLink = attrs?.link ?? attrs?.url ?? attrs?.href ?? null;
    const finalLink = buildLink(rawLink);
    if (finalLink) {
      if (/^https?:\/\//i.test(finalLink)) {
        window.location.href = finalLink;
      } else {
        navigate(finalLink);
      }
    } else {
      // fallback to detail page if no direct link
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
          ) : (!Array.isArray(notificaciones) || notificaciones.length === 0) ? (
            <Box sx={{ textAlign: "center", py: 6 }}>
              <NotificationsOffIcon sx={{ fontSize: 48, color: "text.secondary", mb: 1 }} />
              <Typography color="text.secondary">No hay notificaciones</Typography>
            </Box>
          ) : (
            <>
              <List disablePadding>
                {visibleNotifications.map((notif) => {
                  const id = notif.id;
                  const attrs = notif.attributes ?? notif;
                  const serverRead = attrs?.leida === true || attrs?.read === true || attrs?.leida === "true";
                  const isRead = typeof localReadMap[id] === "boolean" ? localReadMap[id] : serverRead;
                  const title =
                    attrs?.titulo ||
                    attrs?.title ||
                    (typeof attrs?.mensaje === "string" ? attrs.mensaje.slice(0, 140) : null) ||
                    extractPlainText(attrs?.cuerpo) ||
                    "Notificación";
                  const snippet = extractPlainText(attrs?.mensaje || attrs?.cuerpo).slice(0, 280);
                  const dateText = attrs?.timestamp
                    ? new Date(attrs.timestamp).toLocaleString()
                    : new Date(attrs.createdAt ?? attrs.created_at ?? Date.now()).toLocaleString();

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
                                <IconButton edge="end" onClick={() => handleToggleRead(id)} size="small">
                                  {isRead ? <MailOutlineIcon /> : <MarkEmailReadIcon />}
                                </IconButton>
                              </Tooltip>
                              { (attrs?.link || attrs?.url || attrs?.href) && (
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
