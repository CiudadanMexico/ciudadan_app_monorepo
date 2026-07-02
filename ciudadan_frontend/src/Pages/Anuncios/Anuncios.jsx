import React, { useState, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import axios from 'axios';

// Panels
import AnunciosPorDefecto from '../../components/Anuncios/AnunciosPorDefecto.jsx';
import AnunciosProgramados from '../../components/Anuncios/AnunciosProgramados.jsx';
import NuevoAnuncioProgramado from '../../components/Anuncios/NuevoAnuncioProgramado.jsx';
import HistorialPublicaciones from '../../components/Anuncios/HistorialPublicaciones.jsx';
import ConfiguracionAnuncios from '../../components/Anuncios/ConfiguracionAnuncios.jsx';
import { useRoles } from '../../Contexts/RolesContext';

import ActivaTuMembresia from '../../components/Membresias/ActivaTuMembresia.jsx';
import Pestanas from '../../components/Pestanas';

const Anuncios = () => {
  const { isActivaMembresia } = useRoles();
  const { slug } = useParams();
  const location = useLocation();
  const { user, isLoading } = useAuth0();

  const [tabIndex, setTabIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );

  const basePrueba = '/comunidad/mis-anuncios';
  const tabs = [
    { label: 'Por defecto', path: '' },
    { label: 'Programados', path: 'programados' },
    { label: 'Historial de Publicaciones', path: 'historial' },
    { label: 'Configuración', path: 'configuracion' }
  ];

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const path = (location.pathname || '').toLowerCase();

    if (path.includes(`${basePrueba}/programados`)) setTabIndex(1);
    else if (path.includes(`${basePrueba}/historial`)) setTabIndex(2);
    else if (path.includes(`${basePrueba}/configuracion`)) setTabIndex(3);
    else setTabIndex(0);
  }, [location.pathname]);

  if (isLoading) return <p>Cargando...</p>;

  if (!isActivaMembresia()) {
    return <ActivaTuMembresia />;
  }

  const filtros = 'mios';

  // 🔥 ÚNICO AGREGADO: detectar ruta directa
  const esNuevoAnuncioProgramado =
    location.pathname === '/comunidad/nuevo-anuncio-programado';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: isMobile ? 'column-reverse' : 'row',
        padding: '24px',
        gap: '32px',
        flexWrap: 'wrap'
      }}
    >
      <div style={{ flex: '1 1 100%' }}>
        <Pestanas
          tabs={tabs}
          basePath={basePrueba}
          onTabChange={(index) => setTabIndex(index)}
          collapseAt={640}
          backgroundColor="linear-gradient(90deg, #000000 0%, #1a1a1a 50%, #000000 100%)"
          textColor="#cfd2d6"
        />

        <div>
          {esNuevoAnuncioProgramado && <NuevoAnuncioProgramado />}

          {!esNuevoAnuncioProgramado && tabIndex === 0 && (
            <AnunciosPorDefecto />
          )}
          {!esNuevoAnuncioProgramado && tabIndex === 1 && (
            <AnunciosProgramados />
          )}
          {!esNuevoAnuncioProgramado && tabIndex === 2 && (
            <HistorialPublicaciones filtros={filtros} productos={'productos'} />
          )}
          {!esNuevoAnuncioProgramado && tabIndex === 3 && (
            <ConfiguracionAnuncios />
          )}
        </div>
      </div>
    </div>
  );
};

export default Anuncios;
