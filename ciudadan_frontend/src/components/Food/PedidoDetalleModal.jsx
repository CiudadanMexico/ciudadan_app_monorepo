import { Dialog, DialogTitle, DialogContent, DialogActions, Stack, Box, Typography, Chip, Divider, Alert, Button, CardContent, Card, TextField } from '@mui/material';
import CheckCircleOutlineOutlinedIcon from '@mui/icons-material/CheckCircleOutlineOutlined';
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined';
import PersonOutlineOutlinedIcon from '@mui/icons-material/PersonOutlineOutlined';
import PhoneOutlinedIcon from '@mui/icons-material/PhoneOutlined';
import NotesOutlinedIcon from '@mui/icons-material/NotesOutlined';
import { useSnackbar } from 'notistack';
import { useEffect, useState } from 'react';

const ESTADOS_PEDIDO = {
  pendiente_pago: {
    label: 'Pendiente de pago',
    color: 'warning'
  },
  pendiente_verificacion: {
    label: 'Pendiente de verificación',
    color: 'info'
  },
  pendiente_envio: {
    label: 'Pendiente de envío',
    color: 'info'
  },
  enviado: {
    label: 'Enviado',
    color: 'primary'
  },
  en_camino: {
    label: 'En camino',
    color: 'primary'
  },
  recibido: {
    label: 'Recibido',
    color: 'success'
  },
  cancelado: {
    label: 'Cancelado',
    color: 'error'
  },
  devuelto: {
    label: 'Devuelto',
    color: 'default'
  }
};

const PedidoDetalleModal = ({
  pedido,
  restaurante,
  open,
  onClose,
  handleAceptar,
  handleMarcarListo
}) => {
  const { enqueueSnackbar } = useSnackbar();
  const [openConfirmacionRecogida, setOpenConfirmacionRecogida] = useState(false);
  const [pickupData, setPickupData] = useState({ pickupName: '', pickupPhone: '', pickupNotes: '', });

  const handleConfirmarRecogida = async () => {
    const pickupName = pickupData.pickupName.trim();
    const pickupPhone = pickupData.pickupPhone.trim();
    const pickupNotes = pickupData.pickupNotes.trim();

    if (!pickupName) {
      enqueueSnackbar('Ingresa el nombre del responsable de entregar el pedido.', { variant: 'warning', });
      return;
    }

    if (!pickupPhone) {
      enqueueSnackbar('Ingresa el número de teléfono del restaurante.', { variant: 'warning', });
      return;
    }

    try {
      await handleAceptar(pedido, {
        pickupName,
        pickupPhone,
        pickupNotes: pickupNotes ?? null,
      });
      setOpenConfirmacionRecogida(false);
    } catch (error) {
      console.error('Error confirmando datos de recogida:', error);
      enqueueSnackbar(error?.message || 'No fue posible verificar el pago.', { variant: 'error', });
    }
  };

  useEffect(() => {
    if (!pedido || !restaurante) return;

    setPickupData({
      pickupName: restaurante?.nombre ?? restaurante?.name ?? '',
      pickupPhone: restaurante.telefono ?? restaurante.phone ?? '',
      pickupNotes: '',
    });
  }, [pedido, restaurante]);

  if (!pedido) return null;

  const total = Number(pedido?.monto_total ?? 0).toFixed(2);
  const envio = Number(pedido?.monto_envio ?? 0).toFixed(2);

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        fullWidth
        maxWidth="sm"
        fullScreen={false}
        PaperProps={{
          sx: {
            borderRadius: {
              xs: 0,
              sm: 3
            },
            m: {
              xs: 0,
              sm: 2
            }
          }
        }}
      >
        <DialogTitle>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
          >
            <Box>
              <Typography
                variant="h6"
                fontWeight={700}
              >
                Pedido #{pedido.id}
              </Typography>

              <Typography
                variant="body2"
                color="text.secondary"
              >
                Detalle del pedido
              </Typography>
            </Box>

            <Chip
              label={ESTADOS_PEDIDO[pedido?.status]?.label || 'Pendiente'}
              color={ESTADOS_PEDIDO[pedido?.status]?.color || 'warning'}
            />
          </Stack>
        </DialogTitle>
        <DialogContent dividers sx={{ scrollbarWidth: 'thin' }}>
          {/* CLIENTE */}
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
            Información del cliente
          </Typography>
          <Box sx={{ mb: 3 }}>
            <Typography variant="body2"><strong>Correo:</strong>{' '}{pedido.user?.data?.attributes?.email ?? 'No disponible'}</Typography>

            {pedido.user?.data?.attributes?.telefono && (
              <Typography variant="body2"><strong>Teléfono:</strong>{' '}{pedido.user?.data?.attributes?.telefono}</Typography>
            )}
          </Box>

          {/* COMPROBANTE DE PAGO */}
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>Comprobante de pago</Typography>

          {(() => {
            const comprobante = pedido.pago?.data?.attributes?.comprobante?.data;
            const comprobanteAttributes = comprobante?.attributes;
            if (!comprobanteAttributes) {
              return (
                <Alert severity="info" sx={{ mb: 3 }}>
                  No se ha adjuntado un comprobante de pago.
                </Alert>
              );
            }
            const { url, ext, mime, name } = comprobanteAttributes;
            /*
             * Si Strapi devuelve una URL relativa,
             * agregamos la URL base del backend.
             */
            const comprobanteUrl = url?.startsWith('http') ? url : `${process.env.REACT_APP_STRAPI_URL}${url}`;

            const esImagen = mime?.startsWith('image/');

            const esPdf = mime === 'application/pdf' ?? ext === '.pdf';

            return (
              <Card
                elevation={0}
                sx={{
                  mb: 3,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 2
                }}
              >
                <CardContent>
                  {/* INFORMACIÓN DEL ARCHIVO */}
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    justifyContent="space-between"
                    alignItems={{
                      xs: 'stretch',
                      sm: 'center'
                    }}
                    spacing={2}
                  >

                    <Box
                      sx={{
                        minWidth: 0,
                        overflow: 'hidden'
                      }}
                    >
                      <Typography variant="body2" fontWeight={600}
                        sx={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {name || 'Comprobante de pago'}
                      </Typography>

                      <Typography variant="caption" color="text.secondary">
                        {mime ?? ext ?? 'Archivo adjunto'}
                      </Typography>
                    </Box>

                    <Button
                      variant="outlined"
                      size="small"
                      href={comprobanteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{
                        flexShrink: 0
                      }}
                    >
                      {esPdf
                        ? 'Abrir PDF'
                        : 'Abrir comprobante'}
                    </Button>
                  </Stack>
                  {/* PREVISUALIZACIÓN DE IMAGEN */}
                  {esImagen && (
                    <Box
                      sx={{
                        mt: 2,
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        backgroundColor: '#f5f5f5',
                        borderRadius: 2,
                        p: 1,
                        overflow: 'hidden'
                      }}
                    >
                      <Box
                        component="img"
                        src={comprobanteUrl}
                        alt={
                          name ?? 'Comprobante de pago'
                        }
                        sx={{
                          display: 'block',
                          maxWidth: '100%',
                          width: '100%',
                          maxHeight: 300,
                          objectFit: 'contain',
                          borderRadius: 1,
                          cursor: 'pointer'
                        }}
                        onClick={() =>
                          window.open(comprobanteUrl, '_blank', 'noopener,noreferrer')
                        }
                      />
                    </Box>
                  )}


                  {/* PDF */}
                  {esPdf && (
                    <Box
                      sx={{
                        mt: 2,
                        p: 3,
                        borderRadius: 2,
                        backgroundColor: 'grey.50',
                        textAlign: 'center'
                      }}
                    >
                      <PictureAsPdfOutlinedIcon
                        sx={{
                          fontSize: 48,
                          color: 'error.main',
                          mb: 1
                        }}
                      />

                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        El comprobante está disponible en formato PDF.
                      </Typography>

                      <Button
                        variant="contained"
                        color="error"
                        href={comprobanteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        startIcon={
                          <PictureAsPdfOutlinedIcon />
                        }
                      >
                        Ver comprobante PDF
                      </Button>
                    </Box>
                  )}

                </CardContent>
              </Card>
            );
          })()}


          {/* PRODUCTOS */}
          <Typography
            variant="subtitle1"
            fontWeight={700}
            sx={{ mb: 1 }}
          >
            Productos
          </Typography>

          <Stack spacing={1.5}>
            {(pedido.items || []).map(
              (producto, index) => (
                <Box key={index}>

                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    spacing={2}
                  >

                    <Box sx={{ minWidth: 0 }}>
                      <Typography
                        variant="body1"
                        fontWeight={600}
                      >
                        {producto.cantidad} ×{' '}
                        {producto.nombre}
                      </Typography>

                      {producto.modifiers?.length > 0 && (
                        <Typography variant="caption" color="text.secondary" >
                          {producto.modifiers.map(m => m.nombre).join(', ')}
                        </Typography>
                      )}
                    </Box>

                    <Typography fontWeight={600} sx={{ flexShrink: 0 }}>
                      ${Number(producto.subtotal || 0).toFixed(2)}
                    </Typography>

                  </Stack>

                </Box>
              )
            )}
          </Stack>
          <Divider sx={{ my: 1 }} />
          <Stack
            direction="row"
            justifyContent="space-between"
            spacing={2}
          >

            <Box sx={{ minWidth: 0 }}>
              <Typography
                variant="body1"
                fontWeight={600}
              >
                Envío
              </Typography>
            </Box>

            <Typography fontWeight={600} sx={{ flexShrink: 0 }}>
              ${Number(envio).toFixed(2)}
            </Typography>

          </Stack>


          <Divider sx={{ my: 3, mt: 1 }} />


          {/* TOTAL */}
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
          >
            <Typography
              variant="h6"
              fontWeight={700}
            >
              Total
            </Typography>

            <Typography
              variant="h5"
              fontWeight={700}
            >
              ${total}
            </Typography>
          </Stack>


          {/* NOTAS */}
          {pedido.notas && (
            <Box sx={{ mt: 3 }}>

              <Typography
                variant="subtitle2"
                fontWeight={700}
              >
                Notas del cliente
              </Typography>

              <Alert
                severity="info"
                sx={{ mt: 1 }}
              >
                {pedido.notas}
              </Alert>

            </Box>
          )}

        </DialogContent>

        <DialogActions
          sx={{
            p: 1,
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'center',
            alignItems: 'center',
            gap: 1
          }}
        >
          {(pedido?.status === 'pendiente_verificacion') && (
            <Button
              variant="contained"
              color="success"
              fullWidth
              startIcon={
                <CheckCircleOutlineOutlinedIcon />
              }
              // onClick={() => handleAceptar(pedido)}
              onClick={() => setOpenConfirmacionRecogida(true)}
            >
              Verificar pago
            </Button>
          )}

          {pedido?.status === 'pendiente_envio' && (
            <Button
              variant="contained"
              color="success"
              fullWidth
              startIcon={
                <CheckCircleOutlineOutlinedIcon />
              }
              onClick={async () => {
                try {
                  await handleMarcarListo(pedido.id);
                  enqueueSnackbar('El pedido está listo', { variant: 'success' });
                } catch (error) {
                  enqueueSnackbar(error.message ?? 'No fue posible actualizar el pedido', { variant: 'error' });
                }
              }}
            >
              Marcar como listo
            </Button>
          )}
          <Button
            onClick={onClose}
            fullWidth
          >
            Cerrar
          </Button>
        </DialogActions>

      </Dialog >
      <Dialog
        open={openConfirmacionRecogida}
        onClose={() => setOpenConfirmacionRecogida(false)}
        fullWidth
        maxWidth="xs"
        PaperProps={{
          sx: {
            borderRadius: { xs: 0, sm: 3, },
            m: { xs: 0, sm: 2, },
          },
        }}
      >
        <DialogTitle>
          <Stack spacing={0.5}>
            <Typography
              variant="h6"
              fontWeight={700}
            >
              Datos de recogida
            </Typography>

            <Typography
              variant="body2"
              color="text.secondary"
            >
              Confirma los datos que utilizará el repartidor para contactar al restaurante.
            </Typography>
          </Stack>
        </DialogTitle>

        <DialogContent dividers>
          <Stack spacing={2.5}>

            <TextField
              fullWidth
              required
              label="Responsable de entregar el pedido"
              value={pickupData.pickupName}
              onChange={(e) => {
                setPickupData((prev) => ({
                  ...prev,
                  pickupName: e.target.value,
                }));
              }}
              placeholder="Nombre del responsable"
              InputProps={{
                startAdornment: (
                  <PersonOutlineOutlinedIcon
                    sx={{
                      mr: 1,
                      color: 'text.secondary',
                    }}
                  />
                ),
              }}
            />

            <TextField
              fullWidth
              required
              label="Teléfono del restaurante"
              value={pickupData.pickupPhone}
              onChange={(e) => {
                setPickupData((prev) => ({
                  ...prev,
                  pickupPhone: e.target.value,
                }));
              }}
              placeholder="+52 231 123 4567"
              type="tel"
              helperText="El repartidor utilizará este número para comunicarse con el restaurante."
              InputProps={{
                startAdornment: (
                  <PhoneOutlinedIcon
                    sx={{
                      mr: 1,
                      color: 'text.secondary',
                    }}
                  />
                ),
              }}
            />

            <TextField
              fullWidth
              multiline
              minRows={3}
              label="Notas de recogida"
              value={pickupData.pickupNotes}
              onChange={(e) => {
                setPickupData((prev) => ({
                  ...prev,
                  pickupNotes: e.target.value,
                }));
              }}
              placeholder="Ej. Preguntar por Carlos en recepción..."
              helperText="Opcional. Esta información será enviada al repartidor."
              InputProps={{
                startAdornment: (
                  <NotesOutlinedIcon
                    sx={{
                      mr: 1,
                      mt: 0.5,
                      color: 'text.secondary',
                    }}
                  />
                ),
              }}
            />

            <Alert severity="info">
              Verifica que el nombre y teléfono correspondan a la persona que entregará el pedido al repartidor.
            </Alert>

          </Stack>
        </DialogContent>

        <DialogActions sx={{ p: 2, gap: 1, }}>
          <Button
            fullWidth
            onClick={() => setOpenConfirmacionRecogida(false)}
          >
            Cancelar
          </Button>

          <Button
            fullWidth
            variant="contained"
            color="success"
            startIcon={
              <CheckCircleOutlineOutlinedIcon />
            }
            onClick={handleConfirmarRecogida}
          >
            Confirmar y verificar
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default PedidoDetalleModal;