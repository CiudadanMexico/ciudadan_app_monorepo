import { useEffect, useMemo, useState } from 'react'
import {
  Box,
  Typography,
  DialogTitle,
  DialogContent,
  Dialog,
  TextField,
  DialogActions,
  Button,
  MenuItem,
  Chip,
  Stack,
  Divider,
  Alert,
  CircularProgress,
  IconButton,
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import {
  fetchOfficePoints,
  prepararEnvio,
} from '../../services/skydropxService';

const formatCurrency = (value) => {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '$0.00';
  return amount.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
};

const getOfficePointId = (point) => point?.id ?? point?.point_id;

const getOfficePointLabel = (point) => {
  const attrs = point?.attributes ?? point ?? {};
  const nombre = attrs.name ?? attrs.nombre ?? 'Sucursal';
  const calle = attrs.street ?? attrs.address ?? '';
  const colonia = attrs.area_level3 ?? attrs.neighborhood ?? '';
  const ciudad = attrs.area_level2 ?? attrs.city ?? '';
  return [nombre, calle, colonia, ciudad].filter(Boolean).join(' - ');
};

/**
 * Normaliza los items del pedido (componente repeatable) tolerando
 * las distintas formas que puede devolver Strapi.
 */
const normalizeItems = (raw) => {
  if (raw === null || raw === undefined) return [];
  if (Array.isArray(raw)) return raw.map((i) => (i?.attributes ? i.attributes : i));
  if (Array.isArray(raw?.data)) return raw.data.map((d) => (d?.attributes ? d.attributes : d));
  if (raw?.data?.attributes) return [raw.data.attributes];
  if (raw?.attributes) return [raw.attributes];
  if (typeof raw === 'string') {
    try {
      return normalizeItems(JSON.parse(raw));
    } catch {
      return [];
    }
  }
  if (typeof raw === 'object') return [raw];
  return [];
};

const getProductoId = (item) => Number(item?.producto?.id ?? item?.producto?.data?.id ?? item?.producto);

/**
 * Construye el paquete inicial por defecto: todos los productos del pedido
 * con sus cantidades completas y dimensiones estimadas desde los productos
 * (heurística: peso = suma, dimensiones = máximo de cada dimensión).
 */
const buildDefaultPackage = (items) => {
  const pkgItems = items.map((item) => ({
    producto_id: getProductoId(item),
    order_item_id: item?.id ?? null,
    nombre: item?.nombre ?? 'Producto',
    cantidadMax: Number(item?.cantidad) || 1,
    quantity: Number(item?.cantidad) || 1,
  }));

  const peso = items.reduce((acc, item) => {
    const p = item?.producto ?? {};
    return acc + (Number(p?.peso) || 0) * (Number(item?.cantidad) || 1);
  }, 0);

  const maxDim = (key) => items.reduce((acc, item) => {
    const p = item?.producto ?? {};
    return Math.max(acc, Number(p?.[key]) || 0);
  }, 0);

  const declarado = items.reduce((acc, item) => {
    return acc + (Number(item?.precio_unitario) || 0) * (Number(item?.cantidad) || 1);
  }, 0);

  return {
    length: maxDim('largo') || '',
    width: maxDim('ancho') || '',
    height: maxDim('alto') || '',
    weight: peso > 0 ? Number(peso.toFixed(2)) : '',
    declared_value: declarado > 0 ? Number(declarado.toFixed(2)) : '',
    package_protected: false,
    items: pkgItems,
  };
};

/**
 * PrepararEnvio:
 * Modal para que el vendedor defina los paquetes físicos REALES del envío.
 * Crea Shipment + ShipmentPackages + ShipmentPackageItems en backend.
 * NO crea todavía el envío en Skydropx (eso ocurre al generar la guía).
 */
const PrepararEnvio = ({ open, handleClose, selectedPagoPedido, onEnvioPreparado }) => {
  const rate = selectedPagoPedido?.attributes?.skydropx_rate ?? null;
  const rateId = rate?.id ?? rate?.rate_id ?? selectedPagoPedido?.attributes?.skydropx_rate_id;

  // Reglas de la tarifa congelada
  const requierePickupPoint = rate?.office_pickup === true && rate?.pickup_ocurre === false;
  const requiereDeliveryPoint = rate?.office_delivery_only === true;

  const [pickupPoints, setPickupPoints] = useState([]);
  const [deliveryPoints, setDeliveryPoints] = useState([]);
  const [pickupPointId, setPickupPointId] = useState('');
  const [deliveryPointId, setDeliveryPointId] = useState('');

  const [packages, setPackages] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);

  const orderItems = useMemo(
    () => normalizeItems(selectedPagoPedido?.attributes?.item),
    [selectedPagoPedido]
  );

  // Inicializar al abrir
  useEffect(() => {
    if (!open || !selectedPagoPedido) return;

    setError(null);
    setPackages([buildDefaultPackage(orderItems)]);
    setPickupPointId('');
    setDeliveryPointId('');

    const cargarCatalogos = async () => {
      setCargando(true);
      try {
        if (requierePickupPoint && rateId) {
          const points = await fetchOfficePoints(rateId, 'pickup');
          setPickupPoints(Array.isArray(points) ? points : points?.data ?? []);
        }
        if (requiereDeliveryPoint && rateId) {
          const points = await fetchOfficePoints(rateId, 'delivery');
          setDeliveryPoints(Array.isArray(points) ? points : points?.data ?? []);
        }
      } catch (err) {
        setError(err?.message ?? 'No fue posible cargar los catálogos de envío');
      } finally {
        setCargando(false);
      }
    };

    cargarCatalogos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, selectedPagoPedido]);

  // Cantidades ya asignadas por producto (en todos los paquetes)
  const asignadasPorProducto = useMemo(() => {
    const map = new Map();
    for (const pkg of packages) {
      for (const item of pkg.items) {
        map.set(item.producto_id, (map.get(item.producto_id) ?? 0) + (Number(item.quantity) || 0));
      }
    }
    return map;
  }, [packages]);

  const totalesPedido = useMemo(() => {
    const map = new Map();
    for (const item of orderItems) {
      const pid = getProductoId(item);
      map.set(pid, (map.get(pid) ?? 0) + (Number(item?.cantidad) || 0));
    }
    return map;
  }, [orderItems]);

  const cantidadesCompletas = useMemo(() => {
    for (const [pid, total] of totalesPedido) {
      if ((asignadasPorProducto.get(pid) ?? 0) !== total) return false;
    }
    return totalesPedido.size > 0;
  }, [totalesPedido, asignadasPorProducto]);

  const paquetesValidos = useMemo(() => {
    return packages.every((pkg) =>
      Number(pkg.length) > 0 &&
      Number(pkg.width) > 0 &&
      Number(pkg.height) > 0 &&
      Number(pkg.weight) > 0 &&
      pkg.items.some((item) => Number(item.quantity) > 0)
    );
  }, [packages]);

  const formularioValido = useMemo(() => {
    if (packages.length === 0) return false;
    if (!paquetesValidos) return false;
    if (!cantidadesCompletas) return false;
    if (requierePickupPoint && !pickupPointId) return false;
    if (requiereDeliveryPoint && !deliveryPointId) return false;
    return true;
  }, [packages, paquetesValidos, cantidadesCompletas, requierePickupPoint, pickupPointId, requiereDeliveryPoint, deliveryPointId]);

  const updatePackage = (index, patch) => {
    setPackages((prev) => prev.map((pkg, i) => (i === index ? { ...pkg, ...patch } : pkg)));
  };

  const updatePackageItemQty = (pkgIndex, productoId, quantity) => {
    setPackages((prev) => prev.map((pkg, i) => {
      if (i !== pkgIndex) return pkg;
      return {
        ...pkg,
        items: pkg.items.map((item) =>
          item.producto_id === productoId ? { ...item, quantity: Math.max(0, Number(quantity) || 0) } : item
        ),
      };
    }));
  };

  const handleAddPackage = () => {
    // Nuevo paquete con todos los productos en cantidad 0 (el vendedor asigna)
    const pkgItems = orderItems.map((item) => ({
      producto_id: getProductoId(item),
      order_item_id: item?.id ?? null,
      nombre: item?.nombre ?? 'Producto',
      cantidadMax: Number(item?.cantidad) || 1,
      quantity: 0,
    }));
    setPackages((prev) => [...prev, {
      length: '', width: '', height: '', weight: '',
      declared_value: '', package_protected: false, items: pkgItems,
    }]);
  };

  const handleRemovePackage = (index) => {
    setPackages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!selectedPagoPedido || !formularioValido) return;

    setEnviando(true);
    setError(null);

    try {
      const payload = {
        packages: packages.map((pkg) => ({
          length: Number(pkg.length),
          width: Number(pkg.width),
          height: Number(pkg.height),
          weight: Number(pkg.weight),
          declared_value: pkg.declared_value !== '' ? Number(pkg.declared_value) : undefined,
          package_protected: Boolean(pkg.package_protected),
          items: pkg.items
            .filter((item) => Number(item.quantity) > 0)
            .map((item) => ({
              producto_id: item.producto_id,
              order_item_id: item.order_item_id ?? undefined,
              quantity: Number(item.quantity),
            })),
        })),
        office_pickup: Boolean(rate?.office_pickup),
        office_delivery: Boolean(rate?.office_delivery || rate?.office_delivery_only),
      };

      // Solo se envían point ids cuando la tarifa los requiere
      if (requierePickupPoint) payload.office_pickup_point_id = pickupPointId;
      if (requiereDeliveryPoint) payload.office_delivery_point_id = deliveryPointId;

      const resultado = await prepararEnvio(selectedPagoPedido.id, payload);

      if (onEnvioPreparado) onEnvioPreparado(resultado);
      handleClose();
    } catch (err) {
      setError(err?.message ?? 'No fue posible preparar el envío');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="md">
      <DialogTitle>Preparar envío</DialogTitle>
      <DialogContent dividers>
        {cargando ? (
          <Box display="flex" alignItems="center" gap={1} py={2}>
            <CircularProgress size={22} />
            <Typography>Cargando catálogos de envío...</Typography>
          </Box>
        ) : (
          <Box display="flex" flexDirection="column" gap={2}>
            <Alert severity="info">
              Define cómo empacarás los productos. Las dimensiones de la cotización fueron una
              estimación; aquí registras los paquetes físicos reales. La guía se genera después.
            </Alert>

            {/* Resumen de la tarifa congelada */}
            {rate && (
              <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 1.5 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography fontWeight={600}>
                      {rate?.provider_display_name ?? rate?.provider_name ?? 'Paquetería'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {rate?.provider_service_name ?? 'Servicio de envío'}
                    </Typography>
                  </Box>
                  <Typography fontWeight={700}>{formatCurrency(rate?.total)}</Typography>
                </Stack>
              </Box>
            )}

            {/* Paquetes */}
            {packages.map((pkg, pkgIndex) => (
              <Box key={pkgIndex} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 1.5 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography fontWeight={600}>Paquete {pkgIndex + 1}</Typography>
                  {packages.length > 1 && (
                    <IconButton size="small" onClick={() => handleRemovePackage(pkgIndex)}>
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  )}
                </Stack>

                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <TextField
                    label="Largo (cm)" type="number" size="small" required
                    value={pkg.length}
                    onChange={(e) => updatePackage(pkgIndex, { length: e.target.value })}
                    sx={{ width: 110 }}
                  />
                  <TextField
                    label="Ancho (cm)" type="number" size="small" required
                    value={pkg.width}
                    onChange={(e) => updatePackage(pkgIndex, { width: e.target.value })}
                    sx={{ width: 110 }}
                  />
                  <TextField
                    label="Alto (cm)" type="number" size="small" required
                    value={pkg.height}
                    onChange={(e) => updatePackage(pkgIndex, { height: e.target.value })}
                    sx={{ width: 110 }}
                  />
                  <TextField
                    label="Peso (kg)" type="number" size="small" required
                    value={pkg.weight}
                    onChange={(e) => updatePackage(pkgIndex, { weight: e.target.value })}
                    sx={{ width: 110 }}
                  />
                  <TextField
                    label="Valor declarado" type="number" size="small"
                    value={pkg.declared_value}
                    onChange={(e) => updatePackage(pkgIndex, { declared_value: e.target.value })}
                    sx={{ width: 140 }}
                  />
                </Stack>

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={Boolean(pkg.package_protected)}
                      onChange={(e) => updatePackage(pkgIndex, { package_protected: e.target.checked })}
                      size="small"
                    />
                  }
                  label="Paquete protegido (seguro)"
                />

                <Divider sx={{ my: 1 }} />

                <Typography variant="body2" color="text.secondary" mb={0.5}>Contenido del paquete:</Typography>
                {pkg.items.map((item) => {
                  const asignada = asignadasPorProducto.get(item.producto_id) ?? 0;
                  const total = totalesPedido.get(item.producto_id) ?? item.cantidadMax;
                  return (
                    <Stack key={item.producto_id} direction="row" alignItems="center" spacing={1} mb={0.5}>
                      <Typography variant="body2" sx={{ flex: 1 }}>
                        {item.nombre} (pedido: {total})
                      </Typography>
                      <TextField
                        type="number" size="small" label="Cant."
                        value={item.quantity}
                        onChange={(e) => updatePackageItemQty(pkgIndex, item.producto_id, e.target.value)}
                        inputProps={{ min: 0, max: total }}
                        sx={{ width: 90 }}
                        error={asignada > total}
                      />
                    </Stack>
                  );
                })}
              </Box>
            ))}

            <Button startIcon={<AddIcon />} onClick={handleAddPackage} variant="outlined" size="small">
              Agregar paquete
            </Button>

            {/* Estado de asignación de cantidades */}
            {!cantidadesCompletas && (
              <Alert severity="warning">
                Debes empacar exactamente las cantidades del pedido:
                {' '}
                {[...totalesPedido.entries()].map(([pid, total]) => {
                  const asignada = asignadasPorProducto.get(pid) ?? 0;
                  const nombre = orderItems.find((i) => getProductoId(i) === pid)?.nombre ?? `Producto ${pid}`;
                  return asignada !== total ? `${nombre}: ${asignada}/${total}. ` : null;
                })}
              </Alert>
            )}

            {/* Punto de recolección en sucursal */}
            {requierePickupPoint && (
              <TextField
                select
                label="Sucursal de recolección (Ocurre)"
                value={pickupPointId}
                onChange={(e) => setPickupPointId(e.target.value)}
                fullWidth
                required
                helperText="Esta tarifa requiere entregar el paquete en una sucursal de la paquetería"
              >
                {pickupPoints.map((point) => {
                  const id = getOfficePointId(point);
                  return (
                    <MenuItem key={`pickup-${id}`} value={id}>
                      {getOfficePointLabel(point)}
                    </MenuItem>
                  );
                })}
              </TextField>
            )}

            {/* Punto de entrega en sucursal */}
            {requiereDeliveryPoint && (
              <TextField
                select
                label="Sucursal de entrega (Ocurre)"
                value={deliveryPointId}
                onChange={(e) => setDeliveryPointId(e.target.value)}
                fullWidth
                required
                helperText="El destinatario recogerá el paquete en esta sucursal"
              >
                {deliveryPoints.map((point) => {
                  const id = getOfficePointId(point);
                  return (
                    <MenuItem key={`delivery-${id}`} value={id}>
                      {getOfficePointLabel(point)}
                    </MenuItem>
                  );
                })}
              </TextField>
            )}

            {error && <Alert severity="error">{error}</Alert>}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={enviando}>Cancelar</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={cargando || enviando || !formularioValido}
          startIcon={enviando ? <CircularProgress size={18} /> : null}
        >
          {enviando ? 'Guardando...' : 'Guardar paquetes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PrepararEnvio;
