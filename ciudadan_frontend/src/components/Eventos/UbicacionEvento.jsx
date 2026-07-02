import React, { useState } from 'react';
import {
  GoogleMap,
  Marker,
  useLoadScript,
} from '@react-google-maps/api';
import usePlacesAutocomplete, {
  getGeocode,
  getLatLng,
} from 'use-places-autocomplete';
import {
  TextField,
  Box,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  CircularProgress,
} from '@mui/material';

const libraries = ['places'];
const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

const mapContainerStyle = {
  width: '100%',
  height: '300px',
  border: '2px dashed #86ff81aa',
  borderRadius: 8,
  marginBottom: '1rem',
  pointerEvents: 'none', // 👈 Esto es CLAVE
};

const defaultCenter = {
  lat: 19.4326,
  lng: -99.1332,
};

export default function UbicacionEvento({ onLocationChange }) {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries,
  });

  const {
    ready,
    value,
    setValue,
    suggestions: { status, data },
    clearSuggestions,
  } = usePlacesAutocomplete({
    requestOptions: {
      componentRestrictions: { country: 'mx' },
    },
    debounce: 300,
  });

  const [marker, setMarker] = useState(null);
  const [direccion, setDireccion] = useState('');
  const [loadingCoords, setLoadingCoords] = useState(false);

  const center = marker || defaultCenter;

  const handleSelect = async (address) => {
    setValue(address, false);
    clearSuggestions();
    setDireccion(address);
    setLoadingCoords(true);

    try {
      const results = await getGeocode({ address });
      const { lat, lng } = await getLatLng(results[0]);

      const components = results[0].address_components || [];
      let ciudad = '', estado = '', cp = '';

      components.forEach(c => {
        if (c.types.includes('locality')) ciudad = c.long_name;
        if (c.types.includes('administrative_area_level_1')) estado = c.long_name;
        if (c.types.includes('postal_code')) cp = c.long_name;
      });

      setMarker({ lat, lng });
      onLocationChange?.({
        direccion: address,
        ciudad,
        estado,
        cp,
        lat,
        lng,
      });
    } catch (err) {
      console.error('Error geocodificando dirección:', err);
    } finally {
      setLoadingCoords(false);
    }
  };

  if (loadError) return <Typography color="error">Error cargando mapas</Typography>;
  if (!isLoaded) return <Box sx={{ textAlign: 'center' }}><CircularProgress /></Box>;

  return (
    <Box>
      <Typography variant="subtitle1" gutterBottom>
        Busca la dirección y selecciónala:
      </Typography>

      <TextField
        label="Dirección"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={!ready}
        fullWidth
        margin="normal"
        placeholder="Ej. Av. Reforma 123, CDMX"
      />

      {status === 'OK' && (
        <List
          sx={{
            maxHeight: 200,
            overflowY: 'auto',
            bgcolor: 'background.paper',
            mb: 2,
            borderRadius: 1,
            boxShadow: 1,
          }}
        >
          {data.map(({ place_id, description }) => (
            <ListItem key={place_id} disablePadding>
              <ListItemButton onClick={() => handleSelect(description)}>
                <ListItemText primary={description} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      )}

      <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>
        Mapa de ubicación
      </Typography>

      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        zoom={marker ? 15 : 12}
        center={center}
      >
        {marker && <Marker position={marker} />}
      </GoogleMap>

      {loadingCoords && (
        <Box sx={{ textAlign: 'center', my: 1 }}>
          <CircularProgress size={20} />
        </Box>
      )}

      {marker && (
        <Typography variant="body2" sx={{ mt: 1 }}>
          Coordenadas: {marker.lat.toFixed(5)}, {marker.lng.toFixed(5)}
        </Typography>
      )}
    </Box>
  );
}
