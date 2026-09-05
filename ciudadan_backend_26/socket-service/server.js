// server.js
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });

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
const ratingCalculatingRoute = require("./routes/calcRating");
const sendMessageRoute = require("./routes/trip-request");
const wikiRoute = require("./routes/wiki");
const notificaRoute = require("./routes/notifica");
const testTrip = require('./routes/testTrip');
const calculateFare = require('./routes/calculateFare');
const aceptarViajeRoute = require('./routes/aceptarViaje');

const { getUserRating } = require('./lib/calcRating');

let openpayRoute;
try {
  openpayRoute = require("./routes/openpay");
} catch (err) {
  console.error("❌ Error cargando ./routes/openpay:", err);
}
if (openpayRoute) app.use("/api", openpayRoute);

// Registrar rutas que tienes
app.use("/", priceCalculatingRoute);
app.use("/", ratingCalculatingRoute);
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
      console.log(data);
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

  socket.on('ofertaviaje', async (payload, ack) => {
    console.log('evento oferta taxista recibido');
    try {
      const id = payload && (payload.id || payload.travelId || payload.travelid);
      const coords = payload && (payload.coordinates || payload.coords || payload.location);
      //console.log('ofertaviaje payload:', JSON.stringify(payload, null, 2));
      if (!coords || typeof coords.lat !== 'number' || typeof coords.lng !== 'number') {
        if (typeof ack === 'function') ack({ ok: false, error: 'payload inválido: coordinates lat/lng requeridos' });
        return;
      }
      const userRating = payload.driverEmail ? await getUserRating(payload.driverEmail, true) : null;
      console.log('userRating obtenido para driverEmail', payload.driverEmail, ':', userRating);
      const out = {
        fromSocketId: socket.id,
        coordinates: { lat: Number(coords.lat), lng: Number(coords.lng) },
        driver: payload.driver,
        driverEmail: payload.driverEmail || null,
        userEmail: payload.userEmail || null,
        travel: payload.rawTravel,
        price: payload.price,
        userRating,
        meta: payload.meta || null,
        timestamp: new Date().toISOString(),
      };
      io.to(payload.userEmail).emit('ofertaviaje', out);
      if (typeof ack === 'function') ack({ ok: true });
    } catch (e) {
      console.error('Error manejando ofertaviaje:', e);
      if (typeof ack === 'function') ack({ ok: false, error: String(e) });
    }
  });

  socket.on('joinRoom', (payload) => {
    try {
      const room = payload.channel || payload.room || payload.email;
      if (room && typeof room === 'string') {
        socket.join(room);
        console.debug(`Socket ${socket.id} se unió a room: ${room}`);
      }
    } catch (err) {
      console.error('Error en joinRoom:', err);
    }
  });

  socket.on('leaveRoom', (payload) => {
    try {
      const room = payload.channel || payload.room || payload.email;
      if (room && typeof room === 'string') {
        socket.leave(room);
        console.debug(`Socket ${socket.id} dejó la room: ${room}`);
      }
    } catch (err) {
      console.error('Error en leaveRoom:', err);
    }
  });

  socket.on('actualizandoUbicacion', (payload) => {
    try {
      if (!payload) {
        console.error('Error en actualizandoUbicacion: payload inválido');
        return;
      }
      //console.log(payload.payload);
      io.to(payload.travelId).emit('driver-location', payload);
    } catch (e) {
      console.error('Error en actualizandoUbicacion:', e);
    }
  });

  socket.on('trip-update', (payload) => {
    try {
      if (!payload) {
        console.error('Error en trip-update: payload inválido o falta travelId');
        return;
      }
      console.log('trip-update recibido:', JSON.stringify(payload, null, 2));
      io.to(payload.travelId).emit('trip-update', payload);
    } catch (e) {
      console.error('Error en trip-update:', e);
    }
  });

  socket.on('cancel-search', (payload) => {
    try {
      if (!payload) {
        console.error('Error en cancel-search: payload inválido o falta travelId');
        return;
      }
      console.log('cancel-search recibido:', JSON.stringify(payload, null, 2));
      io.emit('cancel-search', payload);
    } catch (e) {
      console.error('Error en cancel-search:', e);
    }
  });

  socket.on('offer-rejected', (payload) => {
    try {
      if (!payload) {
        console.error('Error en offer-rejected: payload inválido o falta travelId');
        return;
      }
      console.log('offer-rejected recibido:', JSON.stringify(payload, null, 2));
      io.emit('offer-rejected', payload);
    } catch (e) {
      console.error('Error en offer-rejected:', e);
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
