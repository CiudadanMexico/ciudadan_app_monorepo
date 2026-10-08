import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { Stepper, Step, StepLabel } from '@mui/material';
import { useLogisticsBalance } from '../../hooks/useLogisticsBalance';

const estadoColor = (estado) => {
  switch ((estado || '').toLowerCase()) {
    case 'completed':
    case 'approved':
      return 'success';
    case 'rechazado':
    case 'rejected':
    case 'failed':
    case 'cancelled':
      return 'error';
    default:
      return 'warning';
  }
};

const labelStatus = (status)=>{
    switch ((status || '').toLowerCase()) {
    case 'completed':
    case 'approved':
      return 'Completado';
    case 'rechazado':
    case 'rejected':
    case 'failed':
      return 'Rechazado';
    case 'cancelled':
      return 'Cancelado'
    default:
      return 'Pendiente';
  }
}

const SaldoLogistico = () => {
  const { getMyBalance, getDeposits, createDeposit, getRechargeAccount, createPago } = useLogisticsBalance();

  const [balance, setBalance] = useState(null);
  const [deposits, setDeposits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [openDialog, setOpenDialog] = useState(false);
  const [step, setStep] = useState(0);
  const [monto, setMonto] = useState('');
  const [referencia, setReferencia] = useState('');
  const [comprobante, setComprobante] = useState(null);
  const [cuenta, setCuenta] = useState(null);
  const [loadingCuenta, setLoadingCuenta] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [balanceData, depositsData] = await Promise.all([getMyBalance(), getDeposits()]);
      setBalance(balanceData?.data ?? balanceData ?? {});
      const lista = depositsData?.deposits ?? depositsData ?? [];
      setDeposits(Array.isArray(lista) ? lista : []);
    } catch (err) {
      console.error('❌ Error al cargar saldo logístico:', err);
      setError(err.message || 'Error al cargar el saldo logístico');
    } finally {
      setLoading(false);
    }
  }, [getMyBalance, getDeposits]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const resetDialog = () => {
    setStep(0);
    setMonto('');
    setReferencia('');
    setComprobante(null);
    setCuenta(null);
    setSubmitError(null);
  };

  const handleOpenDialog = () => {
    resetDialog();
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    if (submitting) return;
    setOpenDialog(false);
    resetDialog();
  };

  // Paso 1 -> 2: validar monto y cargar datos bancarios
  const handleSiguiente = async () => {
    if (!monto || Number(monto) <= 0) {
      setSubmitError('Ingresa un monto válido');
      return;
    }
    setSubmitError(null);
    setLoadingCuenta(true);
    try {
      const cuentaData = await getRechargeAccount();
      setCuenta(cuentaData);
      setStep(1);
    } catch (err) {
      console.error('❌ Error al obtener cuenta de recarga:', err);
      setSubmitError(err.message || 'No se pudieron obtener los datos bancarios');
    } finally {
      setLoadingCuenta(false);
    }
  };

  // Paso 2: registrar pago con comprobante y luego crear el depósito
  const handleCrearDeposito = async () => {
    if (!comprobante) {
      setSubmitError('Adjunta el comprobante de pago (imagen o PDF)');
      return;
    }
    if (!referencia.trim()) {
      setSubmitError('Ingresa la clave de rastreo de la transferencia');
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      // 1) Registrar el pago en /api/pagos con el comprobante adjunto
      const pago = await createPago({ monto: Number(monto), referencia: referencia.trim(), comprobante });
      const paymentId = pago?.id ?? pago;
      console.log('💳 Pago registrado para depósito logístico:', paymentId);

      // 2) Crear el depósito logístico
      await createDeposit({
        amount: Number(monto),
        paymentId,
        externalReference: referencia.trim(),
      });

      setOpenDialog(false);
      resetDialog();
      await cargarDatos();
    } catch (err) {
      console.error('❌ Error al crear depósito:', err);
      setSubmitError(err.message || 'Error al crear el depósito');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  const saldoDisponible = balance?.balance?.availableBalance ?? 0;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {error && <Alert severity="error">{error}</Alert>}

      {/* Tarjeta de saldo */}
      <Card sx={{ maxWidth: 420 }}>
        <CardContent>
          <Typography variant="subtitle2" color="text.secondary">
            Saldo logístico disponible
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 'bold', mt: 1 }}>
            ${Number(saldoDisponible).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </Typography>
          <Button variant="contained" sx={{ mt: 2 }} onClick={handleOpenDialog}>
            Nuevo depósito
          </Button>
        </CardContent>
      </Card>

      {/* Tabla de depósitos */}
      <Box>
        <Typography variant="h6" sx={{ mb: 1 }}>
          Mis depósitos
        </Typography>
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Monto</TableCell>
                <TableCell>Referencia</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell>Fecha</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {deposits.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    No hay depósitos registrados
                  </TableCell>
                </TableRow>
              )}
              {deposits.map((dep) => {
                const attrs = dep.attributes || dep;
                return (
                  <TableRow key={dep.id}>
                    <TableCell>{dep.id}</TableCell>
                    <TableCell>
                      ${Number(attrs.monto ?? attrs.amount ?? 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>{attrs.external || attrs.externalReference || '—'}</TableCell>
                    <TableCell>
                      <Chip
                        label={labelStatus(attrs.estado || attrs.status || 'pendiente')}
                        color={estadoColor(attrs.estado || attrs.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {attrs.createdAt ? new Date(attrs.createdAt).toLocaleDateString('es-MX') : '—'}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* Diálogo nuevo depósito (2 pasos) */}
      <Dialog open={openDialog} onClose={() => { }} fullWidth maxWidth="sm">
        <DialogTitle>Nuevo depósito</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <Stepper activeStep={step} sx={{ mb: 1 }}>
            <Step><StepLabel>Monto</StepLabel></Step>
            <Step><StepLabel>Transferencia y comprobante</StepLabel></Step>
          </Stepper>

          {submitError && <Alert severity="error">{submitError}</Alert>}

          {step === 0 && (
            <TextField
              label="Monto"
              type="number"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              inputProps={{ min: 0, step: '0.01' }}
              fullWidth
              required
              autoFocus
            />
          )}

          {step === 1 && (
            <>
              {/* Datos bancarios de la cuenta de recarga */}
              <Box sx={{ border: '1px solid #e0e0e0', borderRadius: 2, p: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Realiza la transferencia a:
                </Typography>
                {loadingCuenta ? (
                  <CircularProgress size={24} />
                ) : (
                  <>
                    <Typography variant="body2"><strong>Banco:</strong> {cuenta?.bank || '—'}</Typography>
                    <Typography variant="body2"><strong>CLABE:</strong> {cuenta?.clabe || '—'}</Typography>
                    <Typography variant="body2"><strong>Beneficiario:</strong> {cuenta?.beneficiary || '—'}</Typography>
                    {cuenta?.reference && (
                      <Typography variant="body2"><strong>Referencia:</strong> {cuenta.reference}</Typography>
                    )}
                    {cuenta?.instructions && (
                      <Typography variant="body2" sx={{ mt: 1, whiteSpace: 'pre-line' }}>
                        {cuenta.instructions}
                      </Typography>
                    )}
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      Monto a transferir: <strong>${Number(monto).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</strong>
                    </Typography>
                  </>
                )}
              </Box>

              <TextField
                label="Clave de rastreo (referencia)"
                value={referencia}
                onChange={(e) => setReferencia(e.target.value)}
                fullWidth
                required
              />

              <Button variant="outlined" component="label" fullWidth>
                {comprobante ? `📎 ${comprobante.name}` : 'Adjuntar comprobante (imagen o PDF)'}
                <input
                  type="file"
                  hidden
                  accept="image/*,.pdf"
                  onChange={(e) => {
                    setComprobante(e.target.files[0] || null);
                    setSubmitError(null);
                  }}
                />
              </Button>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={submitting}>
            Cancelar
          </Button>
          {step === 1 && (
            <Button onClick={() => setStep(0)} disabled={submitting}>
              Atrás
            </Button>
          )}
          {step === 0 ? (
            <Button onClick={handleSiguiente} variant="contained" disabled={loadingCuenta}>
              {loadingCuenta ? 'Cargando...' : 'Siguiente'}
            </Button>
          ) : (
            <Button onClick={handleCrearDeposito} variant="contained" disabled={submitting}>
              {submitting ? 'Enviando...' : 'Crear depósito'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SaldoLogistico;
