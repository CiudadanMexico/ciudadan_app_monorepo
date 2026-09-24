export const TIPOS = [
  { value: 'conductor', label: 'Conductor', title: 'Quiero conducir', detail: 'Tus viajes. Tu esfuerzo. El 100% para ti.', number: '01' },
  { value: 'lider', label: 'Líder de conductores', title: 'Quiero ser líder de conductores', detail: 'Forma tu red. Crece con tu comunidad.', number: '02' },
  { value: 'socio-estatal', label: 'Socio estatal', title: 'Quiero ser socio estatal', detail: 'Impulsa Ciudadan desde tu estado.', number: '03' },
];
export const ESTADOS = ['Aguascalientes', 'Baja California', 'Baja California Sur', 'Campeche', 'Chiapas', 'Chihuahua', 'Ciudad de México', 'Coahuila', 'Colima', 'Durango', 'Estado de México', 'Guanajuato', 'Guerrero', 'Hidalgo', 'Jalisco', 'Michoacán', 'Morelos', 'Nayarit', 'Nuevo León', 'Oaxaca', 'Puebla', 'Querétaro', 'Quintana Roo', 'San Luis Potosí', 'Sinaloa', 'Sonora', 'Tabasco', 'Tamaulipas', 'Tlaxcala', 'Veracruz', 'Yucatán', 'Zacatecas'];
export const ASIGNADOS = ['Ciudad de México', 'Estado de México'];
export const CIERRE = Date.parse('2026-10-09T00:00:00-06:00');
export const esTipo = value => TIPOS.some(tipo => tipo.value === value);
export const normalizarTelefono = value => {
  let digits = String(value || '').replace(/\D/g, '');
  if (digits.length === 13 && digits.startsWith('521')) digits = digits.slice(3);
  if (digits.length === 12 && digits.startsWith('52')) digits = digits.slice(2);
  return /^\d{10}$/.test(digits) ? `+52${digits}` : null;
};
export function urlRedireccion(tipo, location, origin) {
  const params = new URLSearchParams(location.search);
  params.set('tipo', tipo);
  params.set('origen', `${origin}${location.pathname}${location.search}${location.hash || ''}`);
  return `/prelanzamiento?${params.toString()}`;
}
export function atribucion(location, origin) {
  const params = new URLSearchParams(location.search);
  let origen = `${origin}${location.pathname}${location.search}`;
  try {
    const candidate = new URL(params.get('origen'));
    if (['http:', 'https:'].includes(candidate.protocol)) origen = candidate.href;
  } catch { /* Una visita directa usa la URL actual. */ }
  return {
    origen,
    utm: Object.fromEntries([...params].filter(([key]) => /^utm_[a-z_]{1,40}$/.test(key))),
    lider: params.get('lider') || params.get('ref') || params.get('codigo') || '',
  };
}
export function validarFormulario(values, tipo) {
  const errors = {};
  const required = ['nombre', 'estado', 'municipio'];
  if (tipo === 'conductor') required.push('vehiculo', 'ciudad');
  if (tipo === 'lider') required.push('invitados', 'conduce', 'ciudad');
  if (tipo === 'socio-estatal') required.push('estadoSolicitado', 'experiencia', 'nodo');
  required.forEach(key => { if (!String(values[key] || '').trim()) errors[key] = 'Completa este campo.'; });
  if (!esTipo(tipo)) errors.tipo = 'Selecciona cómo quieres participar.';
  if (String(values.nombre || '').trim().length < 3) errors.nombre = 'Escribe tu nombre completo.';
  if (!normalizarTelefono(values.telefono)) errors.telefono = 'Escribe 10 dígitos, con o sin +52.';
  if (!values.consentimiento) errors.consentimiento = 'Acepta el aviso de privacidad y autoriza el contacto.';
  if (tipo === 'socio-estatal') {
    ['estado', 'estadoSolicitado'].forEach(key => {
      if (ASIGNADOS.includes(values[key])) errors[key] = 'Este estado ya está asignado.';
    });
    if (String(values.experiencia || '').trim().length < 10) errors.experiencia = 'Cuéntanos un poco más (mínimo 10 caracteres).';
  }
  return errors;
}
