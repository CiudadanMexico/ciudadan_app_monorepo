// server.js
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const fs = require("fs");
const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");

const app = express();
const server = http.createServer(app);

// Puerto principal (aquí pones 33032 para sockets y webhook en el mismo server)
const PORT = Number(process.env.SOCKET_PORT || 33032);

// Orígenes permitidos (puedes editar .env CORS_ORIGINS)
const defaultAccept = [
  "http://localhost:3000",
  "http://localhost",
  "http://localhost:33422",
  "https://chatbot.publia.mx",
  "https://marihuanas.club",
  "https://www.marihuanas.club",
  "https://wiki.ciudadan.org",
  "https://ciudadan.org",
];
const accept = (process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(",") : defaultAccept);

// Configurar CORS (antes de rutas)
app.use(
  cors({
    origin: accept,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin"],
    credentials: true,
    optionsSuccessStatus: 200
  })
);

// Middleware para parsear JSON
app.use(express.json());

// Socket.IO con CORS (usa el mismo server)
const io = socketIo(server, {
  cors: {
    origin: accept,
    methods: ["GET", "POST", "OPTIONS"],
    credentials: true
  }
});
app.set("io", io);

// Importar rutas existentes (ajusta si faltan)
const priceCalculatingRoute = require("./routes/priceCalculating");
const sendMessageRoute = require("./routes/trip-request");
const wikiRoute = require("./routes/wiki");
const notificaRoute = require("./routes/notifica");
const testTrip = require('./routes/testTrip');
const calculateFare = require('./routes/calculateFare');
const aceptarViajeRoute = require('./routes/aceptarViaje');

let openpayRoute;
try {
  openpayRoute = require("./routes/openpay");
} catch (err) {
  console.error("❌ Error cargando ./routes/openpay:", err);
}
if (openpayRoute) app.use("/api", openpayRoute);

// Registrar rutas que tienes
app.use("/", priceCalculatingRoute);
app.use("/", sendMessageRoute);
app.use("/wiki", wikiRoute);
app.use("/notifica", notificaRoute);
app.use('/test', testTrip);
app.use('/api', calculateFare);
app.use('/api', aceptarViajeRoute);

// Montar chatbot (archivo externo) — no inicia puerto extra
try {
  const { attachChatbot } = require("./chatbot");
  // attachChatbot montará /webhook en este app y configurará provider correctamente
  attachChatbot(app, { webhookPath: process.env.CHATBOT_WEBHOOK_PATH || "/webhook", appPort: PORT })
    .then(info => {
      console.log("✅ Chatbot montado correctamente:", info);
    })
    .catch(err => {
      console.error("❌ Error montando chatbot:", err);
    });
} catch (err) {
  console.error("❌ No se pudo cargar chatbot.js:", err);
}

// Manejo de WebSocket
io.on("connection", (socket) => {
  console.log("✅ Cliente conectado a WebSocket:", socket.id);

  socket.on('register', (data) => {
    try {
      const email = (data && data.email) ? String(data.email) : null;
      if (email) {
        socket.join(email);
        console.debug(`Socket ${socket.id} se unió a room: ${email}`);
      }
    } catch (err) {
      console.error('Error en register:', err);
    }
  });

  socket.on("speakTTS", (message) => {
    console.log("📢 Servidor recibió 'speakTTS' con mensaje:", message);
    io.emit("speakTTS", message);
  });

  socket.on('ofertaviaje', (payload, ack) => {
    console.log('evento oferta taxista recibido');
    try {
      const coords = payload && (payload.coordinates || payload.coords || payload.location);
      const price = payload && (payload.price ?? payload.precio ?? null);
      if (!coords || typeof coords.lat !== 'number' || typeof coords.lng !== 'number') {
        if (typeof ack === 'function') ack({ ok: false, error: 'payload inválido: coordinates lat/lng requeridos' });
        return;
      }
      const out = {
        fromSocketId: socket.id,
        coordinates: { lat: Number(coords.lat), lng: Number(coords.lng) },
        price,
        meta: payload.meta || null,
        timestamp: new Date().toISOString(),
      };
      socket.broadcast.emit('ofertaviaje', out);
      if (typeof ack === 'function') ack({ ok: true });
    } catch (e) {
      console.error('Error manejando ofertaviaje:', e);
      if (typeof ack === 'function') ack({ ok: false, error: String(e) });
    }
  });

  socket.on("disconnect", () => {
    console.log("❌ Cliente desconectado:", socket.id);
  });
});

// Función defensiva para imprimir rutas (compatible Express 4/5)
function printRoutes(appInstance) {
  console.log("🔎 Rutas registradas:");
  if (!appInstance) {
    console.log("⚠️ appInstance no está definida");
    return;
  }
  const router = appInstance._router || appInstance.router || null;
  if (!router || !router.stack) {
    console.log("⚠️ No se encontró app._router.stack — puede ser Express v5 o el router aún no se montó.");
    return;
  }
  router.stack.forEach((middleware) => {
    try {
      if (middleware.route) {
        const methods = Object.keys(middleware.route.methods || {}).map(m => m.toUpperCase()).join(", ");
        console.log(`${methods} ${middleware.route.path}`);
      } else if (middleware.name === "router" && middleware.handle && middleware.regexp) {
        console.log(`-- router montado:`, middleware.regexp);
      } else if (middleware.name) {
        console.log(`middleware: ${middleware.name}`);
      }
    } catch (e) {
      console.log("error procesando middleware:", e);
    }
  });
}

// Start server (same port for sockets + webhook)
server.listen(PORT, () => {
  console.log(`🚀 Servidor escuchando en el puerto ${PORT}`);
  console.log(`🌐 CORS habilitado para: ${JSON.stringify(accept)}`);
  printRoutes(app);
});
