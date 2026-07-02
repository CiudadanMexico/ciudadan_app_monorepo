import React, { useState } from "react";
import {
  Button,
  TextField,
  CircularProgress,
  Box,
  Typography
} from "@mui/material";
import { useStores } from "../../../hooks/useStores.jsx";
import { useAuth0 } from "@auth0/auth0-react";

import {
  GoogleMap,
  Marker,
  useLoadScript
} from "@react-google-maps/api";
import usePlacesAutocomplete, {
  getGeocode,
  getLatLng,
} from "use-places-autocomplete";

const Paso2 = (setActiveStep, laTienda, usuario) => {

      const {
        updateStore,
        createDireccion,
      } = useStores();

    const [error, setError] = useState("");
      const [loading, setLoading] = useState(false);
      const [direccionData, setDireccionData] = useState({ direccion: "", lat: null, lng: null, cp: "", ciudad: "", estado: "" });

      const handleSaveDireccion = async () => {
        const { direccion, lat, lng, cp, ciudad, estado } = direccionData;
        if (!direccion || !lat || !lng) return setError("Selecciona una dirección válida");
        setLoading(true);
        setError("");
        try {
          await createDireccion({ data: { direccion: JSON.stringify({ address: direccion }), coords: JSON.stringify({ lat, lng }), cp, ciudad, estado, activa: true, email: usuario, store_id: laTienda.id } });
          await updateStore(laTienda.id, { paso: 3 });
          setActiveStep(3);
        } catch (err) {
          console.error("Error al guardar dirección", err);
          setError("Error al guardar dirección");
        } finally {
          setLoading(false);
        }
      };

    // Map & autocomplete
      const { isLoaded } = useLoadScript({ googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY, libraries: ["places"] });
      const { ready, value, setValue, suggestions: { status, data }, clearSuggestions } = usePlacesAutocomplete({ requestOptions: { componentRestrictions: { country: 'mx' } }, debounce: 300 });
      const handleSelect = async address => {
        try {
          setValue(address, false);
          clearSuggestions();
          const results = await getGeocode({ address });
          const { lat, lng } = await getLatLng(results[0]);
          const components = results[0].address_components;
          const comp = { cp: '', ciudad: '', estado: '' };
          components.forEach(c => {
            if (c.types.includes('postal_code')) comp.cp = c.long_name;
            if (c.types.includes('administrative_area_level_1')) comp.estado = c.long_name;
            if (c.types.includes('locality') || c.types.includes('administrative_area_level_2')) comp.ciudad = c.long_name;
          });
          setDireccionData({ direccion: address, lat, lng, ...comp });
        } catch (err) {
          console.error("Error en autocomplete:", err);
        }
      };


  return (
    <Box mt={2}>
          <Box mb={2} p={2} sx={{ backgroundColor: 'error.main', color: 'yellow' }}>
            <Typography>
              <strong>Nota:</strong> Tu dirección de remitente es privada y solo se usa para fines de envío.
            </Typography>
          </Box>
          <TextField
            label="Buscar dirección"
            value={value}
            onChange={e => setValue(e.target.value)}
            disabled={!ready}
            fullWidth
            margin="normal"
          />
          {status === 'OK' && (
            <Box sx={{ maxHeight: 200, overflowY: 'auto', bgcolor: 'background.paper', mb: 2, borderRadius: 1, boxShadow: 1 }}>
              {data.map(({ place_id, description }) => (
                <Box
                  key={place_id}
                  onClick={() => handleSelect(description)}
                  sx={{ p: 1, cursor: 'pointer', '&:hover': { backgroundColor: '#f0f0f0' } }}
                >
                  <Typography>{description}</Typography>
                </Box>
              ))}
            </Box>
          )}
          {isLoaded && direccionData.lat && (
            <GoogleMap
              mapContainerStyle={{ width: '100%', height: '300px' }}
              zoom={15}
              center={{ lat: direccionData.lat, lng: direccionData.lng }}
            >
              <Marker position={{ lat: direccionData.lat, lng: direccionData.lng }} />
            </GoogleMap>
          )}
          <Button
            onClick={handleSaveDireccion}
            disabled={loading}
            variant="contained"
            sx={{ mt: 2 }}
          >
            {loading ? <CircularProgress size={24} /> : 'Guardar Dirección'}
          </Button>
        </Box>
  )
}

export default Paso2