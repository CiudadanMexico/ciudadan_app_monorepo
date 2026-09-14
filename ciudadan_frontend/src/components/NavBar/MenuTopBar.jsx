import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import './MenuTopBar.css';

import wikiImage from '../../assets/topbarmenu/wiki.svg';
import quienesImage from '../../assets/topbarmenu/quienes.svg';
import ciudadanRosaImage from '../../assets/topbarmenu/ciudadan_rosa.svg';
import ayudaImage from '../../assets/topbarmenu/ayuda.svg';
import faqImage from '../../assets/topbarmenu/faq.svg';
import contactoImage from '../../assets/topbarmenu/contacto.svg';
import youtubeImage from '../../assets/topbarmenu/youtube.svg';

// Canal de YouTube por defecto (fuente de verdad: /site-settings.json)
const DEFAULT_YOUTUBE_URL = 'https://www.youtube.com/@ciudadanmx';

/**
 * Nuevo mapa de items (tal como lo pediste)
 */
const DEFAULT_ITEMS = [
  { href: "/", img: ciudadanRosaImage, alt: "Presentación", label: "Presentación" },
  { href: "/info/quienes", img: quienesImage, alt: "¿Quiénes Somos?", label: "¿Quiénes Somos?" },
  { href: "/wiki", img: wikiImage, alt: "Wiki Ciudadan.org", label: "Wiki", target: "_blank" },
  { href: "/wiki/faq", img: faqImage, alt: "Preguntas Frecuentes", label: "Preguntas Frecuentes" },
  { href: "/wiki/ayuda", img: ayudaImage, alt: "Ayuda", label: "Ayuda" },
  { href: "/contacto", img: contactoImage, alt: "Contacto", label: "Contacto" },
  { href: DEFAULT_YOUTUBE_URL, img: youtubeImage, alt: "Canal YT", label: "Canal YT", target: "_blank", siteKey: "social.youtube.url" },
];

const MOBILE_MAX = 1000;
const BODY_CLASS = 'menu-topbar-open';

/**
 * Filtra las keys visibles; soporta visibleKeys que contenga hrefs, labels o alts.
 */
const shouldShow = (item, visibleKeys) => {
  if (!Array.isArray(visibleKeys) || visibleKeys.length === 0) return true;
  return visibleKeys.some(
    (k) => k === item.href || k === item.label || k === item.alt
  );
};

const MenuTopBar = ({
  items = DEFAULT_ITEMS,
  visibleKeys = null,
  isOpen = false,
  setIsOpen = () => {},
  topBarRef = null,
}) => {
  const navigate = useNavigate();
  const [youtubeUrl, setYoutubeUrl] = useState(DEFAULT_YOUTUBE_URL);

  // Lee el canal de YouTube desde /site-settings.json (fuente de verdad).
  // El JSON vive en public/ y hay copia espejo en la raíz del monorepo.
  useEffect(() => {
    let cancelled = false;
    fetch(`${process.env.PUBLIC_URL || ''}/site-settings.json`, { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((settings) => {
        const url = settings?.social?.youtube?.url;
        if (!cancelled && typeof url === 'string' && url.length > 0) {
          setYoutubeUrl(url);
        }
      })
      .catch(() => { /* conserva el valor por defecto */ });
    return () => { cancelled = true; };
  }, []);

  // Aplica la URL de site-settings al item de YouTube (estático o por prop)
  const resolvedItems = items.map((it) =>
    it.siteKey === 'social.youtube.url' ? { ...it, href: youtubeUrl } : it
  );

  const keysToShow = resolvedItems.filter((it) => shouldShow(it, visibleKeys));

  // Añadir/quitar clase al body para esconder logo solo en móviles
  useEffect(() => {
    const applyClass = () => {
      const isMobile = window.innerWidth <= MOBILE_MAX;
      if (isOpen && isMobile) {
        document.body.classList.add(BODY_CLASS);
      } else {
        document.body.classList.remove(BODY_CLASS);
      }
    };

    applyClass();
    window.addEventListener('resize', applyClass);
    return () => {
      window.removeEventListener('resize', applyClass);
      document.body.classList.remove(BODY_CLASS);
    };
  }, [isOpen]);

  // Manejo de evento global 'closeTopBar' si tu app lo usa
  useEffect(() => {
    const handleCloseTopBar = () => {
      setIsOpen(false);
    };
    window.addEventListener('closeTopBar', handleCloseTopBar);
    return () => window.removeEventListener('closeTopBar', handleCloseTopBar);
  }, [setIsOpen]);

  /**
   * Maneja clicks en los items:
   * - Si es externo (href empieza por http o target === '_blank') -> abrir en nueva pestaña (o según target)
   * - Si es interno -> usar navigate para SPA
   */
  const handleItemClick = (e, item) => {
    const href = item.href || '';
    const isExternal = /^https?:\/\//i.test(href) || item.target === '_blank';

    // Si es externo: dejamos el comportamiento natural cuando usamos <a target="_blank">,
    // pero si estamos usando el mismo handler (por ejemplo en un <a> interno), abrimos con window.open
    if (isExternal) {
      // Si el click vino desde un <a target="_blank">, no necesitamos prevenir
      // pero para consistencia y control, abrimos manualmente:
      e.preventDefault();
      window.open(href, item.target || '_blank', 'noopener,noreferrer');
      setIsOpen(false);
      return;
    }

    // Interno: prevenir recarga y navegar con react-router
    e.preventDefault();
    // Normalizamos href: si viene vacío, mandamos a '/'
    const path = href || '/';
    navigate(path);
    setIsOpen(false);
  };

  // Render del componente (desktop + mobile)
  return (
    <div className="menu-topbar-wrapper">
      <div
        className={`menu-topbar ${isOpen ? 'open' : ''}`}
        ref={topBarRef}
        aria-hidden={!isOpen}
      >
        {/* DESKTOP */}
        <div className="menu-topbar-desktop">
          {keysToShow.map((item) => {
            const key = item.href || item.label;
            const content = (
              <div className="menu-topbar-item-content">
                <img src={item.img} alt={item.alt || item.label} className="menu-topbar-svg" />
                <span className="menu-topbar-label">{item.label || item.alt}</span>
              </div>
            );

            const isExternal = /^https?:\/\//i.test(item.href) || item.target === '_blank';

            if (isExternal) {
              return (
                <a
                  key={key}
                  href={item.href}
                  target={item.target || '_blank'}
                  rel="noopener noreferrer"
                  className="menu-topbar-item"
                  onClick={(e) => handleItemClick(e, item)}
                  aria-label={item.label || item.alt}
                >
                  {content}
                </a>
              );
            }

            // Interno: renderizamos <a> con href pero usamos navigate en onClick para SPA
            return (
              <a
                key={key}
                href={item.href}
                className="menu-topbar-item"
                onClick={(e) => handleItemClick(e, item)}
                aria-label={item.label || item.alt}
              >
                {content}
              </a>
            );
          })}

          <button
            className="menu-topbar-close"
            onClick={() => setIsOpen(false)}
            aria-label="Cerrar menú"
          >
            ✕
          </button>
        </div>

        {/* MOBILE */}
        <div className="menu-topbar-mobile">
          {keysToShow.map((item) => {
            const key = item.href || item.label;
            const content = (
              <div className="menu-topbar-grid-inner">
                <img src={item.img} alt={item.alt || item.label} className="menu-topbar-grid-svg" />
                <small className="menu-topbar-grid-label">{item.label || item.alt}</small>
              </div>
            );

            const isExternal = /^https?:\/\//i.test(item.href) || item.target === '_blank';

            if (isExternal) {
              return (
                <a
                  key={key}
                  href={item.href}
                  target={item.target || '_blank'}
                  rel="noopener noreferrer"
                  className="menu-topbar-grid-item"
                  onClick={(e) => handleItemClick(e, item)}
                  aria-label={item.label || item.alt}
                >
                  {content}
                </a>
              );
            }

            return (
              <a
                key={key}
                href={item.href}
                className="menu-topbar-grid-item"
                onClick={(e) => handleItemClick(e, item)}
                aria-label={item.label || item.alt}
              >
                {content}
              </a>
            );
          })}

          <button
            className="menu-topbar-close-mobile"
            onClick={() => setIsOpen(false)}
            aria-label="Cerrar menú"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
};

export default MenuTopBar;
