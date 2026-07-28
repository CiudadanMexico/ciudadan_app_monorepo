export const normalizeEntity = (entity) => {
  if (!entity) return null;
  if (entity.attributes) return { id: entity.id, ...entity.attributes };
  return entity;
};

export const normalizeMediaField = (field) => {
  if (!field) return null;
  const raw = field?.data !== undefined ? field.data : field;
  if (!raw) return null;
  if (Array.isArray(raw)) return raw.map(normalizeEntity).filter(Boolean);
  return normalizeEntity(raw);
};

export const getMediaId = (field) => {
  const normalized = normalizeMediaField(field);
  if (!normalized) return null;
  if (Array.isArray(normalized)) return normalized.map((item) => item?.id).filter(Boolean);
  return normalized?.id || null;
};

export const parseJsonSafe = async (res) => {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

// helpers para el formulario de verificacion
export const formatPhoneDigits = (value) => {
  const digits = String(value || '')
    .replace(/\D/g, '')
    .slice(0, 10);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 2)} ${digits.slice(2)}`;
  return `${digits.slice(0, 2)} ${digits.slice(2, 6)} ${digits.slice(6, 10)}`;
};

export const getFullPhone = (digits) =>
  `+52${String(digits || '')
    .replace(/\D/g, '')
    .slice(0, 10)}`;

export const OTP_LENGTH = 6;

export const toOtpArray = (code) =>
  String(code || '')
    .replace(/\D/g, '')
    .slice(0, OTP_LENGTH)
    .split('')
    .concat(Array.from({ length: OTP_LENGTH }, () => ''))
    .slice(0, OTP_LENGTH);
