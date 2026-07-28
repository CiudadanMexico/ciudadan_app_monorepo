// src/components/WikiBar.jsx
import React, { useState, useRef } from 'react';
import { AppBar, Toolbar, IconButton, Typography, Button, Avatar, Box } from "@mui/material";
import { styled, keyframes } from "@mui/material/styles";
import { motion } from "framer-motion";
import { Link, useNavigate, useLocation } from "react-router-dom";
import UserIcon from "./NavBar/UserIcon"; 
import { useAuth0 } from "@auth0/auth0-react";
// assets
import logo from "../assets/wikiciudadan.png";
import guestImg from "../assets/guest.png";
import guestImage from '../assets/guest.png'; // Ajusta la ruta si es necesario

// ----- Animaciones CSS para el neón -----
const neonMove = keyframes`
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
`;

const AppBarRoot = styled(AppBar)(({ theme }) => ({
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  zIndex: 1400,
  background: "linear-gradient(90deg, #8efc6e 0%, #6dffb3 25%, #b36dff 60%, #7a4cff 100%)",
  backgroundSize: "200% 200%",
  boxShadow: "0 6px 30px rgba(0,0,0,0.25)",
  borderBottomLeftRadius: 8,
  borderBottomRightRadius: 8,
}));

const NeonStrip = styled("div")(({ theme }) => ({
  height: 6,
  width: "100%",
  marginTop: 8,
  borderRadius: 4,
  background:
    "linear-gradient(270deg, rgba(142,252,110,0.95), rgba(179,109,255,0.95), rgba(123,76,255,0.95))",
  backgroundSize: "300% 100%",
  animation: `${neonMove} 3.5s ease-in-out infinite`,
  boxShadow: "0 0 18px rgba(123,76,255,0.28), 0 0 30px rgba(142,252,110,0.12)",
}));

const LogoImg = styled("img")(({ theme }) => ({
  height: 64,
  width: 64,
  objectFit: "cover",
  borderRadius: 8,
  marginRight: theme.spacing(1.5),
  boxShadow: "0 6px 18px rgba(0,0,0,0.25)",
}));

const TitleBox = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  lineHeight: 1,
  marginLeft: theme.spacing(0.5),
}));

const RightArea = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(1.5),
}));

const Subtitle = styled(Typography)(({ theme }) => ({
  fontSize: 13,
  opacity: 0.95,
  fontWeight: 500,
}));

// ----- Componente -----
const WikiBar = ({ SetIsMenuOpen }) => {
  const navigate = useNavigate();
  const { user, isAuthenticated, loginWithRedirect, logout } = useAuth0();
  const [isMenuOpen, setIsMenuOpen] = useState(SetIsMenuOpen || false);  
  const profileRef = useRef(null); 
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false); 
  const closeAllMenus = () => {
    setIsProfileMenuOpen(false);
  };
  const handleLinkClick = (path) => {
    navigate(path);
    setIsMenuOpen(false);
  };

  const handleLogin = () => {
    // Guarda la URL actual antes de hacer login
    const currentUrl = window.location.pathname + window.location.search;
    document.cookie = `returnTo=${encodeURIComponent(currentUrl)}; path=/; max-age=3600`;
    console.log("URL guardada en cookie antes de login:", currentUrl);
    // Redirige a Auth0
    loginWithRedirect();
    setIsMenuOpen(false);
  };
  
    const handleLogout = () => {
    console.log('cerrando sesión');
    // Elimina la cookie de retorno antes de cerrar sesión
    document.cookie = "returnTo=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    //console.log("Cookie de returnTo eliminada antes de logout");
    // Redirige a la página principal después del logout
    logout({ returnTo: window.location.origin });
    setIsMenuOpen(false);
  };

  const avatarSrc = isAuthenticated ? user?.picture : guestImg;

  return (
    <>
      <AppBarRoot position="static" elevation={0}>
        <Toolbar
          sx={{
            minHeight: { xs: 72, sm: 72 },
            px: { xs: 1.5, sm: 3 },
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}
        >
          

          {/* Logo + Títulos */}
          <motion.div
            style={{ display: "flex", alignItems: "center", marginLeft: 12 }}
            initial={{ x: -18, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
          >
            <LogoImg src={logo} alt="Wiki Ciudadan.org" />
            <TitleBox>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 900,
                  letterSpacing: -0.3,
                  fontSize: { xs: 16, sm: 18, md: 20 },
                  color: "#581046ff",
                  textShadow: "0 2px 18px rgba(0,0,0,0.12)",
                }}
              >
                Wiki Ciudadan.org 🔥
              </Typography>
              <Subtitle variant="caption" color="text.secondary">
                Toda la información de Ciudadan al alcance de tu mano  📚✨
              </Subtitle>
            </TitleBox>
          </motion.div>

          {/* Spacer */}
          <Box sx={{ flex: 1 }} />

          {/* Botón volver al sitio (home) */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            <Button
              variant="contained"
              onClick={() => navigate("/")}
              sx={{
                textTransform: "none",
                fontWeight: 700,
                boxShadow: "0 8px 20px rgba(0,0,0,0.18)",
                borderRadius: 2,
                px: 2,
                py: 1,
                bgcolor: "rgba(255,255,255,0.12)",
                backdropFilter: "blur(4px)",
                color: "#fff",
                "&:hover": {
                  transform: "translateY(-2px)",
                  boxShadow: "0 12px 30px rgba(0,0,0,0.25)",
                },
              }}
            >
              ← Volver al sitio
            </Button>
          </motion.div>

          {/* Right side: MenuIcon + perfil */}
          <RightArea>
            {/* MenuIcon personalizado importado */}
            <motion.div whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.98 }}>
              <UserIcon 
                handleLogin={handleLogin}
                isMenuOpen={isProfileMenuOpen}
                setIsMenuOpen={(open) => {
                  closeAllMenus(); // <--- CIERRA LOS DEMÁS
                  setIsProfileMenuOpen(open);
                }}
                handleLogout={handleLogout}
                handleLinkClick={handleLinkClick}
                defaultProfileImage={guestImage}
                guestImage={guestImage}
                Link={Link}
                containerRef={profileRef}
              />
            </motion.div>           
          </RightArea>
        </Toolbar>

        {/* Banda neón animada */}
        <Box sx={{ px: { xs: 1.5, sm: 3 } }}>
          <NeonStrip />
        </Box>
      </AppBarRoot>

      {/* Espacio para que el contenido no quede debajo del AppBar fijo */}
      <Box sx={{ height: { xs: 72 + 12, sm: 72 + 12 } }} />
    </>
  );
};

export default WikiBar;
