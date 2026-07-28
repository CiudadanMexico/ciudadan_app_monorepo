console.log("📦 cargando ruta openpay (/routes/openpay.js)");
const express = require("express");
const fetch = require("cross-fetch");
const router = express.Router();

const OPENPAY_MERCHANT_ID = process.env.OPENPAY_MERCHANT_ID;
const OPENPAY_PRIVATE_KEY = process.env.OPENPAY_PRIVATE_KEY;

// 🧩 Crear cliente y suscribirlo a un plan
router.post("/suscribir", async (req, res) => {
  console.log("➡️ /api/suscribir recibida, body:", req.body);

  try {
    const { token_id, email, name, last_name, phone_number, plan_id } = req.body;

    if (!token_id) {
      console.log("❗ Falta token_id");
      return res.status(400).json({ error: "Falta token_id" });
    }

    if (!plan_id) {
      console.log("❗ Falta plan_id en payload");
      return res.status(400).json({ error: "Falta plan_id en el cuerpo de la solicitud" });
    }

    if (!OPENPAY_MERCHANT_ID || !OPENPAY_PRIVATE_KEY) {
      console.error("❌ Faltan variables de entorno de Openpay:", {
        OPENPAY_MERCHANT_ID,
        OPENPAY_PRIVATE_KEY: !!OPENPAY_PRIVATE_KEY,
      });
      return res.status(500).json({ error: "Configuración Openpay incompleta en el servidor" });
    }

    // 🧱 1️⃣ Crear cliente en Openpay
    const customerResponse = await fetch(
      `https://sandbox-api.openpay.mx/v1/${OPENPAY_MERCHANT_ID}/customers`,
      {
        method: "POST",
        headers: {
          Authorization: "Basic " + Buffer.from(OPENPAY_PRIVATE_KEY + ":").toString("base64"),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          last_name,
          email,
          phone_number,
          requires_account: false,
        }),
      }
    );

    const customerData = await customerResponse.json();
    console.log("🧩 Cliente creado:", customerData);

    if (!customerResponse.ok) {
      return res.status(customerResponse.status).json({
        error: customerData?.description || "Error al crear cliente en Openpay",
      });
    }

    const customer_id = customerData.id;

    // 🧱 2️⃣ Suscribir cliente al plan usando el plan_id del payload
    const subscriptionUrl = `https://sandbox-api.openpay.mx/v1/${OPENPAY_MERCHANT_ID}/customers/${customer_id}/subscriptions`;

    const subscriptionResponse = await fetch(subscriptionUrl, {
      method: "POST",
      headers: {
        Authorization: "Basic " + Buffer.from(OPENPAY_PRIVATE_KEY + ":").toString("base64"),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        plan_id, // ✅ ahora viene del payload
        source_id: token_id,
      }),
    });

    const subscriptionData = await subscriptionResponse.json();
    console.log("💳 Suscripción creada:", subscriptionData);

    if (!subscriptionResponse.ok) {
      return res.status(subscriptionResponse.status).json({
        error: subscriptionData?.description || "Error al crear suscripción en Openpay",
      });
    }

    return res.json({
      success: true,
      customer_id,
      subscription: subscriptionData,
    });
  } catch (err) {
    console.error("Error backend:", err);
    return res.status(500).json({
      error: "Error interno del servidor",
      details: err.message,
    });
  }
});

module.exports = router;
