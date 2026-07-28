// routes/notifica.js
console.log("📦 cargando ruta notifica (/routes/notifica.js)");

const express = require("express");
const router = express.Router();

/**
 * POST /
 * Body esperado (ejemplo):
 * {
 *   "title": "Nueva notificación",
 *   "body": "Tienes un nuevo mensaje",
 *   "email": "usuario@ejemplo.com", // opcional: si se provee, emitimos también solo a esa room
 *   "meta": { ... } // opcional
 * }
 */
router.post("/", (req, res) => {
  try {
    const io = req.app.get("io");
    const payload = req.body;

    console.log("➡️ /notifica POST recibido, payload:", payload);

    if (!payload || Object.keys(payload).length === 0) {
      console.warn("❗ /notifica: payload vacío");
      return res.status(400).json({ ok: false, error: "payload vacío" });
    }

    if (!io) {
      console.error("❌ /notifica: no se encontró io en app (socket no inicializado)");
      return res.status(500).json({ ok: false, error: "socket no inicializado en el servidor" });
    }

    // Emit global para que todos los clientes escuchen (tu cliente debe escuchar 'notification')
    io.emit("notification", payload);
    console.log("🔔 /notifica: emisión global 'notification' realizada:", payload);

    // Si mandan email en el payload, intentamos emitir también a la room con ese email
    if (payload.email) {
      const room = String(payload.email);
      io.to(room).emit("notification", payload);
      console.log(`🔔 /notifica: emisión dirigida a room ${room}`);
    }

    return res.status(200).json({ ok: true, sentTo: payload.email ? ["global", payload.email] : ["global"] });
  } catch (err) {
    console.error("/notifica error:", err);
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

module.exports = router;
