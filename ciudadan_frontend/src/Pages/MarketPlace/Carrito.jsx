import React, { useState } from "react";
import {
  Box,
  Container,
  Tabs,
  Tab,
  Typography,
  Paper,
} from "@mui/material";

import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import RestaurantIcon from "@mui/icons-material/Restaurant";
import MarketplaceCart from "../../components/MarketPlace/MarketplaceCart";
import FoodCart from "../../components/Food/FoodCart";

const Carrito = () => {
  const [tab, setTab] = useState(0);

  const handleChange = (event, newValue) => {
    setTab(newValue);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Typography
        variant="h4"
        fontWeight={700}
        sx={{ mb: 3 }}
      >
        Mi carrito
      </Typography>

      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          border: "1px solid",
          borderColor: "divider",
          overflow: "hidden",
        }}
      >
        <Tabs
          value={tab}
          onChange={handleChange}
          variant="fullWidth"
          sx={{
            borderBottom: "1px solid",
            borderColor: "divider",
          }}
        >
          <Tab
            icon={<ShoppingCartIcon />}
            iconPosition="start"
            label="Marketplace"
          />

          <Tab
            icon={<RestaurantIcon />}
            iconPosition="start"
            label="Comida"
          />
        </Tabs>

        <Box sx={{ p: { xs: 2, md: 3 } }}>
          {tab === 0 && <MarketplaceCart />}

          {tab === 1 && <FoodCart />}
        </Box>
      </Paper>
    </Container>
  );
};

export default Carrito;