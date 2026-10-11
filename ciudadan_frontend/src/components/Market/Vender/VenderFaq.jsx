// SECCION 7 — Preguntas frecuentes (acordeon accesible).
import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Accordion, AccordionDetails, AccordionSummary, Box, Container, Typography } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { preguntasFrecuentes } from './venderLanding.membresia';

export default function VenderFaq() {
  const reduceMotion = useReducedMotion();
  return (
    <Box component="section" aria-labelledby="vender-faq-titulo" sx={{ py: { xs: 5, md: 7 }, bgcolor: 'background.default' }}>
      <Container maxWidth="md">
        <Typography id="vender-faq-titulo" component="h2" variant="h4" fontWeight={800} align="center" gutterBottom>
          Preguntas frecuentes
        </Typography>
        <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 3 }}>
          Respuestas precisas segun el modelo comercial vigente.
        </Typography>
        {preguntasFrecuentes.map((item, i) => (
          <motion.div
            key={item.pregunta}
            initial={reduceMotion ? {} : { opacity: 0, y: 14 }}
            whileInView={reduceMotion ? {} : { opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.4, delay: i * 0.04, ease: 'easeOut' }}
          >
            <Accordion defaultExpanded={i === 0} sx={{ borderRadius: 2, mb: 1 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />} aria-controls={`vender-faq-panel-${i}`} id={`vender-faq-header-${i}`}>
                <Typography component="h3" variant="subtitle1" fontWeight={700}>
                  {item.pregunta}
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8 }}>
                  {item.respuesta}
                </Typography>
              </AccordionDetails>
            </Accordion>
          </motion.div>
        ))}
      </Container>
    </Box>
  );
}
