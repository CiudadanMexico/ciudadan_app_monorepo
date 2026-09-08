import React, { useEffect, useState } from 'react';
import { Box, Drawer, Typography, CircularProgress, Divider, Tabs, Tab } from '@mui/material';
import { wikiService } from '../../services/wikiService';
import { TreeNodeDTO, DocumentResponseDTO } from '../../types/wiki';
import WikiTreeView from './WikiTreeView';
import WikiViewer from './WikiViewer'; 

type WikiSection = 'main' | 'help' | 'faq';

export default function WikiApp() {
  const [section, setSection] = useState<WikiSection>('main');
  const [tree, setTree] = useState<TreeNodeDTO[]>([]);
  const [currentDoc, setCurrentDoc] = useState<DocumentResponseDTO | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // 1. Cargamos el árbol de la sección seleccionada al montar o cambiar de sección
  useEffect(() => {
    setLoading(true);
    wikiService.getSectionTree(section)
      .then((data: any) => {
        setTree(Array.isArray(data) ? data : data.nodes || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error(`Error al cargar árbol de la wiki (${section}):`, err);
        setTree([]);
        setLoading(false);
      });
  }, [section]);

  // 2. Función que captura el clic en el árbol y pide el documento al backend sin recargar la página
  const handleDocumentSelect = async (fullPath: string) => {
    try {
      // fullPath viene como "wiki/main/mi-primer-articulo.md"
      const docData = await wikiService.getDocument(fullPath);
      setCurrentDoc(docData);
    } catch (err) {
      console.error('Error al obtener el contenido del documento:', err);
    }
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      
      {/* Panel Izquierdo: El Árbol de la Wiki */}
      <Drawer
        variant="permanent"
        sx={{
          width: 300,
          flexShrink: 0,
          '& .MuiDrawer-paper': { 
            width: 300, 
            boxSizing: 'border-box', 
            backgroundColor: '#fdfdfd',
            borderRight: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            flexDirection: 'column'
          },
        }}
      >
        <Box sx={{ p: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1, letterSpacing: 0.5 }}>
            📁 EXPLORADOR WIKI
          </Typography>
          
          <Tabs 
            value={section} 
            onChange={(e, newVal) => setSection(newVal)} 
            variant="fullWidth"
            sx={{ minHeight: 36, '& .MuiTab-root': { minHeight: 36, fontSize: '0.75rem', fontWeight: 'bold' } }}
          >
          </Tabs>
        </Box>

        <Box sx={{ overflowY: 'auto', flexGrow: 1, py: 1 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', pt: 4 }}>
              <CircularProgress size={24} />
            </Box>
          ) : (
            // Pasamos ambas funciones: para abrir documento o limpiar al tocar carpeta
            <WikiTreeView 
              nodes={tree} 
              onSelectDocument={handleDocumentSelect} 
              onSelectFolder={() => setCurrentDoc(null)} 
            />
          )}
        </Box>
      </Drawer>

      {/* Panel Derecho: El Visor integrado */}
      <Box component="main" sx={{ flexGrow: 1, height: '100vh', overflowY: 'auto', backgroundColor: '#f9f9f9' }}>
        {currentDoc ? (
          <WikiViewer document={currentDoc} />
        ) : (
          <Box sx={{ p: 8, textAlign: 'center', mt: 10 }}>
            <Typography variant="h5" color="textSecondary" gutterBottom sx={{ fontWeight: 600 }}>
              Bienvenido a la sección: {section.toUpperCase()}
            </Typography>
            <Typography variant="body1" color="textSecondary">
              Selecciona un documento en la sección izquierda para visualizar su contenido aquí.
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}