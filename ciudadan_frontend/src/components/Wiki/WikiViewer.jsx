import React, { useRef, useEffect } from 'react';
import { Box, Typography, Paper, Divider } from '@mui/material';

const WikiViewer = ({ document, onNavigateDocument }) => {
  const contentRef = useRef(null);

  useEffect(() => {
    const node = contentRef.current;
    if (!node) return undefined;

    const handleClick = (event) => {
      // Buscar el elemento <a> más cercano que sea un wikilink.
      const target = event.target && event.target.closest
        ? event.target.closest('a.wiki-link')
        : null;
      if (!target) return;

      // Wikilink ya resuelto por el backend: ruta canónica en data-path
      const resPath = target.getAttribute('data-path');
      // Fallback: el target normalizado (data-target) o el href
      const fallback =
        target.getAttribute('data-target') ||
        (target.getAttribute('href') || '').replace(/^\/wiki\//, '');

      if (resPath || fallback) {
        // Evita que el navegador haga una navegación completa / recarga.
        event.preventDefault();
        event.stopPropagation();
        if (typeof onNavigateDocument === 'function') {
          onNavigateDocument(String(resPath || fallback).replace(/^\/+/, ''));
        }
      }
    };

    node.addEventListener('click', handleClick);
    return () => node.removeEventListener('click', handleClick);
  }, [onNavigateDocument, document]);

  if (!document) {
    return null;
  }

  // Priorizamos el htmlContent que ya parsea tu backend de forma limpia
  const docHtml =
    document.htmlContent || document.content || document.body || '<p>Contenido no disponible.</p>';

  return (
    <Box sx={{ p: 6, maxWidth: '900px', margin: '0 auto', width: '100%' }}>
      <Paper
        elevation={0}
        sx={{
          p: 5,
          backgroundColor: '#ffffff',
          borderRadius: 2,
          boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
        }}
      >
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 2, color: '#1a1a1a' }}>
          {document.title || 'Documento sin título'}
        </Typography>

        <Divider sx={{ mb: 3 }} />

        {/* Renderizamos el HTML directamente embebido (lo inyecta el backend) */}
        <Box
          ref={contentRef}
          sx={{
            lineHeight: 1.7,
            color: '#333',
            '& h1, & h2, & h3': { color: '#111', mt: 3, mb: 1.5 },
            '& p': { mb: 2 },
            '& ul, & ol': { pl: 3, mb: 2 },
            '& pre': { backgroundColor: '#f6f8fa', p: 2, borderRadius: 1, overflowX: 'auto' },
            '& code': {
              fontFamily: 'monospace',
              backgroundColor: '#f0f0f0',
              p: '2px 4px',
              borderRadius: '4px',
              fontSize: '0.9em',
            },
            '& blockquote': { borderLeft: '4px solid #dfe2e5', pl: 2, color: '#6a737d', my: 2 },
            '& a.wiki-link': {
              color: '#2f6feb',
              textDecoration: 'none',
              borderBottom: '1px solid rgba(47,111,235,0.35)',
              cursor: 'pointer',
              '&:hover': { borderBottomColor: '#2f6feb', background: 'rgba(47,111,235,0.06)' },
            },
          }}
          dangerouslySetInnerHTML={{ __html: docHtml }}
        />
      </Paper>
    </Box>
  );
};

export default WikiViewer;