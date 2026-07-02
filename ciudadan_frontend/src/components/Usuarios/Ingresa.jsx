import React from "react";
import { useAuth0 } from "@auth0/auth0-react";
import {
  Card,
  CardContent,
  Typography,
  Button,
} from "@mui/material";
import LoginIcon from "@mui/icons-material/Login";

const Ingresa = () => {
  const { loginWithRedirect } = useAuth0();

  const handleLogin = () => {
    const currentUrl =
      window.location.pathname + window.location.search;

    document.cookie = `returnTo=${encodeURIComponent(
      currentUrl
    )}; path=/; max-age=3600`;

    console.log("URL guardada en cookie antes de login:", currentUrl);

    loginWithRedirect();
  };

  return (
    <Card sx={{ maxWidth: 760, mx: "auto", mt: 4 }}>
      <CardContent sx={{ textAlign: "center" }}>
        <Typography variant="h6">
          Inicia sesión para continuar
        </Typography>

        <Typography sx={{ color: "text.secondary", mb: 2 }}>
          Debes iniciar sesión o registrarte para comprar una membresía.
        </Typography>

        <Button
            variant="contained"
            size="large"
            startIcon={<LoginIcon />}
            onClick={handleLogin}
            sx={{
              px: 4,
              py: 1.5,
              borderRadius: 3,
              fontWeight: "bold",
            }}
          >
            Ir a Iniciar Sesión
          </Button>
      </CardContent>
    </Card>
  );
};

export default Ingresa;
