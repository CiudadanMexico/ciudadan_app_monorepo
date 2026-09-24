console.log("📦 cargando ruta mercadopago (/routes/mercadopago.js)");
const express = require("express");
const crypto = require("crypto");
const router = express.Router();

const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;
const MP_WEBHOOK_SECRET = process.env.MP_WEBHOOK_SECRET;
const MP_NOTIFICATION_URL = process.env.MP_NOTIFICATION_URL || process.env.PUBLIC_WEBHOOK_URL;
const MP_BACK_URL_BASE = (process.env.MP_BACK_URL_BASE || "http://localhost:3002").replace(/\/$/, "");
const MP_CURRENCY = process.env.MP_CURRENCY || "MXN";

const STRAPI_URL = (process.env.STRAPI_URL || "http://localhost:33032").replace(/\/$/, "");
const STRAPI_TOKEN = process.env.STRAPI_TOKEN || process.env.STRAPI_API_TOKEN;

const MP_API = "https://api.mercadopago.com";

const esUrlPublica = (url) =>
  /^https:\/\//i.test(String(url)) &&
  !/localhost|127\.0\.0\.1|0\.0\.0\.0|192\.168\.|10\.\d+\.|172\.(1[6-9]|2\d|3[01])\./i.test(String(url));

const mpHeaders = (extra = {}) => ({
  Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
  "Content-Type": "application/json",
  ...extra,
});

const strapiHeaders = () => ({
  "Content-Type": "application/json",
  ...(STRAPI_TOKEN ? { Authorization: `Bearer ${STRAPI_TOKEN}` } : {}),
});

const leerRespuesta = async (res) => {
  const text = await res.text().catch(() => "");
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

const leerAtributo = (attrs, parsedJson, claves) => {
  for (const k of claves) {
    if (attrs?.[k] !== undefined && attrs[k] !== null && attrs[k] !== "") return attrs[k];
    if (parsedJson?.[k] !== undefined && parsedJson[k] !== null && parsedJson[k] !== "") return parsedJson[k];
  }
  return undefined;
};

const aNumero = (valor) => {
  if (valor === undefined || valor === null) return null;
  if (typeof valor === "number") return Number.isFinite(valor) ? valor : null;
  if (typeof valor === "string") {
    const limpio = valor.replace(/[^\d.]/g, "");
    if (!limpio) return null;
    const num = Number(limpio);
    return Number.isFinite(num) ? num : null;
  }
  return null;
};

const obtenerPlanDeStrapi = async (order) => {
  const url = `${STRAPI_URL}/api/membresias-tipos?filters[order][$eq]=${encodeURIComponent(
    order
  )}&pagination[pageSize]=1&populate=*`;

  const res = await fetch(url, { headers: strapiHeaders() });
  const body = await leerRespuesta(res);

  if (!res.ok) {
    throw new Error(`Strapi ${res.status} al buscar el plan: ${JSON.stringify(body)}`);
  }

  const item = body?.data?.[0];
  if (!item) return null;

  const attrs = item.attributes || item;

  let parsedJson = null;
  if (attrs.json) {
    try {
      parsedJson = typeof attrs.json === "string" ? JSON.parse(attrs.json) : attrs.json;
    } catch {
      parsedJson = null;
    }
  }

  return { id: item.id, attrs, json: parsedJson };
};

const resolverCobro = (plan, subtypeKey) => {
  const { attrs, json } = plan;

  let subtype = null;
  const subtypes = Array.isArray(json?.subtypes) ? json.subtypes : [];

  if (subtypeKey && subtypes.length) {
    subtype =
      subtypes.find(
        (s) =>
          String(s.openpayid) === String(subtypeKey) ||
          String(s.key) === String(subtypeKey) ||
          String(s.id) === String(subtypeKey)
      ) || null;
  }

  const nombre =
    leerAtributo(attrs, json, ["nombre", "title", "name"]) || `Membresía #${attrs.order}`;

  const precio = aNumero(subtype?.precio ?? leerAtributo(attrs, json, ["precio", "price", "amount"]));

  const cobroCrudo = String(
    subtype?.cobro ?? leerAtributo(attrs, json, ["cobro", "modalidad"]) ?? "unico"
  ).toLowerCase();
  const cobro = cobroCrudo === "recurrente" || cobroCrudo === "suscripcion" ? "recurrente" : "unico";

  const frecuencia = Number(subtype?.frecuencia ?? leerAtributo(attrs, json, ["frecuencia"]) ?? 1);
  const tipoFrecuenciaCrudo = String(
    subtype?.tipo_frecuencia ?? leerAtributo(attrs, json, ["tipo_frecuencia"]) ?? "months"
  ).toLowerCase();
  const tipoFrecuencia = tipoFrecuenciaCrudo === "days" ? "days" : "months";

  const duracionMeses = Number(
    subtype?.duracion_meses ?? leerAtributo(attrs, json, ["duracion_meses"]) ?? 12
  );

  return { nombre, precio, cobro, frecuencia, tipoFrecuencia, duracionMeses, subtype };
};

const planEnumDesde = (cobro, frecuencia, tipoFrecuencia, duracionMeses) => {
  const meses = cobro === "recurrente" ? (tipoFrecuencia === "months" ? frecuencia : 1) : duracionMeses;
  if (meses >= 12) return "anual";
  if (meses >= 6) return "semestral";
  return "mensual";
};

const buscarUsuarioPorEmail = async (email) => {
  if (!email) return null;
  const url = `${STRAPI_URL}/api/users?filters[email][$eq]=${encodeURIComponent(email)}`;
  const res = await fetch(url, { headers: strapiHeaders() });
  const body = await leerRespuesta(res);
  if (!res.ok) {
    console.warn("⚠️ No se pudo buscar el usuario en Strapi:", res.status, body);
    return null;
  }
  const encontrados = Array.isArray(body) ? body : body?.data;
  if (Array.isArray(encontrados) && encontrados.length) return encontrados[0].id;
  return null;
};

const buscarMembresiaPorReferencia = async (externalReference) => {
  const url = `${STRAPI_URL}/api/membresias?filters[observaciones][$eq]=${encodeURIComponent(
    externalReference
  )}&pagination[pageSize]=1`;
  const res = await fetch(url, { headers: strapiHeaders() });
  const body = await leerRespuesta(res);
  if (!res.ok) return null;
  return body?.data?.[0] ?? null;
};

const registrarMembresiaPendiente = async ({ externalReference, email, precio, metadata }) => {
  const userId = await buscarUsuarioPorEmail(email);

  const hoy = new Date();
  const fin = new Date();
  fin.setMonth(fin.getMonth() + Number(metadata.duracion_meses || 12));

  const data = {
    fechaInicio: hoy.toISOString().split("T")[0],
    fechaFin: fin.toISOString().split("T")[0],
    plan: metadata.plan_enum,
    monto_pagado: precio,
    activa: false,
    miembroDesde: hoy.toISOString(),
    observaciones: externalReference,
    status: "pendiente",
    usuarioemail: email,
    ...(userId ? { usuario: userId } : {}),
  };

  const res = await fetch(`${STRAPI_URL}/api/membresias`, {
    method: "POST",
    headers: strapiHeaders(),
    body: JSON.stringify({ data }),
  });
  const body = await leerRespuesta(res);
  if (!res.ok) throw new Error(`Strapi ${res.status}: ${JSON.stringify(body)}`);
  console.log("🧾 Membresía pendiente registrada:", externalReference);
  return body;
};

const actualizarMembresia = async (externalReference, { monto, status }) => {
  const existente = await buscarMembresiaPorReferencia(externalReference);

  if (!existente) {
    console.warn("⚠️ No hay membresía con la referencia", externalReference, "- nada que actualizar");
    return null;
  }

  const attrs = existente.attributes || existente;

  if (attrs.activa === true && attrs.status === "pagado" && status === "pagado") {
    console.log("↩️ Membresía ya activa, se ignora el webhook duplicado:", externalReference);
    return existente;
  }

  const data = {
    activa: status === "pagado",
    status,
    ...(monto ? { monto_pagado: monto } : {}),
  };

  const res = await fetch(`${STRAPI_URL}/api/membresias/${existente.id}`, {
    method: "PUT",
    headers: strapiHeaders(),
    body: JSON.stringify({ data }),
  });
  const body = await leerRespuesta(res);
  if (!res.ok) throw new Error(`Strapi ${res.status} al actualizar: ${JSON.stringify(body)}`);

  console.log(`✅ Membresía ${externalReference} -> ${status}`);
  return body;
};

router.post("/mp/checkout", async (req, res) => {
  console.log("➡️ /api/mp/checkout recibida, body:", req.body);

  try {
    const { order, subtypeKey = null, email } = req.body || {};

    if (!MP_ACCESS_TOKEN) {
      console.error("❌ Falta MP_ACCESS_TOKEN en el .env del socket-service");
      return res.status(500).json({ error: "Configuración de Mercado Pago incompleta en el servidor" });
    }
    if (order === undefined || order === null || String(order).trim() === "") {
      return res.status(400).json({ error: "Falta 'order' (identificador del plan)" });
    }
    if (!email) {
      return res.status(400).json({ error: "Falta 'email' del comprador" });
    }

    const plan = await obtenerPlanDeStrapi(order);
    if (!plan) {
      return res.status(404).json({ error: `No existe un plan con order=${order}` });
    }

    const { nombre, precio, cobro, frecuencia, tipoFrecuencia, duracionMeses, subtype } =
      resolverCobro(plan, subtypeKey);

    if (!precio || precio <= 0) {
      console.error("❌ El plan no tiene precio utilizable:", { order, json: plan.json });
      return res.status(422).json({
        error: "El plan seleccionado no tiene un precio válido configurado en Strapi",
      });
    }

    const externalReference = `ciudadan-${order}-${Date.now()}-${crypto
      .randomBytes(4)
      .toString("hex")}`;

    const backUrls = {
      success: `${MP_BACK_URL_BASE}/membresias/retorno?estado=success&ref=${externalReference}`,
      failure: `${MP_BACK_URL_BASE}/membresias/retorno?estado=failure&ref=${externalReference}`,
      pending: `${MP_BACK_URL_BASE}/membresias/retorno?estado=pending&ref=${externalReference}`,
    };

    const metadata = {
      order: String(order),
      subtype_key: subtypeKey ? String(subtypeKey) : null,
      email,
      plan_enum: planEnumDesde(cobro, frecuencia, tipoFrecuencia, duracionMeses),
      duracion_meses: cobro === "recurrente" ? frecuencia : duracionMeses,
      nombre_plan: nombre,
      ambiente: subtype?.ambiente ?? null,
      numplantas: subtype?.numplantas ?? null,
    };

    let mpRes;
    let mpBody;

    if (cobro === "recurrente") {
      const payload = {
        reason: nombre,
        external_reference: externalReference,
        payer_email: email,
        back_url: backUrls.success,
        status: "pending",
        auto_recurring: {
          frequency: frecuencia,
          frequency_type: tipoFrecuencia,
          transaction_amount: precio,
          currency_id: MP_CURRENCY,
        },
      };

      if (MP_NOTIFICATION_URL) {
        payload.notification_url = `${MP_NOTIFICATION_URL.replace(/\/$/, "")}/api/mp/webhook`;
      }

      console.log("📤 MP preapproval ->", payload);

      mpRes = await fetch(`${MP_API}/preapproval`, {
        method: "POST",
        headers: mpHeaders(),
        body: JSON.stringify(payload),
      });
      mpBody = await leerRespuesta(mpRes);
    } else {
      const payload = {
        items: [
          {
            title: nombre,
            description: subtype?.ambiente
              ? `${nombre} · ${subtype.ambiente}${subtype.numplantas ? ` · ${subtype.numplantas} plantas` : ""}`
              : nombre,
            quantity: 1,
            unit_price: precio,
            currency_id: MP_CURRENCY,
          },
        ],
        payer: { email },
        external_reference: externalReference,
        back_urls: backUrls,
        statement_descriptor: "CIUDADAN",
        metadata,
      };

      if (esUrlPublica(MP_BACK_URL_BASE)) {
        payload.auto_return = "approved";
      } else {
        console.warn(
          "⚠️ MP_BACK_URL_BASE no es una URL publica https: se omite auto_return y el usuario tendra que volver manualmente"
        );
      }

      if (MP_NOTIFICATION_URL) {
        payload.notification_url = `${MP_NOTIFICATION_URL.replace(/\/$/, "")}/api/mp/webhook`;
      }

      console.log("📤 MP preference ->", payload);

      mpRes = await fetch(`${MP_API}/checkout/preferences`, {
        method: "POST",
        headers: mpHeaders({ "X-Idempotency-Key": externalReference }),
        body: JSON.stringify(payload),
      });
      mpBody = await leerRespuesta(mpRes);
    }

    console.log("📥 Respuesta MP:", { status: mpRes.status, body: mpBody });

    if (!mpRes.ok) {
      return res.status(mpRes.status).json({
        error: mpBody?.message || "Error creando el checkout en Mercado Pago",
        detalle: mpBody,
      });
    }

    const initPoint = mpBody?.init_point || mpBody?.sandbox_init_point;
    if (!initPoint) {
      return res.status(502).json({ error: "Mercado Pago no devolvió una URL de pago", detalle: mpBody });
    }

    await registrarMembresiaPendiente({ externalReference, email, precio, metadata }).catch((err) =>
      console.warn("⚠️ No se pudo registrar la membresía pendiente:", err?.message || err)
    );

    return res.json({
      success: true,
      modo: cobro,
      init_point: initPoint,
      external_reference: externalReference,
      mp_id: mpBody?.id ?? null,
      precio,
      nombre,
    });
  } catch (err) {
    console.error("💥 Error en /api/mp/checkout:", err);
    return res.status(500).json({ error: "Error interno del servidor", details: err.message });
  }
});

const firmaValida = (req, dataId) => {
  if (!MP_WEBHOOK_SECRET) {
    console.warn("⚠️ MP_WEBHOOK_SECRET no configurado: el webhook NO se está validando");
    return true;
  }

  const signature = req.headers["x-signature"];
  const requestId = req.headers["x-request-id"];
  if (!signature) return false;

  const partes = String(signature)
    .split(",")
    .reduce((acc, parte) => {
      const [k, v] = parte.split("=").map((s) => s && s.trim());
      if (k && v) acc[k] = v;
      return acc;
    }, {});

  const ts = partes.ts;
  const v1 = partes.v1;
  if (!ts || !v1) return false;

  let manifest = `id:${dataId};`;
  if (requestId) manifest += `request-id:${requestId};`;
  manifest += `ts:${ts};`;

  const esperado = crypto.createHmac("sha256", MP_WEBHOOK_SECRET).update(manifest).digest("hex");

  const a = Buffer.from(esperado, "utf8");
  const b = Buffer.from(v1, "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
};

router.post("/mp/webhook", async (req, res) => {
  const tipo = req.body?.type || req.body?.topic || req.query?.type || req.query?.topic;
  const dataId = req.body?.data?.id || req.query?.["data.id"] || req.query?.id;

  console.log("🔔 Webhook MP:", { tipo, dataId });

  res.status(200).json({ received: true });

  try {
    if (!dataId) return;

    if (!firmaValida(req, dataId)) {
      console.error("🚫 Firma de webhook inválida, se descarta:", dataId);
      return;
    }

    if (tipo === "payment") {
      const r = await fetch(`${MP_API}/v1/payments/${dataId}`, { headers: mpHeaders() });
      const pago = await leerRespuesta(r);
      if (!r.ok) {
        console.error("❌ No se pudo consultar el pago en MP:", r.status, pago);
        return;
      }

      const ref = pago?.external_reference;
      if (!ref) {
        console.warn("⚠️ Pago sin external_reference, no se puede conciliar:", dataId);
        return;
      }

      const mapa = {
        approved: "pagado",
        authorized: "pagado",
        pending: "pendiente",
        in_process: "pendiente",
        in_mediation: "pendiente",
        rejected: "rechazado",
        cancelled: "cancelado",
        refunded: "reembolsado",
        charged_back: "contracargo",
      };
      const status = mapa[pago.status] || "pendiente";

      await actualizarMembresia(ref, { monto: pago.transaction_amount, status });
      return;
    }

    if (tipo === "subscription_preapproval" || tipo === "preapproval") {
      const r = await fetch(`${MP_API}/preapproval/${dataId}`, { headers: mpHeaders() });
      const sub = await leerRespuesta(r);
      if (!r.ok) {
        console.error("❌ No se pudo consultar la suscripción en MP:", r.status, sub);
        return;
      }

      const ref = sub?.external_reference;
      if (!ref) {
        console.warn("⚠️ Suscripción sin external_reference:", dataId);
        return;
      }

      const mapa = {
        authorized: "pagado",
        pending: "pendiente",
        paused: "pausado",
        cancelled: "cancelado",
      };
      const status = mapa[sub.status] || "pendiente";

      await actualizarMembresia(ref, {
        monto: sub?.auto_recurring?.transaction_amount,
        status,
      });
      return;
    }

    console.log("ℹ️ Tipo de webhook no manejado, se ignora:", tipo);
  } catch (err) {
    console.error("💥 Error procesando webhook MP:", err);
  }
});

router.get("/mp/estado/:ref", async (req, res) => {
  try {
    const membresia = await buscarMembresiaPorReferencia(req.params.ref);
    if (!membresia) {
      return res.status(404).json({ error: "No se encontró la referencia", ref: req.params.ref });
    }
    const attrs = membresia.attributes || membresia;
    return res.json({
      ref: req.params.ref,
      activa: Boolean(attrs.activa),
      status: attrs.status,
      plan: attrs.plan,
      monto_pagado: attrs.monto_pagado,
      fechaFin: attrs.fechaFin,
    });
  } catch (err) {
    console.error("💥 Error en /api/mp/estado:", err);
    return res.status(500).json({ error: "Error interno del servidor", details: err.message });
  }
});

module.exports = router;
