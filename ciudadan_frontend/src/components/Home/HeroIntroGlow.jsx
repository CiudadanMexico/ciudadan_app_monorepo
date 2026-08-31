// src/components/Home/HeroIntroGlow.jsx
import React from "react";
import { Box, Button, Chip, Stack, Typography } from "@mui/material";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import ParkRoundedIcon from "@mui/icons-material/ParkRounded";
import { motion } from "framer-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

const group = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
};

const glow1 = {
  animate: {
    x: [0, 16, -10, 0],
    y: [0, -12, 10, 0],
    scale: [1, 1.06, 0.98, 1],
  },
  transition: {
    duration: 9,
    repeat: Infinity,
    ease: "easeInOut",
  },
};

const glow2 = {
  animate: {
    x: [0, -14, 12, 0],
    y: [0, 10, -8, 0],
    scale: [1, 0.96, 1.05, 1],
  },
  transition: {
    duration: 11,
    repeat: Infinity,
    ease: "easeInOut",
  },
};

const glow3 = {
  animate: {
    x: [0, 10, -8, 0],
    y: [0, 8, -6, 0],
    scale: [1, 1.02, 0.97, 1],
  },
  transition: {
    duration: 13,
    repeat: Infinity,
    ease: "easeInOut",
  },
};

export default function HeroIntroGlow({
  eyebrow = "Cooperativismo 6.0",
  title = "Gestiona o sé parte de comunidades sustentables que producen, comercializan y avanzan cooperativamente",
  subtitle = "Tecnología abierta, Labory, economía colaborativa 6.0, asambleas virtuales y redes productivas para que socios, conductores, fundadores e inversionistas construyan autonomía real.",
  primaryAction = "Explorar el ecosistema",
  secondaryAction = "Usar Labory",
  tags = [
    "Comunidades autónomas",
    "Economía colaborativa 6.0",
    "Movilidad cooperativa",
    "Asambleas virtuales",
  ],
}) {
  return (
    <Box
      sx={{
        position: "relative",
        overflow: "hidden",
        borderRadius: 6,
        px: { xs: 0, md: 0 },
        py: { xs: 0, md: 0 },
      }}
    >
      {/* luces animadas */}
      <Box
        component={motion.div}
        animate={glow1.animate}
        transition={glow1.transition}
        sx={{
          position: "absolute",
          top: "-4%",
          left: "-8%",
          width: { xs: 180, md: 260 },
          height: { xs: 180, md: 260 },
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(255, 227, 120, 0.98) 0%, rgba(255, 227, 120, 0.42) 24%, rgba(255, 227, 120, 0) 72%)",
          filter: "blur(22px)",
          opacity: 0.95,
          pointerEvents: "none",
          mixBlendMode: "screen",
        }}
      />

      <Box
        component={motion.div}
        animate={glow2.animate}
        transition={glow2.transition}
        sx={{
          position: "absolute",
          top: "8%",
          right: "-10%",
          width: { xs: 190, md: 280 },
          height: { xs: 190, md: 280 },
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(82, 214, 255, 0.96) 0%, rgba(82, 214, 255, 0.38) 24%, rgba(82, 214, 255, 0) 72%)",
          filter: "blur(24px)",
          opacity: 0.9,
          pointerEvents: "none",
          mixBlendMode: "screen",
        }}
      />

      <Box
        component={motion.div}
        animate={glow3.animate}
        transition={glow3.transition}
        sx={{
          position: "absolute",
          bottom: "-8%",
          left: "18%",
          width: { xs: 160, md: 220 },
          height: { xs: 160, md: 220 },
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(126, 255, 198, 0.9) 0%, rgba(126, 255, 198, 0.28) 24%, rgba(126, 255, 198, 0) 72%)",
          filter: "blur(22px)",
          opacity: 0.78,
          pointerEvents: "none",
          mixBlendMode: "screen",
        }}
      />

      <Box
        sx={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background:
            "radial-gradient(circle at 18% 18%, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0) 34%), radial-gradient(circle at 78% 24%, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0) 30%), linear-gradient(180deg, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.22) 100%)",
        }}
      />

      <Box sx={{ position: "relative", zIndex: 1 }}>
        <motion.div initial="hidden" animate="visible" variants={group}>
          <Stack spacing={2.3}>
            <motion.div variants={fadeUp}>
              <Chip
                icon={<ParkRoundedIcon />}
                label={eyebrow}
                variant="outlined"
                sx={{
                  alignSelf: "flex-start",
                  fontWeight: 900,
                  color: "#eafff5",
                  borderColor: "rgba(255,255,255,0.35)",
                  bgcolor: "rgba(0,0,0,0.24)",
                  backdropFilter: "blur(10px)",
                }}
              />
            </motion.div>

            <motion.div variants={fadeUp}>
              <Typography
                variant="h1"
                sx={{
                  fontWeight: 950,
                  lineHeight: 0.96,
                  letterSpacing: "-0.05em",
                  fontSize: { xs: "2.35rem", sm: "3.45rem", md: "4.7rem" },
                  maxWidth: 760,
                  color: "#fff",
                  textShadow: "0 3px 24px rgba(0,0,0,0.55)",
                }}
              >
                {title}
              </Typography>
            </motion.div>

            <motion.div variants={fadeUp}>
              <Typography
                variant="h6"
                sx={{
                  color: "rgba(255,255,255,0.9)",
                  lineHeight: 1.6,
                  fontSize: { xs: "1rem", md: "1.18rem" },
                  maxWidth: 720,
                  textShadow: "0 2px 12px rgba(0,0,0,0.42)",
                }}
              >
                {subtitle}
              </Typography>
            </motion.div>

            <motion.div variants={fadeUp}>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                <Button
                  variant="contained"
                  size="large"
                  endIcon={<ArrowForwardRoundedIcon />}
                  sx={{
                    px: 2.8,
                    py: 1.45,
                    borderRadius: 999,
                    fontWeight: 900,
                    bgcolor: "#19d79c",
                    color: "#072015",
                    boxShadow: "0 12px 30px rgba(25,215,156,0.28)",
                    "&:hover": { bgcolor: "#15c98f" },
                  }}
                >
                  {primaryAction}
                </Button>

                <Button
                  variant="outlined"
                  size="large"
                  sx={{
                    px: 2.8,
                    py: 1.45,
                    borderRadius: 999,
                    fontWeight: 900,
                    color: "#fff",
                    borderColor: "rgba(255,255,255,0.4)",
                    bgcolor: "rgba(0,0,0,0.18)",
                    backdropFilter: "blur(8px)",
                    "&:hover": {
                      borderColor: "rgba(255,255,255,0.7)",
                      bgcolor: "rgba(0,0,0,0.28)",
                    },
                  }}
                >
                  {secondaryAction}
                </Button>
              </Stack>
            </motion.div>

            <motion.div variants={fadeUp}>
              <Stack
                direction="row"
                spacing={1}
                useFlexGap
                flexWrap="wrap"
                sx={{ pt: 0.5 }}
              >
                {tags.map((item) => (
                  <Box
                    key={item}
                    sx={{
                      px: 1.5,
                      py: 0.75,
                      borderRadius: 999,
                      fontSize: 13,
                      fontWeight: 700,
                      bgcolor: "rgba(255,255,255,0.12)",
                      color: "#fff",
                      border: "1px solid rgba(255,255,255,0.18)",
                      backdropFilter: "blur(10px)",
                    }}
                  >
                    {item}
                  </Box>
                ))}
              </Stack>
            </motion.div>
          </Stack>
        </motion.div>
      </Box>
    </Box>
  );
}