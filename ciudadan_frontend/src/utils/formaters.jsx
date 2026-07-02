/**
 * =====================================================
 * UTILIDADES DE FORMATO
 * Archivo: /utils/formaters.js
 * =====================================================
 */

/**
 * Formatea segundos a mm:ss
 * Ejemplo: 125 → "2:05"
 */
const formatTime = (seconds) => {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs < 10 ? "0" : ""}${secs}`;
};

/**
 * Formatea precios
 * - enteros → solo parte entera
 * - decimales → solo decimales
 * - default → precio completo con 2 decimales
 */
const formatPrice = (price, type) => {
  const priceFormatted = parseFloat(price).toFixed(2);
  const [integerPart, decimalPart] = priceFormatted.split(".");

  if (type === "enteros") return integerPart;
  if (type === "decimales") return decimalPart;

  return priceFormatted;
};

/**
 * Inserta "Interior X" dentro de una dirección
 * antes de la palabra "Colonia" si existe
 */
const formatearDireccionConInterior = (direccion, numeroInterior) => {
  if (!direccion || typeof direccion !== "string") return "";

  // Si no hay número interior, regresamos la dirección tal cual
  if (!numeroInterior) return direccion;

  // Caso ideal: la dirección incluye "Colonia"
  if (direccion.includes("Colonia")) {
    return direccion.replace(
      ", Colonia",
      `, Interior ${numeroInterior}, Colonia`
    );
  }

  // Fallback si no trae colonia
  return `${direccion}, Interior ${numeroInterior}`;
};

/**
 * Capitaliza la primera letra de CADA palabra
 * Ejemplo:
 * "club cooperativo oaxaca" → "Club Cooperativo Oaxaca"
 */
const capitalizeWords = (text) => {
  if (!text || typeof text !== "string") return text;

  return text
    .toLowerCase()
    .split(" ")
    .map((word) =>
      word ? word.charAt(0).toUpperCase() + word.slice(1) : ""
    )
    .join(" ");
};

/**
 * Capitaliza SOLO la primera letra de la frase
 * Ej: "club cooperativo oaxaca" → "Club cooperativo oaxaca"
 */
const capitalizePhrase = (text) => {
  if (!text || typeof text !== "string") return text;

  const normalized = text.trim().toLowerCase();
  if (!normalized) return normalized;

  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

const buildSlug = (text = "") => {
  return text
    .toString()
    .toLowerCase()
    .normalize("NFD")                 // separa acentos
    .replace(/[\u0300-\u036f]/g, "") // elimina acentos
    .replace(/[^a-z0-9\s-]/g, "")    // elimina símbolos raros
    .trim()
    .replace(/\s+/g, "-")            // espacios a guiones
    .replace(/-+/g, "-");            // guiones dobles
};

/**
 * Exportamos todo en un solo objeto
 * para mantener el mismo patrón que ya usas
 */
const formaters = {
  formatTime,
  formatPrice,
  formatearDireccionConInterior,
  capitalizeWords,
  capitalizePhrase,
  buildSlug,
};

export default formaters;
