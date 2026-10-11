import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Typography, Box } from "@mui/material";

// Sección con ancla para navegación por URL y entrada discreta con
// Framer Motion. Respeta prefers-reduced-motion.
export default function Seccion({ id, title, kicker, children, sx }) {
  const reducir = useReducedMotion();
  return (
    <Box
      component="section"
      id={id}
      sx={{
        scrollMarginTop: 90,
        py: { xs: 5, md: 8 },
        ...sx,
      }}
    >
      <motion.div
        initial={reducir ? false : { opacity: 0, y: 24 }}
        whileInView={reducir ? undefined : { opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.15 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        {kicker && (
          <Typography
            variant="overline"
            sx={{ color: "#a78bfa", letterSpacing: 2, fontWeight: 700 }}
          >
            {kicker}
          </Typography>
        )}
        {title && (
          <Typography
            variant="h4"
            sx={{ fontWeight: 900, mb: 1, color: "#f3f0ff" }}
          >
            {title}
          </Typography>
        )}
        <Box sx={{ mt: 3 }}>{children}</Box>
      </motion.div>
    </Box>
  );
}
