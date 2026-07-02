// src/components/PreregistroConductor2.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import {
  Box,
  Paper,
  Grid,
  TextField,
  Button,
  Typography,
  MenuItem,
  CircularProgress,
  Alert,
  Stack,
  Chip,
  Divider,
  Avatar,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import { useRoles } from "../../Contexts/RolesContext.jsx";

import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import PersonIcon from "@mui/icons-material/Person";
import PhoneIcon from "@mui/icons-material/Phone";
import EventIcon from "@mui/icons-material/Event";
import PlaceIcon from "@mui/icons-material/Place";
import BadgeIcon from "@mui/icons-material/Badge";
import DescriptionIcon from "@mui/icons-material/Description";
import SecurityIcon from "@mui/icons-material/Security";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import InfoIcon from "@mui/icons-material/Info";
import VerifiedIcon from "@mui/icons-material/Verified";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";

const STRAPI_URL = process.env.REACT_APP_STRAPI_URL || "";

const neonGreen = "#00c853";
const accentBlue = "#2563eb";
const lightBg = "#f5f7fb";
const cardBg = "#ffffff";
const surfaceBg = "#f9fafb";
const borderColor = "rgba(15, 23, 42, 0.10)";
const textMain = "#0f172a";
const textMuted = "#475569";

const Card = styled(Paper)(({ theme }) => ({
  backgroundColor: cardBg,
  color: textMain,
  border: `1px solid ${borderColor}`,
  borderRadius: 18,
  padding: theme.spacing(2),
  boxShadow: "0 10px 30px rgba(15,23,42,0.08)",
}));

const StatusChip = styled(Chip)(({ status }) => {
  let bg = "rgba(100,116,139,0.12)";
  let color = "#334155";
  let border = "rgba(100,116,139,0.22)";

  if (status === "pendiente") {
    bg = "rgba(245, 158, 11, 0.14)";
    color = "#b45309";
    border = "rgba(245, 158, 11, 0.28)";
  }
  if (status === "aprobada") {
    bg = "rgba(0, 200, 83, 0.12)";
    color = neonGreen;
    border = "rgba(0,200,83,0.28)";
  }
  if (status === "rechazada") {
    bg = "rgba(239, 68, 68, 0.12)";
    color = "#dc2626";
    border = "rgba(239,68,68,0.28)";
  }

  return {
    backgroundColor: bg,
    color,
    border: `1px solid ${border}`,
    fontWeight: 800,
  };
});

const generarHoras = () => {
  const horas = [];
  for (let t = 9 * 60; t < 18 * 60; t += 20) {
    const h = String(Math.floor(t / 60)).padStart(2, "0");
    const m = String(t % 60).padStart(2, "0");
    horas.push(`${h}:${m}`);
  }
  return horas;
};

const HORAS_BASE = generarHoras();

const documentosAhora = [
  {
    key: "ine_frente",
    label: "INE frente",
    helper: "Sube una foto nítida del frente de tu identificación.",
    accept: "image/*,application/pdf",
    icon: <BadgeIcon fontSize="small" />,
    required: true,
  },
  {
    key: "ine_tras",
    label: "INE reverso",
    helper: "Sube la parte trasera de tu identificación oficial.",
    accept: "image/*,application/pdf",
    icon: <BadgeIcon fontSize="small" />,
    required: true,
  },
  {
    key: "foto_credencial",
    label: "Foto con credencial",
    helper: "Una foto tuya sosteniendo tu identificación para validar identidad.",
    accept: "image/*,application/pdf",
    icon: <PhotoCameraIcon fontSize="small" />,
    required: true,
  },
  {
    key: "files",
    label: "Archivos adicionales",
    helper: "Puedes agregar comprobantes, capturas o cualquier archivo extra.",
    accept: "image/*,application/pdf",
    icon: <UploadFileIcon fontSize="small" />,
    required: false,
    multiple: true,
  },
];

const documentosDespues = [
  "Validación física de originales en la cita",
  "Coincidencia de datos con tu identificación",
  "Documentos complementarios que te indiquen en la revisión",
  "Cualquier archivo faltante que el validador marque en la cita",
];

function normalizeEntity(entity) {
  if (!entity) return null;
  if (entity.attributes) return { id: entity.id, ...entity.attributes };
  return entity;
}

function normalizeMediaField(field) {
  if (!field) return null;
  const raw = field.data !== undefined ? field.data : field;
  if (!raw) return null;
  if (Array.isArray(raw)) return raw.map(normalizeEntity).filter(Boolean);
  return normalizeEntity(raw);
}

function getSingleMediaId(field) {
  const normalized = normalizeMediaField(field);
  return normalized?.id || null;
}

function getMultipleMediaIds(field) {
  const normalized = normalizeMediaField(field);
  if (!normalized) return [];
  if (Array.isArray(normalized)) return normalized.map((item) => item.id).filter(Boolean);
  return [normalized.id].filter(Boolean);
}

function getMediaUrl(file) {
  if (!file) return "";
  const rawUrl = file?.url || file?.attributes?.url || "";
  if (!rawUrl) return "";
  if (rawUrl.startsWith("http")) return rawUrl;
  return `${STRAPI_URL}${rawUrl}`;
}

function getMediaName(file) {
  return file?.name || file?.attributes?.name || "Archivo";
}

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("es-MX");
}

function toISOStringSafe(date, time) {
  return new Date(`${date}T${time}:00`).toISOString();
}

function onlyDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

function isValidCurp(curp) {
  const v = String(curp || "").trim().toUpperCase();
  return /^[A-Z]{4}[0-9]{6}[HM][A-Z]{5}[A-Z0-9][0-9]$/.test(v);
}

function isValidRfc(rfc) {
  const v = String(rfc || "").trim().toUpperCase();
  return /^([A-ZÑ&]{3,4})\d{6}[A-Z0-9]{3}$/.test(v);
}

const UploadCard = ({
  title,
  helper,
  file,
  existingFile,
  onChange,
  accept,
  disabled = false,
  multiple = false,
  required = false,
  icon = null,
}) => {
  const preview = useMemo(() => {
    const chosen = multiple ? (file || []) : (file || existingFile || null);

    if (multiple) return null;

    if (!chosen) return "";

    const maybeFile = chosen instanceof File ? chosen : null;
    if (maybeFile && maybeFile.type?.startsWith("image/")) {
      return URL.createObjectURL(maybeFile);
    }

    if (!maybeFile && chosen?.url) return getMediaUrl(chosen);
    if (!maybeFile && chosen?.attributes?.url) return getMediaUrl(chosen);

    return "";
  }, [file, existingFile, multiple]);

  useEffect(() => {
    return () => {
      if (preview && file instanceof File && preview.startsWith("blob:")) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview, file]);

  const displayItems = multiple ? (file?.length ? file : existingFile || []) : [];

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        borderRadius: 3,
        backgroundColor: surfaceBg,
        border: `1px solid ${borderColor}`,
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1.2} sx={{ mb: 1 }}>
        {icon}
        <Typography fontWeight={800} color={textMain}>
          {title} {required ? "*" : ""}
        </Typography>
      </Stack>

      <Typography variant="caption" sx={{ color: textMuted, display: "block", mb: 1.5 }}>
        {helper}
      </Typography>

      <Button component="label" variant="outlined" disabled={disabled} sx={{ mb: 1.5, textTransform: "none" }}>
        {multiple ? "Seleccionar archivos" : "Seleccionar archivo"}
        <input
          hidden
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={(e) => {
            if (multiple) {
              const list = Array.from(e.target.files || []);
              onChange(list);
            } else {
              onChange(e.target.files?.[0] || null);
            }
          }}
        />
      </Button>

      {!multiple && preview ? (
        <Paper
          component="a"
          href={preview}
          target="_blank"
          rel="noreferrer"
          sx={{
            overflow: "hidden",
            display: "block",
            borderRadius: 2,
            border: "1px solid rgba(15,23,42,0.08)",
            mb: 1.2,
          }}
        >
          <Box
            component="img"
            src={preview}
            alt={title}
            sx={{ width: "100%", height: 180, objectFit: "cover", display: "block" }}
          />
        </Paper>
      ) : null}

      {!multiple && file ? (
        <Chip
          label={file.name}
          size="small"
          sx={{ bgcolor: "rgba(37,99,235,0.10)", color: accentBlue, fontWeight: 700 }}
        />
      ) : null}

      {!multiple && !file && existingFile ? (
        <Chip
          label={getMediaName(existingFile)}
          size="small"
          sx={{ bgcolor: "rgba(0,200,83,0.10)", color: neonGreen, fontWeight: 700 }}
        />
      ) : null}

      {multiple ? (
        <Stack spacing={1} sx={{ mt: 1 }}>
          {displayItems.length ? (
            displayItems.map((item, idx) => (
              <Chip
                key={idx}
                label={item?.name || item?.attributes?.name || `Archivo ${idx + 1}`}
                size="small"
                sx={{ width: "fit-content", bgcolor: "rgba(37,99,235,0.10)", color: accentBlue }}
              />
            ))
          ) : (
            <Typography variant="caption" sx={{ color: textMuted }}>
              No has seleccionado archivos todavía.
            </Typography>
          )}
        </Stack>
      ) : null}
    </Paper>
  );
};


const normalizeUserFromStrapi = (item) => {
  if (!item) return null;
  if (item.attributes) return { id: item.id, ...item.attributes };
  return item;
};

const fetchStrapiUserByEmail = async (email) => {
  if (!email) return null;

  const url = `${STRAPI_URL}/api/users?filters[email][$eq]=${encodeURIComponent(
    email
  )}&populate[ine_frente]=*&populate[ine_tras]=*&populate[foto_credencial]=*&populate[files]=*`;

  const res = await fetch(url, { credentials: "include" });
  const text = await res.text();

  if (!res.ok) {
    throw new Error(text || "No se pudo buscar el usuario en Strapi.");
  }

  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }

  const raw =
    Array.isArray(json) ? json[0] :
    Array.isArray(json?.data) ? json.data[0] :
    json?.data?.[0] || json?.data || null;

  return normalizeUserFromStrapi(raw);
};

const PreregistroConductor2 = () => {
  const { userData, fetchRolesYMembresia } = useRoles();
  const { user: auth0User } = useAuth0();

  const [strapiUser, setStrapiUser] = useState(null);
  const userEmail = userData?.email || auth0User?.email || "";

  const [form, setForm] = useState({
    nombre_completo: "",
    telefono: "",
    fecha_nacimiento: "",
    ciudad: "",
    curp: "",
    rfc: "",
  });

  const [uploadDocs, setUploadDocs] = useState({
    ine_frente: null,
    ine_tras: null,
    foto_credencial: null,
    files: [],
  });

  const [existingUser, setExistingUser] = useState(null);
  const [existingAgenda, setExistingAgenda] = useState(null);

  const [fecha, setFecha] = useState("");
  const [hora, setHora] = useState("");
  const [horasDisponibles, setHorasDisponibles] = useState([]);

  const [loadingBootstrap, setLoadingBootstrap] = useState(true);
  const [loadingHoras, setLoadingHoras] = useState(false);
  const [loadingSubmit, setLoadingSubmit] = useState(false);

  const [successAgenda, setSuccessAgenda] = useState(null);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [notice, setNotice] = useState("");

  const readOnlyMode = Boolean(existingAgenda) || Boolean(successAgenda);

  const currentDocs = useMemo(() => {
    return {
      ine_frente: normalizeMediaField(existingUser?.ine_frente),
      ine_tras: normalizeMediaField(existingUser?.ine_tras),
      foto_credencial: normalizeMediaField(existingUser?.foto_credencial),
      files: normalizeMediaField(existingUser?.files) || [],
    };
  }, [existingUser]);

  const currentDocsList = useMemo(() => {
    const items = [
      { key: "ine_frente", label: "INE frente", value: currentDocs.ine_frente },
      { key: "ine_tras", label: "INE reverso", value: currentDocs.ine_tras },
      { key: "foto_credencial", label: "Foto credencial", value: currentDocs.foto_credencial },
    ];

    return items.map((item) => ({
      ...item,
      ok: Boolean(item.value),
      name: item.value ? getMediaName(item.value) : null,
      url: item.value ? getMediaUrl(item.value) : "",
    }));
  }, [currentDocs]);

  const extraDocsCount = Array.isArray(currentDocs.files) ? currentDocs.files.length : 0;

useEffect(() => {
  const bootstrap = async () => {
    if (!userEmail) {
      setLoadingBootstrap(false);
      setError("No encontramos tu email de usuario.");
      return;
    }

    setLoadingBootstrap(true);
    setError("");

    try {
      const realUser = await fetchStrapiUserByEmail(userEmail);

      if (!realUser?.id) {
        setLoadingBootstrap(false);
        setError(`No se encontró usuario en Strapi con el email: ${userEmail}`);
        return;
      }

      setStrapiUser(realUser);
      setExistingUser(realUser);

      setForm({
        nombre_completo:
          realUser?.nombre_completo ||
          realUser?.username ||
          userData?.nombre_completo ||
          userData?.username ||
          "",
        telefono: realUser?.telefono || userData?.telefono || "",
        fecha_nacimiento: realUser?.fecha_nacimiento
          ? String(realUser.fecha_nacimiento).slice(0, 10)
          : "",
        ciudad: realUser?.ciudad || userData?.ciudad || "",
        curp: realUser?.curp || userData?.curp || "",
        rfc: realUser?.rfc || userData?.rfc || "",
      });

      const agendaRes = await fetch(
        `${STRAPI_URL}/api/agendas?filters[usuario][id][$eq]=${realUser.id}&filters[descripcion][$containsi]=Preregistro conductor&sort=fecha_inicio:desc&pagination[pageSize]=1&populate[usuario]=*`,
        { credentials: "include" }
      );

      const agendaJson = agendaRes.ok ? await agendaRes.json() : { data: [] };
      const agendaItem = Array.isArray(agendaJson?.data) && agendaJson.data.length ? agendaJson.data[0] : null;

      if (agendaItem) {
        const attrs = agendaItem.attributes || {};
        const normalizedAgenda = {
          id: agendaItem.id,
          ...attrs,
        };

        setExistingAgenda(normalizedAgenda);
        setFecha(String(normalizedAgenda.fecha_inicio || "").slice(0, 10));

        const dt = normalizedAgenda.fecha_inicio ? new Date(normalizedAgenda.fecha_inicio) : null;
        if (dt && !Number.isNaN(dt.getTime())) {
          const hh = String(dt.getHours()).padStart(2, "0");
          const mm = String(dt.getMinutes()).padStart(2, "0");
          setHora(`${hh}:${mm}`);
        }

        setNotice("Ya encontramos una cita previa de conductor en tu cuenta.");
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "No pudimos cargar tus datos iniciales.");
    } finally {
      setLoadingBootstrap(false);
    }
  };

  bootstrap();
}, [userEmail]);

  useEffect(() => {
    if (!fecha || readOnlyMode) return;

    const fetchHoras = async () => {
      setLoadingHoras(true);

      try {
        const start = new Date(`${fecha}T00:00:00`).toISOString();
        const end = new Date(`${fecha}T23:59:59`).toISOString();

        const url = `${STRAPI_URL}/api/agendas?filters[descripcion][$containsi]=Preregistro conductor&filters[fecha_inicio][$gte]=${start}&filters[fecha_inicio][$lte]=${end}&sort=fecha_inicio:asc&pagination[pageSize]=100`;

        const res = await fetch(url, { credentials: "include" });
        const json = await res.json();

        const ocupadas = (json?.data || []).map((item) => {
          const fechaInicio = item?.attributes?.fecha_inicio;
          const d = new Date(fechaInicio);
          return d.toTimeString().slice(0, 5);
        });

        setHorasDisponibles(HORAS_BASE.filter((h) => !ocupadas.includes(h)));
      } catch (err) {
        console.error(err);
        setHorasDisponibles(HORAS_BASE);
      } finally {
        setLoadingHoras(false);
      }
    };

    fetchHoras();
  }, [fecha, readOnlyMode]);

  const validation = () => {
    const errs = {};

    if (!form.nombre_completo.trim()) errs.nombre_completo = "Escribe tu nombre completo.";
    if (!onlyDigits(form.telefono).match(/^\d{10}$/)) errs.telefono = "Escribe un teléfono de 10 dígitos.";
    if (!form.fecha_nacimiento) errs.fecha_nacimiento = "Selecciona tu fecha de nacimiento.";
    if (!form.ciudad.trim()) errs.ciudad = "Escribe tu ciudad.";
    if (!isValidCurp(form.curp)) errs.curp = "La CURP debe tener un formato válido.";
    if (!isValidRfc(form.rfc)) errs.rfc = "El RFC debe tener un formato válido.";
    if (!fecha) errs.fecha = "Selecciona la fecha de tu cita.";
    if (!hora) errs.hora = "Selecciona la hora de tu cita.";

    const hasIneFrente = Boolean(uploadDocs.ine_frente || currentDocs.ine_frente);
    const hasIneTras = Boolean(uploadDocs.ine_tras || currentDocs.ine_tras);
    const hasFoto = Boolean(uploadDocs.foto_credencial || currentDocs.foto_credencial);

    if (!hasIneFrente) errs.ine_frente = "Necesitamos el frente de tu INE.";
    if (!hasIneTras) errs.ine_tras = "Necesitamos el reverso de tu INE.";
    if (!hasFoto) errs.foto_credencial = "Necesitamos una foto con tu credencial.";

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const uploadSingle = async (file) => {
    const formData = new FormData();
    formData.append("files", file);

    const res = await fetch(`${STRAPI_URL}/api/upload`, {
      method: "POST",
      credentials: "include",
      body: formData,
    });

    const text = await res.text();
    if (!res.ok) {
      throw new Error(text || "No se pudo subir el archivo.");
    }

    const json = JSON.parse(text);
    return json?.[0]?.id || null;
  };

  const uploadMany = async (files) => {
    const ids = [];
    for (const file of files) {
      const id = await uploadSingle(file);
      if (id) ids.push(id);
    }
    return ids;
  };

  const buildExistingIds = () => {
    const current = existingUser || strapiUser ||userData || {};
    return {
      ine_frente_id: getSingleMediaId(current?.ine_frente),
      ine_tras_id: getSingleMediaId(current?.ine_tras),
      foto_credencial_id: getSingleMediaId(current?.foto_credencial),
      files_ids: getMultipleMediaIds(current?.files),
    };
  };

  const handleSubmit = async () => {
    setError("");
    setNotice("");

    if (readOnlyMode) {
      setError("Ya existe una cita registrada para este conductor.");
      return;
    }

    if (!validation()) {
      setError("Revisa los campos marcados antes de continuar.");
      return;
    }

    if (!strapiUser?.id) {
      setError("No encontramos tu usuario en el sistema.");
      return;
    }

    setLoadingSubmit(true);

    try {
      const existingIds = buildExistingIds();

      const newUploads = {
        ine_frente: uploadDocs.ine_frente ? await uploadSingle(uploadDocs.ine_frente) : null,
        ine_tras: uploadDocs.ine_tras ? await uploadSingle(uploadDocs.ine_tras) : null,
        foto_credencial: uploadDocs.foto_credencial ? await uploadSingle(uploadDocs.foto_credencial) : null,
        files: uploadDocs.files?.length ? await uploadMany(uploadDocs.files) : [],
      };

      const fechaISO = toISOStringSafe(fecha, hora);

      const finalIneFrente = newUploads.ine_frente || existingIds.ine_frente_id;
      const finalIneTras = newUploads.ine_tras || existingIds.ine_tras_id;
      const finalFotoCredencial = newUploads.foto_credencial || existingIds.foto_credencial_id;
      const finalFiles = Array.from(
        new Set([...(existingIds.files_ids || []), ...(newUploads.files || [])].filter(Boolean))
      );

      const userPayload = {
        nombre_completo: form.nombre_completo.trim(),
        telefono: onlyDigits(form.telefono),
        fecha_nacimiento: form.fecha_nacimiento
          ? new Date(`${form.fecha_nacimiento}T12:00:00`).toISOString()
          : null,
        ciudad: form.ciudad.trim(),
        curp: form.curp.trim().toUpperCase(),
        rfc: form.rfc.trim().toUpperCase(),
        ine_frente: finalIneFrente || null,
        ine_tras: finalIneTras || null,
        foto_credencial: finalFotoCredencial || null,
        files: finalFiles,
        observaciones: existingUser?.observaciones || "",
        verificado: false,
      };

      const userRes = await fetch(`${STRAPI_URL}/api/users/${strapiUser.id}`, {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ data: userPayload }),
      });

      const userText = await userRes.text();
      if (!userRes.ok) {
        throw new Error(userText || "No se pudo actualizar el usuario.");
      }

      const uploadedLabels = [
        ...(newUploads.ine_frente ? ["ine_frente"] : []),
        ...(newUploads.ine_tras ? ["ine_tras"] : []),
        ...(newUploads.foto_credencial ? ["foto_credencial"] : []),
        ...(newUploads.files?.length ? ["files"] : []),
      ];

      const pendingDocs = documentosAhora
        .filter((doc) => doc.required)
        .filter((doc) => {
          if (doc.key === "ine_frente") return !finalIneFrente;
          if (doc.key === "ine_tras") return !finalIneTras;
          if (doc.key === "foto_credencial") return !finalFotoCredencial;
          return false;
        })
        .map((doc) => doc.key);

      const agendaPayload = {
        titulo: `Cita conductor ${form.nombre_completo.trim()}`,
        slug: `preregistro-conductor-${strapiUser.id}-${Date.now()}`,
        usuario: userData.id,
        ciudad: form.ciudad.trim(),
        estado: "pendiente",
        fecha_inicio: fechaISO,
        descripcion: "Preregistro conductor",
        observaciones: "preregistro conductor",
        checked: false,
        metadata: {
          preregistro_conductor: {
            version: 1,
            user_id: strapiUser.id,
            nombre_completo: form.nombre_completo.trim(),
            telefono: onlyDigits(form.telefono),
            fecha_nacimiento: form.fecha_nacimiento,
            ciudad: form.ciudad.trim(),
            curp: form.curp.trim().toUpperCase(),
            rfc: form.rfc.trim().toUpperCase(),
            fecha_cita: fechaISO,
            documentos_subidos: uploadedLabels,
            documentos_guardados: {
              ine_frente: Boolean(finalIneFrente),
              ine_tras: Boolean(finalIneTras),
              foto_credencial: Boolean(finalFotoCredencial),
              files: finalFiles.length,
            },
            documentos_pendientes: pendingDocs,
            revisado_en: new Date().toISOString(),
          },
        },
      };

      const agendaRes = await fetch(`${STRAPI_URL}/api/agendas`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ data: agendaPayload }),
      });

      const agendaText = await agendaRes.text();
      if (!agendaRes.ok) {
        throw new Error(agendaText || "No se pudo crear la cita.");
      }

      const agendaJson = JSON.parse(agendaText);
      const createdAgendaRaw = agendaJson?.data;
      const createdAgenda = createdAgendaRaw?.attributes
        ? { id: createdAgendaRaw.id, ...createdAgendaRaw.attributes }
        : createdAgendaRaw;

      setSuccessAgenda({
        ...createdAgenda,
        fecha_inicio: fechaISO,
      });

      setNotice("Tu cita quedó agendada correctamente.");

      if (typeof fetchRolesYMembresia === "function") {
        fetchRolesYMembresia(true).catch(() => {});
      }
    } catch (err) {
      console.error(err);
      setError(err?.message || "Ocurrió un error al procesar tu solicitud.");
    } finally {
      setLoadingSubmit(false);
    }
  };

  if (loadingBootstrap) {
    return (
      <Box sx={{ minHeight: "45vh", display: "flex", alignItems: "center", justifyContent: "center", bgcolor: lightBg }}>
        <CircularProgress />
      </Box>
    );
  }

  if (successAgenda) {
    return (
      <Box sx={{ maxWidth: 900, mx: "auto", p: 2, bgcolor: lightBg, minHeight: "100vh" }}>
        <Card>
          <Stack alignItems="center" spacing={1.5} sx={{ py: 2 }}>
            <Avatar
              sx={{
                width: 72,
                height: 72,
                bgcolor: "rgba(0,200,83,0.12)",
                color: neonGreen,
                boxShadow: `0 0 24px rgba(0,200,83,0.15)`,
              }}
            >
              <VerifiedIcon sx={{ fontSize: 42 }} />
            </Avatar>

            <Typography variant="h4" fontWeight={900} align="center" color={textMain}>
              Tu cita quedó agendada
            </Typography>

            <Typography variant="body1" align="center" sx={{ color: textMuted, maxWidth: 640 }}>
              Ya registramos tu prerregistro de conductor. En la cita vamos a revisar tus datos,
              tus archivos y la documentación original.
            </Typography>
          </Stack>

          <Divider sx={{ my: 2, borderColor }} />

          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2, borderRadius: 3, backgroundColor: surfaceBg, border: `1px solid ${borderColor}` }}>
                <Stack spacing={1.2}>
                  <Typography fontWeight={800} color={textMain}>Datos de tu cita</Typography>
                  <Stack direction="row" spacing={1.1} alignItems="center">
                    <EventIcon fontSize="small" />
                    <Typography variant="body2" color={textMain}>{formatDate(successAgenda.fecha_inicio)}</Typography>
                  </Stack>
                  <Stack direction="row" spacing={1.1} alignItems="center">
                    <PlaceIcon fontSize="small" />
                    <Typography variant="body2" color={textMain}>{successAgenda.ciudad || form.ciudad || "—"}</Typography>
                  </Stack>
                  <Stack direction="row" spacing={1.1} alignItems="center">
                    <StatusChip status="pendiente" label="pendiente" />
                  </Stack>
                </Stack>
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2, borderRadius: 3, backgroundColor: surfaceBg, border: `1px solid ${borderColor}` }}>
                <Typography fontWeight={800} color={textMain} sx={{ mb: 1 }}>
                  Lleva a tu cita
                </Typography>

                <List dense disablePadding>
                  {documentosDespues.map((item) => (
                    <ListItem key={item} disableGutters sx={{ py: 0.2 }}>
                      <ListItemIcon sx={{ minWidth: 28, color: neonGreen }}>
                        <CheckCircleIcon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText
                        primaryTypographyProps={{ variant: "body2", color: textMain }}
                        primary={item}
                      />
                    </ListItem>
                  ))}
                </List>
              </Paper>
            </Grid>
          </Grid>

          <Alert severity="success" sx={{ mt: 2 }}>
            Ya puedes cerrar esta pantalla. Tu cita quedó guardada.
          </Alert>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mt: 2 }}>
            <Button
              fullWidth
              variant="contained"
              onClick={() => window.history.back()}
              sx={{
                bgcolor: neonGreen,
                color: "#fff",
                fontWeight: 900,
                textTransform: "none",
                "&:hover": { bgcolor: "#00b34a" },
              }}
            >
              Volver
            </Button>
          </Stack>
        </Card>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1100, mx: "auto", p: { xs: 1.5, md: 2 }, pb: 8, bgcolor: lightBg, minHeight: "100vh" }}>
      <Card sx={{ mb: 2 }}>
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1.5 }}>
          <Avatar sx={{ bgcolor: "rgba(37,99,235,0.10)", color: accentBlue }}>
            <DirectionsCarIcon />
          </Avatar>
          <Box>
            <Typography variant="h5" fontWeight={900} color={textMain}>
              Preregistro de conductor
            </Typography>
            <Typography variant="body2" sx={{ color: textMuted }}>
              Hoy pedimos datos básicos, validación de identidad y los archivos iniciales.
            </Typography>
          </Box>
        </Stack>

        {notice ? <Alert severity="info" sx={{ mb: 2 }}>{notice}</Alert> : null}
        {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}

        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, borderRadius: 3, backgroundColor: surfaceBg, border: `1px solid ${borderColor}` }}>
              <Typography fontWeight={800} color={textMain} sx={{ mb: 1 }}>
                Lo que pedimos hoy
              </Typography>

              <List dense disablePadding>
                <ListItem disableGutters sx={{ py: 0.2 }}>
                  <ListItemIcon sx={{ minWidth: 28, color: accentBlue }}><PersonIcon fontSize="small" /></ListItemIcon>
                  <ListItemText primaryTypographyProps={{ variant: "body2", color: textMain }} primary="Nombre completo" />
                </ListItem>
                <ListItem disableGutters sx={{ py: 0.2 }}>
                  <ListItemIcon sx={{ minWidth: 28, color: accentBlue }}><PhoneIcon fontSize="small" /></ListItemIcon>
                  <ListItemText primaryTypographyProps={{ variant: "body2", color: textMain }} primary="Teléfono activo" />
                </ListItem>
                <ListItem disableGutters sx={{ py: 0.2 }}>
                  <ListItemIcon sx={{ minWidth: 28, color: accentBlue }}><BadgeIcon fontSize="small" /></ListItemIcon>
                  <ListItemText primaryTypographyProps={{ variant: "body2", color: textMain }} primary="CURP y RFC" />
                </ListItem>
                <ListItem disableGutters sx={{ py: 0.2 }}>
                  <ListItemIcon sx={{ minWidth: 28, color: accentBlue }}><UploadFileIcon fontSize="small" /></ListItemIcon>
                  <ListItemText primaryTypographyProps={{ variant: "body2", color: textMain }} primary="INE frente, INE reverso y foto con credencial" />
                </ListItem>
                <ListItem disableGutters sx={{ py: 0.2 }}>
                  <ListItemIcon sx={{ minWidth: 28, color: accentBlue }}><DescriptionIcon fontSize="small" /></ListItemIcon>
                  <ListItemText primaryTypographyProps={{ variant: "body2", color: textMain }} primary="Archivos adicionales en files" />
                </ListItem>
              </List>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, borderRadius: 3, backgroundColor: surfaceBg, border: `1px solid ${borderColor}` }}>
              <Typography fontWeight={800} color={textMain} sx={{ mb: 1 }}>
                Lo que se revisa después
              </Typography>

              <List dense disablePadding>
                {documentosDespues.map((item) => (
                  <ListItem key={item} disableGutters sx={{ py: 0.2 }}>
                    <ListItemIcon sx={{ minWidth: 28, color: neonGreen }}>
                      <SecurityIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primaryTypographyProps={{ variant: "body2", color: textMain }} primary={item} />
                  </ListItem>
                ))}
              </List>
            </Paper>
          </Grid>
        </Grid>
      </Card>

      {existingAgenda ? (
        <Card sx={{ mb: 2 }}>
          <Stack spacing={1.2}>
            <Stack direction="row" spacing={1.2} alignItems="center">
              <WarningAmberIcon />
              <Typography variant="h6" fontWeight={900} color={textMain}>
                Ya tienes una cita registrada
              </Typography>
            </Stack>

            <Typography variant="body2" sx={{ color: textMuted }}>
              No puedes crear otra cita porque ya encontramos una existente para este usuario.
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2, borderRadius: 3, backgroundColor: surfaceBg, border: `1px solid ${borderColor}` }}>
                  <Stack spacing={1}>
                    <Typography fontWeight={800} color={textMain}>Datos de la cita</Typography>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <EventIcon fontSize="small" />
                      <Typography variant="body2" color={textMain}>{formatDate(existingAgenda.fecha_inicio)}</Typography>
                    </Stack>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <PlaceIcon fontSize="small" />
                      <Typography variant="body2" color={textMain}>
                        {existingAgenda.ciudad || "—"} {existingAgenda.estado ? `• ${existingAgenda.estado}` : ""}
                      </Typography>
                    </Stack>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <StatusChip status={existingAgenda.estado || "pendiente"} label={existingAgenda.estado || "pendiente"} />
                    </Stack>
                  </Stack>
                </Paper>
              </Grid>

              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2, borderRadius: 3, backgroundColor: surfaceBg, border: `1px solid ${borderColor}` }}>
                  <Typography fontWeight={800} color={textMain} sx={{ mb: 1 }}>
                    Lleva a tu cita
                  </Typography>
                  <List dense disablePadding>
                    {documentosDespues.map((item) => (
                      <ListItem key={item} disableGutters sx={{ py: 0.2 }}>
                        <ListItemIcon sx={{ minWidth: 28, color: neonGreen }}>
                          <CheckCircleIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText primaryTypographyProps={{ variant: "body2", color: textMain }} primary={item} />
                      </ListItem>
                    ))}
                  </List>
                </Paper>
              </Grid>
            </Grid>
          </Stack>
        </Card>
      ) : null}

      <Card>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Nombre completo"
              value={form.nombre_completo}
              onChange={(e) => setForm((p) => ({ ...p, nombre_completo: e.target.value }))}
              disabled={readOnlyMode}
              helperText={fieldErrors.nombre_completo || "Debe coincidir con tu identificación oficial."}
              error={Boolean(fieldErrors.nombre_completo)}
              sx={{
                "& .MuiInputBase-root": { backgroundColor: "#fff" },
              }}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Teléfono"
              value={form.telefono}
              onChange={(e) => setForm((p) => ({ ...p, telefono: e.target.value }))}
              disabled={readOnlyMode}
              helperText={fieldErrors.telefono || "Usa tu número activo para contacto y confirmación."}
              error={Boolean(fieldErrors.telefono)}
              inputProps={{ inputMode: "numeric" }}
              sx={{
                "& .MuiInputBase-root": { backgroundColor: "#fff" },
              }}
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              type="date"
              label="Fecha de nacimiento"
              value={form.fecha_nacimiento}
              onChange={(e) => setForm((p) => ({ ...p, fecha_nacimiento: e.target.value }))}
              disabled={readOnlyMode}
              InputLabelProps={{ shrink: true }}
              helperText={fieldErrors.fecha_nacimiento || "La usaremos para validar tu perfil."}
              error={Boolean(fieldErrors.fecha_nacimiento)}
              sx={{
                "& .MuiInputBase-root": { backgroundColor: "#fff" },
              }}
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Ciudad"
              value={form.ciudad}
              onChange={(e) => setForm((p) => ({ ...p, ciudad: e.target.value }))}
              disabled={readOnlyMode}
              helperText={fieldErrors.ciudad || "Indica la ciudad donde harás tu cita."}
              error={Boolean(fieldErrors.ciudad)}
              sx={{
                "& .MuiInputBase-root": { backgroundColor: "#fff" },
              }}
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="CURP"
              value={form.curp}
              onChange={(e) => setForm((p) => ({ ...p, curp: e.target.value.toUpperCase() }))}
              disabled={readOnlyMode}
              helperText={fieldErrors.curp || "Escríbela completa y sin espacios."}
              error={Boolean(fieldErrors.curp)}
              inputProps={{ maxLength: 18 }}
              sx={{
                "& .MuiInputBase-root": { backgroundColor: "#fff" },
              }}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="RFC"
              value={form.rfc}
              onChange={(e) => setForm((p) => ({ ...p, rfc: e.target.value.toUpperCase() }))}
              disabled={readOnlyMode}
              helperText={fieldErrors.rfc || "Escríbelo tal como aparece en tu constancia."}
              error={Boolean(fieldErrors.rfc)}
              inputProps={{ maxLength: 13 }}
              sx={{
                "& .MuiInputBase-root": { backgroundColor: "#fff" },
              }}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              type="date"
              label="Fecha de la cita"
              value={fecha}
              onChange={(e) => {
                setFecha(e.target.value);
                setHora("");
              }}
              disabled={readOnlyMode}
              InputLabelProps={{ shrink: true }}
              helperText={fieldErrors.fecha || "Elige el día para tu prerregistro."}
              error={Boolean(fieldErrors.fecha)}
              sx={{
                "& .MuiInputBase-root": { backgroundColor: "#fff" },
              }}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            {loadingHoras ? (
              <Paper sx={{ p: 2, borderRadius: 3, backgroundColor: surfaceBg, border: `1px solid ${borderColor}` }}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <CircularProgress size={22} />
                  <Typography variant="body2" color={textMain}>Buscando horarios disponibles...</Typography>
                </Stack>
              </Paper>
            ) : (
              <TextField
                select
                fullWidth
                label="Hora"
                value={hora}
                onChange={(e) => setHora(e.target.value)}
                disabled={readOnlyMode || !fecha}
                helperText={fieldErrors.hora || "Selecciona una hora libre para la cita."}
                error={Boolean(fieldErrors.hora)}
                sx={{
                  "& .MuiInputBase-root": { backgroundColor: "#fff" },
                }}
              >
                {horasDisponibles.map((h) => (
                  <MenuItem key={h} value={h}>
                    {h}
                  </MenuItem>
                ))}
              </TextField>
            )}
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, borderRadius: 3, backgroundColor: surfaceBg, border: `1px solid ${borderColor}` }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                <InfoIcon fontSize="small" />
                <Typography fontWeight={800} color={textMain}>Notas</Typography>
              </Stack>
              <Typography variant="caption" sx={{ color: textMuted }}>
                Si ya tienes archivos cargados en tu usuario, el sistema los conserva. Si subes otros nuevos, se agregan al campo <strong>files</strong>.
              </Typography>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <UploadCard
              title="INE frente"
              helper={documentosAhora[0].helper}
              file={uploadDocs.ine_frente}
              existingFile={currentDocs.ine_frente}
              onChange={(file) => setUploadDocs((p) => ({ ...p, ine_frente: file }))}
              accept={documentosAhora[0].accept}
              disabled={readOnlyMode}
              required
              icon={documentosAhora[0].icon}
            />
            {fieldErrors.ine_frente ? (
              <Typography variant="caption" sx={{ color: "#dc2626", mt: 0.5, display: "block" }}>
                {fieldErrors.ine_frente}
              </Typography>
            ) : null}
          </Grid>

          <Grid item xs={12} md={6}>
            <UploadCard
              title="INE reverso"
              helper={documentosAhora[1].helper}
              file={uploadDocs.ine_tras}
              existingFile={currentDocs.ine_tras}
              onChange={(file) => setUploadDocs((p) => ({ ...p, ine_tras: file }))}
              accept={documentosAhora[1].accept}
              disabled={readOnlyMode}
              required
              icon={documentosAhora[1].icon}
            />
            {fieldErrors.ine_tras ? (
              <Typography variant="caption" sx={{ color: "#dc2626", mt: 0.5, display: "block" }}>
                {fieldErrors.ine_tras}
              </Typography>
            ) : null}
          </Grid>

          <Grid item xs={12} md={6}>
            <UploadCard
              title="Foto con credencial"
              helper={documentosAhora[2].helper}
              file={uploadDocs.foto_credencial}
              existingFile={currentDocs.foto_credencial}
              onChange={(file) => setUploadDocs((p) => ({ ...p, foto_credencial: file }))}
              accept={documentosAhora[2].accept}
              disabled={readOnlyMode}
              required
              icon={documentosAhora[2].icon}
            />
            {fieldErrors.foto_credencial ? (
              <Typography variant="caption" sx={{ color: "#dc2626", mt: 0.5, display: "block" }}>
                {fieldErrors.foto_credencial}
              </Typography>
            ) : null}
          </Grid>

          <Grid item xs={12} md={6}>
            <UploadCard
              title="Archivos adicionales"
              helper={documentosAhora[3].helper}
              file={uploadDocs.files}
              existingFile={currentDocs.files}
              onChange={(files) => setUploadDocs((p) => ({ ...p, files }))}
              accept={documentosAhora[3].accept}
              disabled={readOnlyMode}
              multiple
              icon={documentosAhora[3].icon}
            />
            <Typography variant="caption" sx={{ color: textMuted, display: "block", mt: 0.5 }}>
              Tienes {extraDocsCount} archivo(s) guardado(s) actualmente en el perfil.
            </Typography>
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              minRows={4}
              label="Observaciones opcionales"
              value={existingUser?.observaciones || ""}
              disabled={readOnlyMode}
              helperText="Escribe aquí algo que el validador deba saber antes de tu cita."
              onChange={() => {}}
              sx={{
                "& .MuiInputBase-root": { backgroundColor: "#fff" },
              }}
            />
          </Grid>
        </Grid>

        <Divider sx={{ my: 2, borderColor }} />

        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
          <Button
            fullWidth
            variant="contained"
            onClick={handleSubmit}
            disabled={loadingSubmit || readOnlyMode}
            startIcon={loadingSubmit ? <CircularProgress size={18} color="inherit" /> : <CheckCircleIcon />}
            sx={{
              bgcolor: neonGreen,
              color: "#fff",
              fontWeight: 900,
              height: 52,
              textTransform: "none",
              "&:hover": { bgcolor: "#00b34a" },
              "&.Mui-disabled": { bgcolor: "rgba(0,200,83,0.25)", color: "rgba(255,255,255,0.75)" },
            }}
          >
            {loadingSubmit ? "Guardando cita..." : readOnlyMode ? "Ya existe una cita" : "Agendar cita"}
          </Button>

          <Button
            fullWidth
            variant="outlined"
            onClick={() => window.history.back()}
            startIcon={<CancelIcon />}
            sx={{ height: 52, fontWeight: 800, textTransform: "none" }}
          >
            Cancelar
          </Button>
        </Stack>
      </Card>
    </Box>
  );
};

export default PreregistroConductor2;