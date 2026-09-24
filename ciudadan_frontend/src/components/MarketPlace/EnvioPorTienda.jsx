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
} from "@mui/material";

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
    if(selectedRate)
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
                  label={
                    <Box>
                      <Typography fontWeight={600} >
                        {getCarrier(rate)}
                      </Typography>

                      <Typography variant="body2" color="text.secondary" >
                        {getService(rate)}
                      </Typography>

                      <Typography variant="body1" fontWeight={600} sx={{ mt: 0.5 }} >
                        {formatCurrency(getAmount(rate))}
                      </Typography>
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