// server.js
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });

const fs = require("fs");
const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
const axios = require("axios");

const app = express();
const server = http.createServer(app);

// Puerto principal (aquí pones 33032 para sockets y webhook en el mismo server)
const PORT = Number(process.env.SOCKET_PORT || 33032);

// Orígenes permitidos (puedes editar .env CORS_ORIGINS)
const defaultAccept = [
  "http://localhost:3000",
  "http://localhost",
  "http://localhost:3001",
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
const notificaRoute = require("./routes/notifica");
const testTrip = require('./routes/testTrip');
const calculateFare = require('./routes/calculateFare');
const aceptarViajeRoute = require('./routes/aceptarViaje');

const { ConfigDatabase } = require('./dist/config/ConfigDatabase');
const { DocumentRepositoryImpl } = require('./dist/repository/impl/DocumentRepositoryImpl');
const { WikiService } = require('./dist/services/WikiService');
const { WikiWatcherService } = require('./dist/services/WikiWatcherService');

const WikiRouter = require("./routes/WikiRouter");
const { getUserRating } = require('./lib/calcRating');

const strapiUrl = process.env.STRAPI_URL || "";
const strapiToken = process.env.STRAPI_TOKEN || "";
const headers = {
  'Content-Type': 'application/json',
  ...(strapiToken ? { Authorization: `Bearer ${strapiToken}` } : {})
}

let openpayRoute;
try {
  openpayRoute = require("./routes/openpay");
} catch (err) {
  console.error("❌ Error cargando ./routes/openpay:", err);
}
if (openpayRoute) app.use("/api", openpayRoute);

// Inicializas las dependencias de la Wiki
const db = ConfigDatabase.getConnection();
const documentRepository = new DocumentRepositoryImpl(db);
const wikiService = new WikiService(documentRepository);

// Montar router de la Wiki (arbol + documentos)
app.use("/wiki", WikiRouter);

// Iniciar watcher de archivos .md
const wikiWatcher = new WikiWatcherService(wikiService);
wikiWatcher.start();

// Registrar rutas que tienes
app.use("/", priceCalculatingRoute);
app.use("/", ratingCalculatingRoute);
app.use("/", sendMessageRoute);
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
      const travelId = payload && (payload.id || payload.travelId || payload.travelid);
      const coords = payload && (payload.coordinates || payload.coords || payload.location);
      //console.log('ofertaviaje payload:', JSON.stringify(payload, null, 2));
      if (!coords || typeof coords.lat !== 'number' || typeof coords.lng !== 'number') {
        if (typeof ack === 'function') ack({ ok: false, error: 'payload inválido: coordinates lat/lng requeridos' });
        return;
      }
      const userRating = payload.driverEmail ? await getUserRating(payload.driverEmail, true) : null;
      console.log('userRating obtenido para driverEmail', payload.driverEmail, ':', userRating);
      const out = {
        coordinates: { lat: Number(coords.lat), lng: Number(coords.lng) },
        driver: payload.driver,
        driverEmail: payload.driverEmail,
        userEmail: payload.userEmail,
        travel: payload.rawTravel,
        price: payload.price,
        userRating,
        meta: payload.meta || null,
        timestamp: new Date().toISOString(),
      };

      const newOffer = {
        coordenadas: out.coordinates,
        precio_sugerido: out.price,
        driver_email: out.driverEmail,
        user_email: out.userEmail,
        calif_conductor: userRating,
        pasajero: payload?.userId,
        conductor: payload?.driverId,
        viaje: travelId
      }

      const response = await axios.post(
        `${strapiUrl.replace(/\/$/, '')}/api/viaje-ofertas`,
        { data: newOffer }, { headers }
      );
      if (!response) {
        throw new Error('No se pudo guardar la oferta de viaje');
      }

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

  socket.on('driver-location', async (payload) => {
    try {
      if (!payload) {
        console.error('Error en driver-location: payload inválido');
        return;
      }
      //console.log('driver-location recibido:', JSON.stringify(payload, null, 2));
      io.to(payload.travelId).emit('driver-location', payload);
    } catch (e) {
      console.error('Error en driver-location:', e);
    }
  });

  socket.on('trip-update', (payload) => {
    try {
      if (!payload) {
        console.error('Error en trip-update: payload inválido o falta travelId');
        return;
      }
      //console.log('trip-update recibido:', JSON.stringify(payload, null, 2));
      io.to(payload.travelId).emit('trip-update', payload);
    } catch (e) {
      console.error('Error en trip-update:', e);
    }
  });

  socket.on('offer-accepted', async (payload) => {
    try {
      if (!payload) {
        console.error('Error en offer-accepted: payload inválido o falta travelId');
        return;
      }

      const url = `${strapiUrl.replace(/\/$/, '')}/api/viaje-ofertas?filters[user_email][$eq]=${payload.user}&filters[driver_email][$eq]=${payload.driver}&populate=*`;
      const res = await axios.get(url, { headers });

      if (!res) return;
      const offers = Array.isArray(res.data.data) && res.data.data || null;
      if (!offers) throw new Error('Error en obtener las ofertas de viaje');

      for (const offer of offers) {
        const delRes = await axios.delete(
          `${strapiUrl.replace(/\/$/, '')}/api/viaje-ofertas/${offer.id}`,
          { headers }
        );
        if (!delRes) {
          throw new Error('No se pudo eliminar la oferta de viaje');
        }
      }

      io.emit('offer-accepted', payload);
    } catch (e) {
      console.error('Error en offer-accepted:', e);
    }
  });

  socket.on('cancel-search', async (payload) => {
    try {
      if (!payload) {
        console.error('Error en cancel-search: payload inválido o falta travelId');
        return;
      }

      const url = `${strapiUrl.replace(/\/$/, '')}/api/viaje-ofertas?filters[user_email][$eq]=${payload}&populate=*`;
      const res = await axios.get(url, { headers });

      if (!res) return;
      const offers = Array.isArray(res.data.data) && res.data.data || null;
      if (!offers) throw new Error('Error en obtener las ofertas de viaje');

      for (const offer of offers) {
        const delRes = await axios.delete(
          `${strapiUrl.replace(/\/$/, '')}/api/viaje-ofertas/${offer.id}`,
          { headers }
        );
        if (!delRes) {
          throw new Error('No se pudo eliminar la oferta de viaje');
        }
      }

      io.emit('cancel-search', payload);
    } catch (e) {
      console.error('Error en cancel-search:', e);
    }
  });

  socket.on('offer-rejected', async (payload) => {
    try {
      if (!payload) {
        console.error('Error en offer-rejected: payload inválido o falta travelId');
        return;
      }

      const response = await axios.delete(
        `${strapiUrl.replace(/\/$/, '')}/api/viaje-ofertas/${payload.travelId}`,
        { headers }
      );
      if (!response) {
        throw new Error('No se pudo eliminar la oferta de viaje');
      }

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