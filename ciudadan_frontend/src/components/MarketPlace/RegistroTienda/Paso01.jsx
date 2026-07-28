import React, { useState } from "react";
import {
  Button,
  CircularProgress,
  Box,
  Typography
} from "@mui/material";
import { useStores } from "../../../hooks/useStores.jsx";




const Paso01 = (storeName, email) => {

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const {
        onboardingStripe,
    } = useStores();

    const handleStripeConnect = async () => {
    setLoading(true);
    setError("");
    try {
      const url = await onboardingStripe(storeName, email);
      window.location.href = `${url}?returnTo=${encodeURIComponent(window.location.href)}`;
    } catch (err) {
      console.error(err);
      setError("Error al conectar con Stripe");
    } finally { setLoading(false); }
  };
  return (
    <Box mt={2}>
        <Typography>Conectar Stripe</Typography>
        {error&&<Typography color="error">{error}</Typography>}
        <Button onClick={handleStripeConnect} disabled={loading} variant="contained" color="secondary" sx={{mt:2}}>{loading?<CircularProgress size={24}/>:'Conectar con Stripe'}</Button>
    </Box>
  )
}

export default Paso01