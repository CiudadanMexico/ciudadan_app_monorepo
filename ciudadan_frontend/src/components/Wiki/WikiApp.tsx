import React, { useEffect, useState } from 'react';
import { Box, Drawer, Typography, CircularProgress, Tabs, Tab } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { wikiService } from '../../services/wikiService';
import { TreeNodeDTO, DocumentResponseDTO } from '../../types/wiki';
import WikiTreeView from './WikiTreeView';
import WikiViewer from './WikiViewer';

type WikiSection = 'main' | 'help' | 'faq';
const SECTIONS: WikiSection[] = ['main', 'help', 'faq'];
const SECTION_LABEL: Record<WikiSection, string> = {
  main: 'Principal',
  help: 'Ayuda',
  faq: 'FAQ',
};

/**
 * Visor de la wiki organizado por sección.
 *
 * La sección llega por PROP (`<WikiApp section="help" />`) desde las rutas
 * (`/wiki/main`, `/wiki/help`, `/wiki/faq` en Routes). Antes se leía de
 * `useParams()` esperando un `:section` que no existe en esas rutas literales,
 * así que SIEMPRE caía a 'main' y las otras dos secciones mostraban el árbol
 * de principal — ese era el bug.
 */
export default function WikiApp({ section: sectionProp }: { section?: WikiSection } = {}) {
  const navigate = useNavigate();

  // Prop válida manda; si no viene (o es inválida), default: main.
  const initialSection: WikiSection =
    sectionProp && (SECTIONS as string[]).includes(sectionProp) ? sectionProp : 'main';
  const [section, setSection] = useState<WikiSection>(initialSection);

  const [tree, setTree] = useState<TreeNodeDTO[]>([]);
  const [currentDoc, setCurrentDoc] = useState<DocumentResponseDTO | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Si cambia la prop (navegación entre secciones), sincronizar y limpiar doc.
  useEffect(() => {
    setSection(initialSection);
    setCurrentDoc(null);
  }, [sectionProp]); // eslint-disable-line react-hooks/exhaustive-deps

  // 1. Cargamos el árbol de la sección seleccionada
  useEffect(() => {
    setLoading(true);
    wikiService
      .getSectionTree(section)
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

  const handleSectionChange = (_e: React.SyntheticEvent, newSection: WikiSection) => {
    navigate(`/wiki/${newSection}`);
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
            flexDirection: 'column',
          },
        }}
      >
        <Box sx={{ p: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1, letterSpacing: 0.5 }}>
            📁 EXPLORADOR WIKI
          </Typography>

          <Tabs
            value={section}
            onChange={handleSectionChange}
            variant="fullWidth"
            sx={{ minHeight: 36, '& .MuiTab-root': { minHeight: 36, fontSize: '0.72rem', fontWeight: 'bold' } }}
          >
            {SECTIONS.map((s) => (
              <Tab key={s} label={SECTION_LABEL[s]} value={s} />
            ))}
          </Tabs>
        </Box>

        <Box sx={{ overflowY: 'auto', flexGrow: 1, py: 1 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', pt: 4 }}>
              <CircularProgress size={24} />
            </Box>
          ) : (
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
          <WikiViewer document={currentDoc} onNavigateDocument={handleDocumentSelect} />
        ) : (
          <Box sx={{ p: 8, textAlign: 'center', mt: 10 }}>
            <Typography variant="h5" color="textSecondary" gutterBottom sx={{ fontWeight: 600 }}>
              Bienvenido a la sección: {SECTION_LABEL[section].toUpperCase()}
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