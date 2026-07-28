// Perfil.jsx
import React, { useRef, useState } from "react";
import { useParams } from "react-router-dom";
import QRCode from "react-qr-code";
import {
  Box,
  Typography,
  Button,
  Paper,
  IconButton,
  Tooltip,
  Snackbar,
  Alert,
} from "@mui/material";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import PrintIcon from "@mui/icons-material/Print";
import LoginIcon from "@mui/icons-material/Login";
import { useAuth0 } from "@auth0/auth0-react";

// Componente Perfil con QR bonito y acciones
export default function Perfil() {
  const { username } = useParams();
  const { user, isAuthenticated, loginWithRedirect, isLoading } = useAuth0();

  // url para el perfil: preferimos email si está autenticado, si no usamos username
  const perfilIdentificador = user?.email || username || "invitado";
  const url = `https://ciudadan.org/perfil/${encodeURIComponent(
    perfilIdentificador
  )}`;

  const svgRef = useRef(null);
  const [snack, setSnack] = useState({ open: false, msg: "", severity: "info" });

  const handleCloseSnack = () => setSnack((s) => ({ ...s, open: false }));

  // Copiar enlace al portapapeles
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setSnack({ open: true, msg: "Enlace copiado al portapapeles", severity: "success" });
    } catch (e) {
      setSnack({ open: true, msg: "No se pudo copiar el enlace", severity: "error" });
    }
  };

  // Imprimir (abre una ventana nueva con el QR)
  const handlePrint = () => {
    if (!svgRef.current) return;
    const svg = svgRef.current.innerHTML;
    const html = `
      <html>
        <head>
          <title>Imprimir QR</title>
        </head>
        <body style="display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
          ${svg}
        </body>
      </html>
    `;
    const w = window.open("", "_blank");
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 500);
  };

  // Descargar PNG desde SVG
  const handleDownloadPng = async () => {
    try {
      // obtener el SVG (serializar)
      const svgNode = svgRef.current?.querySelector("svg");
      if (!svgNode) throw new Error("SVG no encontrado");

      const serializer = new XMLSerializer();
      let source = serializer.serializeToString(svgNode);

      // añadir namespace si hace falta
      if (!source.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)) {
        source = source.replace(
          /^<svg/,
          '<svg xmlns="http://www.w3.org/2000/svg"'
        );
      }

      // crear blob y convertir a imagen para dibujar en canvas
      const svgBlob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
      const urlBlob = URL.createObjectURL(svgBlob);
      const img = new Image();
      img.onload = () => {
        // tamaño de salida (se puede ajustar)
        const canvas = document.createElement("canvas");
        const scale = 4; // para mayor resolución
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext("2d");
        // fondo blanco
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          const a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          a.download = `qr-perfil-${perfilIdentificador}.png`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(urlBlob);
          setSnack({ open: true, msg: "Descarga iniciada", severity: "success" });
        }, "image/png");
      };
      img.onerror = () => {
        URL.revokeObjectURL(urlBlob);
        setSnack({ open: true, msg: "Error al convertir SVG", severity: "error" });
      };
      img.src = urlBlob;
    } catch (err) {
      setSnack({ open: true, msg: "Error generando la imagen", severity: "error" });
    }
  };

  // Si está cargando Auth0
  if (isLoading) {
    return (
      <Box
        sx={{
          minHeight: "60vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Typography>Cargando perfil…</Typography>
      </Box>
    );
  }

  // Si no autenticado, invitación a loguearse pero mostrando ejemplo de QR (opcional)
  if (!isAuthenticated) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          p: 3,
          bgcolor: "linear-gradient(180deg, #fffde7 0%, #fff20033 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Paper
          elevation={6}
          sx={{
            p: 4,
            maxWidth: 920,
            width: "100%",
            borderRadius: 3,
            overflow: "hidden",
            position: "relative",
            background:
              "radial-gradient(circle at 10% 10%, rgba(255,242,0,0.12), transparent 10%), linear-gradient(90deg, rgba(255,242,0,0.08), rgba(109,110,113,0.02))",
          }}
        >
          <Box
            sx={{
              display: "flex",
              gap: 4,
              alignItems: "center",
              flexDirection: { xs: "column", md: "row" },
            }}
          >
            <Box
              sx={{
                flex: "0 0 260px",
                p: 2,
                borderRadius: 2,
                background: "white",
                boxShadow: 3,
                display: "inline-block",
                animation: "float 6s ease-in-out infinite",
              }}
              ref={svgRef}
            >
              <QRCode value={url} size={200} />
            </Box>

            <Box sx={{ flex: 1 }}>
              <Typography variant="h5" sx={{ fontWeight: 800, color: "#6d6e71" }}>
                Perfil público — vista previa
              </Typography>
              <Typography sx={{ mt: 1, color: "#444" }}>
                Para generar tu QR personal y acceder a funciones exclusivas inicia sesión.
              </Typography>

              <Box sx={{ mt: 3, display: "flex", gap: 2, flexWrap: "wrap" }}>
                <Button
                  variant="contained"
                  startIcon={<LoginIcon />}
                  onClick={() => loginWithRedirect()}
                  sx={{
                    background: "#fff200",
                    color: "#051322",
                    fontWeight: 700,
                    "&:hover": { filter: "brightness(0.95)" },
                  }}
                >
                  Iniciar sesión
                </Button>

                <Button
                  variant="outlined"
                  startIcon={<ContentCopyIcon />}
                  onClick={handleCopy}
                >
                  Copiar enlace
                </Button>

                <Button
                  variant="outlined"
                  startIcon={<FileDownloadIcon />}
                  onClick={handleDownloadPng}
                >
                  Descargar PNG
                </Button>
              </Box>

              <Typography sx={{ mt: 2, fontSize: 13, color: "text.secondary" }}>
                Enlace público:
                <Box component="span" sx={{ display: "block", mt: 0.5, wordBreak: "break-all" }}>
                  {url}
                </Box>
              </Typography>
            </Box>
          </Box>

          {/* Animación keyframes in-line */}
          <style>{`
            @keyframes float {
              0% { transform: translateY(0px); }
              50% { transform: translateY(-8px); }
              100% { transform: translateY(0px); }
            }
          `}</style>
        </Paper>

        <Snackbar
          open={snack.open}
          autoHideDuration={3000}
          onClose={handleCloseSnack}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        >
          <Alert onClose={handleCloseSnack} severity={snack.severity} sx={{ width: "100%" }}>
            {snack.msg}
          </Alert>
        </Snackbar>
      </Box>
    );
  }

  // Si está autenticado, mostrar QR y acciones
  return (
    <Box
      sx={{
        minHeight: "100vh",
        p: 3,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          "linear-gradient(180deg, rgba(255,242,0,0.06) 0%, rgba(255,242,0,0.03) 50%, transparent 100%)",
      }}
    >
      <Paper
        elevation={10}
        sx={{
          p: { xs: 3, md: 5 },
          maxWidth: 1000,
          width: "100%",
          borderRadius: 3,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <Box sx={{ display: "flex", gap: 4, flexDirection: { xs: "column", md: "row" } }}>
          <Box
            sx={{
              flex: "0 0 320px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              p: 2,
            }}
          >
            <Box
              ref={svgRef}
              sx={{
                p: 2,
                borderRadius: 2,
                background: "linear-gradient(180deg, #fff, #f7f7e6)",
                boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
                transform: "rotate(-1.5deg)",
              }}
            >
              <QRCode value={url} size={260} />
            </Box>
          </Box>

          <Box sx={{ flex: 1 }}>
            <Typography variant="h4" sx={{ fontWeight: 900, color: "#051322" }}>
              Tu código QR
            </Typography>

            <Typography sx={{ mt: 1, color: "#6d6e71" }}>
              {user?.name ? `Hola, ${user.name}` : `Usuario: ${perfilIdentificador}`}
            </Typography>

            <Typography sx={{ mt: 2, mb: 2 }}>
              Escanea este código para abrir tu perfil público en Ciudadan.org.
            </Typography>

            <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center" }}>
              <Tooltip title="Descargar PNG">
                <Button
                  variant="contained"
                  startIcon={<FileDownloadIcon />}
                  onClick={handleDownloadPng}
                  sx={{
                    background: "#fff200",
                    color: "#051322",
                    fontWeight: 800,
                    borderRadius: 2,
                    px: 3,
                    "&:hover": { filter: "brightness(0.95)" },
                  }}
                >
                  Descargar
                </Button>
              </Tooltip>

              <Tooltip title="Copiar enlace">
                <Button
                  variant="outlined"
                  startIcon={<ContentCopyIcon />}
                  onClick={handleCopy}
                >
                  Copiar enlace
                </Button>
              </Tooltip>

              <Tooltip title="Imprimir">
                <IconButton onClick={handlePrint} sx={{ border: "1px solid #eee" }}>
                  <PrintIcon />
                </IconButton>
              </Tooltip>
            </Box>

            <Paper
              elevation={0}
              sx={{
                mt: 3,
                p: 2,
                borderRadius: 2,
                background: "linear-gradient(90deg, rgba(109,110,113,0.04), rgba(255,242,0,0.03))",
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#6d6e71" }}>
                Indicaciones rápidas
              </Typography>
              <ol style={{ marginTop: 8, paddingLeft: 18, color: "#444" }}>
                <li>Escanea el QR con la cámara de tu móvil para abrir tu perfil público.</li>
                <li>Comparte el enlace o descarga el PNG para imprimirlo en tarjetas o posters.</li>
                <li>Si vas a imprimir, recomiendo descargar en PNG para mejor resultado.</li>
              </ol>
            </Paper>

            <Typography sx={{ mt: 2, fontSize: 13, color: "text.secondary", wordBreak: "break-all" }}>
              Enlace de perfil:
              <Box component="span" sx={{ display: "block", mt: 0.5 }}>
                {url}
              </Box>
            </Typography>
          </Box>
        </Box>

        <Snackbar
          open={snack.open}
          autoHideDuration={3000}
          onClose={handleCloseSnack}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        >
          <Alert onClose={handleCloseSnack} severity={snack.severity} sx={{ width: "100%" }}>
            {snack.msg}
          </Alert>
        </Snackbar>
      </Paper>
    </Box>
  );
}
