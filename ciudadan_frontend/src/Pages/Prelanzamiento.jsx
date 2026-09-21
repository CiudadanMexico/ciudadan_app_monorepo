import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Box, Button, Container, ThemeProvider, createTheme } from '@mui/material';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import DirectionsCarRoundedIcon from '@mui/icons-material/DirectionsCarRounded';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import PublicRoundedIcon from '@mui/icons-material/PublicRounded';
import hero from '../assets/prelanzamiento_hero.webp';
import heroSmall from '../assets/prelanzamiento_hero_960.webp';
import logo from '../assets/ciudadan_logo_public.png';
import Formulario from '../components/Prelanzamiento/Formulario';
import AvisoPrivacidad from '../components/Prelanzamiento/AvisoPrivacidad';
import Video from '../components/Prelanzamiento/Video';
import { atribucion, CIERRE, esTipo, TIPOS } from '../components/Prelanzamiento/datos';
import { getPublicConfig } from '../services/driverVerifierService';
import { WHATSAPP_COMUNIDAD } from '../services/prelanzamientoService';
import '../components/Prelanzamiento/prelanzamiento.css';

const theme = createTheme({
  palette: { primary: { main: '#efe92f', contrastText: '#11172b' }, secondary: { main: '#6940c9' }, text: { primary: '#11172b', secondary: '#566076' } },
  typography: { fontFamily: "'Inter', 'Segoe UI', sans-serif", h2: { fontWeight: 800 }, h4: { fontWeight: 800 }, button: { fontWeight: 800, letterSpacing: '.02em' } },
  shape: { borderRadius: 12 },
  components: { MuiButton: { styleOverrides: { root: { borderRadius: 8, padding: '14px 22px', boxShadow: 'none' } } } },
});
const icons = [DirectionsCarRoundedIcon, GroupsRoundedIcon, PublicRoundedIcon];
const beneficios = ['Sin comisiones por viaje.', 'Precio especial de prelanzamiento: $300 MXN mensuales.', 'Conservas ese precio durante tu primer año.', 'Después del prelanzamiento, el precio regular será de $500 MXN mensuales.', 'Acceso anticipado a la plataforma.', 'Comunidad y soporte de Ciudadan.'];
const socioBeneficios = ['Inversión inicial desde $10,000 MXN.', 'Posibilidad de pagar hasta en 12 meses.', 'Recibe el 5% de las membresías de los conductores afiliados en su estado.', 'Participa en el crecimiento de una plataforma tecnológica cooperativa.', 'Recibe acompañamiento para desarrollar la comunidad estatal.'];
const money = value => new Intl.NumberFormat('es-MX').format(value);
function Lista({ items }) { return <ul className='pre-beneficios'>{items.map(text => <li key={text}><CheckRoundedIcon aria-hidden='true' /><span>{text}</span></li>)}</ul>; }

export default function Prelanzamiento() {
  const location = useLocation();
  const navigate = useNavigate();
  const [tipo, setTipo] = useState(() => new URLSearchParams(location.search).get('tipo') || 'conductor');
  const [attribution] = useState(() => atribucion(location, window.location.origin));
  const [whatsapp, setWhatsapp] = useState(null);
  const [cerrado, setCerrado] = useState(Date.now() >= CIERRE);
  const initialScroll = useRef(false);
  const privacidad = process.env.REACT_APP_AVISO_PRIVACIDAD_URL || '';
  const scroll = useCallback(id => {
    const section = document.getElementById(id);
    section?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    section?.focus({ preventScroll: true });
  }, []);
  useEffect(() => {
    const oldTitle = document.title;
    document.title = 'Prelanzamiento Ciudadan · 9 de octubre de 2026';
    getPublicConfig().then(config => setWhatsapp(config.whatsappGroupUrl || WHATSAPP_COMUNIDAD));
    const timer = setInterval(() => setCerrado(Date.now() >= CIERRE), 60000);
    return () => { document.title = oldTitle; clearInterval(timer); };
  }, []);
  useEffect(() => {
    const selected = new URLSearchParams(location.search).get('tipo');
    if (esTipo(selected)) {
      setTipo(selected);
      if (!initialScroll.current) {
        const timer = setTimeout(() => { initialScroll.current = true; scroll(selected); }, 100);
        return () => clearTimeout(timer);
      }
    } else setTipo('conductor');
    return undefined;
  }, [location.search, scroll]);
  const elegir = (value, target) => {
    initialScroll.current = true;
    setTipo(value);
    const params = new URLSearchParams(location.search);
    params.set('tipo', value);
    navigate({ pathname: '/prelanzamiento', search: params.toString() }, { replace: true });
    if (target) requestAnimationFrame(() => scroll(target));
  };
  const cta = (value, text) => <Button variant='contained' onClick={() => elegir(value, 'registro')} endIcon={<ArrowForwardRoundedIcon />} disabled={cerrado}>{text}</Button>;
  return <ThemeProvider theme={theme}><Box className='pre-page'>
    <a className='pre-skip' href='#registro'>Ir al formulario</a>
    <header className='pre-header'><Container maxWidth='lg' className='pre-header-inner'>
      <Link to='/' className='pre-brand'><img src={logo} alt='' width='38' height='38' /><span>ciudadan<span className='pre-brand-dot'>.</span></span></Link>
      <nav aria-label='Modalidades de prelanzamiento'>{TIPOS.map(item => <a key={item.value} href={`#${item.value}`} onClick={event => { event.preventDefault(); elegir(item.value, item.value); }}>{item.label}</a>)}</nav>
      <span className='pre-header-date'>09 OCT <b>2026</b></span>
    </Container></header>
    <main>
      <section className='pre-hero' aria-labelledby='pre-title'>
        <img className='pre-hero-img' src={hero} srcSet={`${heroSmall} 960w, ${hero} 1920w`} sizes='100vw' alt='Cuatro conductores frente a un automóvil en Ciudad de México, con una conductora de cabello magenta al frente y el Ángel de la Independencia al fondo.' width='1942' height='809' fetchpriority='high' loading='eager' />
        <div className='pre-hero-gradient' />
        <Container maxWidth='lg' className='pre-hero-content'>
          <div className='pre-eyebrow'><span /> CIUDADAN LLEGA EL 9 DE OCTUBRE</div>
          <h1 id='pre-title'>La plataforma donde los conductores se quedan con el <em>100%</em> del pago de sus viajes</h1>
          <p className='pre-hero-offer'>{cerrado ? 'El prelanzamiento ha finalizado.' : <>Regístrate antes del lanzamiento y paga sólo <strong>$300 MXN mensuales</strong> durante tu primer año</>}</p>
          <p className='pre-hero-small'>Después del lanzamiento, la membresía tendrá un precio regular de $500 MXN mensuales.</p>
          {cta('conductor', 'REGISTRARME AL PRELANZAMIENTO')}
          <div className='pre-urgencia'>SÓLO ANTES DEL 9 DE OCTUBRE</div>
          <p className='pre-hero-terms'>Esta promoción es exclusiva para conductores que completen su registro de prelanzamiento antes del 9 de octubre.</p>
        </Container>
      </section>
      <div className='pre-principios'><span>100% de tus viajes para ti</span><span>Sin comisiones por viaje</span><span>Tecnología cooperativa</span></div>
      <Container maxWidth='lg' component='section' className='pre-selector'>
        <p className='pre-kicker'>UN MISMO CAMINO. TRES FORMAS DE SUMAR.</p><h2>¿Cómo quieres participar?</h2>
        <div className='pre-options'>{TIPOS.map((item, index) => { const Icon = icons[index]; return <button key={item.value} type='button' className={`pre-option ${tipo === item.value ? 'is-selected' : ''}`} aria-pressed={tipo === item.value} onClick={() => elegir(item.value, item.value)}><span className='pre-option-top'><Icon /><span>{item.number}</span></span><h3>{item.title}</h3><p>{item.detail}</p><span className='pre-option-arrow'>Conocer más <ArrowForwardRoundedIcon /></span></button>; })}</div>
      </Container>
      <section id='conductor' tabIndex={-1} className='pre-section pre-conductor'><Container maxWidth='lg' className='pre-two-columns'>
        <div><p className='pre-kicker'>01 / QUIERO CONDUCIR</p><h2>El 100% del pago de tus viajes <span>es para ti</span></h2><Lista items={beneficios} /><p className='pre-callout'>Para conservar el precio de $300 MXN mensuales durante tu primer año debes registrarte antes del lanzamiento oficial del 9 de octubre.</p>{cta('conductor', 'QUIERO PAGAR SÓLO $300 AL MES')}</div>
        <div><div className='pre-price'><span>MEMBRESÍA DE PRELANZAMIENTO</span><div><strong>$300</strong><span>MXN<br />al mes</span></div><p>Durante tu primer año · Registro antes del 9 de octubre</p><hr /><p>Precio regular después del prelanzamiento: <b>$500 MXN/mes</b></p></div><Video id='_RBi46F5IUU' title='Conoce Ciudadan para conductores' /></div>
      </Container></section>
      <section id='lider' tabIndex={-1} className='pre-section pre-lider'><Container maxWidth='lg'>
        <div className='pre-two-columns'><div><p className='pre-kicker'>02 / QUIERO SER LÍDER DE CONDUCTORES</p><h2>Tu comunidad avanza.<br /><span>Tú creces con ella.</span></h2><div className='pre-limit'>Sólo habrá 200 líderes fundadores</div><p className='pre-lead'>Forma tu propia red y recibe mensualmente el <strong>10% de las membresías</strong> de los conductores que invites y permanezcan activos.</p><p>Un líder invita, organiza, orienta y acompaña a los conductores de su red para que puedan incorporarse correctamente a Ciudadan.</p></div><Video id='4-Hewz79Hhs' title='Conviértete en líder de conductores de Ciudadan' /></div>
        <div className='pre-table-wrap'><table><caption>Ejemplos de ingresos mensuales de tu red</caption><thead><tr><th scope='col'>Conductores activos</th><th scope='col'>Membresía de $300 MXN</th><th scope='col'>Membresía de $500 MXN</th></tr></thead><tbody>{[20, 100, 200].map(n => <tr key={n}><th scope='row'>{n} conductores</th><td>${money(n * 30)} <small>MXN/mes</small></td><td>${money(n * 50)} <small>MXN/mes</small></td></tr>)}</tbody></table></div>
        <p className='pre-muted'>Ejemplos calculados sobre membresías activas y pagadas; no son ingresos garantizados. El precio promocional se conserva durante el primer año del conductor.</p>
        <div className='pre-section-footer'><p>Sólo se aceptarán <strong>200 líderes fundadores</strong>. Los lugares se asignarán a quienes comiencen a formar y acompañar activamente su red. Échale ganas y aparta tu lugar cuanto antes.</p>{cta('lider', 'QUIERO SER UNO DE LOS 200 LÍDERES')}</div>
      </Container></section>
      <section id='socio-estatal' tabIndex={-1} className='pre-section pre-socio'><Container maxWidth='lg' className='pre-two-columns'>
        <div><p className='pre-kicker'>03 / QUIERO SER SOCIO ESTATAL</p><h2>Ciudadan en tu estado.<br /><span>Contigo al frente.</span></h2><h3>Sólo se asignará un socio por estado</h3><p>Buscamos socios que ayuden a lanzar, representar y hacer crecer Ciudadan en su estado.</p><Lista items={socioBeneficios} />{cta('socio-estatal', 'QUIERO SOLICITAR MI ESTADO')}</div>
        <div><div className='pre-state-card'><div className='pre-limit'>Sólo 30 lugares disponibles</div><strong>Un estado.<br />Una oportunidad de construir.</strong><p>CDMX y Estado de México ya están asignados. Los demás estados se otorgarán conforme sean aprobados los perfiles.</p><div className='pre-state-tags'><span>CDMX · asignado</span><span>Estado de México · asignado</span></div></div><Video id='ubrxiA72pM0' title='Conviértete en socio estatal de Ciudadan' /></div>
      </Container></section>
      <section id='registro' tabIndex={-1} className='pre-section pre-registro'><Container maxWidth='lg' className='pre-registration-grid'>
        <div className='pre-registration-copy'><p className='pre-kicker'>ESTÁS A UN PASO</p><h2>El futuro se mueve<br /><span>con personas como tú.</span></h2><p>Elige tu lugar en Ciudadan. Déjanos tus datos y te acompañamos en los siguientes pasos.</p><div className='pre-date-block'><strong>09</strong><span>OCTUBRE<br />2026</span></div><p>Sin cobros ahora.<br />Primero, construimos comunidad.</p></div>
        <Formulario tipo={esTipo(tipo) ? tipo : 'conductor'} cambiarTipo={value => elegir(value)} {...attribution} whatsapp={whatsapp} privacidad={privacidad} cerrado={cerrado} />
      </Container></section>
      {!privacidad && <AvisoPrivacidad />}
      <footer className='pre-footer'><Container maxWidth='md'><p className='pre-kicker'>EL TRABAJO TIENE VALOR. Y ES TUYO.</p><h2>Una nueva forma de movernos<br />comienza el 9 de octubre</h2><p>Quien realiza el trabajo debe conservar el valor de su trabajo.</p><strong>Ciudadan</strong><p>Tecnología cooperativa para construir una economía más justa.</p></Container></footer>
    </main>
    {!cerrado && <div className='pre-mobile-cta'><Button variant='contained' fullWidth onClick={() => elegir('conductor', 'registro')}>REGÍSTRATE Y CONSERVA LOS $300</Button></div>}
  </Box></ThemeProvider>;
}
