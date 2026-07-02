import { isFuture, parseISO } from "date-fns";
import { FILE_RULES } from "./fileRules";

export const onlyDigits = (value) => String(value || "").replace(/\D/g, "");

export const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
export const isValidPhone = (value) => /^\d{10}$/.test(onlyDigits(value));
export const isValidCurp = (value) =>
  /^[A-Z]{4}[0-9]{6}[HM][A-Z]{5}[A-Z0-9][0-9]$/.test(
    String(value || "")
      .trim()
      .toUpperCase()
  );
export const isValidRfc = (value) =>
  /^([A-ZÑ&]{3,4})\d{6}[A-Z0-9]{3}$/.test(
    String(value || "")
      .trim()
      .toUpperCase()
  );
export const isValidZipCode = (value) => /^\d{5}$/.test(String(value || "").trim());
export const isValidVin = (value) =>
  /^[A-HJ-NPR-Z0-9]{17}$/.test(
    String(value || "")
      .trim()
      .toUpperCase()
  );
export const isValidLicensePlate = (value) =>
  /^[A-Z0-9-]{5,10}$/.test(
    String(value || "")
      .trim()
      .toUpperCase()
  );

export const isPastOrTodayDate = (value) => {
  if (!value) return false;
  try {
    return !isFuture(parseISO(String(value)));
  } catch {
    return false;
  }
};

export const isFutureOrTodayDate = (value) => {
  if (!value) return false;
  try {
    const target = parseISO(String(value));
    if (Number.isNaN(target.getTime())) return false;
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return target.getTime() >= startOfToday.getTime();
  } catch {
    return false;
  }
};

export const isFutureDateTime = (value) => {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return date.getTime() > Date.now();
};

export const buildFileError = (label, reason) => `${label}: ${reason}`;

const inferFileName = (entry) => entry?.name || entry?.attributes?.name || "archivo";
const inferFileType = (entry) => entry?.type || entry?.mime || entry?.attributes?.mime || "";
const inferFileSize = (entry) => entry?.size || entry?.attributes?.size || 0;

export const validateFilesByRule = (fieldName, value) => {
  const rule = FILE_RULES[fieldName];
  if (!rule) return true;

  if (!value || (Array.isArray(value) && value.length === 0)) return true;

  const files = Array.isArray(value) ? value : [value];
  if (rule.maxFiles && files.length > rule.maxFiles) {
    return `Solo puedes subir hasta ${rule.maxFiles} archivo(s).`;
  }

  for (const item of files) {
    const type = inferFileType(item);
    const size = inferFileSize(item);
    const name = inferFileName(item);

    if (rule.accept.includes("image/*") && type && !type.startsWith("image/") && type !== "application/pdf") {
      return buildFileError(name, "solo se permiten imagen o PDF");
    }
    if (rule.maxSize && Number(size) > rule.maxSize) {
      return buildFileError(name, `supera ${Math.round(rule.maxSize / 1024 / 1024)}MB`);
    }
  }

  return true;
};
