// src/Pages/MembresiasDetalles.jsx — Detalles completos de membresías y servidores
import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import MemoryIcon from "@mui/icons-material/Memory";
import BoltIcon from "@mui/icons-material/Bolt";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import PersonIcon from "@mui/icons-material/Person";
import DriveEtaIcon from "@mui/icons-material/DriveEta";
import StorefrontIcon from "@mui/icons-material/Storefront";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

import MercadoPagoBoton from "../components/Membresias/MercadoPagoBoton";
import { sendToWhatsApp } from "../utils/sendToWhatsApp";
import {
  HERO_DETALLES,
  PLANES_ORDER,
  PLANES_COPY,
  MODALIDADES_SERVIDOR,
  COMPARACION_SERVIDOR,
  EQUIVALENCIA_RENTA,
  PAGOS,
  FAQ,
  PUBLIA,
} from "../config/membresiasContenido";
import { SERVIDOR, mensualidadServidor } from "../config/servidores";
import { RENTA_COMPARTIDO_LAB, LAB_REFERENCIA } from "../config/labory";
import "../styles/membresias.css";
import "../styles/membresias-servidores.css";

const fmtMxn = (n, decimales = 2) => {
  const v = Number(n);
  if (!Number.isFinite(v)) return null; // nunca mostrar NaN
  return `$${new Intl.NumberFormat("es-MX", {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  }).format(v)}`;
};

const ICONOS_MODALIDAD = { compartido: MemoryIcon, privado: BoltIcon };
const ICONOS_PLAN = { personal: PersonIcon, conductor: DriveEtaIcon, negocios: StorefrontIcon };

function Beneficios({ items, color }) {
  return (
    <List dense disablePadding>
      {(Array.isArray(items) ? items : []).map((b, i) => (
        <ListItem key={i} disableGutters sx={{ py: 0.5 }}>
          <ListItemIcon sx={{ minWidth: 34, color: color || "var(--mg-lila)" }}>
            <CheckCircleIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary={<Typography sx={{ color: "var(--mg-lila-claro)" }}>{b}</Typography>}
          />
        </ListItem>
      ))}
    </List>
  );
}

// Tarjeta de membresía: precios/beneficios REALES de Strapi (o fallback de
// config si el fetch falla). Un solo CTA por tarjeta (sin duplicados).
function TarjetaMembresia({ plan, copy, email }) {
  const Icono = ICONOS_PLAN[copy.id] || PersonIcon;
  const precio = `${fmtMxn(plan.precio, 0)} MXN / mes`;
  return (
    <Card id={copy.id} className={`mg-card mg-ancla ${copy.destacado ? "mg-glow" : ""}`} sx={{ height: "100%" }}>
      <CardContent sx={{ p: { xs: 3, md: 4 }, display: "flex", flexDirection: "column", gap: 1.5, height: "100%" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box sx={{
            width: 46, height: 46, borderRadius: "14px", display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(255,224,74,0.12)", border: "1px solid rgba(255,224,74,0.35)",
          }}>
            <Icono sx={{ color: "var(--mg-amarillo)" }} />
          </Box>
          <Box>
            <Typography variant="h5" className="mg-titulo-marca" sx={{ fontSize: "1.35rem" }}>{plan.nombre}</Typography>
            <Chip size="small" className="mg-chip-precio" label={precio} sx={{ height: 22, mt: 0.5 }} />
          </Box>
        </Box>

        <Typography className="mg-texto" sx={{ fontSize: "0.95rem" }}>{copy.resumen}</Typography>
        <Box sx={{ flex: 1 }}><Beneficios items={plan.beneficios} /></Box>

        <Box sx={{ mt: 1 }}>
          {email ? (
            <MercadoPagoBoton
              order={plan.order}
              email={email}
              precioMostrado={precio}
              label={copy.cta}
              labelCargando="Preparando tu contratación..."
            />
          ) : (
            <MercadoPagoBoton order={plan.order} label={copy.cta} />
          )}
        </Box>
      </CardContent>
    </Card>
  );
}

function ModalidadServidor({ data, email, precioServidor }) {
  const Icono = ICONOS_MODALIDAD[data.id] || MemoryIcon;
  return (
    <Card className="mg-card mg-glow" sx={{ height: "100%" }}>
      <CardContent sx={{ p: { xs: 3, md: 4 } }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
          <Icono sx={{ color: "var(--mg-amarillo)" }} />
          <Typography variant="h5" className="mg-titulo-marca">{data.nombre}</Typography>
        </Box>

        {/* Slot de imagen protagonista: cityan_servidor_{compartido|privado}.png */}
        <Box className="mg-serv-imagen" sx={{ mb: 2.5 }}>
          <Box className="mg-serv-imagen__icono">
            <Icono />
            <span>{data.nombre}</span>
          </Box>
        </Box>

        <Beneficios items={data.puntos} />

        <Box className="mg-precio" sx={{ display: "flex", alignItems: "baseline", gap: 0.75, mt: 3, mb: 0.5 }}>
          <Typography component="span" sx={{ fontSize: "1.7rem", fontWeight: 900 }}>{fmtMxn(precioServidor, 0)}</Typography>
          <Typography component="small" sx={{ fontSize: "0.9rem" }}>
            MXN · pago único · ≈ {fmtMxn(mensualidadServidor(SERVIDOR.plazoObjetivo))} al mes a {SERVIDOR.plazoObjetivo} MSI
          </Typography>
        </Box>
        <Typography className="mg-caption" sx={{ display: "block", mb: 2.5 }}>
          {PAGOS.notaMsi}
        </Typography>

        {email ? (
          <MercadoPagoBoton
            order={SERVIDOR.order}
            subtypeKey={data.subtypeKey}
            email={email}
            precioMostrado={`${fmtMxn(precioServidor, 0)} MXN (pago único)`}
            label={data.cta}
            labelCargando="Preparando tu compra..."
          />
        ) : (
          <MercadoPagoBoton order={SERVIDOR.order} subtypeKey={data.subtypeKey} label={data.cta} />
        )}
      </CardContent>
    </Card>
  );
}

export default function MembresiasDetalles() {
  const location = useLocation();
  const reducir = useReducedMotion();
  const { user, isAuthenticated } = useAuth0();
  const [modalidad, setModalidad] = useState("compartido");
  const [planes, setPlanes] = useState(null); // null = aún sin fetch

  const strapiUrl = (process.env.REACT_APP_STRAPI_URL || "http://localhost:33032").replace(/\/$/, "");

  // Scroll restoration: al abrir sin ancla se ve el encabezado; con ancla se
  // respeta la navegación deliberada.
  useEffect(() => {
    const hash = location.hash?.replace("#", "");
    if (hash) {
      // Pequeño retry: el contenido puede estar montando.
      let intentos = 0;
      const t = setInterval(() => {
        const el = document.getElementById(hash);
        intentos += 1;
        if (el || intentos > 10) {
          clearInterval(t);
          if (el) el.scrollIntoView({ behavior: reducir ? "auto" : "smooth", block: "start" });
        }
      }, 120);
      return () => clearInterval(t);
    }
    window.scrollTo(0, 0);
    return undefined;
  }, [location.hash, reducir]);

  // Precios y beneficios reales desde Strapi; fallback al contenido local.
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch(`${strapiUrl}/api/membresias-tipos?pagination[pageSize]=100&sort=order:asc&populate=*`);
        const json = await res.json();
        if (mounted) setPlanes(json?.data ?? []);
      } catch {
        if (mounted) setPlanes([]);
      }
    })();
    return () => { mounted = false; };
  }, [strapiUrl]);

  const parsearPlan = (item) => {
    const attrs = item?.attributes || {};
    let datos = null;
    if (attrs.json) {
      try { datos = typeof attrs.json === "string" ? JSON.parse(attrs.json) : attrs.json; } catch { datos = null; }
    }
    const tomar = (clave, porDefecto) => {
      if (attrs[clave] !== undefined && attrs[clave] !== null && attrs[clave] !== "") return attrs[clave];
      if (datos && datos[clave] !== undefined && datos[clave] !== null && datos[clave] !== "") return datos[clave];
      return porDefecto;
    };
    return { order: attrs.order ?? 0, nombre: tomar("nombre", "Membresía"), precio: Number(tomar("precio", 0)) || 0, beneficios: tomar("beneficios", []) };
  };

  // Planes 1-3 (membresías); el 10 (servidor) usa config para no duplicar.
  const porOrder = {};
  if (Array.isArray(planes) && planes.length) {
    planes.forEach((it) => { const p = parsearPlan(it); porOrder[p.order] = p; });
  }
  const membresias = [PLANES_ORDER.personal, PLANES_ORDER.conductor, PLANES_ORDER.negocios].map((order) => ({
    order,
    nombre: porOrder[order]?.nombre || PLANES_COPY[Object.keys(PLANES_ORDER).find((k) => PLANES_ORDER[k] === order)]?.nombre,
    precio: porOrder[order]?.precio || 300,
    beneficios: porOrder[order]?.beneficios || [],
  }));

  const precioServidor = porOrder[PLANES_ORDER.servidor]?.precio || SERVIDOR.precioTotal;
  const equivalencia = EQUIVALENCIA_RENTA;
  const equivalenciaValida = equivalencia && Number.isFinite(equivalencia.total);

  const entrada = (i) =>
    reducir
      ? {}
      : {
          initial: { opacity: 0, y: 20 },
          whileInView: { opacity: 1, y: 0 },
          viewport: { once: true, amount: 0.15 },
          transition: { duration: 0.5, delay: (i % 3) * 0.08, ease: "easeOut" },
        };

  const modalidadData = MODALIDADES_SERVIDOR[modalidad];

  return (
    <Box className="mg-page">
      <Box className="mg-halo mg-halo--uno" />
      <Box className="mg-halo mg-halo--dos" />

      {/* ============ HERO ============ */}
      <Box sx={{ maxWidth: "var(--mg-ancho)", mx: "auto", px: { xs: 3, md: 4 }, pt: { xs: 7, md: 11 }, pb: { xs: 5, md: 7 }, textAlign: "center" }}>
        <motion.div {...entrada(0)}>
          <Typography variant="overline" className="mg-kicker">{HERO_DETALLES.kicker}</Typography>
          <Typography variant="h2" className="mg-titulo-marca" sx={{ fontSize: { xs: "2.1rem", md: "3rem" }, mt: 1, mb: 2 }}>
            {HERO_DETALLES.titulo}
          </Typography>
          <Typography className="mg-texto" sx={{ maxWidth: 620, mx: "auto" }}>{HERO_DETALLES.subtitulo}</Typography>
        </motion.div>
      </Box>

      {/* ============ 1) MEMBRESÍAS ============ */}
      <Box id="membresias" className="mg-ancla" sx={{ maxWidth: "var(--mg-ancho)", mx: "auto", px: { xs: 3, md: 4 }, pb: 7 }}>
        <Typography variant="overline" className="mg-kicker">Membresías</Typography>
        <Typography variant="h4" className="mg-titulo-marca" sx={{ mb: 3.5, mt: 0.5 }}>Membresías</Typography>
        <Grid container spacing={3} alignItems="stretch">
          {membresias.map((plan, i) => {
            const copyKey = Object.keys(PLANES_ORDER).find((k) => PLANES_ORDER[k] === plan.order);
            const copy = PLANES_COPY[copyKey] || { id: copyKey, resumen: "", cta: `Elegir ${plan.nombre}` };
            return (
              <Grid item xs={12} md={4} key={plan.order}>
                <motion.div {...entrada(i)} style={{ height: "100%" }}>
                  <TarjetaMembresia plan={plan} copy={copy} email={isAuthenticated ? user?.email : null} />
                </motion.div>
              </Grid>
            );
          })}
        </Grid>
      </Box>

      {/* ============ 2) SERVIDORES ============ */}
      <Box id="servidores" className="mg-ancla" sx={{ maxWidth: "var(--mg-ancho)", mx: "auto", px: { xs: 3, md: 4 }, py: 7 }}>
        <Typography variant="overline" className="mg-kicker">Infraestructura</Typography>
        <Typography variant="h4" className="mg-titulo-marca" sx={{ mb: 1, mt: 0.5 }}>Servidores</Typography>
        <Typography className="mg-texto" sx={{ maxWidth: 720, mb: 3 }}>
          Compra el equipo físico y elige cómo operarlo. La compra es un pago único
          de {fmtMxn(precioServidor, 0)} MXN; no es una suscripción.
        </Typography>

        {/* Toggle de modalidad */}
        <Box className="mg-toggle" role="group" aria-label="Modalidad del servidor" sx={{ mb: 3 }}>
          {Object.values(MODALIDADES_SERVIDOR).map((m) => (
            <button
              key={m.id}
              type="button"
              aria-pressed={modalidad === m.id}
              onClick={() => setModalidad(m.id)}
            >
              {m.nombre}
            </button>
          ))}
        </Box>

        <AnimatePresence mode="wait">
          <motion.div
            key={modalidad}
            initial={reducir ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reducir ? undefined : { opacity: 0, y: -12 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
          >
            <ModalidadServidor
              data={modalidadData}
              email={isAuthenticated ? user?.email : null}
              precioServidor={precioServidor}
            />
          </motion.div>
        </AnimatePresence>

        {/* Bloque renta + equivalencia */}
        {modalidad === "compartido" && (
          <motion.div {...entrada(1)}>
            <Card className="mg-card mg-card--superficie" sx={{ mt: 3 }}>
              <CardContent sx={{ p: { xs: 3, md: 4 } }}>
                <Typography variant="overline" className="mg-kicker">Renta por participación</Typography>
                <Box className="mg-renta" sx={{ mt: 1 }}>
                  <Typography className="mg-renta__principal">
                    {RENTA_COMPARTIDO_LAB} Labory mensuales
                  </Typography>
                  {equivalenciaValida ? (
                    <Typography className="mg-renta__referencia">
                      (≈ {fmtMxn(equivalencia.total)} MXN de referencia · 1 Labory ≈ {fmtMxn(LAB_REFERENCIA.valorUnitario)} MXN)
                    </Typography>
                  ) : (
                    <Typography className="mg-renta__referencia">Equivalencia temporalmente no disponible</Typography>
                  )}
                </Box>
                <Typography className="mg-caption" sx={{ display: "block", mt: 1.5 }}>
                  Referencia interna del esquema de intercambio entre agencias y nodos.
                  No es efectivo garantizado ni rendimiento asegurado. El precio de venta
                  de cada nodo puede variar según la demanda y sus condiciones.
                </Typography>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </Box>

      {/* ============ 3) FICHA TÉCNICA ============ */}
      <Box sx={{ maxWidth: "var(--mg-ancho)", mx: "auto", px: { xs: 3, md: 4 }, pb: 7 }}>
        <motion.div {...entrada(0)}>
          <Typography variant="overline" className="mg-kicker">Equipo</Typography>
          <Typography variant="h4" className="mg-titulo-marca" sx={{ mb: 2.5, mt: 0.5 }}>Ficha técnica</Typography>
          <ul className="mg-specs">
            {SERVIDOR.specs.map((s, i) => (
              <li key={i}><MemoryIcon /> {s}</li>
            ))}
          </ul>
          <Typography className="mg-caption" sx={{ display: "block", mt: 2 }}>
            Hardware reacondicionado. La fuente, la ventilación y la compatibilidad del
            ejemplar final se validan antes de la entrega.
          </Typography>
        </motion.div>
      </Box>

      {/* ============ 4) COMPARATIVA ============ */}
      <Box id="comparacion" className="mg-ancla" sx={{ maxWidth: "var(--mg-ancho)", mx: "auto", px: { xs: 3, md: 4 }, pb: 7 }}>
        <motion.div {...entrada(0)}>
          <Typography variant="overline" className="mg-kicker">Comparativa</Typography>
          <Typography variant="h4" className="mg-titulo-marca" sx={{ mb: 3, mt: 0.5 }}>Compartido vs. privado</Typography>

          <table className="mg-comparativa">
            <thead>
              <tr>
                {COMPARACION_SERVIDOR.encabezados.map((h) => (<th key={h} scope="col">{h}</th>))}
              </tr>
            </thead>
            <tbody>
              {COMPARACION_SERVIDOR.filas.map((f) => (
                <tr key={f.criterio}>
                  <th scope="row">{f.criterio}</th>
                  <td data-etiqueta="Compartido">{f.compartido}</td>
                  <td data-etiqueta="Privado">{f.privado}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      </Box>

      {/* ============ 5) PAGOS Y RENOVACIÓN ============ */}
      <Box id="pagos" className="mg-ancla" sx={{ maxWidth: "var(--mg-ancho)", mx: "auto", px: { xs: 3, md: 4 }, pb: 7 }}>
        <motion.div {...entrada(0)}>
          <Typography variant="overline" className="mg-kicker">Pagos</Typography>
          <Typography variant="h4" className="mg-titulo-marca" sx={{ mb: 2.5, mt: 0.5 }}>Pagos y renovación</Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card className="mg-card" sx={{ height: "100%" }}>
                <CardContent sx={{ p: 3.5 }}>
                  <Typography variant="h6" className="mg-titulo-marca" sx={{ fontSize: "1.1rem", mb: 1 }}>Membresías</Typography>
                  <Typography className="mg-texto" sx={{ fontSize: "0.95rem" }}>
                    Se contratan por {fmtMxn(300, 0)} MXN mensuales con renovación automática.
                    Antes de confirmar verás el importe, la periodicidad y la próxima
                    renovación; puedes cancelarla cuando quieras.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card className="mg-card" sx={{ height: "100%" }}>
                <CardContent sx={{ p: 3.5 }}>
                  <Typography variant="h6" className="mg-titulo-marca" sx={{ fontSize: "1.1rem", mb: 1 }}>Servidor</Typography>
                  <Typography className="mg-texto" sx={{ fontSize: "0.95rem" }}>
                    Es un pago único de {fmtMxn(precioServidor, 0)} MXN, no una suscripción.
                    {" "}{PAGOS.notaMsi}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12}>
              <Card className="mg-card mg-card--superficie">
                <CardContent sx={{ p: 3.5, display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
                  <Typography className="mg-texto" sx={{ flex: 1, minWidth: 260, fontSize: "0.95rem" }}>
                    {PAGOS.ayudaCta}
                  </Typography>
                  <Button
                    className="mg-btn"
                    endIcon={<WhatsAppIcon />}
                    onClick={() => sendToWhatsApp("Duda sobre pagos de membresías y servidores")}
                  >
                    Resolver una duda
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </motion.div>
      </Box>

      {/* ============ 6) FAQ ============ */}
      <Box id="faq" className="mg-ancla" sx={{ maxWidth: "var(--mg-ancho)", mx: "auto", px: { xs: 3, md: 4 }, pb: 7 }}>
        <motion.div {...entrada(0)}>
          <Typography variant="overline" className="mg-kicker">Ayuda</Typography>
          <Typography variant="h4" className="mg-titulo-marca" sx={{ mb: 3, mt: 0.5 }}>Preguntas frecuentes</Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            {FAQ.map((item, i) => (
              <Accordion key={i} className="mg-faq-item" disableGutters elevation={0}>
                <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: "var(--mg-lila)" }} />} aria-controls={`faq-p-${i}`} id={`faq-p-${i}`}>
                  <Typography sx={{ fontWeight: 700, color: "#fff" }}>{item.p}</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography>{item.r}</Typography>
                </AccordionDetails>
              </Accordion>
            ))}
          </Box>
        </motion.div>
      </Box>

      {/* ============ 7) SERVICIOS DE PUBLIA ============ */}
      <Box id="publia" className="mg-ancla" sx={{ maxWidth: "var(--mg-ancho)", mx: "auto", px: { xs: 3, md: 4 }, pb: 8 }}>
        <motion.div {...entrada(0)}>
          <Typography variant="overline" className="mg-kicker">Servicios</Typography>
          <Typography variant="h4" className="mg-titulo-marca" sx={{ mb: 3, mt: 0.5 }}>{PUBLIA.nombre}</Typography>
          <Grid container spacing={3} alignItems="stretch">
            <Grid item xs={12} md={6}>
              <Card className="mg-card" sx={{ height: "100%" }}>
                <CardContent sx={{ p: { xs: 3, md: 4 } }}>
                  <Typography className="mg-texto" sx={{ mb: 2 }}>{PUBLIA.intro}</Typography>
                  <List dense disablePadding>
                    {PUBLIA.servicios.map((s, i) => (
                      <ListItem key={i} disableGutters sx={{ py: 1, "&:not(:last-child)": { borderBottom: "1px solid var(--mg-borde)" } }}>
                        <ListItemIcon sx={{ minWidth: 32, color: "var(--mg-lila)" }}>
                          <CheckCircleIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText primary={<Typography sx={{ color: "var(--mg-lila-claro)" }}>{s}</Typography>} />
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card className="mg-card mg-card--superficie" sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
                <CardContent sx={{ p: { xs: 3, md: 4 }, display: "flex", flexDirection: "column", gap: 2, flex: 1, justifyContent: "center" }}>
                  <Typography className="mg-texto">{PUBLIA.notaCatalogo}</Typography>
                  <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                    <Button
                      className="mg-btn mg-btn--flecha"
                      endIcon={<WhatsAppIcon />}
                      onClick={() => sendToWhatsApp(PUBLIA.cta)}
                    >
                      {PUBLIA.cta}
                      <span className="mg-flecha"><ArrowForwardIcon fontSize="small" /></span>
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </motion.div>
      </Box>
    </Box>
  );
}
