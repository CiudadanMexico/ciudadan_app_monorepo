// routes/notifica.js
console.log("📦 cargando ruta notifica (/routes/notifica.js)");

const express = require("express");
const router = express.Router();

/**
 * POST /notifica  — emisión en tiempo real SOLO al destinatario.
 *
 * Cuerpo del nuevo contrato (lo llama Strapi desde notificacion service):
 * {
 *   "email": "usuario@ejemplo.com",
 *   "notification": { "id": 1, "attributes": { ... } },   // forma Strapi
 *   "broadcast": false
 * }
 *
 * RETRO-COMPATIBILIDAD: si no llega `notification`, todo el body se emite
 * (así funcionan llamadas antiguas tipo { title, body, email, meta }).
 *
 * CRÍTICO: NUNCA se emite en global por defecto. Un `io.emit` indiscriminado
 * hacía que TODOS los usuarios conectados recibieran notificaciones privadas
 * de terceros. El broadcast global exige `broadcast: true` explícito.
 */
router.post("/", (req, res) => {
  try {
    const io = req.app.get("io");
    const body = req.body || {};

    if (!io) {
      console.error("❌ /notifica: no se encontró io en app (socket no inicializado)");
      return res.status(500).json({ ok: false, error: "socket no inicializado en el servidor" });
    }

    const email = String(body.email || body.to || "").trim();
    const broadcast = body.broadcast === true;

    if (!broadcast && !email) {
      console.warn("❗ /notifica: sin destinatario y sin broadcast explícito -> rechazado");
      return res
        .status(400)
        .json({ ok: false, error: 'Falta "email" (destinatario). El broadcast global requiere broadcast: true' });
    }

    // Compatibilidad: si no traen `notification`, todo el body es la notificación.
    const notification =
      body.notification !== undefined && body.notification !== null
        ? body.notification
        : body;

    const payload = broadcast ? { ...notification, broadcast: true } : notification;

    if (broadcast) {
      // Sólo explícito y deliberado (nunca es el comportamiento por defecto).
      io.emit("notification", payload);
      console.warn("⚠️ /notifica: BROADCAST GLOBAL explícito solicitado");
      return res.status(200).json({ ok: true, sentTo: ["broadcast"] });
    }

    const room = String(email);
    io.to(room).emit("notification", payload);
    console.log(`🔔 /notifica: emitido al room ${room}`);

    return res.status(200).json({ ok: true, sentTo: [room] });
  } catch (err) {
    console.error("/notifica error:", err);
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

module.exports = router;
