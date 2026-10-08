/**
 * useSeo — title, description, OpenGraph y canonical para las páginas
 * de la Generación Fundadora (spec 21), sin dependencias nuevas.
 * Restaura el título anterior al desmontar para no afectar otras rutas.
 */
import { useEffect } from 'react';

const upsertMeta = (attr, key, content) => {
  if (!content) return;
  let tag = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attr, key);
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', content);
};

const upsertCanonical = (href) => {
  if (!href) return;
  let link = document.head.querySelector('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'canonical';
    document.head.appendChild(link);
  }
  link.href = href;
};

export const useSeo = ({ title, description, ogImage, canonical } = {}) => {
  useEffect(() => {
    const previousTitle = document.title;

    if (title) {
      document.title = title;
      upsertMeta('property', 'og:title', title);
    }
    if (description) {
      upsertMeta('name', 'description', description);
      upsertMeta('property', 'og:description', description);
    }
    if (ogImage) {
      upsertMeta('property', 'og:image', ogImage);
      upsertMeta('name', 'twitter:card', 'summary_large_image');
    }
    if (canonical) {
      upsertMeta('property', 'og:url', canonical);
      upsertCanonical(canonical);
    }

    return () => {
      document.title = previousTitle;
    };
  }, [title, description, ogImage, canonical]);
};

export default useSeo;
