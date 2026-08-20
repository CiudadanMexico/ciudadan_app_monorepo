// Perfil.jsx
import React, { useEffect, useRef, useState, useCallback } from "react";
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
  CircularProgress,
  Stack,
  Chip,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  TextField,
  Divider,
} from "@mui/material";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import PrintIcon from "@mui/icons-material/Print";
import LoginIcon from "@mui/icons-material/Login";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import SendIcon from "@mui/icons-material/Send";
import { useAuth0 } from "@auth0/auth0-react";
import { useRoles } from "../../Contexts/RolesContext";
import {
  assignUserAreas,
  proposeSubarea,
  subirDocumentoArea,
  listProposedSubareas,
} from "../../services/cowork/mutationsServices";
import { getSubareasDeArea } from "../../services/cowork/queryServices";
import { getActiveRootAreas } from "../../utils/cowork.helpers";

const STRAPI_URL = process.env.REACT_APP_STRAPI_URL || "http://localhost:33032";

// Componente Perfil con QR bonito y acciones
export default function Perfil() {
  const { username } = useParams();
  const { user, isAuthenticated, loginWithRedirect, isLoading, getAccessTokenSilently } = useAuth0();
  const { userData, fetchRolesYMembresia } = useRoles();

  // url para el perfil: preferimos email si está autenticado, si no usamos username
  const perfilIdentificador = user?.email || username || "invitado";
  const url = `https://ciudadan.org/perfil/${encodeURIComponent(
    perfilIdentificador
  )}`;

  const svgRef = useRef(null);
  const [snack, setSnack] = useState({ open: false, msg: "", severity: "info" });

  // ------------------ Mis áreas y verificación (Fix 5.3 + 3.4) ------------------
  // Captura: área asignada + propuesta de subárea (carrera/oficio) + subida
  // de documentación. Badge de estado de verificación visible para el dueño.
  const [rootAreas, setRootAreas] = useState([]);
  const [loadingCatalogo, setLoadingCatalogo] = useState(false);
  const [selectedAreaId, setSelectedAreaId] = useState("");
  const [proposeAreaId, setProposeAreaId] = useState("");
  const [proposeNombre, setProposeNombre] = useState("");
  const [propuestaObs, setPropuestaObs] = useState("");
  const [docs, setDocs] = useState([]);
  const [docAreaId, setDocAreaId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submittingPropuesta, setSubmittingPropuesta] = useState(false);
  const [docUploading, setDocUploading] = useState(false);
  // Subáreas EXISTENTES bajo el área raíz elegida — "elegirla de la lista"
  // (spec 5.3), en vez de siempre tener que proponer/escribir una nueva.
  const [existingSubareas, setExistingSubareas] = useState([]);
  const [loadingSubareas, setLoadingSubareas] = useState(false);
  const [selectedSubareaId, setSelectedSubareaId] = useState("");
  const [submittingSubarea, setSubmittingSubarea] = useState(false);
  // Mis propuestas de subárea ya enviadas, con su estado (antes no se
  // mostraba ningún feedback: el usuario proponía y nunca sabía qué pasó).
  const [misPropuestas, setMisPropuestas] = useState([]);

  // Cargar catálogo de áreas raíz activas desde el backend (al montar + auth)
  const fetchCatalogo = useCallback(async () => {
    setLoadingCatalogo(true);
    try {
      let token = null;
      try {
        token = await getAccessTokenSilently({
          authorizationParams: { audience: "https://api.ciudadan.org" },
        });
      } catch { /* offline OK, catálogo raíz suele ser público */ }
      const res = await fetch(`${STRAPI_URL}/api/areas?filters[level][$eq]=0&filters[is_active][$eq]=true&pagination[pageSize]=50`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error(`Error catálogo áreas (${res.status})`);
      const json = await res.json();
      const items = Array.isArray(json.data) ? json.data : [];
      const parsed = items.map((it) => {
        const a = it.attributes || it;
        return { id: it.id, name: a.name || a.nombre || "—" };
      });
      setRootAreas(parsed);
    } catch (err) {
      // fallback: usar las áreas del propio userData si el fetch falla.
      const local = getActiveRootAreas(userData?.areas || []);
      setRootAreas(local.map((a) => ({ id: a.id, name: a.name || a.nombre || "—" })));
    } finally {
      setLoadingCatalogo(false);
    }
  }, [getAccessTokenSilently, userData]);

  useEffect(() => {
    if (isAuthenticated) fetchCatalogo();
  }, [isAuthenticated, fetchCatalogo]);

  // Cargar subáreas existentes del área raíz elegida en "proponer/elegir"
  // (mismo selector se usa para navegar el catálogo antes de proponer).
  useEffect(() => {
    if (!proposeAreaId) {
      setExistingSubareas([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadingSubareas(true);
      try {
        let token = null;
        try {
          token = await getAccessTokenSilently({
            authorizationParams: { audience: "https://api.ciudadan.org" },
          });
        } catch {}
        const json = await getSubareasDeArea(proposeAreaId, token);
        if (cancelled) return;
        const items = Array.isArray(json.data)
          ? json.data.map((it) => {
              const a = it.attributes || it;
              return { id: it.id, name: a.name || "—" };
            })
          : [];
        setExistingSubareas(items);
      } catch {
        if (!cancelled) setExistingSubareas([]);
      } finally {
        if (!cancelled) setLoadingSubareas(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [proposeAreaId, getAccessTokenSilently]);

  // Cargar mis propuestas de subárea ya enviadas, para mostrar su estado.
  useEffect(() => {
    if (!isAuthenticated || !userData?.id) return;
    let cancelled = false;
    (async () => {
      try {
        let token = null;
        try {
          token = await getAccessTokenSilently({
            authorizationParams: { audience: "https://api.ciudadan.org" },
          });
        } catch {}
        const json = await listProposedSubareas(userData.id, token);
        if (!cancelled) setMisPropuestas(json?.data?.proposed_subareas || []);
      } catch {
        if (!cancelled) setMisPropuestas([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, userData?.id, getAccessTokenSilently]);

  // Asignar directamente una subárea que YA EXISTE en el catálogo (spec 5.3
  // "elegirla de la lista") — sin pasar por revisión, porque ya es una
  // subárea real y verificada como carrera/oficio válido; lo único
  // pendiente después es la verificación DOCUMENTAL del usuario en esa área.
  const handleAssignSubarea = async () => {
    if (!selectedSubareaId || !userData?.id) return;
    setSubmittingSubarea(true);
    try {
      let token = null;
      try {
        token = await getAccessTokenSilently({
          authorizationParams: { audience: "https://api.ciudadan.org" },
        });
      } catch {}
      const actuales = (userData.areas || []).map((a) => (typeof a === "object" ? a.id : Number(a)));
      const nuevosIds = Array.from(new Set([...actuales, Number(selectedSubareaId)]));
      await assignUserAreas(userData.id, nuevosIds, token);
      setSnack({ open: true, msg: "Subárea asignada. Sube tu documentación para verificación.", severity: "success" });
      setSelectedSubareaId("");
      fetchRolesYMembresia && fetchRolesYMembresia(true);
    } catch (err) {
      setSnack({ open: true, msg: `No se pudo asignar la subárea: ${err.message || err}`, severity: "error" });
    } finally {
      setSubmittingSubarea(false);
    }
  };

  // Asignar área al usuario (vía assignUserAreas service)
  const handleAssignArea = async () => {
    if (!selectedAreaId || !userData?.id) return;
    setSubmitting(true);
    try {
      let token = null;
      try {
        token = await getAccessTokenSilently({
          authorizationParams: { audience: "https://api.ciudadan.org" },
        });
      } catch {}
      const actuales = (userData.areas || []).map((a) => (typeof a === "object" ? a.id : Number(a)));
      const nuevosIds = Array.from(new Set([...actuales, Number(selectedAreaId)]));
      await assignUserAreas(userData.id, nuevosIds, token);
      setSnack({ open: true, msg: "Área asignada. Sube tu documentación para verificación.", severity: "success" });
      setSelectedAreaId("");
      // Refrescar userData del contexto (no force=true para no spamear)
      fetchRolesYMembresia && fetchRolesYMembresia(true);
    } catch (err) {
      setSnack({ open: true, msg: `No se pudo asignar el área: ${err.message || err}`, severity: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  // Subir documento del usuario (PDF/JPG/PNG) — se guarda como evidencia de la
  // carrera/oficio. El verificador lo verá y marcará verified/pending/rejected
  // en UserVerification.jsx. Aquí solo lo dejamos listo para-inspección.
  // Nota: NO creamos el área en este flujo; la propuesta va a area_details.proposed_subareas[].
  const handleUploadDoc = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!docAreaId) {
      setSnack({ open: true, msg: "Selecciona primero para qué área es este documento", severity: "warning" });
      return;
    }
    const allowed = ["image/jpeg", "image/png", "application/pdf"];
    if (!allowed.includes(file.type)) {
      setSnack({ open: true, msg: "Solo JPG, PNG o PDF", severity: "warning" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setSnack({ open: true, msg: "Máximo 5MB por archivo", severity: "warning" });
      return;
    }
    setDocUploading(true);
    try {
      let token = null;
      try {
        token = await getAccessTokenSilently({
          authorizationParams: { audience: "https://api.ciudadan.org" },
        });
      } catch {}
      const formData = new FormData();
      formData.append("files", file);
      formData.append("ref", "plugin::users-permissions.user");
      formData.append("refId", userData.id);
      formData.append("field", "documentos");
      const res = await fetch(`${STRAPI_URL}/api/upload`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (!res.ok) throw new Error(`Upload fallido (${res.status})`);
      const uploaded = await res.json();
      const f = Array.isArray(uploaded) ? uploaded[0] : uploaded;
      const nuevoDoc = {
        name: f?.name || file.name,
        url: f?.url || URL.createObjectURL(file),
        strapiId: f?.id,
        size: file.size,
        type: file.type,
        uploadedAt: new Date().toISOString(),
      };
      setDocs((prev) => [...prev, nuevoDoc]);

      // Persistir el documento en area_details[docAreaId].documentos — sin
      // esto, el archivo se sube a la Media Library pero ningún verificador
      // puede verlo jamás (bug real: la subida era puramente decorativa).
      try {
        await subirDocumentoArea(
          userData.id,
          docAreaId,
          { nombre: nuevoDoc.name, url: nuevoDoc.url, size: nuevoDoc.size, tipo: nuevoDoc.type },
          token
        );
        fetchRolesYMembresia && fetchRolesYMembresia(true);
        setSnack({ open: true, msg: "Documento subido. Un verificador lo revisará.", severity: "success" });
      } catch (persistErr) {
        setSnack({
          open: true,
          msg: `El archivo se subió pero no se pudo asociar al área: ${persistErr.message || persistErr}`,
          severity: "warning",
        });
      }
    } catch (err) {
      // Fallback: blob URL local (no persistido) para que el usuario al menos
      // vea que reconocimos el archivo. Se pierde al recargar.
      setDocs((prev) => [
        ...prev,
        { name: file.name, url: URL.createObjectURL(file), size: file.size, type: file.type, uploadedAt: new Date().toISOString() },
      ]);
      setSnack({ open: true, msg: `Upload a Strapi falló; archivo cargado localmente: ${err.message || err}`, severity: "warning" });
    } finally {
      setDocUploading(false);
    }
  };

  // Quitar documento de la lista local (no borra en Strapi)
  const handleRemoveDoc = (idx) => setDocs((prev) => prev.filter((_, i) => i !== idx));

  // Proponer subárea (carrera/oficio) nueva dentro de un área raíz
  const handleProposeSubarea = async () => {
    if (!proposeAreaId || !proposeNombre.trim()) {
      setSnack({ open: true, msg: "Selecciona un área e indica el nombre de la subárea", severity: "warning" });
      return;
    }
    setSubmittingPropuesta(true);
    try {
      let token = null;
      try {
        token = await getAccessTokenSilently({
          authorizationParams: { audience: "https://api.ciudadan.org" },
        });
      } catch {}
      await proposeSubarea(userData.id, proposeAreaId, proposeNombre.trim(), propuestaObs.trim(), token);
      setSnack({ open: true, msg: "Subárea propuesta. Un socio la revisará y creará.", severity: "success" });
      setProposeNombre("");
      setPropuestaObs("");
      setProposeAreaId("");
      fetchRolesYMembresia && fetchRolesYMembresia(true);
    } catch (err) {
      setSnack({ open: true, msg: `No se pudo proponer: ${err.message || err}`, severity: "error" });
    } finally {
      setSubmittingPropuesta(false);
    }
  };

  // Helper local: estado de verificación de un área en area_details
  const statusDeArea = (areaId) => {
    const id = Number(areaId);
    const details = userData?.area_details || {};
    const entry = details[id] || details[String(id)];
    return entry?.status || "pending";
  };

  const badgeChip = (status) => {
    if (status === "verified") return <Chip size="small" color="success" label="✓ Verificada" />;
    if (status === "rejected") return <Chip size="small" color="error" label="✕ Rechazada" />;
    return <Chip size="small" color="warning" label="⏳ Pendiente de verificación" />;
  };
  // ------------------ Fin Mis áreas y verificación ------------------

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

            {/* ===================== Mis áreas y verificación ===================== */}
            {/* Fix 5.3 — captura de área/subárea + subida de docs en el perfil.
                Fix 3.4 — el dueño ve el badge de verificación por área. */}
            <Paper
              elevation={0}
              sx={{
                mt: 3,
                p: 2,
                borderRadius: 2,
                background: "linear-gradient(90deg, rgba(0,255,153,0.05), rgba(255,242,0,0.03))",
                border: "1px solid rgba(0,0,0,0.06)",
              }}
            >
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "#051322", mb: 1 }}>
                Mis áreas y verificación
              </Typography>
              <Typography variant="body2" sx={{ color: "#6d6e71", mb: 2 }}>
                Asocia un área raíz a tu perfil, sube tu documentación y (si tu carrera/oficio
                no está en la lista) proponlo como subárea. Un verificador revisará tu solicitud.
              </Typography>

              {/* Áreas asignadas con badge de verificación (Fix 3.4) */}
              {Array.isArray(userData?.areas) && userData.areas.length > 0 ? (
                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mb: 2 }}>
                  {userData.areas.map((a) => {
                    const id = typeof a === "object" ? a.id : Number(a);
                    const name = typeof a === "object" ? (a.name || a.nombre || `#${id}`) : `#${id}`;
                    return (
                      <Box key={id} sx={{ display: "inline-flex", alignItems: "center", gap: 0.75 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{name}</Typography>
                        {badgeChip(statusDeArea(id))}
                      </Box>
                    );
                  })}
                </Stack>
              ) : (
                <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
                  Aún no tienes áreas asignadas.
                </Typography>
              )}

              {/* Asignar área raíz */}
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#051322" }}>
                Asociar un área
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 1, alignItems: "center" }} useFlexGap flexWrap="wrap">
                <FormControl sx={{ minWidth: 220 }} size="small">
                  <InputLabel id="area-label">Área raíz</InputLabel>
                  <Select
                    labelId="area-label"
                    label="Área raíz"
                    value={selectedAreaId}
                    onChange={(e) => setSelectedAreaId(e.target.value)}
                    disabled={loadingCatalogo || submitting}
                  >
                    {loadingCatalogo ? (
                      <MenuItem value=""><em>Cargando…</em></MenuItem>
                    ) : rootAreas.length === 0 ? (
                      <MenuItem value=""><em>Sin catálogo</em></MenuItem>
                    ) : (
                      rootAreas.map((a) => <MenuItem key={a.id} value={a.id}>{a.name}</MenuItem>)
                    )}
                  </Select>
                </FormControl>
                {loadingCatalogo && <CircularProgress size={20} />}
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<SendIcon />}
                  disabled={!selectedAreaId || submitting}
                  onClick={handleAssignArea}
                  sx={{ background: "#00cc7a", color: "#fff", "&:hover": { background: "#00996b" } }}
                >
                  {submitting ? "Asignando…" : "Asignar"}
                </Button>
              </Stack>

              {/* Elegir o proponer subárea (carrera/oficio) — spec 5.3:
                  "elegirla de la lista o escribirla si no existe". Antes solo
                  existía la mitad de "escribirla" (proponer); ahora primero
                  se muestran las subáreas YA EXISTENTES bajo el área raíz
                  elegida para asignarlas directo, y solo si no está ahí se
                  usa la propuesta de abajo. */}
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#051322" }}>
                ¿Cuál es tu carrera u oficio?
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 1 }}>
                Elige el área raíz y luego busca tu carrera en la lista. Si no está, puedes
                proponerla más abajo.
              </Typography>
              <Stack spacing={1}>
                <FormControl size="small" sx={{ minWidth: 220 }}>
                  <InputLabel id="prop-area-label">Área raíz</InputLabel>
                  <Select
                    labelId="prop-area-label"
                    label="Área raíz"
                    value={proposeAreaId}
                    onChange={(e) => { setProposeAreaId(e.target.value); setSelectedSubareaId(""); }}
                    disabled={submittingPropuesta}
                  >
                    {rootAreas.map((a) => <MenuItem key={a.id} value={a.id}>{a.name}</MenuItem>)}
                  </Select>
                </FormControl>

                {proposeAreaId && (
                  <Stack direction="row" spacing={1} sx={{ alignItems: "center" }} useFlexGap flexWrap="wrap">
                    <FormControl size="small" sx={{ minWidth: 220 }}>
                      <InputLabel id="subarea-label">Tu carrera/oficio</InputLabel>
                      <Select
                        labelId="subarea-label"
                        label="Tu carrera/oficio"
                        value={selectedSubareaId}
                        onChange={(e) => setSelectedSubareaId(e.target.value)}
                        disabled={loadingSubareas || submittingSubarea}
                      >
                        {loadingSubareas ? (
                          <MenuItem value=""><em>Cargando…</em></MenuItem>
                        ) : existingSubareas.length === 0 ? (
                          <MenuItem value=""><em>No hay ninguna todavía — proponla abajo</em></MenuItem>
                        ) : (
                          existingSubareas.map((a) => <MenuItem key={a.id} value={a.id}>{a.name}</MenuItem>)
                        )}
                      </Select>
                    </FormControl>
                    {loadingSubareas && <CircularProgress size={20} />}
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<SendIcon />}
                      disabled={!selectedSubareaId || submittingSubarea}
                      onClick={handleAssignSubarea}
                      sx={{ background: "#00cc7a", color: "#fff", "&:hover": { background: "#00996b" } }}
                    >
                      {submittingSubarea ? "Asignando…" : "Asignar esta"}
                    </Button>
                  </Stack>
                )}
              </Stack>

              {/* Proponer subárea nueva (si no está en la lista de arriba) */}
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#051322" }}>
                Tu carrera/oficio no está en la lista? Propónla como subárea
              </Typography>
              <Stack spacing={1} sx={{ mt: 1 }}>
                <TextField
                  size="small"
                  label="Nombre de subárea (carrera/oficio)"
                  placeholder="Ej. Lic. en Derecho"
                  value={proposeNombre}
                  onChange={(e) => setProposeNombre(e.target.value)}
                  fullWidth
                  helperText={!proposeAreaId ? "Primero elige un área raíz arriba" : ""}
                />
                <TextField
                  size="small"
                  label="Observaciones (opcional)"
                  placeholder="Ej. Título emitido por la UNAM"
                  value={propuestaObs}
                  onChange={(e) => setPropuestaObs(e.target.value)}
                  fullWidth
                />
                <Box>
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<SendIcon />}
                    disabled={!proposeAreaId || !proposeNombre.trim() || submittingPropuesta}
                    onClick={handleProposeSubarea}
                    sx={{ background: "#fff200", color: "#051322", "&:hover": { filter: "brightness(0.95)" } }}
                  >
                    {submittingPropuesta ? "Enviando…" : "Proponer subárea"}
                  </Button>
                </Box>
              </Stack>

              {/* Mis propuestas enviadas y su estado — antes el usuario
                  proponía y nunca sabía qué había pasado con su propuesta. */}
              {misPropuestas.length > 0 && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#051322", mb: 1 }}>
                    Mis propuestas enviadas
                  </Typography>
                  <Stack spacing={0.75}>
                    {misPropuestas.map((p, i) => (
                      <Box key={i} sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {p.nombre} <Typography component="span" variant="caption" color="text.secondary">({p.areaName})</Typography>
                        </Typography>
                        {p.estado === "approved" && <Chip size="small" color="success" label="✓ Aprobada" />}
                        {p.estado === "rejected" && <Chip size="small" color="error" label={`✕ Rechazada${p.motivo_rechazo ? `: ${p.motivo_rechazo}` : ""}`} />}
                        {(!p.estado || p.estado === "pending") && <Chip size="small" color="warning" label="⏳ Pendiente de revisión" />}
                      </Box>
                    ))}
                  </Stack>
                </>
              )}

              {/* Subir documentación */}
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#051322" }}>
                Documentación de tu área / carrera
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 1 }}>
                Sube título, certificado o diploma en PDF/JPG/PNG (máx 5MB) — un verificador lo revisará
                y marcará tu área como verificada o rechazada.
              </Typography>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 1 }} useFlexGap flexWrap="wrap">
                <FormControl size="small" sx={{ minWidth: 220 }}>
                  <InputLabel id="doc-area-label">¿Para qué área es?</InputLabel>
                  <Select
                    labelId="doc-area-label"
                    label="¿Para qué área es?"
                    value={docAreaId}
                    onChange={(e) => setDocAreaId(e.target.value)}
                    disabled={docUploading}
                  >
                    {(userData?.areas || []).length === 0 ? (
                      <MenuItem value=""><em>Primero asigna un área arriba</em></MenuItem>
                    ) : (
                      userData.areas.map((a) => {
                        const id = typeof a === "object" ? a.id : Number(a);
                        const name = typeof a === "object" ? (a.name || a.nombre || `#${id}`) : `#${id}`;
                        return <MenuItem key={id} value={id}>{name}</MenuItem>;
                      })
                    )}
                  </Select>
                </FormControl>
              </Stack>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center" }} useFlexGap flexWrap="wrap">
                <Button
                  variant="outlined"
                  size="small"
                  component="label"
                  startIcon={<UploadFileIcon />}
                  disabled={docUploading || !docAreaId}
                  sx={{ borderColor: "#00cc7a", color: "#00cc7a" }}
                >
                  Subir documento
                  <input
                    type="file"
                    accept="image/jpeg,image/png,application/pdf"
                    hidden
                    onChange={handleUploadDoc}
                  />
                </Button>
                {docUploading && <CircularProgress size={18} />}
              </Stack>
              {docs.length > 0 && (
                <Stack spacing={0.5} sx={{ mt: 1 }}>
                  {docs.map((d, i) => (
                    <Box key={i} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Typography variant="caption" sx={{ flex: 1 }}>📄 {d.name}</Typography>
                      <Button size="text" sx={{ color: "#c62828", fontSize: 12 }} onClick={() => handleRemoveDoc(i)}>
                        Quitar
                      </Button>
                    </Box>
                  ))}
                </Stack>
              )}
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
