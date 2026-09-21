'use strict';

const ESTADOS = ['Aguascalientes', 'Baja California', 'Baja California Sur', 'Campeche', 'Chiapas', 'Chihuahua', 'Ciudad de México', 'Coahuila', 'Colima', 'Durango', 'Estado de México', 'Guanajuato', 'Guerrero', 'Hidalgo', 'Jalisco', 'Michoacán', 'Morelos', 'Nayarit', 'Nuevo León', 'Oaxaca', 'Puebla', 'Querétaro', 'Quintana Roo', 'San Luis Potosí', 'Sinaloa', 'Sonora', 'Tabasco', 'Tamaulipas', 'Tlaxcala', 'Veracruz', 'Yucatán', 'Zacatecas'];
const CIERRE = Date.parse('2026-10-09T00:00:00-06:00');
const normalizarTelefono = value => {
  let digits = String(value || '').replace(/\D/g, '');
  if (digits.length === 13 && digits.startsWith('521')) digits = digits.slice(3);
  if (digits.length === 12 && digits.startsWith('52')) digits = digits.slice(2);
  return /^\d{10}$/.test(digits) ? `+52${digits}` : null;
};

function validarRegistro(input, now = Date.now()) {
  const errors = {};
  const data = {};
  const texto = (key, min = 2, max = 160) => {
    const value = typeof input[key] === 'string' ? input[key].trim() : '';
    if (value.length < min || value.length > max) errors[key] = 'Completa este campo con una respuesta válida.';
    data[key] = value;
    return value;
  };
  const opcion = (key, choices) => {
    data[key] = input[key];
    if (!choices.includes(input[key])) errors[key] = 'Selecciona una opción válida.';
  };
  if (now >= CIERRE) errors.general = 'El registro de prelanzamiento cerró el 9 de octubre de 2026.';
  opcion('tipo', ['conductor', 'lider', 'socio-estatal']);
  texto('nombre', 3, 160);
  data.telefono = normalizarTelefono(input.telefono);
  if (!data.telefono) errors.telefono = 'Escribe un WhatsApp mexicano de 10 dígitos, con o sin +52.';
  opcion('estado', ESTADOS);
  texto('municipio');
  if (input.consentimiento !== true) errors.consentimiento = 'Debes aceptar el aviso de privacidad y autorizar el contacto.';
  data.consentimiento = true;
  data.avisoVersion = 'prelanzamiento-2026-09';
  if (data.tipo === 'conductor') {
    opcion('vehiculo', ['taxi', 'plataforma', 'ambos']);
    texto('ciudad');
    texto('lider', 0, 120);
  }
  if (data.tipo === 'lider') {
    opcion('invitados', ['1-20', '21-50', '51-100', 'mas-100']);
    opcion('conduce', ['taxi', 'plataforma', 'ambos', 'no']);
    texto('ciudad');
  }
  if (data.tipo === 'socio-estatal') {
    const disponibles = ESTADOS.filter(e => !['Ciudad de México', 'Estado de México'].includes(e));
    opcion('estadoSolicitado', disponibles);
    if (!disponibles.includes(data.estado)) errors.estado = 'CDMX y Estado de México ya están asignados.';
    texto('experiencia', 10, 2000);
    opcion('nodo', ['si', 'parcial', 'no']);
  }
  texto('origen', 1, 2000);
  try {
    const url = new URL(data.origen);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
  } catch { errors.origen = 'La URL de origen no es válida.'; }
  data.utm = {};
  if (input.utm && typeof input.utm === 'object' && !Array.isArray(input.utm)) {
    Object.entries(input.utm).forEach(([key, value]) => {
      if (/^utm_[a-z_]{1,40}$/.test(key) && typeof value === 'string') data.utm[key] = value.slice(0, 300);
    });
  }
  data.fecha = new Date(now).toISOString();
  data.promocionReservada = data.tipo === 'conductor' && now < CIERRE;
  data.seguimiento = 'pendiente';
  return { data, errors };
}
module.exports = { ESTADOS, CIERRE, normalizarTelefono, validarRegistro };
