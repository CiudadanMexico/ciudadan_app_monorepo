import React from 'react';
import { Box, Typography, Paper, Divider } from '@mui/material';
import { DocumentResponseDTO } from '../../types/wiki';

interface WikiViewerProps {
  document: DocumentResponseDTO & { htmlContent?: string; content?: string; body?: string }; 
}

const WikiViewer: React.FC<WikiViewerProps> = ({ document }) => {
  if (!document) {
    return null;
  }

  // Priorizamos el htmlContent que ya parsea tu backend de forma limpia
  const docHtml = document.htmlContent || document.content || document.body || '<p>Contenido no disponible.</p>';

  return (
    <Box sx={{ p: 6, maxWidth: '900px', margin: '0 auto', width: '100%' }}>
      <Paper elevation={0} sx={{ p: 5, backgroundColor: '#ffffff', borderRadius: 2, boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
        
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 2, color: '#1a1a1a' }}>
          {document.title || 'Documento sin título'}
        </Typography>

        <Divider sx={{ mb: 3 }} />

        {/* Renderizamos el HTML directamente embebido */}
        <Box 
          sx={{ 
            lineHeight: 1.7, 
            color: '#333',
            '& h1, & h2, & h3': { color: '#111', mt: 3, mb: 1.5 },
            '& p': { mb: 2 },
            '& ul, & ol': { pl: 3, mb: 2 },
            '& pre': { backgroundColor: '#f6f8fa', p: 2, borderRadius: 1, overflowX: 'auto' },
            '& code': { fontFamily: 'monospace', backgroundColor: '#f0f0f0', p: '2px 4px', borderRadius: '4px', fontSize: '0.9em' },
            '& blockquote': { borderLeft: '4px solid #dfe2e5', pl: 2, color: '#6a737d', my: 2 }
          }}
          dangerouslySetInnerHTML={{ __html: docHtml }} 
        />
        
      </Paper>
    </Box>
  );
};

export default WikiViewer;