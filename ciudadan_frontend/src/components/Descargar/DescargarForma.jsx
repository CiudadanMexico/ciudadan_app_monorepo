import { useCallback, useState } from 'react';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import TextField from '@mui/material/TextField';
import CircularProgress from '@mui/material/CircularProgress';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import MarkEmailReadRoundedIcon from '@mui/icons-material/MarkEmailReadRounded';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import Turnstile, { turnstileHabilitado } from './Turnstile';
import { atribucionDescarga, estimarDescarga, validarCorreo } from './datos';
import { PRIVACY_VERSION, reclamarDescarga, reenviarEnlace } from '../../services/driverLaunchService';

/**
 * Pasos reales de la descarga: correo → enlace → instalar APK.
 * El enlace lo firma el servidor; esta vista nunca construye URLs de descarga.
 */
export default function DescargarForma({ config, promocionActiva, promocionTexto, avisoPrivacidad }) {
  const [email, setEmail] = useState('');
  const [aviso, setAviso] = useState(true);
  const [turnstileToken, setTurnstileToken] = useState('');
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [enlace, setEnlace] = useState(null);
  const [mensaje, setMensaje] = useState('');
  const [correoEnviado, setCorreoEnviado] = useState(true);
  const [reenviando, setReenviando] = useState(false);

  const onTurnstile = useCallback(token => setTurnstileToken(token || ''), []);
  const peso = estimarDescarga(config?.apk?.tamanoMb);

  const pedirEnlace = async (evento) => {
    evento.preventDefault();
    if (cargando) return;
    const errorCorreo = validarCorreo(email);
    setError(errorCorreo);
    if (errorCorreo) return;

    setCargando(true);
    setError(null);
    try {
      const resultado = await reclamarDescarga({
        email,
        quieroAviso: aviso,
        emailConsent: aviso,
        privacyVersion: PRIVACY_VERSION,
        turnstileToken: turnstileToken || undefined,
        ...atribucionDescarga(window.location.search, document.referrer),
      });
      if (!resultado.downloadUrl) {
        setError(resultado.message);
        return;
      }
      setEnlace(resultado.downloadUrl);
      setMensaje(resultado.message);
      setCorreoEnviado(resultado.emailEnviado);
    } catch (falla) {
      setError(falla.message || 'No pudimos generar tu enlace. Intenta de nuevo.');
    } finally {
      setCargando(false);
    }
  };

  const reenviar = async () => {
    if (reenviando) return;
    setReenviando(true);
    setError(null);
    try {
      const resultado = await reenviarEnlace(email, turnstileToken || undefined);
      if (resultado.downloadUrl) setEnlace(resultado.downloadUrl);
      setMensaje(resultado.message);
      setCorreoEnviado(resultado.emailEnviado);
    } catch (falla) {
      setError(falla.message || 'No pudimos reenviar el enlace.');
    } finally {
      setReenviando(false);
    }
  };

  if (enlace) {
    return <div className='desc-pasos' role='status' aria-live='polite'>
      <p className='desc-kicker'>PASO 2 DE 3 · TU ENLACE ESTÁ LISTO</p>
      <h3>Descarga e instala la app</h3>
      <p className='desc-mensaje'>{mensaje}</p>
      {!correoEnviado && <p className='desc-aviso'><ErrorOutlineRoundedIcon />
        <span>No pudimos enviar el correo, pero tu enlace funciona: usa este botón.</span></p>}
      <Button variant='contained' size='large' className='desc-btn-descarga' href={enlace}>
        <DownloadRoundedIcon /> DESCARGAR LA APP {peso ? `(${peso.tamanoMb} MB)` : ''}
      </Button>
      <ol className='desc-pasos-lista'>
        <li>Toca el botón y espera a que termine la descarga{peso ? ` (${peso.wifi})` : ''}.</li>
        <li>Abre el archivo <code>CiudadanConductor.apk</code> y acepta <em>instalar desde esta fuente</em>.</li>
        <li>Entra con <b>{email}</b>: tu membresía promocional ya viene aplicada.</li>
      </ol>
      {promocionActiva && <p className='desc-sello'>PROMOCIÓN APLICADA · {promocionTexto}</p>}
      <div className='desc-acciones'>
        <Button size='small' onClick={reenviar} disabled={reenviando}>
          {reenviando ? <CircularProgress size={15} /> : <MarkEmailReadRoundedIcon />} Reenviar el enlace
        </Button>
        <Button size='small' onClick={() => { setEnlace(null); setMensaje(''); setError(null); }}>Usar otro correo</Button>
      </div>
      <p className='desc-nota'>El enlace es personal: sólo descarga la app con tu correo y es el único enlace activo que tienes. Si lo compartiste o cambias de teléfono, usa «Reenviar el enlace»: se genera uno nuevo y el anterior deja de servir.</p>
    </div>;
  }

  return <form className='desc-form' onSubmit={pedirEnlace} noValidate>
    <p className='desc-kicker'>PASO 1 DE 3 · SÓLO TOMA 10 SEGUNDOS</p>
    <h3>Pide tu enlace de descarga</h3>
    {promocionActiva
      ? <p className='desc-lead'>{promocionTexto}. Se aplica solo, al descargar la app.</p>
      : <p className='desc-lead'>La promoción de lanzamiento ya cerró: recibirás la app y el precio regular de la membresía.</p>}
    <TextField
      id='desc-email'
      label='Tu correo'
      type='email'
      autoComplete='email'
      inputMode='email'
      required
      fullWidth
      value={email}
      onChange={evento => { setEmail(evento.target.value); if (error) setError(null); }}
      error={Boolean(error)}
      helperText={error || 'A ese correo llega tu enlace personal de descarga.'}
      margin='normal'
    />
    <FormControlLabel
      control={<Checkbox checked={aviso} onChange={evento => setAviso(evento.target.checked)} name='aviso' color='primary' />}
      label={<span className='desc-check'>Quiero además un <b>correo el día del lanzamiento</b> para no quedarme sin mi lugar.</span>}
    />
    <Turnstile onToken={onTurnstile} />
    {!turnstileHabilitado && <p className='desc-nota'>Entorno de pruebas: la verificación anti‑bots no está activa en este entorno.</p>}
    <Button type='submit' variant='contained' size='large' fullWidth disabled={cargando} className='desc-btn'>
      {cargando ? <CircularProgress size={20} /> : <DownloadRoundedIcon />} {promocionActiva ? 'QUIERO LA APP CON MI PROMOCIÓN' : 'QUIERO DESCARGAR LA APP'}
    </Button>
    {peso && <p className='desc-peso'>La app pesa <b>{peso.tamanoMb} MB</b> · {peso.wifi} · {peso.datos}. {peso.espacio}.</p>}
    <p className='desc-nota'>
      Al continuar aceptas el <a href={avisoPrivacidad || '#'} target='_blank' rel='noreferrer'>aviso de privacidad</a>.
      Usamos tu correo sólo para enviarte la app y el aviso de lanzamiento; puedes darte de baja cuando quieras.
    </p>
  </form>;
}

