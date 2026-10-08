/**
 * Utilidades puras de la landing de descarga (sin React ni peticiones) para
 * poder probarlas con Jest.
 */

const ZONA_HORARIA = 'America/Mexico_City';

/** Solo estructura de correo: la entrega la decide Brevo. */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

export function validarCorreo(email) {
  if (!email || !String(email).trim()) return 'Escribe tu correo para enviarte el enlace.';
  if (!EMAIL_RE.test(String(email).trim())) return 'Ese correo no parece válido. Revísalo e intenta de nuevo.';
  return null;
}

/** `$500` / `$450.50` sin depender de la locale del navegador. */
export function formatearPrecio(valor, currency = 'MXN') {
  const numero = typeof valor === 'number' ? valor : parseFloat(valor);
  if (!Number.isFinite(numero)) return null;
  const decimales = numero % 1 === 0 ? 0 : 2;
  const cifra = new Intl.NumberFormat('es-MX', { minimumFractionDigits: decimales, maximumFractionDigits: 2 }).format(numero);
  return `${String(currency).toUpperCase() === 'MXN' ? '$' : `${String(currency).toUpperCase()} `}${cifra}`;
}

/** 12 meses → "tu primer año"; cualquier otro valor → "N meses". */
export function textoDuracion(meses) {
  const numero = parseInt(meses, 10);
  if (!Number.isFinite(numero) || numero <= 0) return 'el periodo promocional';
  if (numero === 1) return 'tu primer mes';
  if (numero === 12) return 'tu primer año';
  if (numero === 24) return 'tus primeros 2 años';
  return `tus primeros ${numero} meses`;
}

/**
 * Fecha de lanzamiento siempre derivada de `launch_at` (nunca hardcodear el día
 * de la semana) y siempre en hora del centro de México.
 */
export function formatearLanzamiento(launchAt, ahora = new Date()) {
  if (!launchAt) return null;
  const fecha = new Date(launchAt);
  if (Number.isNaN(fecha.getTime())) return null;
  const opciones = (extra = {}) => ({ timeZone: ZONA_HORARIA, ...extra });
  const dia = Number(fecha.toLocaleString('en-US', opciones({ day: 'numeric' })));
  const mesCorto = fecha.toLocaleString('es-MX', opciones({ month: 'short' })).replace(/\.$/, '').toUpperCase();
  const anio = Number(fecha.toLocaleString('en-US', opciones({ year: 'numeric' })));
  const larga = fecha.toLocaleString('es-MX', opciones({ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));
  const hora = fecha.toLocaleString('es-MX', opciones({ hour: 'numeric', minute: '2-digit' }));
  return {
    dia: Number.isFinite(dia) ? dia : '',
    mesCorto,
    anio: Number.isFinite(anio) ? anio : '',
    larga,
    hora,
    esFuturo: fecha.getTime() > ahora.getTime(),
    diasRestantes: Math.max(0, Math.ceil((fecha.getTime() - ahora.getTime()) / 86400000)),
  };
}

/**
 * Aviso honesto del peso del binario: cuánto tarda aproximadamente según la
 * conexión. Redondeamos hacia arriba para no prometer de menos.
 */
export function estimarDescarga(tamanoMb) {
  const mb = typeof tamanoMb === 'number' ? tamanoMb : parseFloat(tamanoMb);
  if (!Number.isFinite(mb) || mb <= 0) return null;
  const minutos = (mbps) => Math.max(1, Math.ceil(mb / mbps / 60));
  return {
    tamanoMb: Math.round(mb * 10) / 10,
    wifi: `≈ ${minutos(12.5)} min con Wi-Fi`,
    datos: `≈ ${minutos(3)} min con datos móviles`,
    espacio: `Deja al menos ${Math.ceil(mb * 2.5)} MB libres en el teléfono`,
  };
}

/** El APK sólo instala en Android: en iOS hay que avisar antes del tap. */
export const esAndroid = (userAgent = (typeof navigator !== 'undefined' ? navigator.userAgent : '')) =>
  /android/i.test(String(userAgent));

/** Claves de atribución que el backend acepta (utm* + referrer). */
export function atribucionDescarga(search = '', referrer = '') {
  const params = new URLSearchParams(search);
  const salida = {};
  [['utmSource', 'utm_source'], ['utmMedium', 'utm_medium'], ['utmCampaign', 'utm_campaign'], ['utmContent', 'utm_content']]
    .forEach(([camel, snake]) => {
      const valor = params.get(camel) || params.get(snake);
      if (valor) salida[camel] = String(valor).slice(0, 300);
    });
  const origen = params.get('ref') || params.get('referrer') || referrer;
  if (origen) salida.referrer = String(origen).slice(0, 1000);
  return salida;
}
