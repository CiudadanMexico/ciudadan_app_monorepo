import React, { useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, Checkbox, FormControlLabel, MenuItem, TextField, Typography } from '@mui/material';
import { ASIGNADOS, CIERRE, ESTADOS, TIPOS, normalizarTelefono, validarFormulario } from './datos';
import { registrarPrelanzamiento } from '../../services/prelanzamientoService';

const CONFIRMACION = {
  conductor: 'Registramos tu solicitud antes del lanzamiento para que puedas obtener la membresía promocional de $300 MXN mensuales durante tu primer año. Nuestro equipo te contactará para completar tu incorporación.',
  lider: 'Registramos tu solicitud para convertirte en uno de los 200 líderes fundadores. Nuestro equipo te contactará para explicarte cómo comenzar a formar tu red.',
  'socio-estatal': 'Registramos tu solicitud de socio estatal. Nuestro equipo revisará la disponibilidad del estado y se pondrá en contacto contigo para continuar el proceso.',
};

export default function Formulario({ tipo, cambiarTipo, origen, utm, lider, whatsapp, privacidad, cerrado }) {
  const [values, setValues] = useState({ nombre: '', telefono: '', estado: '', municipio: '', vehiculo: '', ciudad: '', lider, invitados: '', conduce: '', estadoSolicitado: '', experiencia: '', nodo: '', consentimiento: false });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(null);
  const lock = useRef(false);
  const resultRef = useRef(null);
  const formRef = useRef(null);
  useEffect(() => { if (success) resultRef.current?.focus(); }, [success]);
  const change = (key, value) => {
    setValues(prev => ({ ...prev, [key]: value }));
    setErrors(prev => ({ ...prev, [key]: undefined }));
  };
  const field = (key, label, options, extra = {}) => <TextField
    key={key} id={`pre-${key}`} name={key} label={label} value={values[key]}
    onChange={event => change(key, event.target.value)} fullWidth required={key !== 'lider'}
    select={!!options} error={!!errors[key]} helperText={errors[key] || extra.helperText}
    inputProps={{ maxLength: key === 'experiencia' ? 2000 : key === 'telefono' ? 25 : key === 'lider' ? 120 : 160 }}
    {...extra}
  >{options?.map(option => {
    const item = typeof option === 'string' ? { value: option, label: option } : option;
    return <MenuItem key={item.value} value={item.value} disabled={item.disabled}>{item.label}</MenuItem>;
  })}</TextField>;
  const estados = ESTADOS.map(value => ({ value, label: tipo === 'socio-estatal' && ASIGNADOS.includes(value) ? `${value} — asignado` : value, disabled: tipo === 'socio-estatal' && ASIGNADOS.includes(value) }));

  async function submit(event) {
    event.preventDefault();
    if (lock.current) return;
    const validation = validarFormulario(values, tipo);
    setErrors(validation);
    setError('');
    if (Object.keys(validation).length) {
      setTimeout(() => formRef.current?.querySelector('[aria-invalid="true"], input[name="consentimiento"]')?.focus(), 0);
      return;
    }
    if (Date.now() >= CIERRE) { setError('El prelanzamiento ya cerró.'); return; }
    lock.current = true;
    setSending(true);
    try {
      const result = await registrarPrelanzamiento({ ...values, tipo, telefono: normalizarTelefono(values.telefono), origen, utm });
      if (!result?.data?.recibido) throw new Error('No recibimos confirmación del registro. Inténtalo de nuevo.');
      setSuccess(result.data.tipo);
    } catch (err) { setError(err.message); }
    finally { lock.current = false; setSending(false); }
  }

  if (success) return <Box className='pre-confirmacion' ref={resultRef} tabIndex={-1} role='status'>
    <span className='pre-success-icon' aria-hidden='true'>✓</span>
    <Typography variant='h4' component='h2'>¡Tu registro fue recibido!</Typography>
    <p>Ya formas parte del prelanzamiento de Ciudadan.</p>
    <p>{CONFIRMACION[success]}</p>
    <p className='pre-muted'>No se realizó ningún cobro. La incorporación y la asignación están sujetas al proceso de revisión.</p>
    {whatsapp ? <Button variant='contained' href={whatsapp} target='_blank' rel='noopener noreferrer'>UNIRME AL GRUPO DE WHATSAPP</Button> : <p>El equipo te compartirá por WhatsApp el acceso al grupo oficial.</p>}
  </Box>;

  return <Box component='form' ref={formRef} onSubmit={submit} noValidate className='pre-form' aria-busy={sending}>
    <input type='hidden' name='modalidad' value={tipo} />
    <input type='hidden' name='url_origen' value={origen} />
    <input type='hidden' name='utm' value={JSON.stringify(utm)} />
    <Typography component='h2' variant='h4'>Regístrate antes del lanzamiento</Typography>
    <p className='pre-muted'>Lanzamiento oficial: <strong>9 de octubre de 2026</strong></p>
    <p>Todos los campos son obligatorios, excepto quién te invitó.</p>
    {cerrado && <Alert severity='info'>El registro de prelanzamiento ha finalizado.</Alert>}
    {error && <Alert severity='error' role='alert' sx={{ mb: 2 }}>{error}</Alert>}
    <fieldset disabled={sending || cerrado}>
      <legend className='pre-sr-only'>Datos de tu registro</legend>
      <TextField id='pre-tipo' name='tipo' select label='Tipo de participación' value={tipo} required fullWidth onChange={e => { cambiarTipo(e.target.value); setErrors({}); }}>
        {TIPOS.map(item => <MenuItem key={item.value} value={item.value}>{item.label}</MenuItem>)}
      </TextField>
      <div className='pre-form-grid'>
        {field('nombre', 'Nombre completo', null, { autoComplete: 'name' })}
        {field('telefono', 'Número de WhatsApp', null, { type: 'tel', autoComplete: 'tel', helperText: errors.telefono || 'México: 10 dígitos, con o sin +52.' })}
        {field('estado', 'Estado', estados)}
        {field('municipio', 'Municipio o alcaldía', null, { autoComplete: 'address-level2' })}
        {tipo === 'conductor' && <>
          {field('vehiculo', '¿Qué vehículo manejas actualmente?', [{ value: 'taxi', label: 'Taxi' }, { value: 'plataforma', label: 'Vehículo de plataforma' }, { value: 'ambos', label: 'Ambos' }])}
          {field('ciudad', '¿En qué ciudad trabajas?')}
          {field('lider', '¿Quién te invitó? (opcional)', null, { helperText: 'Código, teléfono o identificador de tu líder.' })}
        </>}
        {tipo === 'lider' && <>
          {field('invitados', '¿Cuántos conductores podrías invitar?', [{ value: '1-20', label: '1 a 20' }, { value: '21-50', label: '21 a 50' }, { value: '51-100', label: '51 a 100' }, { value: 'mas-100', label: 'Más de 100' }])}
          {field('conduce', '¿Actualmente conduces?', [{ value: 'taxi', label: 'Taxi' }, { value: 'plataforma', label: 'Vehículo de plataforma' }, { value: 'ambos', label: 'Ambos' }, { value: 'no', label: 'No actualmente' }])}
          {field('ciudad', 'Ciudad donde formarás tu red')}
        </>}
        {tipo === 'socio-estatal' && <>
          {field('estadoSolicitado', 'Estado que deseas solicitar', estados)}
          {field('nodo', '¿Tienes espacio, Internet estable y respaldo eléctrico?', [{ value: 'si', label: 'Sí, cuento con los tres' }, { value: 'parcial', label: 'Cuento con algunos' }, { value: 'no', label: 'Todavía no' }])}
          <div className='pre-form-wide'>{field('experiencia', 'Experiencia relevante', null, { multiline: true, minRows: 3 })}</div>
        </>}
      </div>
      {tipo === 'socio-estatal' && <Alert severity='info'>CDMX y Estado de México ya están asignados. Las solicitudes de los demás estados se revisan antes de su asignación.</Alert>}
      <FormControlLabel control={<Checkbox name='consentimiento' checked={values.consentimiento} onChange={e => change('consentimiento', e.target.checked)} inputProps={{ 'aria-describedby': 'pre-consent-error', required: true }} />} label='He leído el aviso de privacidad y autorizo que Ciudadan me contacte por WhatsApp.' />
      {errors.consentimiento && <p id='pre-consent-error' role='alert' className='pre-error'>{errors.consentimiento}</p>}
      <p className='pre-legal'>Al registrarte autorizas que Ciudadan te contacte por WhatsApp para informarte sobre el lanzamiento, reuniones y siguientes pasos. Consulta nuestro <a href={privacidad || '#aviso-privacidad'} onClick={() => { if (!privacidad) document.querySelector('#aviso-privacidad details')?.setAttribute('open', ''); }} target={privacidad ? '_blank' : undefined} rel={privacidad ? 'noopener noreferrer' : undefined}>aviso de privacidad</a>.</p>
      <Button type='submit' variant='contained' size='large' fullWidth disabled={sending || cerrado}>{sending ? 'GUARDANDO TU SOLICITUD…' : 'APARTAR MI LUGAR'}</Button>
      <p className='pre-legal'>Sin cobros en este registro. Sólo recibimos tu solicitud.</p>
    </fieldset>
  </Box>;
}
