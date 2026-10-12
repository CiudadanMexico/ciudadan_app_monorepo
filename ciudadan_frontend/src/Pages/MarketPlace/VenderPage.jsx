// Pagina publica «Vende en Ciudadan» — ruta /market/vender.
// Landing comercial responsive: hero, beneficios, Tienda Oficial, simulador Labory,
// digitalizacion, pasos, FAQ y CTA final. Un solo H1. SEO via document head.
import React, { useEffect } from 'react';
import { Box, Breadcrumbs, Container, Link, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import VenderHero from '../../components/Market/Vender/VenderHero';
import VenderBeneficios from '../../components/Market/Vender/VenderBeneficios';
import VenderTiendaOficial from '../../components/Market/Vender/VenderTiendaOficial';
import LaborySimulador from '../../components/Market/Vender/LaborySimulador';
import VenderDigitaliza from '../../components/Market/Vender/VenderDigitaliza';
import VenderPasos from '../../components/Market/Vender/VenderPasos';
import VenderFaq from '../../components/Market/Vender/VenderFaq';
import VenderCtaFinal from '../../components/Market/Vender/VenderCtaFinal';
import '../../styles/vender.css';

const TITULO_SEO = 'Vende en Ciudadan | Tienda gratis sin comisiones en Mexico';
const DESCRIPCION_SEO =
  'Abre tu tienda gratis en Ciudadan Marketplace: 0% de comision de Ciudadan, pagos directos y cobertura nacional en Mexico. Descubre Tienda Oficial y Membresia de Negocios.';

function actualizaMeta(nombre, contenido, atributo = 'name') {
  let etiqueta = document.head.querySelector(`meta[${atributo}="${nombre}"]`);
  if (!etiqueta) {
    etiqueta = document.createElement('meta');
    etiqueta.setAttribute(atributo, nombre);
    document.head.appendChild(etiqueta);
  }
  etiqueta.setAttribute('content', contenido);
}

export default function VenderPage() {
  useEffect(() => {
    document.title = TITULO_SEO;
    actualizaMeta('description', DESCRIPCION_SEO);
    actualizaMeta('og:title', TITULO_SEO, 'property');
    actualizaMeta('og:description', DESCRIPCION_SEO, 'property');
    actualizaMeta('og:type', 'website', 'property');
    return undefined;
  }, []);

  return (
    <Box component="main" id="vender-ciudadan">
      <Container maxWidth="lg" sx={{ pt: 2 }}>
        <Breadcrumbs aria-label="Ruta de navegacion" sx={{ fontSize: 13 }}>
          <Link component={RouterLink} to="/market" color="inherit" underline="hover">
            Market
          </Link>
          <Typography color="text.primary" fontSize={13}>
            Vende en Ciudadan
          </Typography>
        </Breadcrumbs>
      </Container>
      <VenderHero />
      <VenderBeneficios />
      <VenderTiendaOficial />
      <LaborySimulador />
      <VenderDigitaliza />
      <VenderPasos />
      <VenderFaq />
      <VenderCtaFinal />
    </Box>
  );
}
