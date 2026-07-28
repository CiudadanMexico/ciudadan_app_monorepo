// chatbot.js
require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const {
  createBot,
  createProvider,
  createFlow,
  addKeyword
} = require('@bot-whatsapp/bot');

const MetaProvider = require('@bot-whatsapp/provider/meta');
const MockAdapter = require('@bot-whatsapp/database/mock');
const axios = require('axios');

/**
 * enviar mensaje por WhatsApp Cloud API
 */
async function sendWhatsAppReply(numberId, accessToken, toPhone, text) {
  const url = `https://graph.facebook.com/v17.0/${numberId}/messages`;

  const payload = {
    messaging_product: 'whatsapp',
    to: toPhone,
    type: 'text',
    text: {
      body: text
    }
  };

  try {
    const r = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    console.log('[chatbot] Respuesta enviada:', r.data);
    return r.data;
  } catch (err) {
    console.error(
      '[chatbot] Error enviando respuesta:',
      err.response?.data || err.message
    );

    throw err;
  }
}

/**
 * attachChatbot(app, opts)
 */
async function attachChatbot(app, opts = {}) {
  if (!app) {
    throw new Error(
      'attachChatbot necesita la instancia express "app".'
    );
  }

  const WEBHOOK_PATH =
    opts.webhookPath ||
    process.env.CHATBOT_WEBHOOK_PATH ||
    '/webhook';

  const APP_PORT = Number(
    opts.appPort ||
    process.env.PORT ||
    33032
  );

  const META_VERIFY_TOKEN =
    process.env.META_VERIFY_TOKEN ||
    process.env.KEY ||
    null;

  const ACCESS_TOKEN =
    process.env.VERIFY_TOKEN ||
    process.env.ACCESS_TOKEN ||
    null;

  const NUMBER_ID =
    process.env.NUMBER_ID ||
    null;

  const PUBLIC_WEBHOOK_URL =
    process.env.PUBLIC_WEBHOOK_URL ||
    null;

  if (!META_VERIFY_TOKEN) {
    console.warn(
      '⚠️ META_VERIFY_TOKEN no definido'
    );
  }

  if (!ACCESS_TOKEN) {
    console.warn(
      '⚠️ ACCESS_TOKEN no definido'
    );
  }

  if (!NUMBER_ID) {
    console.warn(
      '⚠️ NUMBER_ID no definido'
    );
  }

  const router = express.Router();

  router.use(
    bodyParser.json({
      limit: '1mb'
    })
  );

  /**
   * GET webhook verificación Meta
   */
  router.get('/', (req, res) => {
    try {
      const mode = req.query['hub.mode'];
      const token = req.query['hub.verify_token'];
      const challenge = req.query['hub.challenge'];

      console.log(
        '[chatbot] GET webhook',
        { mode, token }
      );

      if (
        mode === 'subscribe' &&
        token === META_VERIFY_TOKEN
      ) {
        console.log(
          '✅ Webhook verificado'
        );

        return res
          .status(200)
          .send(challenge);
      }

      console.log(
        '❌ Verificación fallida'
      );

      return res.sendStatus(403);

    } catch (err) {
      console.error(
        'Error GET webhook:',
        err
      );

      return res.sendStatus(500);
    }
  });

  /**
   * POST webhook eventos
   */
  router.post('/', async (req, res) => {
    try {
      console.log(
        '--- EVENTO WEBHOOK ---'
      );

      console.log(
        JSON.stringify(req.body, null, 2)
      );

      // responder rápido a Meta
      res.status(200).send('ok');

      const body = req.body || {};

      if (
        body.object !== 'whatsapp_business_account' ||
        !Array.isArray(body.entry)
      ) {
        console.log(
          '[chatbot] Payload ignorado'
        );

        return;
      }

      for (const entry of body.entry) {
        if (!entry.changes) continue;

        for (const change of entry.changes) {
          const value = change.value || {};

          const messages =
            value.messages || [];

          const contacts =
            value.contacts || [];

          if (!messages.length) {
            console.log(
              '[chatbot] Cambio sin messages'
            );

            continue;
          }

          for (const msg of messages) {
            const from =
              msg.from ||
              contacts?.[0]?.wa_id ||
              null;

            const text =
              msg?.text?.body ||
              null;

            console.log(
              `[chatbot] Mensaje from=${from} text=${text}`
            );

            if (
              !NUMBER_ID ||
              !ACCESS_TOKEN ||
              !from
            ) {
              console.warn(
                '[chatbot] faltan credenciales'
              );

              continue;
            }

            try {
              const replyText =
                `Hola 👋 recibimos: "${text || ''}"`;

              await sendWhatsAppReply(
                NUMBER_ID,
                ACCESS_TOKEN,
                from,
                replyText
              );

            } catch (err) {
              console.error(
                '[chatbot] Error reply:',
                err.message
              );
            }
          }
        }
      }

    } catch (err) {
      console.error(
        'Error POST webhook:',
        err
      );

      try {
        res.sendStatus(500);
      } catch (_) {}
    }
  });

  /**
   * montar router
   */
  app.use(
    WEBHOOK_PATH,
    router
  );

  /**
   * flows
   */
  const flowSecundario = addKeyword([
    '2',
    'siguiente'
  ]).addAnswer([
    '📄 Aquí tenemos el flujo secundario'
  ]);

  const flowDocs = addKeyword([
    'doc',
    'documentacion',
    'documentación'
  ]).addAnswer(
    [
      '📄 Documentación:',
      'https://bot-whatsapp.netlify.app/'
    ],
    null,
    null,
    [flowSecundario]
  );

  const flowPrincipal = addKeyword([
    'hola',
    'ole',
    'alo'
  ])
    .addAnswer(
      '🙌 Hola bienvenido'
    )
    .addAnswer(
      [
        '👉 escribe *doc*'
      ],
      null,
      null,
      [flowDocs]
    );

  /**
   * init bot
   */
  try {
    const adapterDB =
      new MockAdapter();

    const adapterFlow =
      createFlow([
        flowPrincipal
      ]);

    let providerWebhook;

    if (
      PUBLIC_WEBHOOK_URL &&
      PUBLIC_WEBHOOK_URL.startsWith('http')
    ) {
      providerWebhook =
        PUBLIC_WEBHOOK_URL;
    } else {
      providerWebhook =
        `http://localhost:${APP_PORT}${WEBHOOK_PATH}`;
    }

    const adapterProvider =
      createProvider(
        MetaProvider,
        {
          jwtToken: ACCESS_TOKEN,
          numberId: NUMBER_ID,
          verifyToken:
            META_VERIFY_TOKEN,
          version: 'v22.0',
          webhook:
            providerWebhook
        }
      );

    await createBot({
      flow: adapterFlow,
      provider: adapterProvider,
      database: adapterDB
    });

    console.log(
      '🤖 Chatbot inicializado'
    );

  } catch (err) {
    console.error(
      '❌ Error inicializando chatbot:',
      err
    );
  }

  return {
    webhookPath: WEBHOOK_PATH,
    publicWebhook:
      PUBLIC_WEBHOOK_URL ||
      `http://localhost:${APP_PORT}${WEBHOOK_PATH}`
  };
}

module.exports = {
  attachChatbot
};