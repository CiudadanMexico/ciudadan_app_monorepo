import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Grid,
  Stack,
  Typography,
  useTheme,
} from "@mui/material";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0 },
};

/**
 * SectionBlock — bloque reutilizable de sección para el home.
 *
 * Props:
 *  - eyebrow:        string — etiqueta superior (chip decorativo)
 *  - title:          string — título principal
 *  - subtitle:       string — subtítulo / descripción
 *  - image:          string — URL/import de la imagen
 *  - imageAlt:       string — texto alternativo de la imagen
 *  - reverse:        bool   — invierte el orden (imagen izquierda / texto derecha)
 *  - chips:          array  — [{ label, title, subtitle }]
 *                     Cada chip es un botón: al hacer clic cambia el título y
 *                     subtítulo de la sección por los valores del chip.
 *                     Si el chip no trae title/subtitle, solo actúa como tag.
 *  - cards:          array  — [{ icon, title, text }] tarjetas superpuestas sobre la imagen
 *  - primaryAction:  string — texto del botón primario
 *  - secondaryAction:string — texto del botón secundario
 */
function SectionBlock({
  eyebrow,
  title,
  subtitle,
  image,
  imageAlt,
  reverse = false,
  chips = [],
  cards = [],
  primaryAction,
  secondaryAction,
}) {
  const theme = useTheme();
  const [activeChip, setActiveChip] = useState(null);

  // Si hay un chip activo con texto propio, se muestra su título/subtítulo.
  const displayTitle = activeChip?.title || title;
  const displaySubtitle = activeChip?.subtitle || subtitle;

  const handleChipClick = (chip) => {
    // Si el chip no trae texto alternativo, no cambia nada (solo tag).
    if (!chip.title && !chip.subtitle) return;
    // Toggle: clic en el mismo chip restaura el texto original.
    setActiveChip(activeChip === chip ? null : chip);
  };

  return (
    <Box sx={{ py: { xs: 7, md: 10 } }}>
      <Container maxWidth="xl">
        <Grid
          container
          spacing={4}
          alignItems="center"
          direction={reverse ? "row-reverse" : "row"}
        >
          <Grid item xs={12} md={6}>
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.25 }} variants={fadeUp}>
              <Stack spacing={2.25}>
                <Chip
                  label={eyebrow}
                  sx={{ alignSelf: "flex-start", fontWeight: 700 }}
                  color="success"
                  variant="outlined"
                />
                <Typography
                  variant="h3"
                  sx={{
                    fontWeight: 900,
                    lineHeight: 1.03,
                    letterSpacing: "-0.03em",
                    fontSize: { xs: "2rem", md: "3.1rem" },
                  }}
                >
                  {displayTitle}
                </Typography>
                <Typography
                  variant="h6"
                  sx={{
                    color: "text.secondary",
                    lineHeight: 1.55,
                    fontSize: { xs: "1rem", md: "1.15rem" },
                    maxWidth: 640,
                  }}
                >
                  {displaySubtitle}
                </Typography>

                {chips.length > 0 && (
                  <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                    {chips.map((c) => {
                      const isActive = activeChip === c;
                      const clickable = Boolean(c.title || c.subtitle);
                      return (
                        <Chip
                          key={c.label}
                          label={c.label}
                          onClick={clickable ? () => handleChipClick(c) : undefined}
                          sx={{
                            fontWeight: 600,
                            cursor: clickable ? "pointer" : "default",
                            transition: "all 0.2s ease",
                            ...(isActive && {
                              bgcolor: "success.main",
                              color: "#fff",
                              fontWeight: 800,
                            }),
                            ...(clickable && !isActive && {
                              "&:hover": { bgcolor: "success.light", color: "#fff" },
                            }),
                          }}
                        />
                      );
                    })}
                  </Stack>
                )}

                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ pt: 0.5 }}>
                  {primaryAction && (
                    <Button
                      variant="contained"
                      size="large"
                      endIcon={<ArrowForwardRoundedIcon />}
                      sx={{ px: 2.4, py: 1.3, borderRadius: 999, fontWeight: 800 }}
                    >
                      {primaryAction}
                    </Button>
                  )}
                  {secondaryAction && (
                    <Button
                      variant="outlined"
                      size="large"
                      sx={{ px: 2.4, py: 1.3, borderRadius: 999, fontWeight: 800 }}
                    >
                      {secondaryAction}
                    </Button>
                  )}
                </Stack>
              </Stack>
            </motion.div>
          </Grid>

          <Grid item xs={12} md={6}>
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 24 }}
              whileInView={{ opacity: 1, scale: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            >
              <Box
                sx={{
                  position: "relative",
                  borderRadius: 6,
                  overflow: "hidden",
                  minHeight: { xs: 300, sm: 380, md: 520 },
                  boxShadow: theme.shadows[10],
                  background: "linear-gradient(180deg, rgba(0,0,0,0.08), rgba(0,0,0,0.22))",
                }}
              >
                <Box
                  component="img"
                  src={image}
                  alt={imageAlt}
                  sx={{
                    width: "100%",
                    height: "100%",
                    minHeight: { xs: 300, sm: 380, md: 520 },
                    objectFit: "cover",
                    display: "block",
                  }}
                />
                <Box
                  sx={{
                    position: "absolute",
                    inset: 0,
                    background:
                      "linear-gradient(180deg, rgba(5,10,16,0.05) 0%, rgba(5,10,16,0.18) 55%, rgba(5,10,16,0.56) 100%)",
                  }}
                />
                {cards.length > 0 && (
                  <Stack
                    spacing={1.25}
                    sx={{
                      position: "absolute",
                      left: { xs: 14, md: 18 },
                      right: { xs: 14, md: 18 },
                      bottom: { xs: 14, md: 18 },
                    }}
                  >
                    {cards.map((card) => (
                      <Card
                        key={card.title}
                        sx={{
                          background: "rgba(10, 15, 20, 0.62)",
                          backdropFilter: "blur(10px)",
                          color: "#fff",
                          borderRadius: 4,
                          border: "1px solid rgba(255,255,255,0.12)",
                        }}
                        elevation={0}
                      >
                        <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
                          <Stack direction="row" spacing={1.25} alignItems="center">
                            <Box
                              sx={{
                                width: 40,
                                height: 40,
                                borderRadius: 2,
                                bgcolor: "rgba(255,255,255,0.12)",
                                display: "grid",
                                placeItems: "center",
                                flex: "0 0 auto",
                              }}
                            >
                              {card.icon}
                            </Box>
                            <Box>
                              <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.15 }}>
                                {card.title}
                              </Typography>
                              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                                {card.text}
                              </Typography>
                            </Box>
                          </Stack>
                        </CardContent>
                      </Card>
                    ))}
                  </Stack>
                )}
              </Box>
            </motion.div>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}

export default SectionBlock;