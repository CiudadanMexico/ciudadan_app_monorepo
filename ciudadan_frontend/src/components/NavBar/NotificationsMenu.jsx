// src/components/Notifications/NotificationsMenu.jsx
import React, { useEffect, useRef, useState, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Box,
  Paper,
  List,
  ListItemButton,
  ListItemAvatar,
  Avatar,
  ListItemText,
  Typography,
  Divider,
  Button,
  IconButton,
  Stack,
  Badge,
  CircularProgress,
} from "@mui/material";
import MarkEmailReadIcon from "@mui/icons-material/MarkEmailRead";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import CloseIcon from "@mui/icons-material/Close";
import NotificationsOffIcon from "@mui/icons-material/NotificationsOff";
import { useNotifications } from "../../Contexts/NotificationsContext";
import notificationIcon from "../../assets/notification.png";
import "../../styles/NotificationsMenu.css";

const MAIN_DOMAIN = (process.env.REACT_APP_MAIN_DOMAIN || "").replace(/\/$/, "");

const NotificationsMenu = ({ handleLogout, isOpen, onClose, containerRef, onOpen }) => {
  const navigate = useNavigate();
  const menuRef = useRef(null);
  const portalRef = useRef(null);

  // portal node
  useEffect(() => {
    const node = document.createElement("div");
    document.body.appendChild(node);
    portalRef.current = node;
    return () => {
      if (portalRef.current) {
        document.body.removeChild(portalRef.current);
        portalRef.current = null;
      }
    };
  }, []);

  // Context
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

  // position state for the panel
  const [pos, setPos] = useState({ left: null, top: 80, width: 360, origin: "top right" });

  // controlar si mostramos también las leídas (por defecto false -> solo no leídas)
  const [showRead, setShowRead] = useState(false);

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

  // calculate and set position relative to containerRef
  const computePosition = () => {
    const viewportW = window.innerWidth;
    const panelWidth = Math.min(360, Math.round(Math.min(420, viewportW * 0.9)));
    let left = viewportW - panelWidth - 16; // default right aligned (16px padding)
    let top = 72; // fallback top

    // if we have the icon ref, compute accurate coords
    try {
      const el = containerRef?.current;
      if (el && typeof el.getBoundingClientRect === "function") {
        const rect = el.getBoundingClientRect();
        const preferredLeft = rect.right - panelWidth; // align right edge to icon right edge
        const maxLeft = Math.max(8, Math.min(preferredLeft, viewportW - panelWidth - 8));
        left = maxLeft;

        // try to position below icon, unless there's no space -> then above
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        const estimatedPanelHeight = menuRef?.current?.offsetHeight || Math.round(window.innerHeight * 0.45);

        if (spaceBelow > Math.min(estimatedPanelHeight + 16, window.innerHeight * 0.6)) {
          top = rect.bottom + 8;
        } else if (spaceAbove > Math.min(estimatedPanelHeight + 16, window.innerHeight * 0.6)) {
          top = rect.top - Math.min(estimatedPanelHeight, spaceAbove) - 8;
        } else {
          // center vertically in viewport as fallback
          top = Math.max(12, Math.round((window.innerHeight - Math.min(estimatedPanelHeight, window.innerHeight * 0.6)) / 2));
        }

        // MOBILE: if narrow screen, center horizontally and use full-ish width
        if (viewportW <= 768) {
          const mobileW = Math.round(viewportW * 0.94);
          left = Math.round((viewportW - mobileW) / 2);
          // ensure top is just below header if possible
          top = Math.max(12, rect.bottom + 8);
        }
      } else {
        // no containerRef: default top-right
        left = Math.max(8, viewportW - panelWidth - 16);
        top = 72;
      }
    } catch (e) {
      // fallback safe values
      left = Math.max(8, (window.innerWidth - panelWidth) - 16);
      top = 72;
    }

    setPos({ left, top, width: panelWidth, origin: "top right" });
  };

  // measure on open and whenever window resizes / scrolls
  useLayoutEffect(() => {
    if (!isOpen) return;
    computePosition();

    const onResize = () => computePosition();
    const onScroll = () => computePosition();

    window.addEventListener("resize", onResize, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });

    // also reposition after the menu renders, in case height unknown
    const t = setTimeout(() => computePosition(), 80);

    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, containerRef, notificaciones.length, showRead]);

  // open effect: refresh on open
  const prevOpenRef = useRef(false);
  useEffect(() => {
    if (!prevOpenRef.current && isOpen) {
      if (typeof refreshFn === "function") refreshFn().catch(() => {});
      // small delay to allow focus
      setTimeout(() => {
        if (menuRef.current) {
          const btn = menuRef.current.querySelector("button");
          if (btn) btn.focus();
        }
      }, 120);
    }
    prevOpenRef.current = isOpen;
  }, [isOpen, refreshFn]);

  // helpers for link & reading
  const buildLink = (rawLink) => {
    if (!rawLink) return null;
    if (/^https?:\/\//i.test(rawLink)) return rawLink;
    const r = rawLink.startsWith("/") ? rawLink : `/${rawLink}`;
    return MAIN_DOMAIN ? `${MAIN_DOMAIN}${r}` : r;
  };

  const handleClickNotification = (notif) => {
    if (!notif) return;
    const id = notif.id;
    const attrs = notif?.attributes ?? notif;
    const isRead = attrs?.leida === true || attrs?.read === true || attrs?.leida === "true";
    const rawLink = attrs?.link ?? attrs?.url ?? attrs?.href ?? null;
    const finalLink = buildLink(rawLink);

    if (!isRead && typeof markAsReadFn === "function") {
      // fire-and-forget
      markAsReadFn(id).catch((e) => console.error("markAsRead error:", e));
    }

    if (finalLink) {
      if (/^https?:\/\//i.test(finalLink)) {
        window.location.href = finalLink;
      } else {
        navigate(finalLink);
      }
    } else {
      // 👇 fallback elegante: detalle de notificación
      navigate(`/notificacion/${id}`);
    }

    if (typeof onClose === "function") onClose();

    };

  // mark all
  const handleMarkAll = async () => {
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
      } catch (e) {
        console.error("markAll error", e);
      }
    } else if (typeof refreshFn === "function") {
      await refreshFn();
    }
  };

  // NUEVO: lista filtrada según showRead
  const filteredNotifications = (Array.isArray(notificaciones) ? notificaciones : []).filter((n) => {
    if (showRead) return true;
    const a = n?.attributes ?? n;
    return !(a?.leida === true || a?.read === true || a?.leida === "true");
  });

  // Mostrar TODAS las notificaciones filtradas (sin cortar a 5)
  const previewNotifications = filteredNotifications;

  // render panel JSX
  const panel = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -6, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.98 }}
          transition={{ duration: 0.22 }}
          style={{
            position: "fixed",
            left: pos.left ?? "auto",
            top: pos.top ?? 72,
            width: pos.width,
            zIndex: 1600,
            transformOrigin: pos.origin,
          }}
        >
          <Paper
            ref={menuRef}
            elevation={8}
            sx={{
              borderRadius: 2,
              bgcolor: "rgba(6,28,14,0.98)",
              color: "rgba(230,255,230,1)",
              boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
              border: "1px solid rgba(0,255,128,0.06)",
              overflow: "hidden",
            }}
          >
            {/* header */}
            <Box px={2} py={1} display="flex" alignItems="center" justifyContent="space-between" gap={1}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Badge
                  color="primary"
                  badgeContent={(Array.isArray(notificaciones) ? notificaciones : []).filter((n) => {
                    const a = n?.attributes ?? n;
                    return !(a?.leida === true || a?.read === true || a?.leida === "true");
                  }).length}
                >
                  <Avatar src={notificationIcon} alt="notifs" sx={{ width: 36, height: 36 }} />
                </Badge>
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "#bfffd0" }}>
                    Notificaciones
                  </Typography>
                </Box>
              </Stack>

              <Stack direction="row" spacing={0.5} alignItems="center">
                {/* NUEVO: Toggle mostrar leídas (DoneAllIcon) */}
                <IconButton
                  size="small"
                  onClick={() => {
                    setShowRead((s) => !s);
                    // no cerramos ni navegamos
                  }}
                  sx={{ color: showRead ? "#7ee0a3" : "#bfffd0" }}
                  title={showRead ? "Ocultar leídas" : "Mostrar leídas"}
                >
                  <DoneAllIcon fontSize="small" />
                </IconButton>

                {/* Mantener función 'marcar todas como leídas' (nuevo icono) */}
                <IconButton
                  size="small"
                  onClick={handleMarkAll}
                  sx={{ color: "#bfffd0" }}
                  title="Marcar todas como leídas"
                >
                  <MarkEmailReadIcon fontSize="small" />
                </IconButton>

                <IconButton size="small" onClick={() => (typeof onClose === "function" ? onClose() : null)} sx={{ color: "#bfffd0" }}>
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Stack>
            </Box>

            <Divider sx={{ borderColor: "rgba(255,255,255,0.04)" }} />

            {/* list */}
            <Box
              sx={{
                maxHeight: { xs: "60vh", sm: "55vh" },
                overflowY: "auto",
                overflowX: "hidden",
              }}
            >

              <List disablePadding>
                {loading ? (
                  <ListItemButton>
                    <ListItemText primary={<Typography> Cargando notificaciones... </Typography>} />
                    <CircularProgress size={18} />
                  </ListItemButton>
                ) : (!Array.isArray(notificaciones) || notificaciones.length === 0) ? (
                  <Box p={3} textAlign="center">
                    <NotificationsOffIcon sx={{ fontSize: 40, color: "text.secondary", mb: 1 }} />
                    <Typography variant="body2" color="text.secondary">Ninguna notificación</Typography>
                  </Box>
                ) : (
                  // ahora mostramos todas las notificaciones filtradas (no solo 5)
                  previewNotifications.map((notif) => {
                    const id = notif.id;
                    const attrs = notif.attributes ?? notif;
                    const isRead = attrs?.leida === true || attrs?.read === true || attrs?.leida === "true";
                    const rawLink = attrs?.link ?? attrs?.url ?? attrs?.href ?? null;
                    const title =
                      attrs?.titulo ||
                      attrs?.title ||
                      (typeof attrs?.mensaje === "string" ? attrs.mensaje.slice(0, 120) : null) ||
                      extractPlainText(attrs?.cuerpo) ||
                      "Notificación";
                    const dateText = attrs?.timestamp
                      ? new Date(attrs.timestamp).toLocaleString()
                      : new Date(attrs.createdAt ?? attrs.created_at ?? Date.now()).toLocaleString();

                    return (
                      <React.Fragment key={id}>
                        <ListItemButton
                          onClick={() => handleClickNotification(notif)}
                          sx={{
                            alignItems: "flex-start",
                            py: 1.25,
                            px: 1.5,
                            bgcolor: isRead ? "transparent" : "rgba(0,255,128,0.03)",
                            "&:hover": { bgcolor: isRead ? "rgba(255,255,255,0.02)" : "rgba(0,255,128,0.06)" },
                          }}
                        >
                          <ListItemAvatar>
                            <Avatar src={notificationIcon} alt="notf" />
                          </ListItemAvatar>

                          <ListItemText
                            primary={
                              <Box display="flex" justifyContent="space-between" gap={1}>
                                <Typography
                                  variant="body2"
                                  sx={{
                                    fontWeight: isRead ? 500 : 700,
                                    color: "#e6ffe6",
                                    wordBreak: "break-word",
                                    overflowWrap: "anywhere",
                                  }}
                                >

                                  {title}
                                </Typography>
                                <Typography
                                  variant="body2"
                                  sx={{
                                    fontWeight: isRead ? 500 : 700,
                                    color: "#e6ffe6",
                                    wordBreak: "break-word",
                                    overflowWrap: "anywhere",
                                  }}
                                >

                                  {dateText}
                                </Typography>
                              </Box>
                            }
                            secondary={attrs?.mensaje && (
                              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                {extractPlainText(attrs?.mensaje || attrs?.cuerpo).slice(0, 220)}
                              </Typography>
                            )}
                          />

                          {rawLink && (
                            <IconButton
                              edge="end"
                              size="small"
                              aria-label="abrir"
                              onClick={(e) => {
                                e.stopPropagation();
                                const final = buildLink(rawLink);
                                if (final) {
                                  if (/^https?:\/\//i.test(final)) {
                                    window.location.href = final;
                                  } else {
                                    navigate(final);
                                  }
                                } else {
                                  navigate(`/notificacion/${id}`);
                                }

                                if (typeof onClose === "function") onClose();
                              }}
                              sx={{ color: "#bfffd0" }}
                            >
                              <OpenInNewIcon fontSize="small" />
                            </IconButton>
                          )}
                        </ListItemButton>

                        <Divider component="li" sx={{ borderColor: "rgba(255,255,255,0.04)" }} />
                      </React.Fragment>
                    );
                  })
                )}
              </List>
            </Box>

            <Divider sx={{ borderColor: "rgba(255,255,255,0.04)" }} />

            <Box px={2} py={1} display="flex" justifyContent="space-between" alignItems="center">
              <Button
                size="small"
                onClick={() => {
                  // ahora Ver todas navega a /notificaciones (página completa)
                  navigate('/notificaciones');
                }}
                sx={{ color: "#bfffd0" }}
              >
                Ver todas
              </Button>

              <Button size="small" onClick={handleMarkAll} startIcon={<DoneAllIcon />} sx={{ color: "#bfffd0" }}>
                Marcar todas como leídas
              </Button>
            </Box>
          </Paper>
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (!portalRef.current) return null;
  return createPortal(panel, portalRef.current);
};

export default NotificationsMenu;
