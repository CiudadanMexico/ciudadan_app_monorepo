// src/index.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';

import conductorRoutes from './routes/conductores.js';

// =====================
// ENV desde carpeta superior
// =====================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({
  path: path.resolve(__dirname, '../../.env'),
});

// =====================
// APP
// =====================
const app = express();

app.use(
  cors({
    origin: ['http://localhost:3000', 'http://localhost:5173'],
    credentials: true,
  })
);

// JSON normal para las rutas que sí lo usan
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log('➡️', req.method, req.originalUrl);
  next();
});

// =====================
// MEDIA PROXY: GET /uploads/*
// =====================
app.use('/uploads', async (req, res) => {
  try {
    const targetUrl = `${process.env.STRAPI_URL}${req.originalUrl}`;

    const response = await axios({
      url: targetUrl,
      method: 'GET',
      responseType: 'stream',
    });

    Object.entries(response.headers).forEach(([key, value]) => {
      const k = key.toLowerCase();
      if (
        k === 'transfer-encoding' ||
        k === 'content-length' ||
        k === 'connection'
      ) {
        return;
      }
      res.setHeader(key, value);
    });

    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');

    response.data.pipe(res);
  } catch (err) {
    console.error('❌ media proxy error:', err.message);
    res.status(500).send('Error loading media');
  }
});

// =====================
// UPLOAD PROXY: POST /api/upload
// =====================
app.post('/api/upload', async (req, res) => {
  try {
    const targetUrl = `${process.env.STRAPI_URL}/api/upload`;

    const headers = {
      ...req.headers,
      Authorization: `Bearer ${process.env.STRAPI_API_TOKEN}`,
    };

    // limpiar headers que suelen romper el proxy
    delete headers.host;
    delete headers['content-length'];
    delete headers.connection;

    const response = await axios({
      method: 'POST',
      url: targetUrl,
      headers,
      data: req, // stream directo
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
      validateStatus: () => true,
    });

    res.status(response.status).json(response.data);
  } catch (err) {
    console.error('❌ upload proxy error:', err.response?.data || err.message);
    res
      .status(err.response?.status || 500)
      .json(err.response?.data || { error: 'Upload error' });
  }
});

// =====================
// RUTAS PRIVADAS CONDUCTOR
// =====================
app.use('/api/conductores', conductorRoutes);

// =====================
// PROXY GENÉRICO A STRAPI
// =====================
app.use('/api', async (req, res) => {
  if (req.originalUrl.startsWith('/api/conductores')) {
    return res.status(404).json({ error: 'Not found' });
  }

  // evitamos que /api/upload caiga aquí por accidente
  if (req.originalUrl === '/api/upload') {
    return res.status(404).json({ error: 'Not found' });
  }

  const targetUrl = `${process.env.STRAPI_URL}${req.originalUrl}`;

  try {
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.STRAPI_API_TOKEN}`,
      },
      body: ['GET', 'HEAD'].includes(req.method)
        ? undefined
        : JSON.stringify(req.body),
    });

    const data = await response.text();

    res.status(response.status).send(data);
  } catch (err) {
    console.error('❌ Proxy error:', err);
    res.status(500).json({ error: 'Proxy error' });
  }
});

// =====================
// HEALTHCHECK
// =====================
app.get('/_health', (req, res) => {
  res.json({ ok: true });
});

// =====================
// START
// =====================
const PORT = 33010;

app.listen(PORT, () => {
  console.log(`🚀 Middleware corriendo en http://localhost:${PORT}`);
});