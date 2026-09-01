
import React, { useEffect, useMemo, useState } from "react";

import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  IconButton,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";

import {
  MdAccountBalance,
  MdCheckCircle,
  MdChevronDown,
  MdCloudUpload,
  MdContentCopy,
  MdDescription,
  MdImage,
  MdPayments,
  MdPictureAsPdf,
  MdReceiptLong,
  MdUploadFile,
} from "react-icons/md";


/**
 * ============================================================
 * HELPERS
 * ============================================================
 */

/**
 * Obtiene attributes de una entidad de Strapi.
 */
const getAttributes = (item) => {
  if (!item) return {};

  return item.attributes || item;
};


/**
 * Obtiene un valor considerando:
 *
 * 1. item.attributes
 * 2. item directamente
 * 3. nombres alternativos
 */
const getValue = (item, keys = [], fallback = null) => {
  if (!item) return fallback;

  const attributes = getAttributes(item);

  for (const key of keys) {
    if (attributes[key] !== undefined && attributes[key] !== null) {
      return attributes[key];
    }

    if (item[key] !== undefined && item[key] !== null) {
      return item[key];
    }
  }

  return fallback;
};


/**
 * Obtiene el ID de una relación Strapi.
 */
const getRelationId = (relation) => {
  if (!relation) return null;

  if (typeof relation === "number") {
    return relation;
  }

  if (typeof relation === "string") {
    return relation;
  }

  if (relation.id) {
    return relation.id;
  }

  if (relation.data?.id) {
    return relation.data.id;
  }

  return null;
};


/**
 * Convierte cualquier valor numérico a número.
 */
const toNumber = (value, fallback = 0) => {
  const number = Number(value);

  return Number.isFinite(number) ? number : fallback;
};


/**
 * Formatea moneda.
 */
const formatCurrency = (value, currency = "MXN") => {
  const amount = toNumber(value);

  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
};


/**
 * Obtiene la información bancaria del restaurante.
 *
 * Como la estructura exacta de los campos puede variar,
 * soportamos algunos nombres comunes.
 */
const getBankData = (orden) => {
  const restaurant = getValue(orden, ["restaurant", "restaurante", "food_restaurant",], null);

  const restaurantAttributes = getAttributes(restaurant);

  const bankData = restaurantAttributes?.datos_bancarios || restaurantAttributes?.datosBancarios || restaurantAttributes?.banco || {};

  return {
    banco: getValue(bankData, ["banco", "bank", "nombre",], null) || getValue(restaurant, ["banco", "nombre_banco", "nombreBanco",], null),
    titular: getValue(bankData, ["titular", "beneficiario", "nombre_beneficiario", "nombreBeneficiario",], null) || getValue(restaurant, ["titular_cuenta", "titularCuenta", "beneficiario",], null),
    clabe: getValue(bankData, ["clabe", "clabe_bancaria", "clabeBancaria",], null) || getValue(restaurant, ["clabe", "clabe_bancaria", "clabeBancaria",], null),
    cuenta: getValue(bankData, ["cuenta", "numero_cuenta", "numeroCuenta",], null) || getValue(restaurant, ["cuenta", "numero_cuenta", "numeroCuenta",], null),
    tarjeta: getValue(bankData, ["tarjeta", "numero_tarjeta", "numeroTarjeta",], null) || getValue(restaurant, ["tarjeta", "numero_tarjeta", "numeroTarjeta",], null),
  };
};


/**
 * Obtiene el nombre del restaurante.
 */
const getRestaurantName = (orden) => {
  const restaurant = getValue(orden, ["restaurant", "restaurante", "food_restaurant",], null);
  return (
    getValue(restaurant, ["nombre", "name", "razon_social", "razonSocial",], null) || getValue(orden, ["restaurant_name", "restaurante_nombre", "nombre_restaurante",], null) || "Restaurante");
};


/**
 * Obtiene el total de la orden.
 */
const getOrderTotal = (orden) => {
  return toNumber(getValue(orden, ["monto_total", "total", "total_order", "totalOrden",], 0));
};


/**
 * Obtiene subtotal.
 */
const getOrderSubtotal = (orden) => {
  return toNumber(getValue(orden, ["subtotal", "monto_subtotal", "subtotal_order", "subtotalOrden",], 0));
};


/**
 * Obtiene costo de envío.
 */
const getOrderShipping = (orden) => {
  return toNumber(getValue(orden, ["monto_envio", "costo_envio", "shipping_cost", "shippingCost", "delivery_fee",], 0));
};


/**
 * Obtiene moneda.
 */
const getOrderCurrency = (orden) => {
  return (getValue(orden, ["currency", "moneda",], null) || "MXN");
};


/**
 * Obtiene ID de la orden.
 */
const getOrderId = (orden) => {
  return getRelationId(orden);
};


/**
 * Determina si el objeto ya contiene comprobante.
 */
const getExistingReceipt = (orden) => {
  return (getValue(orden, ["comprobante", "comprobante_pago", "comprobantePago", "receipt", "payment_receipt",], null) || null);
};


/**
 * ============================================================
 * COMPONENT
 * ============================================================
 */

const FoodCheckoutPago = ({
  ordenes = [],
  /**
   * Callback cuando todas las órdenes tienen comprobante.
   */
  onTodosLosPagosSubidos,

  /**
   * Función que realmente realiza la subida.
   *
   * Debe regresar el comprobante creado/actualizado.
   *
   * Ejemplo:
   *
   * const subirComprobante = async ({
   *   orden,
   *   file,
   * }) => {
   *   ...
   *   return comprobante;
   * }
   */
  subirComprobante,

  /**
   * Permite mostrar inicialmente un mensaje.
   */
  error: externalError = "",
}) => {

  const [selectedFiles, setSelectedFiles] = useState({});
  const [uploading, setUploading] = useState({});
  const [uploadedReceipts, setUploadedReceipts] = useState({});
  const [errors, setErrors] = useState({});
  const [copied, setCopied] = useState("");
  const [expanded, setExpanded] = useState(false);


  /**
   * ==========================================================
   * INICIALIZAR COMPROBANTES EXISTENTES
   * ==========================================================
   */

  useEffect(() => {
    const initialReceipts = {};

    ordenes.forEach((orden) => {
      const id = getOrderId(orden);

      if (!id) return;

      const receipt = getExistingReceipt(orden);

      if (receipt) {
        initialReceipts[id] = receipt;
      }
    });

    setUploadedReceipts((current) => ({
      ...initialReceipts,
      ...current,
    }));
  }, [ordenes]);


  /**
   * ==========================================================
   * ESTADO GENERAL
   * ==========================================================
   */

  const totalOrdenes = ordenes.length;

  const pagosCompletados = useMemo(() => {
    return ordenes.filter((orden) => {
      const id = getOrderId(orden);

      return Boolean(uploadedReceipts[id]);
    }).length;
  }, [ordenes, uploadedReceipts,]);


  const todosLosPagosSubidos = totalOrdenes > 0 && pagosCompletados === totalOrdenes;


  /**
   * Avisar al padre cuando todos estén listos.
   */
  useEffect(() => {
    if (todosLosPagosSubidos && onTodosLosPagosSubidos) {
      onTodosLosPagosSubidos(true);
    }
  }, [todosLosPagosSubidos, onTodosLosPagosSubidos]);


  /**
   * ==========================================================
   * COPY
   * ==========================================================
   */

  const handleCopy = async (value, type) => {
    if (!value) return;

    try {
      await navigator.clipboard.writeText(String(value));

      setCopied(type);

      setTimeout(() => {
        setCopied("");
      }, 1800);

    } catch (error) {
      console.error("Error copiando información", error);
    }
  };


  /**
   * ==========================================================
   * FILE
   * ==========================================================
   */

  const handleFileChange = (ordenId, event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    setErrors((current) => ({
      ...current,
      [ordenId]: "",
    }));


    /**
     * Validar tipo.
     */
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "application/pdf",];

    if (!allowedTypes.includes(file.type)) {
      setErrors((current) => ({
        ...current,
        [ordenId]:
          "El comprobante debe ser JPG, PNG o PDF.",
      }));
      return;
    }


    /**
     * Validar tamaño.
     * 10 MB.
     */
    const maxSize = 10 * 1024 * 1024;

    if (file.size > maxSize) {
      setErrors((current) => ({
        ...current,
        [ordenId]:
          "El comprobante no puede superar los 10 MB.",
      }));

      return;
    }


    setSelectedFiles((current) => ({
      ...current,
      [ordenId]: file,
    }));
  };


  /**
   * ==========================================================
   * UPLOAD
   * ==========================================================
   */

  const handleUpload = async (orden) => {
    const ordenId = getOrderId(orden);

    if (!ordenId) {
      setErrors((current) => ({
        ...current,
        [ordenId]: "No se pudo identificar la orden.",
      }));

      return;
    }

    const file = selectedFiles[ordenId];

    if (!file) {
      setErrors((current) => ({
        ...current,
        [ordenId]:
          "Selecciona un comprobante antes de continuar.",
      }));

      return;
    }

    if (typeof subirComprobante !== "function") {
      setErrors((current) => ({
        ...current,
        [ordenId]:
          "No se configuró la función para subir el comprobante.",
      }));

      return;
    }


    setUploading((current) => ({
      ...current,
      [ordenId]: true,
    }));

    setErrors((current) => ({
      ...current,
      [ordenId]: "",
    }));


    try {
      const comprobante = await subirComprobante({
        orden,
        ordenId,
        file,
      });


      setUploadedReceipts((current) => ({
        ...current,
        [ordenId]: comprobante,
      }));


      setSelectedFiles((current) => {
        const next = {
          ...current,
        };

        delete next[ordenId];

        return next;
      }
      );


      // if (onPagoSubido) {
      //   onPagoSubido({
      //     orden,
      //     ordenId,
      //     comprobante,
      //   });
      // }

    } catch (error) {
      console.error("Error subiendo comprobante", error);

      setErrors((current) => ({
        ...current,
        [ordenId]: error?.message ?? "No fue posible subir el comprobante.",
      }));

    } finally {
      setUploading((current) => ({
        ...current,
        [ordenId]: false,
      }));
    }
  };


  /**
   * ==========================================================
   * EMPTY
   * ==========================================================
   */

  if (!ordenes.length) {
    return (
      <Alert severity="info">
        No hay órdenes disponibles para realizar el pago.
      </Alert>
    );
  }


  /**
   * ==========================================================
   * RENDER
   * ==========================================================
   */

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: 1000,
        mx: "auto",
      }}
    >

      {/* =====================================================
          HEADER
      ====================================================== */}
      <Stack spacing={1} sx={{ mb: 3, }} >
        <Stack
          direction={{ xs: "column", sm: "row", }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", sm: "center", }}
          spacing={2}
        >
          <Box>
            <Typography variant="h5" fontWeight={700}>
              Realiza tus pagos
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, }}>
              Realiza una transferencia por cada restaurante y sube el comprobante correspondiente.
            </Typography>
          </Box>
          {/* PROGRESO */}
          <Chip
            icon={todosLosPagosSubidos ? <MdCheckCircle /> : <MdPayments />}
            label={`${pagosCompletados} de ${totalOrdenes} pagos`}
            color={todosLosPagosSubidos ? "success" : "default"}
            variant={todosLosPagosSubidos ? "filled" : "outlined"}
          />
        </Stack>
        {/* PROGRESS MESSAGE */}
        <Alert severity={todosLosPagosSubidos ? "success" : "info"} icon={todosLosPagosSubidos ? <MdCheckCircle /> : <MdPayments />} sx={{ mt: 1 }}>
          {todosLosPagosSubidos
            ? "Todos los comprobantes han sido enviados correctamente."
            : `Debes subir ${totalOrdenes - pagosCompletados} comprobante${totalOrdenes - pagosCompletados === 1 ? "" : "s"} para continuar.`}
        </Alert>
      </Stack>

      {/* =====================================================
          ERROR EXTERNO
      ====================================================== */}
      {externalError && (
        <Alert severity="error" sx={{ mb: 2, }}>
          {externalError}
        </Alert>
      )}

      {/* =====================================================
          RESTAURANTES
      ====================================================== */}
      <Stack spacing={2}>
        {ordenes.map((orden, index) => {

          const ordenId = getOrderId(orden);
          const restaurantName = getRestaurantName(orden);
          const currency = getOrderCurrency(orden);
          const subtotal = getOrderSubtotal(orden);
          const shipping = getOrderShipping(orden);
          const total = getOrderTotal(orden);
          const bank = getBankData(orden);
          const selectedFile = selectedFiles[ordenId];
          const receipt = uploadedReceipts[ordenId];
          const isUploading = Boolean(uploading[ordenId]);
          const error = errors[ordenId];

          const isComplete = Boolean(receipt);


          return (

            <Card
              key={`orden-item-${ordenId}` || `orden-${index}`}
              variant="outlined"
              sx={{ borderRadius: 3, overflow: "hidden", }}
            >

              <Accordion
                expanded={expanded === ordenId || (expanded === false && !isComplete)}
                onChange={(_, isExpanded) => { setExpanded(isExpanded ? ordenId : false); }}
                disableGutters
                elevation={0}
              >

                {/* =================================================
                    RESTAURANT HEADER
                ================================================== */}

                <AccordionSummary
                  expandIcon={<MdChevronDown />}
                  sx={{
                    px: {
                      xs: 2,
                      sm: 3,
                    },
                    py: 1,
                    "& .MuiAccordionSummary-content":
                    {
                      my: 1,
                    },
                  }}
                >

                  <Stack
                    direction="row"
                    alignItems="center"
                    spacing={1.5}
                    sx={{ width: "100%", minWidth: 0, }}
                  >
                    <Box
                      sx={{
                        width: 42,
                        height: 42,
                        borderRadius: 2,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        bgcolor: isComplete ? "success.light" : "action.hover",
                        flexShrink: 0,
                      }}
                    >
                      {isComplete ? (
                        <MdCheckCircle
                          size={24}
                        />
                      ) : (
                        <MdAccountBalance
                          size={24}
                        />
                      )}
                    </Box>


                    <Box sx={{ minWidth: 0, flex: 1 }} >
                      <Typography variant="subtitle1" fontWeight={700} noWrap >
                        {restaurantName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" >
                        Orden #{ordenId}
                      </Typography>
                    </Box>

                    <Box sx={{ textAlign: "right", mr: 1, }}>
                      <Typography variant="subtitle1" fontWeight={800} >
                        {formatCurrency(total, currency)}
                      </Typography>

                      <Chip
                        size="small"
                        label={isComplete ? "Comprobante enviado" : "Pago pendiente"}
                        color={isComplete ? "success" : "warning"}
                        variant="outlined"
                        sx={{
                          display: { xs: "none", sm: "inline-flex" },
                        }}
                      />
                    </Box>
                  </Stack>
                </AccordionSummary>
                {/* =================================================
                    DETAILS
                ================================================== */}
                <AccordionDetails
                  sx={{ px: { xs: 2, sm: 3 }, pb: 3 }}
                >
                  <Stack spacing={3}>
                    {/* =================================================
                        TOTAL
                    ================================================== */}
                    <Paper
                      variant="outlined"
                      sx={{ p: 2, borderRadius: 2 }}
                    >
                      <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5, }} >
                        Resumen del pago
                      </Typography>
                      <Stack spacing={1}>
                        <Stack direction="row" justifyContent="space-between" >
                          <Typography variant="body2" color="text.secondary" >
                            Productos
                          </Typography>
                          <Typography variant="body2" >
                            {formatCurrency(subtotal, currency)}
                          </Typography>
                        </Stack>
                        <Stack direction="row" justifyContent="space-between" >
                          <Typography variant="body2" color="text.secondary" >
                            Envío
                          </Typography>
                          <Typography variant="body2" >
                            {formatCurrency(shipping, currency)}
                          </Typography>
                        </Stack>
                        <Divider />
                        <Stack direction="row" justifyContent="space-between" alignItems="center" >
                          <Typography variant="subtitle1" fontWeight={700} >
                            Total a transferir
                          </Typography>
                          <Typography variant="h6" fontWeight={800} >
                            {formatCurrency(total, currency)}
                          </Typography>
                        </Stack>
                      </Stack>
                    </Paper>
                    {/* =================================================
                        BANK DATA
                    ================================================== */}
                    <Box>
                      <Stack
                        direction="row"
                        alignItems="center"
                        spacing={1}
                        sx={{ mb: 1.5, }}
                      >
                        <MdAccountBalance size={22} />

                        <Typography variant="subtitle1" fontWeight={700} >
                          Datos para transferencia
                        </Typography>
                      </Stack>
                      <Grid
                        container
                        spacing={1.5}
                      >
                        {/* BANCO */}
                        {bank.banco && (
                          <Grid item xs={12} sm={6} >
                            <Paper variant="outlined" sx={{ p: 1.5, height: "100%", borderRadius: 2 }} >
                              <Typography variant="caption" color="text.secondary" >
                                Banco
                              </Typography>
                              <Typography variant="body1" fontWeight={600} >
                                {bank.banco}
                              </Typography>
                            </Paper>
                          </Grid>
                        )}


                        {/* TITULAR */}
                        {bank.titular && (
                          <Grid item xs={12} sm={6} >
                            <Paper variant="outlined" sx={{ p: 1.5, height: "100%", borderRadius: 2, }} >
                              <Typography variant="caption" color="text.secondary" >
                                Titular / Beneficiario
                              </Typography>
                              <Typography variant="body1" fontWeight={600} >
                                {bank.titular}
                              </Typography>
                            </Paper>
                          </Grid>
                        )}


                        {/* CLABE */}
                        {bank.clabe && (
                          <Grid
                            item
                            xs={12}
                          >
                            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, }} >
                              <Stack
                                direction={{ xs: "column", sm: "row", }}
                                alignItems={{ xs: "stretch", sm: "center", }}
                                justifyContent="space-between"
                                spacing={1}
                              >
                                <Box>
                                  <Typography variant="caption" color="text.secondary" >
                                    CLABE interbancaria
                                  </Typography>
                                  <Typography variant="body1" fontWeight={700} sx={{ wordBreak: "break-all", }} >
                                    {bank.clabe}
                                  </Typography>
                                </Box>
                                <Tooltip title={copied === "clabe" ? "Copiado" : "Copiar CLABE"} >
                                  <IconButton
                                    onClick={() => handleCopy(bank.clabe, "clabe")}
                                    size="small"
                                  >
                                    {copied === "clabe" ? (<MdCheckCircle />) : (<MdContentCopy />)}
                                  </IconButton>
                                </Tooltip>
                              </Stack>
                            </Paper>
                          </Grid>
                        )}

                        {/* CUENTA */}
                        {bank.cuenta && (
                          <Grid item xs={12} sm={6} >
                            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }} >
                              <Stack direction="row" alignItems="center" justifyContent="space-between" >
                                <Box>
                                  <Typography variant="caption" color="text.secondary" >
                                    Número de cuenta
                                  </Typography>
                                  <Typography variant="body1" fontWeight={600} >
                                    {bank.cuenta}
                                  </Typography>
                                </Box>
                                <IconButton
                                  size="small"
                                  onClick={() => handleCopy(bank.cuenta, "cuenta")}
                                >
                                  {copied === "cuenta" ? (<MdCheckCircle />) : (<MdContentCopy />)}
                                </IconButton>
                              </Stack>
                            </Paper>
                          </Grid>
                        )}

                        {/* TARJETA */}

                        {bank.tarjeta && (
                          <Grid item xs={12} sm={6} >
                            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }} >
                              <Stack direction="row" alignItems="center" justifyContent="space-between" >
                                <Box>
                                  <Typography variant="caption" color="text.secondary" >
                                    Número de tarjeta
                                  </Typography>
                                  <Typography variant="body1" fontWeight={600} >
                                    {bank.tarjeta}
                                  </Typography>
                                </Box>
                                <IconButton
                                  size="small"
                                  onClick={() => handleCopy(bank.tarjeta, "tarjeta")}
                                >
                                  {copied === "tarjeta" ? (<MdCheckCircle />) : (<MdContentCopy />)}
                                </IconButton>
                              </Stack>
                            </Paper>
                          </Grid>
                        )}
                      </Grid>
                      {!bank.banco && !bank.titular && !bank.clabe && !bank.cuenta && !bank.tarjeta && (
                        <Alert severity="warning" sx={{ mt: 1, }} >
                          Este restaurante todavía no tiene datos bancarios registrados.
                        </Alert>
                      )}
                    </Box>

                    {/* =================================================
                        COMPROBANTE
                    ================================================== */}

                    <Box>
                      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5, }} >
                        <MdReceiptLong size={22} />
                        <Typography variant="subtitle1" fontWeight={700} >
                          Comprobante de transferencia
                        </Typography>
                      </Stack>

                      {isComplete ? (
                        /* =================================================
                           COMPLETE
                        ================================================== */

                        <Alert severity="success" icon={<MdCheckCircle />} >
                          <Typography variant="body2" fontWeight={600} >
                            Comprobante enviado correctamente.
                          </Typography>
                          <Typography variant="caption" display="block" sx={{ mt: 0.5, }} >
                            El restaurante deberá validar tu transferencia.
                          </Typography>
                        </Alert>

                      ) : (

                        <Stack spacing={1.5}>
                          {/* FILE DROP AREA */}
                          <Paper
                            variant="outlined"
                            sx={{
                              p: { xs: 2, sm: 3 },
                              borderRadius: 2,
                              borderStyle: "dashed",
                              textAlign: "center",
                              cursor: "pointer",
                              transition: "background-color 0.2s",
                              "&:hover": {
                                bgcolor: "action.hover",
                              },
                            }}
                            component="label"
                          >
                            <input
                              hidden
                              type="file"
                              accept="image/jpeg,image/jpg,image/png,application/pdf"
                              onChange={(event) => handleFileChange(ordenId, event)}
                            />
                            <Stack alignItems="center" spacing={1} >
                              <Box
                                sx={{
                                  width: 52,
                                  height: 52,
                                  borderRadius: "50%",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  bgcolor: "action.hover",
                                }}
                              >
                                <MdCloudUpload size={28} />
                              </Box>
                              <Typography variant="body1" fontWeight={600} >
                                {selectedFile ? selectedFile.name : "Selecciona tu comprobante"}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" >
                                JPG, PNG o PDF · Máximo 10 MB
                              </Typography>
                              <Button component="span" variant="outlined" size="small" startIcon={<MdUploadFile />} >
                                Seleccionar archivo
                              </Button>
                            </Stack>
                          </Paper>


                          {/* SELECTED FILE */}

                          {selectedFile && (
                            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }} >
                              <Stack direction="row" alignItems="center" spacing={1.5} >
                                {selectedFile.type === "application/pdf" ? (<MdPictureAsPdf size={25} />) : (<MdImage size={25} />)}
                                <Box sx={{ flex: 1, minWidth: 0 }} >
                                  <Typography variant="body2" fontWeight={600} noWrap >
                                    {selectedFile.name}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary" >
                                    {(selectedFile.size / 1024 / 1024).toFixed(2)}{" "}MB
                                  </Typography>
                                </Box>
                              </Stack>
                            </Paper>
                          )}

                          {/* ERROR */}

                          {error && (
                            <Alert severity="error" >
                              {error}
                            </Alert>
                          )}
                          {/* UPLOAD BUTTON */}
                          <Button
                            variant="contained"
                            fullWidth
                            disabled={!selectedFile || isUploading}
                            onClick={() => handleUpload(orden)}
                            startIcon={isUploading ? (<CircularProgress size={18} color="inherit" />) : (<MdCloudUpload />)}
                            sx={{ minHeight: 46, borderRadius: 2, fontWeight: 700 }}
                          >
                            {isUploading ? "Subiendo comprobante..." : "Subir comprobante"}
                          </Button>
                        </Stack>
                      )}
                    </Box>

                    {/* =================================================
                        PAYMENT NOTICE
                    ================================================== */}
                    <Alert severity="info" icon={<MdDescription />} >
                      <Typography variant="body2" >
                        Después de subir el comprobante, el pago quedará pendiente de validación por parte del restaurante.
                      </Typography>
                    </Alert>
                  </Stack>
                </AccordionDetails>
              </Accordion>
            </Card>
          );
        })}
      </Stack>

      {/* =====================================================
          FOOTER
      ====================================================== */}
      <Box sx={{ mt: 3 }} >
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }} >
          <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ xs: "flex-start", sm: "center" }} justifyContent="space-between" spacing={1.5} >
            <Box>
              <Typography variant="subtitle2" fontWeight={700} >
                Estado de pagos
              </Typography>
              <Typography variant="body2" color="text.secondary" >
                {pagosCompletados} de{" "}{totalOrdenes} comprobantes enviados
              </Typography>
            </Box>
            <Chip
              icon={todosLosPagosSubidos ? <MdCheckCircle /> : <MdPayments />}
              label={todosLosPagosSubidos ? "Listo para continuar" : "Pagos pendientes"}
              color={todosLosPagosSubidos ? "success" : "warning"}
            />
          </Stack>
        </Paper>
      </Box>
    </Box >
  );
};


export default FoodCheckoutPago;