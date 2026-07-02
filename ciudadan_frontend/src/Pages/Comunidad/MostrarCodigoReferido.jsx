// src/components/GenerarCodigoReferido/MostrarCodigoReferido.jsx
import React, { useRef, useMemo } from "react";
import {
  Box,
  Paper,
  Typography,
  Button,
  Stack,
  IconButton,
  Divider,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import LinkIcon from "@mui/icons-material/Link";
import QrCodeIcon from "@mui/icons-material/QrCode";
import GetAppIcon from "@mui/icons-material/GetApp";
import DownloadIcon from "@mui/icons-material/Download";
import CloseIcon from "@mui/icons-material/Close";
import QRCode from "react-qr-code";

/**
 * MostrarCodigoReferido
 * Props:
 *  - codigo: objeto Strapi (json.data element) o string "prefijo-sufijo"
 *  - onClose: opcional
 *
 * Renderiza:
 *  - Código prefijo-sufijo con copiar
 *  - Link público https://ciudadan.org/referido/:codigo con copiar y abrir
 *  - QR del link + botones descargar (svg/png) y copiar
 */

export default function MostrarCodigoReferido({ codigo, onClose }) {
  const qrWrapRef = useRef(null);

  const buildString = (c) => {
    if (!c) return "";
    if (typeof c === "string") return c;
    // Strapi v4 -> object with attributes
    const attrs = c.attributes ?? c;
    if (attrs.prefijo || attrs.sufijo) {
      // sanitize: eliminar espacios inesperados
      const p = (attrs.prefijo ?? "").toString().trim();
      const s = (attrs.sufijo ?? "").toString().trim();
      return `${p}${s ? "-" + s : ""}`;
    }
    if (c.prefijo && c.sufijo) return `${c.prefijo}-${c.sufijo}`;
    return JSON.stringify(c);
  };

  const codigoTexto = useMemo(() => buildString(codigo), [codigo]);

  // Link público
  const publico = `https://ciudadan.org/referido/${encodeURIComponent(codigoTexto)}`;

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      alert("Copiado: " + text);
    } catch (err) {
      console.error(err);
      alert("No se pudo copiar automáticamente. Selecciona y copia manualmente.");
    }
  };

  const downloadSVG = () => {
    try {
      const svgEl = qrWrapRef.current?.querySelector("svg");
      if (!svgEl) {
        alert("QR no disponible para descargar.");
        return;
      }
      const svgData = new XMLSerializer().serializeToString(svgEl);
      const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${codigoTexto}.svg`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("Error descargando SVG.");
    }
  };

  const downloadPNG = () => {
    try {
      const svgEl = qrWrapRef.current?.querySelector("svg");
      if (!svgEl) {
        alert("QR no disponible para descargar.");
        return;
      }
      const svgData = new XMLSerializer().serializeToString(svgEl);
      const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(svgBlob);
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        // escalar para mayor resolución (2x)
        const scale = 2;
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        canvas.toBlob((blob) => {
          if (!blob) {
            alert("No se pudo generar PNG.");
            return;
          }
          const a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          a.download = `${codigoTexto}.png`;
          a.click();
          URL.revokeObjectURL(a.href);
        }, "image/png");
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        alert("Error generando imagen para PNG.");
      };
      // Important: use blob URL to avoid tainting canvas with external resources
      img.src = url;
    } catch (err) {
      console.error(err);
      alert("Error descargando PNG.");
    }
  };

  const openLink = () => {
    window.open(publico, "_blank", "noopener");
  };

  return (
    <Paper sx={{ p: 2, borderRadius: 2, maxWidth: 720 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>
          Tu código referido
        </Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          {onClose ? (
            <IconButton size="small" onClick={onClose}>
              <CloseIcon />
            </IconButton>
          ) : null}
        </Stack>
      </Box>

      <Divider sx={{ mb: 2 }} />

      {/* Seccion 1: código + copiar */}
      <Box mb={2}>
        <Typography sx={{ fontSize: 13, color: "text.secondary" }}>Código</Typography>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems="center" mt={1}>
          <Box
            sx={{
              px: 2,
              py: 1,
              borderRadius: 1,
              bgcolor: "background.paper",
              boxShadow: "0 4px 14px rgba(0,0,0,0.06)",
              fontWeight: 800,
              letterSpacing: 0.6,
            }}
          >
            {codigoTexto || "(sin código)"}
          </Box>

          <Button
            startIcon={<ContentCopyIcon />}
            onClick={() => copyToClipboard(codigoTexto)}
            variant="outlined"
            size="small"
          >
            Copiar código
          </Button>
        </Stack>
      </Box>

      {/* Seccion 2: link público */}
      <Box mb={2}>
        <Typography sx={{ fontSize: 13, color: "text.secondary" }}>Link público</Typography>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems="center" mt={1}>
          <Box
            sx={{
              px: 2,
              py: 1,
              borderRadius: 1,
              bgcolor: "rgba(0,0,0,0.04)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              maxWidth: 420,
            }}
            title={publico}
          >
            <a href={publico} target="_blank" rel="noreferrer" style={{ color: "inherit", textDecoration: "none" }}>
              {publico}
            </a>
          </Box>

          <Button startIcon={<LinkIcon />} onClick={() => copyToClipboard(publico)} variant="outlined" size="small">
            Copiar link
          </Button>

          <Button startIcon={<QrCodeIcon />} onClick={openLink} variant="contained" size="small">
            Abrir link
          </Button>
        </Stack>
      </Box>

      {/* Seccion 3: QR + descargar */}
      <Box>
        <Typography sx={{ fontSize: 13, color: "text.secondary" }}>QR</Typography>
        <Box display="flex" gap={2} alignItems="center" mt={1} flexWrap="wrap">
          <Box
            ref={qrWrapRef}
            sx={{
              p: 1,
              borderRadius: 2,
              bgcolor: "#fff",
              display: "inline-block",
              boxShadow: "0 6px 20px rgba(0,0,0,0.08)",
            }}
          >
            {/* react-qr-code genera un <svg> */}
            <QRCode value={publico} size={128} level="M" />
          </Box>

          <Stack direction="row" spacing={1}>
            <Button
              startIcon={<ContentCopyIcon />}
              onClick={() => copyToClipboard(publico)}
              variant="outlined"
              size="small"
            >
              Copiar link
            </Button>

            <Button startIcon={<DownloadIcon />} onClick={downloadSVG} variant="outlined" size="small">
              Descargar SVG
            </Button>

            <Button startIcon={<GetAppIcon />} onClick={downloadPNG} variant="contained" size="small">
              Descargar PNG
            </Button>
          </Stack>
        </Box>
      </Box>
    </Paper>
  );
}
