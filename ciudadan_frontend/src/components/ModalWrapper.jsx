// ModalWrapper.jsx
import React, { useRef, useState, useCallback, useEffect } from "react";
import { Modal, Box, Typography, IconButton, Divider } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

export default function ModalWrapper({
  open,
  onClose,
  title,
  width = { xs: "94%", sm: 760, md: 1000 },
  children,
  actions = null,
}) {
  const contentRef = useRef(null);
  const [isAtBottom, setIsAtBottom] = useState(false);

  const containerStyle = {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width,
    bgcolor: "transparent",
    outline: "none",
    maxHeight: "90vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    p: 2,
  };

  const modalCard = {
    width: "100%",
    bgcolor: "background.paper",
    boxShadow: 24,
    borderRadius: 2,
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    maxHeight: "80vh",
  };

  const headerBar = {
    background: "linear-gradient(90deg, #7b2cff 0%, #b300ff 50%, #7b2cff 100%)",
    color: "#fff",
    px: 3,
    py: 1.25,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 8,
  };

  const contentBox = {
    p: 3,
    overflowY: "auto",
    flex: "1 1 auto",
    position: "relative",
  };

  const stickyDividerBox = {
    position: "sticky",
    bottom: 0,
    left: 0,
    right: 0,
    display: "flex",
    justifyContent: "center",
    pointerEvents: "none",
  };

  const handleScroll = useCallback(() => {
    const el = contentRef.current;
    if (!el) return;
    const threshold = 12;
    const isBottomNow = el.scrollHeight - el.scrollTop - el.clientHeight <= threshold;
    setIsAtBottom(isBottomNow);
  }, []);

  useEffect(() => {
    if (!open) return;
    const el = contentRef.current;
    const t = setTimeout(() => handleScroll(), 100);
    window.addEventListener("resize", handleScroll);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", handleScroll);
    };
  }, [open, handleScroll]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      aria-labelledby="modal-title"
      BackdropProps={{ sx: { backgroundColor: "rgba(0,0,0,0.45)" } }}
    >
      <Box sx={containerStyle}>
        <Box sx={modalCard}>
          {/* Barra superior */}
          <Box sx={headerBar}>
            <Typography id="modal-title" variant="h6" component="h2" sx={{ fontWeight: 700 }}>
              {title}
            </Typography>

            <IconButton
              onClick={onClose}
              size="small"
              aria-label="cerrar"
              sx={{
                color: "rgba(255,255,255,0.95)",
                bgcolor: "rgba(255,255,255,0.08)",
                "&:hover": { bgcolor: "rgba(255,255,255,0.12)" },
              }}
            >
              <CloseIcon />
            </IconButton>
          </Box>

          {/* Contenido scrollable */}
          <Box
            sx={contentBox}
            onScroll={handleScroll}
            ref={contentRef}
            tabIndex={-1}
            role="region"
            aria-label={title}
          >
            {children}

            {/* Divider + acciones (sin espacio extra abajo) */}
            {actions && (
              <>
                <Divider sx={{ my: 2, borderColor: "rgba(0,0,0,0.1)" }} />
                <Box sx={{ display: "flex", justifyContent: "center", pb: 1 }}>
                  {actions}
                </Box>
              </>
            )}

            {/* Barra de brillo inferior al llegar al fondo */}
            <Box sx={stickyDividerBox} aria-hidden>
              <Divider
                sx={{
                  width: "64%",
                  height: 4,
                  borderRadius: 2,
                  bgcolor: "#7b2cff",
                  opacity: isAtBottom ? 1 : 0,
                  transform: isAtBottom ? "scaleX(1)" : "scaleX(0.98)",
                  transition: "opacity 220ms ease, transform 220ms ease",
                }}
              />
            </Box>
          </Box>
        </Box>
      </Box>
    </Modal>
  );
}
