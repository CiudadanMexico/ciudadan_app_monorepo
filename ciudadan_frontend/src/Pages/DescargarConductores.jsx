import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Box, Button, Container, ThemeProvider, createTheme } from '@mui/material';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import ShieldRoundedIcon from '@mui/icons-material/ShieldRounded';
import PercentRoundedIcon from '@mui/icons-material/PercentRounded';
import PaidRoundedIcon from '@mui/icons-material/PaidRounded';
import SupportAgentRoundedIcon from '@mui/icons-material/SupportAgentRounded';
import PhoneAndroidRoundedIcon from '@mui/icons-material/PhoneAndroidRounded';
import logo from '../assets/ciudadan_logo_public.png';
import captura from '../assets/taxiappciudadan.png';
import DescargarForma from '../components/Descargar/DescargarForma';
import { esAndroid, estimarDescarga, formatearLanzamiento, formatearPrecio, textoDuracion } from '../components/Descargar/datos';
import { getMembershipConfig } from '../services/driverLaunchService';
import '../components/Descargar/descargar.css';

const theme = createTheme({
  palette: { primary: { main: '#efe92f', contrastText: '#11172b' }, secondary: { main: '#6940c9' }, text: { primary: '#11172b', secondary: '#566076' } },
  typography: { fontFamily: "'Inter', 'Segoe UI', sans-serif", h2: { fontWeight: 800 }, h4: { fontWeight: 800 }, button: { fontWeight: 800, letterSpacing: '.02em' } },
  shape: { borderRadius: 12 },
  components: { MuiButton: { styleOverrides: { root: { borderRadius: 8, padding: '14px 22px', boxShadow: 'none' } } } },
});

const WHATSAPP = 'https://wa.me/525540927949?text=Hola%2C%20quiero%20descargar%20la%20app%20de%20Ciudadan%20para%20conductores';
const BENEFICIOS = [
  { Icon: PercentRoundedIcon, titulo: 'Cero comisión por viaje', detalle: 'El 100% de lo que paga el pasajero es para ti. La app se paga con tu membresía, no con tus viajes.' },
  { Icon: PaidRoundedIcon, titulo: 'Un solo cobro al mes', detalle: 'Sabes exactamente cuánto inviertes: tu membresía mensual y nada más.' },
  { Icon: ShieldRoundedIcon, titulo: 'Pasajeros y conductores verificados', detalle: 'Documentos validados antes de manejar. Manejas con menos riesgo y más viajes.' },
  { Icon: SupportAgentRoundedIcon, titulo: 'Soporte de verdad', detalle: 'Atención por WhatsApp y una red de líderes que te acompaña desde tu primer viaje.' },
];

const requiereScrollSuave = () => !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export default function DescargarConductores() {
  const [config, setConfig] = useState(null);
  const [cerrado, setCerrado] = useState(false);
  const aviso = process.env.REACT_APP_AVISO_PRIVACIDAD_URL || '';

  useEffect(() => {
    const titulo = document.title;
    document.title = 'Descarga la app Ciudadan para conductores';
    let vivo = true;
    let limite = null;

    // Un temporizador barato: sólo voltea el mensaje cuando cruza la fecha límite.
    const revisar = () => { if (limite) setCerrado(Date.now() > limite); };

    getMembershipConfig().then(datos => {
      if (!vivo) return;
      setConfig(datos);
      const fecha = datos.promotionClaimDeadline || datos.launchAt;
      limite = fecha ? new Date(fecha).getTime() : null;
      revisar();
    });

    const temporizador = setInterval(revisar, 60000);
    return () => { vivo = false; document.title = titulo; clearInterval(temporizador); };
  }, []);

  const scroll = id => {
    const seccion = document.getElementById(id);
    seccion?.scrollIntoView({ behavior: requiereScrollSuave() ? 'smooth' : 'auto', block: 'start' });
    seccion?.focus({ preventScroll: true });
  };

  const vista = useMemo(() => {
    const promocionActiva = !cerrado && config?.promotionActive !== false;
    const promo = formatearPrecio(config?.promotionalMonthlyPrice, config?.currency);
    const regular = formatearPrecio(config?.regularMonthlyPrice, config?.currency);
    const duracion = textoDuracion(config?.promotionDurationMonths);
    return {
      promocionActiva,
      promo,
      regular,
      duracion,
      promocionTexto: promocionActiva && promo ? `${promo} MXN al mes durante ${duracion}` : null,
      lanzamiento: formatearLanzamiento(config?.launchAt),
      peso: estimarDescarga(config?.apk?.tamanoMb),
    };
  }, [config, cerrado]);

  const { promocionActiva, promo, regular, duracion, promocionTexto, lanzamiento, peso } = vista;
  const android = esAndroid();
  const encabezadoLanzamiento = lanzamiento ? `${String(lanzamiento.dia).padStart(2, '0')} ${lanzamiento.mesCorto} ${lanzamiento.anio}` : '';

  return <ThemeProvider theme={theme}><Box className='desc-page'>
    <h1 className='desc-sr-only'>Descarga la app Ciudadan para conductores</h1>
    <header className='desc-header'><Container maxWidth='lg' className='desc-header-inner'>
      <Link to='/' className='desc-brand'><img src={logo} alt='' width='32' height='32' /><span>ciudadan<span className='desc-brand-dot'>.</span></span></Link>
      <Link to='/prelanzamiento' className='desc-header-link'>PRELANZAMIENTO{encabezadoLanzamiento ? ` · ${encabezadoLanzamiento}` : ''}</Link>
    </Container></header>

    <main>
      <section className='desc-hero' aria-labelledby='desc-titulo'><Container maxWidth='lg' className='desc-hero-grid'>
        <div>
          <p className='desc-eyebrow'><span /> DESCARGA PARA CONDUCTORES · ANDROID</p>
          <h2 id='desc-titulo'>Tu viaje, tu esfuerzo,<br /><em>el 100% para ti</em></h2>
          <p className='desc-hero-lead'>Descarga la app de Ciudadan, entra con tu correo y empieza a manejar sin comisión por viaje.</p>
          <div className='desc-hero-card'>
            <p className='desc-hero-price'>{promo || '$300'} <small>MXN / MES · {promocionActiva ? 'PROMOCIÓN' : 'REGULAR'}</small></p>
            <p>{promocionActiva
              ? <>Precio de prelanzamiento durante <b>{duracion}</b>. Después: <s>{regular || '$500'} MXN/mes</s></>
              : <>La promoción de prelanzamiento cerró: la membresía es <b>{regular || '$500'} MXN</b> al mes.</>}</p>
          </div>
          <div className='desc-hero-cta'>
            <Button variant='contained' size='large' startIcon={<DownloadRoundedIcon />} onClick={() => scroll('descarga')}>
              DESCARGAR LA APP{peso ? ` (${peso.tamanoMb} MB)` : ''}
            </Button>
            <Button variant='outlined' size='large' startIcon={<PhoneAndroidRoundedIcon />} onClick={() => scroll('instalacion')}>CÓMO INSTALARLA</Button>
          </div>
          {promocionActiva && <p className='desc-hero-urgencia'>LA PROMOCIÓN CIERRA{lanzamiento ? ` EL ${encabezadoLanzamiento}` : ''}</p>}
          <p className='desc-hero-note'>Sólo necesitas tu correo: no pedimos tarjeta para descargar la app.</p>
        </div>
        <div className='desc-hero-captura'><img src={captura} alt='Pantallas de la app de Ciudadan para conductores: viaje aceptado, ruta y ganancias del día.' width='1122' height='1402' loading='eager' fetchpriority='high' /></div>
      </Container></section>

      <div className='desc-confianza'><span>SIN COMISIÓN POR VIAJE</span><span>MEMBRESÍA FIJA AL MES</span><span>SOPORTE POR WHATSAPP</span><span>ANDROID 8 O SUPERIOR</span></div>

      <Container maxWidth='lg' component='section' className='desc-beneficios'>
        <p className='desc-kicker'>POR QUÉ CONDUCIR CON CIUDADAN</p>
        <h2>Menos comisión, más control de tu trabajo</h2>
        <div className='desc-grid'>{BENEFICIOS.map(({ Icon, titulo, detalle }) => <article className='desc-card' key={titulo}><Icon /><h3>{titulo}</h3><p>{detalle}</p></article>)}</div>
      </Container>


      <section id='descarga' tabIndex={-1} className='desc-descarga' aria-labelledby='desc-descarga-titulo'>
        <Container maxWidth='lg' className='desc-descarga-grid'>
          <DescargarForma config={config} promocionActiva={promocionActiva} promocionTexto={promocionTexto} avisoPrivacidad={aviso} />
          <aside className='desc-card'>
            <h3 className='desc-kicker' style={{ marginBottom: 4 }}>ANTES DE DESCARGAR</h3>
            <h3 style={{ fontSize: '1.15rem' }}>{peso ? `La app pesa ${peso.tamanoMb} MB` : 'Descarga directa (APK)'}</h3>
            <ul className='desc-lista-check'>
              <li>{peso ? peso.espacio : 'Deja al menos 300 MB libres en el teléfono'}.</li>
              <li>{peso ? `${peso.wifi} · ${peso.datos}` : 'Usa Wi‑Fi si puedes: ahorras datos móviles'}.</li>
              <li>Android 8 o superior. iPhone: aún no hay versión, te avisaremos por correo.</li>
              <li>Por ahora se instala desde nuestro enlace oficial; en cuanto esté en Play Store te lo enviamos.</li>
            </ul>
            {config?.esRespaldo && <p className='desc-nota'>Mostramos precios de referencia: confirma el monto en el correo que recibes.</p>}
            {!config?.apk?.disponible && config && <p className='desc-nota'>El binario se está publicando. Si el enlace falla, espera unos minutos y pídelo otra vez.</p>}
          </aside>
        </Container>
      </section>

      <Container maxWidth='lg' component='section' id='instalacion' tabIndex={-1} className='desc-beneficios'>
        <p className='desc-kicker'>CÓMO INSTALAR EL APK</p>
        <h2>Tres toques y estás en línea</h2>
        <ol className='desc-pasos-num'>
          <li><strong>1. Pide tu enlace</strong><span>Escribe tu correo y te enviamos un enlace personal de descarga.</span></li>
          <li><strong>2. Descarga y permite instalar</strong><span>Android preguntará si confías en el navegador: acepta una sola vez.</span></li>
          <li><strong>3. Entra con tu correo</strong><span>Usa el mismo correo del enlace: tu membresía promocional ya viene aplicada.</span></li>
          <li><strong>4. Si algo se traba</strong><span>Escríbenos por WhatsApp y te ayudamos a instalarla en vivo.</span></li>
        </ol>
        {!android && <div className='desc-movil'>
          <h3>Estás desde un iPhone o una computadora</h3>
          <p>El archivo que descargas es para Android. Si estás en iPhone, deja tu correo en el formulario: te escribimos en cuanto exista la versión para iOS.</p>
          <Button variant='contained' component='a' href={WHATSAPP} target='_blank' rel='noreferrer' startIcon={<SupportAgentRoundedIcon />}>ESCRIBIR POR WHATSAPP</Button>
        </div>}
      </Container>
    </main>

    <footer className='desc-footer'><Container maxWidth='lg'>
      <p className='desc-kicker' style={{ color: 'var(--desc-teal)' }}>CIUDADAN · {lanzamiento ? lanzamiento.larga : 'LANZAMIENTO 2026'}</p>
      <h2>Maneja con tu propia gente</h2>
      <p>¿Quieres invitar a otros conductores y ganar con tu red? Mira el <a href='/prelanzamiento'>prelanzamiento de líderes</a>.</p>
      <p>{promocionTexto ? `Membresía de promoción: ${promocionTexto}. Precio regular: ${regular || '$500'} MXN/mes.` : `Membresía regular: ${regular || '$500'} MXN al mes.`}</p>
      <p><a href={aviso || '#'} target='_blank' rel='noreferrer'>Aviso de privacidad</a> · <a href={WHATSAPP} target='_blank' rel='noreferrer'>WhatsApp de soporte</a></p>
    </Container></footer>

    <div className='desc-mobile-cta'><Button variant='contained' endIcon={<ArrowForwardRoundedIcon />} onClick={() => scroll('descarga')}>DESCARGAR LA APP{peso ? ` · ${peso.tamanoMb} MB` : ''}</Button></div>
  </Box></ThemeProvider>;
}

