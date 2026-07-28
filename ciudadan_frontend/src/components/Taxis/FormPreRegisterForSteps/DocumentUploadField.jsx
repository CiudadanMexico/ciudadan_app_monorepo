import React, { useEffect, useMemo } from "react";
import { useFormContext } from "react-hook-form";
import { Box, Button, Chip, FormHelperText, Paper, Stack, Typography } from "@mui/material";
import { FILE_RULES } from "@/utils/preRegisterForSteps/fileRules";
import { validateFileField } from "@/utils/preRegisterForSteps/stepValidators";

const inferName = (file) => file?.name || file?.attributes?.name || "Archivo";

const inferPreviewUrl = (entry) => {
  if (entry instanceof File && entry.type?.startsWith("image/")) return URL.createObjectURL(entry);
  const direct = entry?.url || entry?.attributes?.url || "";
  if (!direct) return "";
  if (direct.startsWith("http")) return direct;
  const host = process.env.REACT_APP_STRAPI_URL || "";
  return `${host}${direct}`;
};

const RESUB_HIGHLIGHT_SX = {
  border: "2px solid #7c3aed",
  bgcolor: "#faf5ff",
  boxShadow: "0 0 0 3px rgba(124, 58, 237, 0.18)",
};

const DocumentUploadField = ({
  name,
  label,
  helper,
  required = false,
  highlightResub = false,
  resubStatusLabel = null,
  resubReviewerNote = null,
}) => {
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = useFormContext();

  const rules = FILE_RULES[name] || { multiple: false, accept: "image/*,application/pdf" };
  const value = watch(name);
  const list = useMemo(() => (Array.isArray(value) ? value : value ? [value] : []), [value]);

  useEffect(() => {
    register(name, {
      validate: (fieldValue) => {
        const listValue = Array.isArray(fieldValue) ? fieldValue : fieldValue ? [fieldValue] : [];
        if (required && !listValue.length) return "Este archivo es obligatorio.";
        const fileValidation = validateFileField(name, fieldValue);
        return fileValidation === true ? true : fileValidation;
      },
    });
  }, [name, register, required]);

  const preview = useMemo(() => {
    if (rules.multiple || !list.length) return "";
    return inferPreviewUrl(list[0]);
  }, [list, rules.multiple]);

  const onSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (rules.multiple) {
      const previous = Array.isArray(value) ? value : [];
      setValue(name, [...previous, ...files], { shouldValidate: true, shouldDirty: true });
    } else {
      setValue(name, files[0] || null, { shouldValidate: true, shouldDirty: true });
    }
  };

  const hasError = Boolean(errors?.[name]);

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        borderRadius: 2,
        ...(highlightResub
          ? RESUB_HIGHLIGHT_SX
          : { border: "1px solid #e2e8f0", bgcolor: "#f8fafc" }),
      }}
    >
      <Stack spacing={1}>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <Typography fontWeight={700}>
            {label}
            {required ? " *" : ""}
          </Typography>
          {highlightResub ? (
            <Chip
              label={resubStatusLabel || "Reenvío requerido"}
              size="small"
              sx={{
                bgcolor: "#ede9fe",
                color: "#5b21b6",
                fontWeight: 700,
                border: "1px solid #7c3aed",
              }}
            />
          ) : null}
        </Stack>
        <Typography variant="caption" sx={{ color: "#64748b" }}>
          {helper}
        </Typography>
        {highlightResub && resubReviewerNote ? (
          <Typography variant="caption" sx={{ color: "#6d28d9", fontWeight: 600 }}>
            Nota del revisor: {resubReviewerNote}
          </Typography>
        ) : null}

        <Button component="label" variant="outlined" sx={{ textTransform: "none", width: "fit-content" }}>
          {rules.multiple ? "Agregar archivos" : "Seleccionar archivo"}
          <input hidden type="file" accept={rules.accept} multiple={Boolean(rules.multiple)} onChange={onSelect} />
        </Button>

        {!rules.multiple && preview ? (
          <Box component="a" href={preview} target="_blank" rel="noreferrer" sx={{ textDecoration: "none" }}>
            <Box
              component="img"
              src={preview}
              alt={label}
              sx={{ width: "100%", maxHeight: 170, borderRadius: 2, objectFit: "cover", border: "1px solid #e2e8f0" }}
            />
          </Box>
        ) : null}

        <Stack direction="row" gap={0.8} useFlexGap flexWrap="wrap">
          {list.length
            ? list.map((item, idx) => <Chip key={`${name}-${idx}`} label={inferName(item)} size="small" />)
            : null}
        </Stack>

        {hasError ? <FormHelperText error>{errors[name]?.message}</FormHelperText> : null}
      </Stack>
    </Paper>
  );
};

export default DocumentUploadField;
