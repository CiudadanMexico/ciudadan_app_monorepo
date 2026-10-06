import {
  Card,
  CardContent,
  Typography,
  RadioGroup,
  FormControlLabel,
  Radio,
  Box,
  CircularProgress,
  Alert,
  Chip,
  Stack,
  Divider,
} from "@mui/material";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import StorefrontOutlinedIcon from "@mui/icons-material/StorefrontOutlined";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import ScheduleOutlinedIcon from "@mui/icons-material/ScheduleOutlined";

const formatCurrency = (value) => {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return "$0.00";
  }

  return amount.toLocaleString(
    "es-MX",
    {
      style: "currency",
      currency: "MXN",
    }
  );
};

const getRateId = (rate) => rate?.id ?? rate?.rate_id;

const getCarrier = (rate) => rate?.provider_display_name ?? rate?.carrier ?? "Paquetería";

const getService = (rate) => rate?.provider_service_name ?? rate?.service ?? rate?.servicelevel_name ?? "Servicio de envío";

const getAmount = (rate) => rate?.total ?? rate?.amount ?? rate?.price ?? 0;

const getDays = (rate) => {
  const days = Number(rate?.days);
  return Number.isFinite(days) && days > 0 ? days : null;
};

const getExtraFees = (rate) => Array.isArray(rate?.extra_fees) ? rate.extra_fees : [];

const getExtraFeesTotal = (rate) => getExtraFees(rate).reduce((sum, fee) => sum + (Number(fee?.value) || 0), 0);

const getExtraFeeLabel = (extra_fee) => {
  switch (extra_fee) {
    case 'exceeded_dimension_fee':
      return 'Cargo por dimensiones excedidas';
    case 'demand_surcharge_fee':
      return 'Cargo adicional por demanda';
    default:
      return 'Cargo adicional'
  }
}
const getDeliveryInfo = (rate) => {
  if (rate?.office_delivery_only) {
    return {
      icon: <StorefrontOutlinedIcon fontSize="small" />,
      text: "Entrega solo en sucursal",
    };
  }

  if (rate?.office_delivery) {
    return {
      icon: <StorefrontOutlinedIcon fontSize="small" />,
      text: "Domicilio o sucursal (Ocurre)",
    };
  }

  return {
    icon: <HomeOutlinedIcon fontSize="small" />,
    text: "Entrega a domicilio",
  };
};

const EnvioPorTienda = ({
  store,
  quotation,
  selectedRateId,
  onSelectRate,
  loading = false,
}) => {
  if (loading) {
    return (
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography
            variant="h6"
            gutterBottom
          >
            {store?.name ?? "Tienda"}
          </Typography>

          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
            }}
          >
            <CircularProgress size={22} />

            <Typography>
              Obteniendo opciones de envío...
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (!quotation) {
    return null;
  }

  const rates = quotation?.rates?.filter((rate) => rate?.success) ?? [];

  if (rates.length === 0) {
    return (
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography
            variant="h6"
            gutterBottom
          >
            {store?.name ?? ""}
          </Typography>

          <Alert severity="warning">
            No encontramos opciones de envío para esta tienda.
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const handleSelectRate = (rateId) => {
    const selectedRate = rates.find((rate) => (rate?.id ?? rate?.rate_id) == rateId);
    if (selectedRate)
      onSelectRate(selectedRate);
  };

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Typography
          variant="h6"
          gutterBottom
        >
          {store?.name ?? ""}
        </Typography>

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mb: 2 }}
        >
          Selecciona una opción de envío
        </Typography>

        <RadioGroup
          value={selectedRateId ?? ""}
          onChange={(event) =>
            handleSelectRate(event.target.value)
          }
        >
          {rates.map((rate) => {
            const rateId = getRateId(rate);
            const days = getDays(rate);
            const delivery = getDeliveryInfo(rate);
            const extraFees = getExtraFees(rate);
            const extraFeesTotal = getExtraFeesTotal(rate);

            return (
              <Box
                key={`rate-item-${rateId}`}
                sx={{
                  border: "1px solid",
                  borderColor: selectedRateId === rateId ? "primary.main" : "divider",
                  borderRadius: 2,
                  mb: 1,
                  p: 1.5,
                }}
              >
                <FormControlLabel
                  value={rateId}
                  control={<Radio />}
                  sx={{ alignItems: "flex-start", m: 0, width: "100%" }}
                  label={
                    <Box sx={{ width: "100%" }}>
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="flex-start"
                        spacing={2}
                      >
                        <Box>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <LocalShippingOutlinedIcon
                              fontSize="small"
                              color="action"
                            />
                            <Typography fontWeight={600}>
                              {getCarrier(rate)}
                            </Typography>
                            <Chip
                              label={getService(rate)}
                              size="small"
                              variant="outlined"
                            />
                          </Stack>

                          <Stack
                            direction="row"
                            spacing={0.5}
                            alignItems="center"
                            sx={{ mt: 0.5, color: "text.secondary" }}
                          >
                            {delivery.icon}
                            <Typography variant="body2" color="text.secondary">
                              {delivery.text}
                            </Typography>
                          </Stack>
                        </Box>

                        <Box sx={{ textAlign: "right" }}>
                          {days && (
                            <Stack
                              direction="row"
                              spacing={0.5}
                              alignItems="center"
                              justifyContent="flex-end"
                            >
                              <ScheduleOutlinedIcon
                                fontSize="small"
                                color="action"
                              />
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                {days} {days === 1 ? "día hábil" : "días hábiles"}
                              </Typography>
                            </Stack>
                          )}

                          <Typography variant="h6" fontWeight={700}>
                            {formatCurrency(getAmount(rate))}
                          </Typography>
                        </Box>
                      </Stack>

                      {extraFees.length > 0 && (
                        <>
                          <Divider sx={{ my: 1 }} />
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ display: "block", mb: 0.5 }}
                          >
                            Incluye cargos extra ({formatCurrency(extraFeesTotal)}):
                          </Typography>
                          <Stack
                            direction="row"
                            spacing={0.5}
                            flexWrap="wrap"
                            useFlexGap
                          >
                            {extraFees.map((fee, index) => (
                              <Chip
                                key={`fee-${rateId}-${fee?.code ?? index}`}
                                label={`${getExtraFeeLabel(fee?.code ?? 'Cargo')}: ${formatCurrency(fee?.value ?? 0)}`}
                                size="small"
                                variant="outlined"
                                color="warning"
                              />
                            ))}
                          </Stack>
                        </>
                      )}
                    </Box>
                  }
                />
              </Box>
            );
          })}
        </RadioGroup>
      </CardContent>
    </Card>
  );
};

export default EnvioPorTienda;