// src/Pages/Membresias.jsx — Catálogo comercial de membresías y servidores
import React, { useEffect, useMemo, useState } from "react";
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Alert,
  Button,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import DriveEtaIcon from "@mui/icons-material/DriveEta";
import StorefrontIcon from "@mui/icons-material/Storefront";
import DnsIcon from "@mui/icons-material/Dns";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import MemoryIcon from "@mui/icons-material/Memory";
import { motion, useReducedMotion } from "framer-motion";

import '../styles/membresias.css';
import '../styles/membresias-servidores.css';

import { useAuth0 } from '@auth0/auth0-react';
import { useRoles } from '../Contexts/RolesContext';
import MiMembresia from '../components/Membresias/MiMembresia.jsx';
import MercadoPagoBoton from '../components/Membresias/MercadoPagoBoton.jsx';
import { useNavigate } from 'react-router-dom';
import PreLoader from '../components/PreLoader.jsx';
import { HERO, PLANES_ORDER, PLANES_COPY } from '../config/membresiasContenido';
import { SERVIDOR, mensualidadServidor } from '../config/servidores';

const COLLECTION_ENDPOINT = "membresias-tipos";

const ICONOS_PLAN = { personal: PersonIcon, conductor: DriveEtaIcon, negocios: StorefrontIcon };

const fmtMxn = (n, decimales = 0) =>
  `$${new Intl.NumberFormat("es-MX", {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  }).format(n)}`;

// Ancla suave a una sección de la misma página (respeta reduced-motion).
function irASeccion(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const reducir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ behavior: reducir ? "auto" : "smooth", block: "start" });
}

const Membresias = () => {
  const chargeText = 'Cargando Membresías';
  const { isActivaMembresia } = useRoles();
  const { user, isAuthenticated, loginWithRedirect } = useAuth0();
  const reducir = useReducedMotion();

  const [planes, setPlanes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const strapiUrl = (process.env.REACT_APP_STRAPI_URL || "http://localhost:33032").replace(/\/$/, "");
  const navigate = useNavigate();

  const handleMembresiaClick = (plan) => (e) => {
    e.preventDefault();
    const order = plan?.order || plan?.id;
    const destino = `/membresias/pagar/order/${order}`;
    // Sin sesión: mandar a iniciar sesión y volver a esta misma página de pago.
    if (!isAuthenticated) {
      loginWithRedirect({ appState: { returnTo: destino } });
      return;
    }
    navigate(destino);
  };

  useEffect(() => {
    let mounted = true;

    const fetchPlanes = async () => {
      try {
        setLoading(true);
        const fullUrl = `${strapiUrl}/api/${COLLECTION_ENDPOINT}?pagination[pageSize]=100&sort=order:asc&populate=*`;
        const res = await fetch(fullUrl);
        const json = await res.json();
        const items = json?.data ?? [];

        const mapped = items.map((r) => {
          const attrs = r.attributes || {};
          let datos = null;
          if (attrs.json) {
            try {
              datos = typeof attrs.json === "string" ? JSON.parse(attrs.json) : attrs.json;
            } catch {
              datos = null;
            }
          }
          const tomar = (clave, porDefecto) => {
            if (attrs[clave] !== undefined && attrs[clave] !== null && attrs[clave] !== "") return attrs[clave];
            if (datos && datos[clave] !== undefined && datos[clave] !== null && datos[clave] !== "") return datos[clave];
            return porDefecto;
          };
          let picUrl = null;
          if (attrs.pic?.data?.attributes?.url) picUrl = attrs.pic.data.attributes.url;
          else if (attrs.pic?.url) picUrl = attrs.pic.url;
          return {
            id: r.id,
            order: attrs.order ?? 0,
            nombre: tomar("nombre", "Membresía"),
            precio: Number(tomar("precio", 0)) || 0,
            beneficios: tomar("beneficios", []),
            cobro: tomar("cobro", "unico"),
            picUrl,
          };
        });

        if (mounted) {
          setPlanes(mapped);
          setLoading(false);
        }
      } catch (err) {
        console.error(err);
        if (mounted) {
          setError(err.message);
          setLoading(false);
        }
      }
    };

    fetchPlanes();
    return () => { mounted = false; };
  }, [strapiUrl]);

  // Separar: membresías (orders 1-3) vs servidor (order 10 → bloque propio)
  const membresias = useMemo(
    () => planes.filter((p) => p.order >= 1 && p.order <= 3),
    [planes]
  );
  const planServidor = useMemo(
    () => planes.find((p) => p.order === PLANES_ORDER.servidor),
    [planes]
  );

  if (isActivaMembresia()) {
    return <MiMembresia />;
  }

  const entrada = (i) =>
    reducir
      ? {}
      : {
          initial: { opacity: 0, y: 20 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.5, delay: i * 0.08, ease: "easeOut" },
        };

  return (
    <Box className="mg-page">
      {/* Halos de fondo */}
      <Box className="mg-halo mg-halo--uno" />
      <Box className="mg-halo mg-halo--dos" />
      <Box className="mg-halo mg-halo--tres" />

      {/* ============ HERO ============ */}
      <Box
        sx={{
          maxWidth: "var(--mg-ancho)",
          mx: "auto",
          px: { xs: 3, md: 4 },
          pt: { xs: 7, md: 11 },
          pb: { xs: 6, md: 9 },
          textAlign: "center",
        }}
      >
        <motion.div {...entrada(0)}>
          <Typography variant="overline" className="mg-kicker">
            {HERO.kicker}
          </Typography>
          <Typography
            variant="h2"
            className="mg-titulo-marca"
            sx={{ fontSize: { xs: "2.3rem", md: "3.4rem" }, mt: 1, mb: 2 }}
          >
            {HERO.titulo}
          </Typography>
          <Typography className="mg-texto" sx={{ maxWidth: 640, mx: "auto", fontSize: { xs: "1rem", md: "1.15rem" } }}>
            {HERO.subtitulo}
          </Typography>
        </motion.div>

        <motion.div
          {...entrada(1)}
          style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap", marginTop: 32 }}
        >
          <Button className="mg-btn mg-btn--flecha" onClick={() => irASeccion("planes")}>
            {HERO.ctaPrimario}
            <span className="mg-flecha"><ArrowForwardIcon fontSize="small" /></span>
          </Button>
          <Button className="mg-btn-ghost" onClick={() => irASeccion("servidores")}>
            {HERO.ctaSecundario}
          </Button>
        </motion.div>
      </Box>

      {/* ============ MEMBRESÍAS ============ */}
      <Box id="planes" className="mg-ancla" sx={{ maxWidth: "var(--mg-ancho)", mx: "auto", px: { xs: 3, md: 4 }, pb: 8 }}>
        <Typography variant="overline" className="mg-kicker">Membresías</Typography>
        <Typography variant="h4" className="mg-titulo-marca" sx={{ mb: 4, mt: 0.5 }}>
          Personal, Conductor y Negocios
        </Typography>

        {loading ? (
          <Box display="flex" justifyContent="center" my={6}><PreLoader text={chargeText} /></Box>
        ) : error ? (
          <Box display="flex" justifyContent="center" my={4}>
            <Alert severity="error" sx={{ bgcolor: "rgba(42,11,77,0.8)", color: "#fff" }}>
              No pudimos cargar las membresías. Intenta de nuevo en unos minutos.
            </Alert>
          </Box>
        ) : (
          <Grid container spacing={3} alignItems="stretch">
            {membresias.map((plan, index) => {
              const copy = PLANES_COPY[Object.keys(PLANES_ORDER).find((k) => PLANES_ORDER[k] === plan.order)] || {};
              const Icono = ICONOS_PLAN[copy.id] || PersonIcon;
              const destacado = !!copy.destacado;
              return (
                <Grid item xs={12} md={4} key={plan.id}>
                  <motion.div {...entrada(index + 2)} style={{ height: "100%" }}>
                    <Card
                      className={`mg-card ${destacado ? "mg-glow" : ""}`}
                      sx={{ height: "100%", display: "flex", flexDirection: "column" }}
                    >
                      <CardContent sx={{ p: { xs: 3, md: 3.5 }, display: "flex", flexDirection: "column", flex: 1, gap: 1.5 }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                          <Box sx={{
                            width: 46, height: 46, borderRadius: "14px", display: "flex", alignItems: "center", justifyContent: "center",
                            background: "rgba(255,224,74,0.12)", border: "1px solid rgba(255,224,74,0.35)",
                          }}>
                            <Icono sx={{ color: "var(--mg-amarillo)" }} />
                          </Box>
                          <Box>
                            <Typography variant="h5" className="mg-titulo-marca" sx={{ fontSize: "1.35rem" }}>
                              {plan.nombre}
                            </Typography>
                            {destacado && (
                              <Chip size="small" label="Recomendada" className="mg-chip-precio" sx={{ height: 22, mt: 0.5 }} />
                            )}
                          </Box>
                        </Box>

                        <Box className="mg-precio" sx={{ display: "flex", alignItems: "baseline", gap: 0.75 }}>
                          <Typography component="span" sx={{ fontSize: "2.1rem", fontWeight: 900 }}>
                            {fmtMxn(plan.precio)}
                          </Typography>
                          <Typography component="small" sx={{ fontSize: "0.9rem" }}>MXN / mes</Typography>
                        </Box>

                        <Typography className="mg-texto" sx={{ fontSize: "0.95rem" }}>
                          {copy.resumen}
                        </Typography>

                        <List dense disablePadding sx={{ flex: 1 }}>
                          {(Array.isArray(plan.beneficios) ? plan.beneficios : []).map((b, i) => (
                            <ListItem key={i} disableGutters sx={{ py: 0.4 }}>
                              <ListItemIcon sx={{ minWidth: 30, color: "var(--mg-lila)" }}>
                                <CheckCircleIcon fontSize="small" />
                              </ListItemIcon>
                              <ListItemText
                                primary={<Typography sx={{ color: "var(--mg-lila-claro)", fontSize: "0.92rem" }}>{b}</Typography>}
                              />
                            </ListItem>
                          ))}
                        </List>

                        {/* Acciones al pie */}
                        <Box sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 1 }}>
                          {isAuthenticated && user?.email ? (
                            <MercadoPagoBoton
                              order={plan.order || plan.id}
                              email={user.email}
                              precioMostrado={`${fmtMxn(plan.precio)} MXN / mes`}
                              label={copy.cta || `Elegir ${plan.nombre}`}
                            />
                          ) : (
                            <Button fullWidth className="mg-btn" onClick={handleMembresiaClick(plan)}>
                              {copy.cta || `Elegir ${plan.nombre}`}
                            </Button>
                          )}
                          <Button
                            fullWidth
                            className="mg-btn-ghost"
                            onClick={() => navigate(`/membresias/detalles${copy.ancla || "#membresias"}`)}
                          >
                            Ver detalles
                          </Button>
                        </Box>
                      </CardContent>
                    </Card>
                  </motion.div>
                </Grid>
              );
            })}
          </Grid>
        )}
      </Box>

      {/* ============ BLOQUE PROPIO DEL SERVIDOR ============ */}
      <Box
        id="servidores"
        className="mg-ancla"
        sx={{
          maxWidth: "var(--mg-ancho)",
          mx: "auto",
          px: { xs: 3, md: 4 },
          pb: 8,
        }}
      >
        <motion.div {...entrada(membresias.length + 2)}>
          <Card className="mg-card mg-card--superficie mg-glow" sx={{ overflow: "hidden" }}>
            <Grid container>
              <Grid item xs={12} md={5}>
                <Box className="mg-serv-imagen" sx={{ borderRadius: 0, height: "100%", minHeight: { xs: 220, md: "100%" } }}>
                  {/* Slot de imagen: ciudadan_servidor_compartido.png / _privado.png */}
                  <Box className="mg-serv-imagen__icono">
                    <MemoryIcon />
                    <span>Infraestructura Ciudadan</span>
                  </Box>
                </Box>
              </Grid>
              <Grid item xs={12} md={7}>
                <CardContent sx={{ p: { xs: 3, md: 5 } }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1 }}>
                    <DnsIcon sx={{ color: "var(--mg-amarillo)" }} />
                    <Typography variant="h4" className="mg-titulo-marca" sx={{ fontSize: { xs: "1.6rem", md: "2rem" } }}>
                      Tu propio servidor
                    </Typography>
                  </Box>
                  <Typography className="mg-texto" sx={{ mb: 2.5 }}>
                    {PLANES_COPY.servidor.resumen} Elige entre la modalidad compartida
                    (compartes capacidad y recibes renta en Labory) o la privada
                    (equipo tuyo desde el inicio, cómputo exclusivo).
                  </Typography>

                  <ul className="mg-specs" style={{ marginBottom: 20 }}>
                    {SERVIDOR.specs.map((s, i) => (
                      <li key={i}><MemoryIcon /> {s}</li>
                    ))}
                  </ul>

                  <Box className="mg-precio" sx={{ display: "flex", alignItems: "baseline", gap: 0.75, mb: 0.5 }}>
                    <Typography component="span" sx={{ fontSize: "1.9rem", fontWeight: 900 }}>
                      {fmtMxn(planServidor?.precio || SERVIDOR.precioTotal)}
                    </Typography>
                    <Typography component="small" sx={{ fontSize: "0.9rem" }}>
                      MXN · pago único · ≈ {fmtMxn(mensualidadServidor(SERVIDOR.plazoObjetivo), 2)} al mes a {SERVIDOR.plazoObjetivo} MSI
                    </Typography>
                  </Box>
                  <Typography className="mg-caption" sx={{ display: "block", mb: 3 }}>
                    Los meses sin intereses dependen de tu banco y medio de pago; Mercado Pago te muestra los disponibles al pagar.
                  </Typography>

                  <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                    <Button
                      className="mg-btn mg-btn--flecha"
                      onClick={() => navigate("/membresias/detalles#compartido")}
                    >
                      Quiero mi servidor compartido
                      <span className="mg-flecha"><ArrowForwardIcon fontSize="small" /></span>
                    </Button>
                    <Button
                      className="mg-btn-ghost"
                      onClick={() => navigate("/membresias/detalles#privado")}
                    >
                      Quiero mi servidor privado
                    </Button>
                  </Box>
                </CardContent>
              </Grid>
            </Grid>
          </Card>
        </motion.div>
      </Box>
    </Box>
  );
};

export default Membresias;
