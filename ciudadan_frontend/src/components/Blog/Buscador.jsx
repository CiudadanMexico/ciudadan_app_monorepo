import { Box, TextField } from '@mui/material';

const Buscador = () => (
  <Box mt={2} textAlign="center">
    <TextField
      variant="outlined"
      placeholder="Buscar en contenidos..."
      fullWidth
      sx={{ maxWidth: 500, mx: 'auto', boxShadow: 3, borderRadius: 2 }}
    />

    
  </Box>
);

export default Buscador;
