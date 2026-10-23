import React, { useState } from 'react';
import {
  Box, Button, Card, CardActionArea, Grid2 as Grid, TextField, Typography,
} from '@mui/material';
import repartidorService from '../../../services/Repartidor/repartidorService';
import { TarjetaPaso, TIPOS_VEHICULO } from '../helpers';

/**
 * Paso 3 (spec §6.5, §4.2-4.4): tipo de vehículo permitido + campos
 * condicionales. Bicicleta JAMAS pide placa/licencia; motocicleta exige
 * licencia/seguro/tarjeta VIGENTES; la eléctrica pide potencia/velocidad.
 * El backend revalida la matriz completa al guardar, enviar y aprobar.
 */
const StepVehiculo = ({ token, me, recargar, siguiente, toast }) => {
  const existente = me?.data?.vehicle || null;

  const [type, setType] = useState(existente?.type || 'bicicleta');
  const [brand, setBrand] = useState(existente?.brand || '');
  const [model, setModel] = useState(existente?.model || '');
  const [color, setColor] = useState(existente?.color || '');
  const [year, setYear] = useState(existente?.year || '');
  const [serial, setSerial] = useState(existente?.serial_or_vin || '');
  const [plate, setPlate] = useState(existente?.plate || '');
  const [motorPower, setMotorPower] = useState(existente?.motor_power || '');
  const [maxSpeed, setMaxSpeed] = useState(existente?.max_assisted_speed || '');
  const [licenseNumber, setLicenseNumber] = useState(existente?.license_number || '');
  const [licenseExpiration, setLicenseExpiration] = useState(existente?.license_expiration || '');
  const [insuranceExpiration, setInsuranceExpiration] = useState(existente?.insurance_expiration || '');
  const [cargando, setCargando] = useState(false);

  const esElectrica = type === 'bicicleta_electrica';
  const esMoto = type === 'motocicleta';

  const guardar = async () => {
    setCargando(true);
    try {
      const datos = { type, brand, model, color };
      if (serial) datos.serial_or_vin = serial;
      if (esElectrica) {
        datos.motor_power = motorPower;
        datos.max_assisted_speed = maxSpeed ? Number(maxSpeed) : '';
      }
      if (esMoto) {
        datos.year = year ? Number(year) : '';
        datos.plate = plate;
        datos.license_number = licenseNumber;
        datos.license_expiration = licenseExpiration;
        datos.insurance_expiration = insuranceExpiration;
      }
      await repartidorService.registrarVehiculo(token, datos);
      await recargar();
      toast?.success('Vehículo guardado. Ahora sube tus evidencias.');
      siguiente(3);
    } catch (e) {
      toast?.error(e.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <TarjetaPaso titulo="3. Tu vehículo">
      <Typography variant="body2" sx={{ mb: 2, color: 'rgba(255,255,255,0.8)' }}>
        Vehículos permitidos en el MVP: bicicleta, bicicleta eléctrica y motocicleta
        (sin automóviles ni repartidor a pie). La bici no requiere placa ni licencia.
      </Typography>

      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, mb: 3 }}>
        {TIPOS_VEHICULO.map((t) => (
          <Card
            key={t.id}
            variant="outlined"
            sx={{
              borderColor: type === t.id ? '#8A5CF5' : 'rgba(255,255,255,0.15)',
              bgcolor: type === t.id ? 'rgba(138,92,245,0.15)' : 'transparent',
            }}
          >
            <CardActionArea onClick={() => setType(t.id)} sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h4">{t.icono}</Typography>
              <Typography variant="subtitle2" sx={{ color: '#fff', fontWeight: 700 }}>{t.label}</Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>{t.descripcion}</Typography>
            </CardActionArea>
          </Card>
        ))}
      </Box>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <TextField fullWidth label="Marca" value={brand} onChange={(e) => setBrand(e.target.value)} />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <TextField fullWidth label="Modelo" value={model} onChange={(e) => setModel(e.target.value)} />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <TextField fullWidth label="Color" value={color} onChange={(e) => setColor(e.target.value)} />
        </Grid>
        <Grid size={{ xs: 12 }}>
          <TextField
            fullWidth
            label={esMoto ? 'Número de serie vehicular (NIV), si existe' : 'Número de serie, si existe'}
            value={serial}
            onChange={(e) => setSerial(e.target.value)}
          />
        </Grid>

        {esElectrica && (
          <>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Potencia del motor (p. ej. 250W)"
                value={motorPower}
                onChange={(e) => setMotorPower(e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                type="number"
                label="Velocidad máx. de asistencia (km/h, según fabricante)"
                value={maxSpeed}
                onChange={(e) => setMaxSpeed(e.target.value)}
                helperText="Si supera lo permitido para bici asistida, tu agencia la clasificará como motorizado y pedirá documentos de motocicleta."
              />
            </Grid>
          </>
        )}

        {esMoto && (
          <>
            <Grid size={{ xs: 6, sm: 3 }}>
              <TextField fullWidth type="number" label="Año" value={year} onChange={(e) => setYear(e.target.value)} />
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <TextField fullWidth label="Placa" value={plate} onChange={(e) => setPlate(e.target.value)} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="Número de licencia" value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} />
            </Grid>
            <Grid size={{ xs: 6, sm: 6 }}>
              <TextField
                fullWidth
                type="date"
                label="Vigencia de licencia"
                value={licenseExpiration}
                onChange={(e) => setLicenseExpiration(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 6 }}>
              <TextField
                fullWidth
                type="date"
                label="Vigencia del seguro"
                value={insuranceExpiration}
                onChange={(e) => setInsuranceExpiration(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Grid>
          </>
        )}
      </Grid>

      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          disabled={cargando}
          onClick={guardar}
          sx={{ bgcolor: '#8A5CF5', '&:hover': { bgcolor: '#6A3FCB' }, fontWeight: 700 }}
        >
          {cargando ? 'Guardando…' : 'Guardar vehículo y continuar'}
        </Button>
      </Box>
    </TarjetaPaso>
  );
};

export default StepVehiculo;
