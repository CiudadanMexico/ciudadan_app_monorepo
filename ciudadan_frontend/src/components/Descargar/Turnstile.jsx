import { useEffect, useRef } from 'react';

/**
 * Cloudflare Turnstile explícito.
 *
 * Si no hay `REACT_APP_TURNSTILE_SITE_KEY` el widget no se monta y se envía
 * token vacío: el backend sólo lo acepta en desarrollo con
 * `TURNSTILE_DISABLED=true` y en producción responde 503 (nunca se salta la
 * verificación en silencio).
 */

const SITE_KEY = process.env.REACT_APP_TURNSTILE_SITE_KEY || '';
export const turnstileHabilitado = Boolean(SITE_KEY);

let promesa = null;

function cargarScript() {
  if (typeof window === 'undefined') return Promise.resolve(null);
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (!promesa) {
    promesa = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error('turnstile_no_cargo')));
      script.onerror = () => { promesa = null; reject(new Error('turnstile_no_cargo')); };
      document.head.appendChild(script);
      setTimeout(() => {
        if (!window.turnstile) { promesa = null; reject(new Error('turnstile_tiempo')); }
      }, 12000);
    });
  }
  return promesa;
}

export default function Turnstile({ onToken, siteKey = SITE_KEY }) {
  const contenedor = useRef(null);
  const widget = useRef(null);

  useEffect(() => {
    if (!siteKey) {
      onToken(null);
      return undefined;
    }
    let vivo = true;
    cargarScript()
      .then(turnstile => {
        if (!vivo || !turnstile || !contenedor.current) return;
        widget.current = turnstile.render(contenedor.current, {
          sitekey: siteKey,
          theme: 'light',
          appearance: 'always',
          size: 'flexible',
          retry: 'auto',
          callback: token => { if (vivo) onToken(token); },
          'expired-callback': () => { if (vivo) onToken(''); },
          'error-callback': () => { if (vivo) onToken(''); },
        });
      })
      .catch(() => { if (vivo) onToken(''); });

    return () => {
      vivo = false;
      try {
        if (window.turnstile && widget.current) window.turnstile.remove(widget.current);
      } catch {
        /* el widget ya no existe */
      }
      widget.current = null;
    };
  }, [siteKey, onToken]);

  if (!siteKey) return null;
  return <div className='desc-turnstile' ref={contenedor} aria-label='Verificación de seguridad' />;
}
