import { Autocomplete, Box, Divider, TextField, Typography } from '@mui/material';

const Paso2 = ({
  formData,
  handleChange,
  formSubmitted,
  consignmentNotes = [],
  packagings = [],
  consignmentSearch,
  packagingSearch,
  setConsignmentSearch,
  setPackagingSearch,
  loadingConsignments = false,
  loadingPackagings = false
}) => {

  const selectedConsignmentNote = consignmentNotes.find((item) => String(item.consignment_note) === String(formData.consignment_note || '')) || null;
  const selectedPackaging = packagings.find((item) => String(item.code) === String(formData.package_type || '')) || null;
  return (
    <>
      <Typography variant="h6" gutterBottom> Medidas del producto </Typography>
      <TextField
        className="input-text"
        label="Alto (cm)"
        name="alto"
        type="number"
        value={formData.alto}
        onChange={handleChange}
        required
        fullWidth
        error={formSubmitted && !formData.alto}
        helperText={formSubmitted && !formData.alto ? 'Este campo es obligatorio' : ''}
      />
      <TextField
        className="input-text"
        label="Ancho (cm)"
        name="ancho"
        type="number"
        value={formData.ancho}
        onChange={handleChange}
        required
        fullWidth
        error={formSubmitted && !formData.ancho}
        helperText={formSubmitted && !formData.ancho ? 'Este campo es obligatorio' : ''}
      />
      <TextField
        className="input-text"
        label="Largo (cm)"
        name="largo"
        type="number"
        value={formData.largo}
        onChange={handleChange}
        required
        fullWidth
        error={formSubmitted && !formData.largo}
        helperText={formSubmitted && !formData.largo ? 'Este campo es obligatorio' : ''}
      />
      <TextField
        className="input-text"
        label="Peso (kg)"
        name="peso"
        type="number"
        value={formData.peso}
        onChange={handleChange}
        required
        fullWidth
        error={formSubmitted && !formData.peso}
        helperText={formSubmitted && !formData.peso ? 'Este campo es obligatorio' : ''}
      />
      <Divider sx={{ my: 2 }} />
      <Typography variant="h6" gutterBottom> Configuración de envío </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }} >
        Estos valores se utilizarán como configuración predeterminada cuando este producto forme parte de un envío.
      </Typography>
      {/* CARTA PORTE */}
      <Autocomplete
        options={consignmentNotes}
        value={selectedConsignmentNote}
        onChange={(_, newValue) => {
          handleChange({
            target: {
              name: 'consignment_note',
              value: newValue ? String(newValue.consignment_note) : '',
              type: 'text',
            },
          });
          if (!newValue)
            setConsignmentSearch('');
        }}
        inputValue={consignmentSearch}
        onInputChange={(_, newInputValue, reason) => {
          if (reason === 'input') {
            setConsignmentSearch(newInputValue);
          }

          if (reason === 'clear') {
            setConsignmentSearch('');
            handleChange({
              target: {
                name: 'consignment_note',
                value: '',
                type: 'text',
              }
            });
          }
        }}
        getOptionLabel={(option) =>
          option ? `${option.description} (${option.consignment_note})` : ''
        }
        isOptionEqualToValue={(option, value) =>
          String(option.consignment_note) === String(value.consignment_note)
        }
        noOptionsText="No se encontraron Cartas Porte"
        loadingText="Buscando ..."
        loading={loadingConsignments}
        renderOption={(props, option) => (
          <Box component="li" {...props}>
            <Box>
              <Typography variant="body2">
                {option.description}
              </Typography>
              <Typography variant="caption" color="text.secondary" >
                Código: {option.consignment_note}
              </Typography>
            </Box>
          </Box>
        )}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Carta Porte"
            required
            fullWidth
            error={formSubmitted && !formData.consignment_note}
            helperText={formSubmitted && !formData.consignment_note ? 'Selecciona una Carta Porte' : ''}
          />
        )}
      />

      {/* TIPO DE EMPAQUE */}
      <Autocomplete
        options={packagings}
        value={selectedPackaging}
        onChange={(_, newValue) => {
          handleChange({
            target: {
              name: 'package_type',
              value: newValue ? newValue.code : '',
              type: 'text',
            },
          });
        }}
        inputValue={packagingSearch}
        onInputChange={(_, newInputValue, reason) => {
          if (reason === 'input') {
            const value = newInputValue.trim();
            setPackagingSearch(value);
          }

          if (reason === 'clear') {
            setPackagingSearch('');
            handleChange({
              target: {
                name: 'package_type',
                value: '',
                type: 'text',
              }
            })
          }
        }}
        getOptionLabel={(option) => option ? `${option.name} (${option.code})` : ''}
        isOptionEqualToValue={(option, value) => option.code === value.code}
        noOptionsText="No se encontraron tipos de empaque"
        loadingText="Buscando ..."
        loading={loadingPackagings}
        renderOption={(props, option) => (
          <Box component="li" {...props}>
            <Box>
              <Typography variant="body2">
                {option.name}
              </Typography>
              <Typography variant="caption" color="text.secondary" >
                Código: {option.code}
              </Typography>
            </Box>
          </Box>
        )}
        renderInput={(params) => (
          <TextField {...params}
            label="Tipo de empaque"
            required
            fullWidth
            error={formSubmitted && !formData.package_type}
            helperText={formSubmitted && !formData.package_type ? 'Selecciona un tipo de empaque' : ''}
          />
        )}
      />

      {/* <TextField
        className="input-text"
        select
        fullWidth
        required
        label="Tipo de empaque"
        name="package_type"
        value={formData.package_type || ''}
        onChange={handleChange}
        error={formSubmitted && !formData.package_type}
        helperText={formSubmitted && !formData.package_type ? 'Selecciona un tipo de empaque' : ''}
      >
        <MenuItem value=""> <em>Selecciona una opción</em> </MenuItem>
        {packagings.map((item) => (
          <MenuItem
            key={item.code}
            value={item.code}
          > {item.name} ({item.code})
          </MenuItem>))
        }
      </TextField> */}
      <Box sx={{ mt: 1 }}>
        <Typography variant="caption" color="text.secondary">
          La configuración de envío podrá modificarse posteriormente al preparar el envío del pedido.
        </Typography>
      </Box>
    </>
  );
};

export default Paso2;
