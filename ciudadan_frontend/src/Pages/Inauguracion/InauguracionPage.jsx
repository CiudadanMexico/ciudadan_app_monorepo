import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Prisma3D from '../../components/Inauguracion/Prisma3D';
import useSeo from '../../hooks/useSeo';
import scenery from '../../assets/inauguracion/hero-escena.webp';
import sceneryMobile from '../../assets/inauguracion/hero-movil.webp';
import '../../styles/inauguracion.css';

const VENUE = 'Aura Hub · Uxmal 520, Vértiz Narvarte, CDMX';
const LUMA_EVENT_URL = process.env.REACT_APP_LUMA_EVENT_URL || '';
// Copiar de la opción Embed del evento en Luma. No inventar un ID.
const LUMA_EMBED_URL = process.env.REACT_APP_LUMA_EMBED_URL || '';

const moments = [
  { time: '17:00', title: 'Conectamos', desc: 'Bienvenida y registro. Conoce a las personas detrás de Ciudadan.' },
  { time: '17:30', title: 'El futuro se habita', desc: 'Una visión de comunidades sustentables, productivas y conectadas.' },
  { time: '18:00', title: 'Tecnología para crear', desc: 'IA, herramientas libres, microfábricas y nuevas economías cooperativas.' },
  { time: '19:00', title: 'Asamblea Cero', desc: 'Primera experiencia de participación y construcción colectiva.' },
  { time: '19:30', title: 'Nos encontramos', desc: 'Conversaciones, comunidad y conexiones para proyectos futuros.' },
  { time: 'Después', title: 'Noche electrónica', desc: 'DJ set por confirmar. Música y celebración para cerrar la noche.' },
];

const goodUrl = (raw) => {
  try {
    const parsed = new URL(raw);
    return parsed.protocol === 'https:' && /(^|\.)luma\.com$|(^|\.)lu\.ma$/.test(parsed.hostname);
  } catch { return false; }
};

function Reserva({ compact = false }) {
  const hasLuma = goodUrl(LUMA_EVENT_URL);
  const embed = goodUrl(LUMA_EMBED_URL) ? LUMA_EMBED_URL : '';
  return (
    <div className={`inau-reserva ${compact ? 'inau-reserva--compact' : ''}`} id={compact ? undefined : 'registro'}>
      <div className="inau-reserva__head">
        <span className="inau-eyebrow">TU LUGAR EN LA ASAMBLEA CERO</span>
        <h2>Ven a habitar el futuro.</h2>
        <p>Entrada gratuita · Registro individual · Cupo sujeto a capacidad de la sede.</p>
      </div>
      {embed && !compact ? (
        <iframe title="Registro al encuentro de Ciudadan en Luma" src={embed} loading="lazy" className="inau-luma-iframe" allow="payment" />
      ) : hasLuma ? (
        <a className="inau-button inau-button--primary" href={LUMA_EVENT_URL} target="_blank" rel="noopener noreferrer">
          Reservar mi lugar <span aria-hidden="true">↗</span>
        </a>
      ) : (
        <div className="inau-reserva__pending" role="status">
          Estamos habilitando el prerregistro. Vuelve pronto para reservar tu lugar.
        </div>
      )}
      {embed && !compact && hasLuma && <a className="inau-reserva__fallback" href={LUMA_EVENT_URL} target="_blank" rel="noopener noreferrer">¿Problemas con el formulario? Abrir registro en Luma ↗</a>}
      <small>El registro es para asistir al evento; unirse a Ciudadan será una decisión independiente.</small>
    </div>
  );
}

function formatCalendarLink() {
  const title = encodeURIComponent('Ciudadan 6.0 · Gran encuentro inaugural');
  const details = encodeURIComponent('El futuro se habita · Asamblea Cero · Ecoaldeas, tecnología libre y noche electrónica.');
  const location = encodeURIComponent(VENUE);
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=20261121T230000Z/20261122T030000Z&details=${details}&location=${location}`;
}

export default function InauguracionPage() {
  const { pathname } = useLocation();
  const [revealsReady, setRevealsReady] = useState(false);
  useSeo({
    title: 'Ciudadan 6.0 · El futuro se habita · 21 de noviembre',
    description: 'Gran encuentro inaugural Ciudadan 6.0. Ecoaldeas productivas, inteligencia artificial, economía cooperativa, Asamblea Cero y noche electrónica. 21 de noviembre, 17:00, Aura Hub CDMX.',
    ogImage: `${window.location.origin}/social/ciudadan-inauguracion.jpg`,
    canonical: `${window.location.origin}/inauguracion`,
  });
  useEffect(() => {
    document.documentElement.classList.add('inau-route-active');
    return () => document.documentElement.classList.remove('inau-route-active');
  }, [pathname]);
  useEffect(() => {
    if (!('IntersectionObserver' in window)) { setRevealsReady(true); return undefined; }
    setRevealsReady(true);
    const items = Array.from(document.querySelectorAll('.inau-reveal'));
    const io = new IntersectionObserver((entries) => entries.forEach(({ target, isIntersecting }) => {
      if (isIntersecting) { target.classList.add('is-visible'); io.unobserve(target); }
    }), { threshold: 0.1, rootMargin: '0px 0px -35px 0px' });
    items.forEach((item) => io.observe(item));
    return () => io.disconnect();
  }, []);

  return (
    <main className={`inau-page ${revealsReady ? 'inau-js' : ''}`}>
      <div className="inau-background" aria-hidden="true" />
      <section className="inau-hero" aria-labelledby="inau-title">
        <div className="inau-hero__copy">
          <span className="inau-eyebrow">CIUDADAN 6.0 / GRAN ENCUENTRO INAUGURAL</span>
          <h1 id="inau-title">EL FUTURO <em>SE HABITA.</em></h1>
          <p className="inau-hero__lead">Una nueva forma de vivir, crear y prosperar.</p>
          <p className="inau-hero__desc">Una red de ecoaldeas productivas, tecnología abierta y personas que construyen nuevas economías. Ven a conocer el proyecto y participa en su primera experiencia colectiva.</p>
          <dl className="inau-when">
            <div><dt>Fecha</dt><dd><strong>SÁBADO 21-NOV</strong></dd></div>
            <div><dt>Hora</dt><dd><strong>5:00 PM</strong></dd></div>
            <div><dt>Lugar</dt><dd><strong>AURA HUB · CDMX</strong><span>Uxmal 520, Vértiz Narvarte</span></dd></div>
          </dl>
          <div className="inau-actions">
            <a className="inau-button inau-button--primary" href={goodUrl(LUMA_EVENT_URL) ? LUMA_EVENT_URL : '#registro'} target={goodUrl(LUMA_EVENT_URL) ? '_blank' : undefined} rel={goodUrl(LUMA_EVENT_URL) ? 'noopener noreferrer' : undefined}>Prerregístrate <span aria-hidden="true">↗</span></a>
            <a className="inau-button inau-button--ghost" href="#experiencia">Descubre el encuentro ↓</a>
          </div>
          <p className="inau-hero__note">Entrada gratuita · DJ set por confirmar</p>
        </div>
        <div className="inau-hero__visual" aria-label="Personajes de Ciudadan en una ecoaldea futurista con una fiesta electrónica">
          <picture>
            <source media="(max-width: 640px)" srcSet={sceneryMobile} />
            <img src={scenery} alt="Comunidad futurista con una tecnoartesana de cabello violeta, un colaborador y un gato negro, frente a una ecoaldea tecnológica" width="1254" height="508" fetchPriority="high" decoding="async" />
          </picture>
          <div className="inau-visual__shade" />
          <Prisma3D />
          <div className="inau-hero__visual-caption"><span className="inau-live-dot" /> ECOALDEAS · CREATIVIDAD · TECNOLOGÍA</div>
        </div>
      </section>

      <section className="inau-manifesto inau-container inau-reveal" id="experiencia">
        <span className="inau-eyebrow">UN FUTURO QUE YA EMPEZAMOS A CONSTRUIR</span>
        <h2>El siguiente capítulo no es una ciudad. <span>Es una red de comunidades.</span></h2>
        <p>Imagina vivir en un territorio regenerativo y construir proyectos con herramientas de vanguardia. Comunidades autónomas que comparten conocimiento, producción, servicios digitales y oportunidades reales de colaboración.</p>
      </section>

      <section className="inau-pillars inau-container" aria-label="Qué descubrirás en Ciudadan">
        <article className="inau-pillar inau-reveal"><span>01 / HABITAR</span><h3>Ecoaldeas productivas</h3><p>Arquitectura natural, sostenibilidad y negocios que nacen de la comunidad.</p></article>
        <article className="inau-pillar inau-reveal"><span>02 / CREAR</span><h3>IA y microfábricas</h3><p>Tecnología abierta, automatización, formación y producción distribuida.</p></article>
        <article className="inau-pillar inau-reveal"><span>03 / COOPERAR</span><h3>Economías conectadas</h3><p>Proyectos y personas que comparten capacidades sin perder su autonomía.</p></article>
      </section>

      <section className="inau-event inau-container" aria-labelledby="inau-programa">
        <div className="inau-event__heading inau-reveal">
          <div><span className="inau-eyebrow">EL SÁBADO 21 DE NOVIEMBRE</span><h2 id="inau-programa">Un encuentro para vivirlo.</h2></div>
          <a className="inau-text-link" href={formatCalendarLink()} target="_blank" rel="noopener noreferrer">Añadir al calendario ↗</a>
        </div>
        <div className="inau-timeline">
          {moments.map((m) => <div className="inau-timeline__row inau-reveal" key={`${m.time}-${m.title}`}><time>{m.time}</time><div><h3>{m.title}</h3><p>{m.desc}</p></div></div>)}
        </div>
      </section>

      <section className="inau-assembly inau-container inau-reveal">
        <div><span className="inau-eyebrow">ASAMBLEA CERO</span><h2>No solo vengas a mirar. <em>Participa.</em></h2><p>Descubre cómo funciona la citocracia y participa en nuestra primera experiencia colectiva para elegir una misión comunitaria. Una demostración abierta, sin costo y sin exigir membresía.</p></div>
        <div className="inau-assembly__symbol" aria-hidden="true"><span>●</span><span>●</span><span>●</span><span>●</span><span>●</span><span>●</span></div>
      </section>

      <section className="inau-closing inau-container" aria-labelledby="inau-after">
        <div className="inau-after inau-reveal">
          <span className="inau-eyebrow">DESPUÉS DE CONSTRUIR, CELEBRAMOS</span>
          <h2 id="inau-after">Noche <em>electrónica.</em></h2>
          <p>DJ set por confirmar · Música · Convivencia · Networking</p>
        </div>
        <Reserva />
        <div className="inau-footer-note">
          <p><strong>¿Dónde?</strong> Aura Hub · Uxmal 520, Vértiz Narvarte, CDMX</p>
          <p><strong>¿Quién puede venir?</strong> Cualquier persona interesada en nuevas comunidades, negocios, tecnología y cooperación.</p>
          <p><strong>¿Tiene costo?</strong> No, la entrada es gratuita; registro sujeto al aforo disponible.</p>
        </div>
      </section>
    </main>
  );
}
