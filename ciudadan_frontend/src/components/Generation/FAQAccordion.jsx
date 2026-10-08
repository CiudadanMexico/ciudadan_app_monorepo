/**
 * FAQAccordion — preguntas frecuentes del ecosistema Generación Fundadora.
 * Accesible: Accordion de MUI (botones reales, teclado, aria expandible).
 */
import { Accordion, AccordionDetails, AccordionSummary, Typography, Box } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMoreRounded';
import { GEN_COLORS } from './GenerationTheme';

const FAQAccordion = ({ items = [] }) => (
  <Box sx={{ '& .MuiAccordion-root': { bgcolor: 'transparent' } }}>
    {items.map((item) => (
      <Accordion
        key={item.question}
        disableGutters
        sx={{
          bgcolor: 'rgba(255,255,255,0.03)',
          border: `1px solid ${GEN_COLORS.borde}`,
          borderRadius: '12px !important',
          mb: 1.5,
          '&:before': { display: 'none' },
          '&.Mui-expanded': { borderColor: GEN_COLORS.verde, my: 0 },
        }}
      >
        <AccordionSummary
          expandIcon={<ExpandMoreIcon sx={{ color: GEN_COLORS.verde }} />}
          aria-controls={`faq-${item.key}-content`}
          id={`faq-${item.key}-header`}
        >
          <Typography
            component="h3"
            sx={{
              fontWeight: 600,
              fontSize: { xs: '0.98rem', md: '1.05rem' },
              color: GEN_COLORS.texto,
            }}
          >
            {item.question}
          </Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ pt: 0 }}>
          <Typography sx={{ color: GEN_COLORS.textoSecundario, lineHeight: 1.7, fontSize: { xs: '0.95rem', md: '1rem' } }}>
            {item.answer}
          </Typography>
        </AccordionDetails>
      </Accordion>
    ))}
  </Box>
);

export default FAQAccordion;
