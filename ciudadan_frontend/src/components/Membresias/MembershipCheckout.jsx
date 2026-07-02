// src/pages/MembershipCheckout.jsx
import React, { useEffect, useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useNavigate } from "react-router-dom";
import Ingresa from '../Usuarios/Ingresa';

import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Grid,
  TextField,
  Button,
  Chip,
  Divider,
  Avatar,
  Alert,
  CircularProgress,
  Stack,
} from "@mui/material";

import { useRoles } from '../../Contexts/RolesContext';

import { FaCcVisa, FaCcMastercard, FaCcAmex, FaCreditCard } from "react-icons/fa";

/**
 * MembershipCheckout (UI con resolución correcta de plan_id desde openpayid)
 *
 * Props relevantes:
 * - plan (obj) opcional: { id, order, nombre, precio, openpayid, priceId, subtypes, subtypes_data }
 * - subtype (obj) opcional: { ambiente, numplantas, precio, openpayid, ... }
 * - planId (string) fallback si nada de lo anterior tiene openpayid
 *
 * Comportamiento:
 * - Si subtype.openpayid existe -> usar ese como plan_id
 * - else if plan.openpayid existe -> usar ese
 * - else fallback a props.planId || plan.priceId || plan.id
 *
 * NOTA: No se cambió la lógica de token OpenPay / Strapi; solo se resolvió y se loguea el plan_id correcto.
 */

export default function MembershipCheckout({
  planidx = null,
  planId = null,
  openpayMerchantId = process.env.REACT_APP_OPENPAY_MERCHANT_ID,
  openpayPublicKey = process.env.REACT_APP_OPENPAY_PUBLIC_KEY,
  sandbox = true,
  backendUrl = "http://localhost:3033/api/suscribir",
  strapiUrl = process.env.REACT_APP_STRAPI_URL,
  plan = null,
  subtype = null,
  order = null,
  goBack = null,
}) {

  const { user, isAuthenticated, loginWithRedirect, logout } = useAuth0();
  const navigate = useNavigate();

  const usuarioEmail = user?.email;
  const usuarioName = user?.name || (usuarioEmail ? usuarioEmail.split("@")[0] : "usuario");

  const { isActivaMembresia } = useRoles();

  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const [cardNumber, setCardNumber] = useState("");
  const [holderName, setHolderName] = useState("");
  const [expMonth, setExpMonth] = useState("");
  const [expYear, setExpYear] = useState("");
  const [cvv, setCvv] = useState("");

  // ---------- Carga OpenPay (igual) ----------
  useEffect(() => {
    if (!isAuthenticated) return;
    if (!planidx) return;
    if (isActivaMembresia()) {
      console.log('🔁 Redirigiendo a /mi-membresia');
      navigate('/mi-membresia');
    }
    if (window.OpenPay) {
      setScriptLoaded(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://openpay.s3.amazonaws.com/openpay.v1.min.js";
    script.async = true;
    script.onload = () => {
      if (window.OpenPay) {
        try {
          window.OpenPay.setId(openpayMerchantId);
          window.OpenPay.setApiKey(openpayPublicKey);
          window.OpenPay.setSandboxMode(Boolean(sandbox));
        } catch (e) {
          console.warn("⚠️ Error configurando OpenPay:", e);
        }
        setScriptLoaded(true);
        console.log("✅ OpenPay cargado y listo");
        console.log("y mas que listo !!! *** ", planidx);
        if(!planidx){
          console.log("y mas que listo !!! *** sin num ");
        }
      }
    };
    script.onerror = (err) => console.error("❌ Error cargando OpenPay:", err);
    document.body.appendChild(script);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  // ---------- Helpers ----------
  function formatPrecio(p) {
    if (p === undefined || p === null || p === "") return "(sin precio)";
    if (typeof p === "number") return `$${p.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")} / mensual`;
    if (typeof p === "string") return p;
    if (typeof p === "object" && p.price) return String(p.price);
    return String(p);
  }

  const displayedPrice = () => {
    if (subtype && (subtype.precio !== undefined && subtype.precio !== null)) return formatPrecio(subtype.precio);
    if (plan && (plan.precio !== undefined && plan.precio !== null)) return formatPrecio(plan.precio);
    return "(sin precio)";
  };

  const displayedTitle = () => {
    if (plan && plan.nombre) return plan.nombre;
    if (order) return `Membresía #${order}`;
    return "Membresía";
  };

  // ---------- Strapi helpers (igual, tolerante con userId) ----------
  const getUserFromStrapi = async (email) => {
    if (!email) throw new Error("Email vacío al buscar usuario en Strapi");
    const apiToken = process.env.REACT_APP_STRAPI_TOKEN;
    if (!apiToken) throw new Error("No hay REACT_APP_STRAPI_TOKEN en .env");

    const q = encodeURIComponent(email);
    const endpoint = `${strapiUrl}/api/users?filters[email][$eq]=${q}`;
    console.log("🔍 GET user ->", endpoint);

    const res = await fetch(endpoint, {
      headers: { Authorization: `Bearer ${apiToken}` },
    });

    const text = await res.text().catch(() => "");
    let parsed;
    try { parsed = JSON.parse(text); } catch { parsed = text; }

    console.log("📥 getUserFromStrapi response:", { status: res.status, body: parsed });

    if (!res.ok) {
      throw new Error(`Error GET user Strapi ${res.status}: ${JSON.stringify(parsed)}`);
    }

    const found = parsed?.data;
    if (Array.isArray(found) && found.length > 0) return found[0].id;
    return null;
  };

  const createMembershipInStrapi = async (userId, amount = 500) => {
    const apiToken = process.env.REACT_APP_STRAPI_TOKEN;
    if (!apiToken) throw new Error("No hay REACT_APP_STRAPI_TOKEN en .env");

    const planEnum = "anual"; // no tocamos mapeo
    const hoy = new Date();
    const fin = new Date(); fin.setFullYear(fin.getFullYear() + 1);

    const membershipData = {
      fechaInicio: hoy.toISOString().split("T")[0],
      fechaFin: fin.toISOString().split("T")[0],
      plan: planEnum,
      monto_pagado: amount,
      activa: true,
      miembroDesde: hoy.toISOString(),
      observaciones: "Pago exitoso vía OpenPay",
      status: "pagado",
      usuarioemail: usuarioEmail,
      ...(userId ? { usuario: userId } : {}),
    };

    const endpoint = `${strapiUrl}/api/membresias`;
    console.log("📤 POST create membership ->", endpoint, membershipData);

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiToken}`,
      },
      body: JSON.stringify({ data: membershipData }),
    });

    const text = await res.text().catch(() => "");
    let parsed;
    try { parsed = JSON.parse(text); } catch { parsed = text; }

    console.log("📥 createMembershipInStrapi response:", { status: res.status, body: parsed });

    if (!res.ok) {
      throw new Error(`Strapi create membership ${res.status}: ${JSON.stringify(parsed)}`);
    }

    return parsed;
  };

  // ---------- Resolución correcta de plan_id desde openpayid ----------
  const resolvePlanIdToSend = () => {
    // Prioridad: subtype.openpayid -> plan.openpayid -> plan.priceId -> plan.id -> prop planId
    const sourceCandidates = [
      { val: subtype?.openpayid, from: "subtype.openpayid" },
      { val: subtype?.openpayid, from: "subtype.openpayid" },
      { val: order, from: "order" },
      { val: plan?.priceId, from: "plan.priceId" },
      { val: planId, from: "prop.planId" },
      { val: plan?.id, from: "plan.id" },
    ];
    for (const c of sourceCandidates) {
      if (c.val !== undefined && c.val !== null && String(c.val).trim() !== "") {
        console.log('🌱🌱🌱🌱 ', planidx);
        return { plan_id: String(c.val), from: c.from };
      }
    }
    console.log('🌱🌱🌱🌱 ', planidx);
    return { plan_id: null, from: "none" };
  };

  // ---------- Función de pago (ajustada para usar resolvePlanIdToSend) ----------
  const createTokenAndSubscribe = async (ev) => {
    ev.preventDefault();
    setMessage(null);

    if (!isAuthenticated || !usuarioEmail) {
      setMessage({ type: "error", text: "Debes iniciar sesión con Auth0 antes de pagar." });
      return;
    }

    if (!scriptLoaded) {
      setMessage({ type: "error", text: "OpenPay.js no está listo aún." });
      return;
    }

    setLoading(true);

    const cardData = {
      card_number: cardNumber.replace(/\s+/g, ""),
      holder_name: holderName || usuarioName,
      expiration_month: expMonth,
      expiration_year: expYear,
      cvv2: cvv,
    };

    try {
      window.OpenPay.token.create(
        cardData,
        async function success(response) {
          const token_id = response?.data?.id;
          console.log("✅ OpenPay token creado:", token_id, "response:", response);

          try {
            // 1) buscar usuario en Strapi (si existe)
            let userId = null;
            try {
              userId = await getUserFromStrapi(usuarioEmail);
            } catch (e) {
              console.warn("⚠️ getUserFromStrapi error (continuamos sin userId):", e?.message || e);
              userId = null;
            }
            console.log("userId (puede ser null):", userId);

            // 2) resolver plan_id correctamente (desde openpayid si aplica)
            const resolved = resolvePlanIdToSend();
            const resolvedPlanId = resolved.plan_id;
            console.log("🔎 Plan ID resuelto:", { resolvedPlanId, from: resolved.from, plan, subtype, prop_planId: planId });

            // 3) determinar amount numérico si es posible
            const pickPrecio = (p) => {
              if (p === undefined || p === null) return null;
              if (typeof p === "number") return p;
              if (typeof p === "string") {
                const digits = p.replace(/[^\d]/g, "");
                if (!digits) return null;
                const num = Number(digits);
                if (Number.isFinite(num)) return num;
              }
              return null;
            };
            let amountNumeric = pickPrecio(subtype?.precio) ?? pickPrecio(plan?.precio) ?? null;

            const payPayload = {
              token_id,
              plan_id: planidx, // <-- aquí se envía el openpayid correcto (si existe)
              plan_order: plan?.order ?? order ?? null,
              plan_name: plan?.nombre ?? null,
              amount: amountNumeric,
              subtype: subtype ? { ambiente: subtype.ambiente, numplantas: subtype.numplantas, precio: subtype.precio, openpayid: subtype.openpayid } : null,
              name: holderName || usuarioName,
              email: usuarioEmail,
            };

            console.log("📤 PAYLOAD a backend (antes de fetch):", payPayload);

            // 4) enviar pago al backend
            const res = await fetch(backendUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payPayload),
            });

            const text = await res.text().catch(() => "");
            let body;
            try { body = JSON.parse(text); } catch { body = text; }

            console.log("📥 Respuesta backend pago:", { status: res.status, body });

            if (!res.ok) {
              throw new Error(`Backend pago error ${res.status}: ${JSON.stringify(body)}`);
            }

            const amount = body?.amount ?? body?.monto ?? amountNumeric ?? 500;

            // 5) crear membresía en Strapi (pasando userId si existe)
            const membershipResp = await createMembershipInStrapi(userId, amount);
            console.log("🎉 Membership creado:", membershipResp);

            setMessage({ type: "success", text: "🎉 Pago y membresía registrados correctamente." });
          } catch (err) {
            console.error("❌ Error al registrar usuario/membresía:", err);
            setMessage({
              type: "error",
              text:
                `❌ Error al registrar usuario/membresía:\n${err.message}\n\n` +
                `Depuración:\nemail: ${usuarioEmail}\nusername: ${usuarioName}\nplan_id enviado: ${JSON.stringify(resolvePlanIdToSend())}\nplan.order: ${plan?.order}\nsubtype: ${JSON.stringify(subtype)}\n`,
            });
          } finally {
            setLoading(false);
          }
        },
        function failure(error) {
          console.error("❌ OpenPay token error:", error);
          const msg = error?.data?.description || error?.message || JSON.stringify(error);
          setMessage({ type: "error", text: `Error creando token OpenPay: ${msg}` });
          setLoading(false);
        }
      );
    } catch (err) {
      console.error("💥 Excepción inesperada:", err);
      setMessage({ type: "error", text: `💥 Error inesperado: ${err.message}` });
      setLoading(false);
    }
  };

    const handleLogin = () => {
    // Guarda la URL actual antes de hacer login
    const currentUrl = window.location.pathname + window.location.search;
    document.cookie = `returnTo=${encodeURIComponent(currentUrl)}; path=/; max-age=3600`;
    console.log("URL guardada en cookie antes de login:", currentUrl);
    // Redirige a Auth0
    loginWithRedirect();
    //setIsMenuOpen(false);
  };

  const NoPlan = () => (
    <Card sx={{ maxWidth: 760, mx: "auto", mt: 4 }}>
      <CardContent sx={{ textAlign: "center" }}>
        <Typography variant="h6">El Plan seleccionado NO existe en el catálogo.</Typography>
        
      </CardContent>
    </Card>
  );

  if (!isAuthenticated || !user) return <Ingresa />;
  if (!planidx ) return <NoPlan />;
  //if (isActivaMembresia ) return <NoPlan />;

  return (
    <Box sx={{ maxWidth: 920, mx: "auto", py: 3 }}>
      <Grid container spacing={3}>
        <Grid item xs={12} md={5}>
          <Card elevation={3}>
            <CardHeader
              avatar={<Avatar sx={{ bgcolor: "#fff200", color: "#000" }}>C</Avatar>}
              title={<Typography variant="h6" component="div">{displayedTitle()}</Typography>}
              subheader={<Typography variant="body2" color="text.secondary">Orden #{order ?? (plan?.order ?? plan?.id ?? "—")}</Typography>}
            />
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>{displayedPrice()}</Typography>
                  <Typography variant="body2" color="text.secondary">Precio mostrado según la membresía seleccionada</Typography>
                </Box>

                <Box>
                  <Stack direction="row" spacing={1}>
                    {subtype?.ambiente && <Chip label={String(subtype.ambiente).toUpperCase()} />}
                    {subtype?.numplantas && <Chip label={`${subtype.numplantas} plantas`} color="secondary" />}
                  </Stack>
                </Box>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle1" gutterBottom>Detalles</Typography>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  <strong>Ambiente:</strong> {subtype?.ambiente ?? "—"}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>Número de plantas:</strong> {subtype?.numplantas ?? "—"}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>openpayid (subtype):</strong> {subtype?.openpayid ?? "—"}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>openpayid (plan):</strong> {plan?.openpayid ?? "—"}
                </Typography>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" gutterBottom>Formas de pago</Typography>
              <Box sx={{ display: "flex", gap: 2, alignItems: "center", mt: 1 }}>
                <FaCcVisa size={36} />
                <FaCcMastercard size={36} />
                <FaCcAmex size={36} />
              </Box>

              <Box sx={{ mt: 3, color: "text.secondary" }}>
                <Typography variant="caption">
                  Pago seguro con OpenPay. No almacenamos datos sensibles en nuestros servidores.
                </Typography>
              </Box>
            </CardContent>
          </Card>

          <Box sx={{ mt: 2, display: "flex", gap: 1 }}>
            <Button variant="outlined" onClick={() => (goBack ? goBack() : navigate(-1))}>← Volver</Button>
          </Box>
        </Grid>

        <Grid item xs={12} md={7}>
          <Card elevation={3}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>Datos de la tarjeta</Typography>

              <form onSubmit={createTokenAndSubscribe}>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      label="Número de tarjeta"
                      placeholder="4111 1111 1111 1111"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      fullWidth
                      required
                      InputProps={{
                        startAdornment: (<Box sx={{ display: "flex", alignItems: "center", pr: 1 }}><FaCreditCard /></Box>)
                      }}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Nombre (como aparece en la tarjeta)"
                      placeholder={usuarioName || "NOMBRE APELLIDO"}
                      value={holderName}
                      onChange={(e) => setHolderName(e.target.value)}
                      fullWidth
                      required
                    />
                  </Grid>

                  <Grid item xs={6} sm={3}>
                    <TextField
                      label="MM"
                      placeholder="MM"
                      value={expMonth}
                      onChange={(e) => setExpMonth(e.target.value)}
                      fullWidth
                      required
                      inputProps={{ maxLength: 2 }}
                    />
                  </Grid>

                  <Grid item xs={6} sm={3}>
                    <TextField
                      label="YYYY"
                      placeholder="YYYY"
                      value={expYear}
                      onChange={(e) => setExpYear(e.target.value)}
                      fullWidth
                      required
                      inputProps={{ maxLength: 4 }}
                    />
                  </Grid>

                  <Grid item xs={12} sm={4}>
                    <TextField
                      label="CVV"
                      placeholder="123"
                      value={cvv}
                      onChange={(e) => setCvv(e.target.value)}
                      fullWidth
                      required
                      inputProps={{ maxLength: 4 }}
                    />
                  </Grid>

                  <Grid item xs={12} sm={8} />

                  <Grid item xs={12}>
                    <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
                      <Button
                        variant="contained"
                        color="primary"
                        type="submit"
                        disabled={loading}
                        sx={{ textTransform: "none", fontWeight: 700 }}
                      >
                        {loading ? <><CircularProgress size={18} sx={{ mr: 1 }} />Procesando...</> : `Pagar ${displayedPrice()}`}
                      </Button>

                      <Button variant="outlined" onClick={() => {
                        setCardNumber(""); setHolderName(""); setExpMonth(""); setExpYear(""); setCvv("");
                        setMessage(null);
                      }}>
                        Limpiar
                      </Button>
                    </Box>
                  </Grid>

                  <Grid item xs={12}>
                    {message && (
                      <Alert severity={message.type === "error" ? "error" : "success"} sx={{ whiteSpace: "pre-wrap" }}>
                        {message.text}
                      </Alert>
                    )}
                  </Grid>

                </Grid>
              </form>
            </CardContent>
          </Card>

          <Box sx={{ mt: 2 }}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="caption" color="text.secondary">
                  Al completar el pago aceptas los términos y condiciones de Ciudadan.org, Si tienes problemas con tu pago, contáctanos a soporte.
                </Typography>
              </CardContent>
            </Card>
          </Box>

        </Grid>
      </Grid>
    </Box>
  );
}
