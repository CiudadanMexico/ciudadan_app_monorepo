import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  CircularProgress,
} from '@mui/material';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { useSnackbar } from 'notistack';

const ConfiguracionTienda = () => {
  const { slug } = useParams();
  const { enqueueSnackbar } = useSnackbar();
  const [storeId, setStoreId] = useState(null);
  const [imagen, setImagen] = useState(null);
  const [preview, setPreview] = useState('');
  const [cp, setCp] = useState('');
  const [localidad, setLocalidad] = useState('');
  const [ciudad, setCiudad] = useState('');
  const [estado, setEstado] = useState('');
  const [esquema, setEsquema] = useState('sin_iva');
  const [direccionId, setDireccionId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  // Base URL including /api
  const STRAPI_URL = process.env.REACT_APP_STRAPI_URL.replace(/\/$/, '') + '/api';

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get(
          `${STRAPI_URL}/stores?filters[slug][$eq]=${slug}&populate=direccion,imagen`
        );
        const store = res.data.data[0];
        setStoreId(store.id);
        const imgUrl = store.attributes.imagen?.data?.attributes?.url;
        setPreview(imgUrl ? `${process.env.REACT_APP_STRAPI_URL.replace(/\/$/, '')}${imgUrl}` : '');
        setCp(store.attributes.cp || '');
        setLocalidad(store.attributes.localidad || '');
        setEsquema(store.attributes.esquema_impuestos || 'sin_iva');
        const dirData = store.attributes.direccion?.data;
        if (dirData) {
          setDireccionId(dirData.id);
          setCiudad(dirData.attributes.ciudad || '');
          setEstado(dirData.attributes.estado || '');
          setCp(dirData.attributes.cp || cp);
        }
      } catch (err) {
        console.error('Error fetching store:', err);
        enqueueSnackbar('Error al cargar datos de la tienda', { variant: 'error' });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [slug]);

  const handleImageChange = e => {
    const file = e.target.files[0];
    setImagen(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const formStore = new FormData();
      if (imagen) formStore.append('files.imagen', imagen);
      const storeData = { cp, localidad, esquema_impuestos: esquema };
      formStore.append('data', JSON.stringify(storeData));
      await axios.put(
        `${STRAPI_URL}/stores/${storeId}`,
        formStore,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      const direccionPayload = {
        direccion: JSON.stringify({ cp, ciudad, estado }),
        cp,
        ciudad,
        estado,
        store_id: storeId
      };
      if (direccionId) {
        await axios.put(
          `${STRAPI_URL}/direcciones/${direccionId}`,
          { data: direccionPayload }
        );
      } else {
        await axios.post(
          `${STRAPI_URL}/direcciones`,
          { data: direccionPayload }
        );
      }
      enqueueSnackbar('Configuración guardada', { variant: 'success' });
    } catch (err) {
      console.error('Error saving configuration:', err);
      enqueueSnackbar(
        'Error al guardar: ' + (err.response?.data?.error?.message || err.message),
        { variant: 'error' }
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <CircularProgress />;

  return (
    <Box width="100%" p={3}>
      <Typography variant="h4" gutterBottom>Configuración de Tienda</Typography>

      <Box mb={2}>
        <Typography>Imagen de perfil</Typography>
        {preview && <img src={preview} alt="Preview" style={{ width: 120, height: 120, objectFit: 'cover', borderRadius: 8 }} />}
        <Button variant="outlined" component="label" sx={{ mt: 1 }}>
          <i className="material-icons">photo_camera</i> Cambiar imagen
          <input type="file" hidden onChange={handleImageChange} />
        </Button>
      </Box>

      <TextField label="Código Postal" value={cp} onChange={e => setCp(e.target.value)} fullWidth sx={{ mb: 2 }} />
      <TextField label="Localidad" value={localidad} onChange={e => setLocalidad(e.target.value)} fullWidth sx={{ mb: 2 }} />
      <TextField label="Ciudad" value={ciudad} onChange={e => setCiudad(e.target.value)} fullWidth sx={{ mb: 2 }} />
      <TextField label="Estado" value={estado} onChange={e => setEstado(e.target.value)} fullWidth sx={{ mb: 2 }} />

      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel id="esquema-label">Esquema Impuestos</InputLabel>
        <Select labelId="esquema-label" value={esquema} label="Esquema Impuestos" onChange={e => setEsquema(e.target.value)}>
          <MenuItem value="sin_iva">Sin IVA</MenuItem>
          <MenuItem value="con_iva">Con IVA</MenuItem>
          <MenuItem value="optativo">Optativo</MenuItem>
        </Select>
      </FormControl>

      <Button variant="contained" onClick={handleSave} disabled={saving}>
        {saving ? <CircularProgress size={24} /> : 'Guardar cambios'}
      </Button>
    </Box>
  );
};

export default ConfiguracionTienda;
