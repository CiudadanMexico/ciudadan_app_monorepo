import React from "react";
import { useAuth0 } from "@auth0/auth0-react";
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Divider,
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

import MercadoPagoBoton from "../components/Membresias/MercadoPagoBoton";
import Seccion from "../components/Membresias/Seccion";
import { sendToWhatsApp } from "../utils/sendToWhatsApp";
import {
  MEMBRESIAS,
  MODALIDADES_SERVIDOR,
  COMPARACION_SERVIDOR,
  EQUIVALENCIA_RENTA,
  PAGOS,
  FAQ,
  PUBLIA,
} from "../config/membresiasContenido";
import { SERVIDOR } from "../config/servidores";
import { RENTA_COMPARTIDO_LAB, LAB_REFERENCIA } from "../config/labory";
import "../styles/membresias-servidores.css";

const fmtMxn = (n) =>
  `$${new Intl.NumberFormat("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)}`;

const ICONOS_MODALIDAD = { compartido: MemoryIcon, privado: BoltIcon };

function Beneficios({ items, color }) {
  return (
    <List dense disablePadding>
      {items.map((b, i) => (
        <ListItem key={i} disableGutters sx={{ py: 0.5 }}>
          <ListItemIcon sx={{ minWidth: 34, color }}>
            <CheckCircleIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary={<Typography sx={{ color: "#e7e0ff" }}>{b}</Typography>}
          />
        </ListItem>
      ))}
    </List>
  );
}

function TarjetaMembresia({ data, email }) {
  const precio = `${fmtMxn(data.precio)} MXN / mes`;
  return (
    <Card className="ms-card" sx={{ height: "100%" }}>
      <CardContent sx={{ p: { xs: 3, md: 4 } }}>
        <Chip size="small" className="ms-chip" label={`$${data.precio} MXN mensuales`} />
        <Typography variant="h4" sx={{ fontWeight: 900, mt: 2, color: "#fff" }}>
          {data.nombre}
        </Typography>
        <Typography sx={{ color: "#cfc4f0", mt: 1, mb: 3 }}>{data.resumen}</Typography>
        <Beneficios items={data.beneficios} color={data.color} />
        <Box sx={{ mt: 3 }}>
          {email ? (
            <MercadoPagoBoton
              order={data.order}
              email={email}
              precioMostrado={`${precio}`}
              label={data.cta}
              labelCargando="Preparando tu contratación..."
            />
          ) : (
            <MercadoPagoBoton order={data.order} label={data.cta} />
          )}
        </Box>
      </CardContent>
    </Card>
  );
}

function ModalidadServidor({ data, email }) {
  const Icono = ICONOS_MODALIDAD[data.id] || MemoryIcon;
  return (
    <Card className="ms-card ms-glow" sx={{ height: "100%" }}>
      <CardContent sx={{ p: { xs: 3, md: 4 } }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
          <Icono sx={{ color: "#a78bfa" }} />
          <Typography variant="h5" sx={{ fontWeight: 900, color: "#fff" }}>
            {data.nombre}
          </Typography>
        </Box>
        {/* Slot de imagen: listo para ciudadan_servidor_*.png cuando llegue.
            Mientras tanto, ilustración con iconografía (no se generan imágenes). */}
        <Box
          className="ms-server-img"
          sx={{ mb: 3, display: "flex", justifyContent: "center" }}
        >
          <Icono sx={{ fontSize: 84, opacity: 0.6 }} />
        </Box>
        <Beneficios items={data.puntos} color="#a78bfa" />
        <Box sx={{ mt: 3 }}>
          {email ? (
            <MercadoPagoBoton
              order={SERVIDOR.order}
              subtypeKey={data.subtypeKey}
              email={email}
              precioMostrado={fmtMxn(SERVIDOR.precioTotal)}
              label={data.cta}
              labelCargando="Preparando tu compra..."
            />
          ) : (
            <MercadoPagoBoton
              order={SERVIDOR.order}
              subtypeKey={data.subtypeKey}
              label={data.cta}
            />
          )}
        </Box>
      </CardContent>
    </Card>
  );
}

export default function MembresiasDetalles() {
  const { isAuthenticated, email } = useAuth0();

  return (
    <Box component="main" className="ms-page" sx={{ py: { xs: 5, md: 7 } }}>

      {/* HERO PRINCIPAL */}
      <Box
        sx={{
          textAlign: { xs: "center", md: "left" },
          maxWidth: 1200,
          margin: "0 auto",
          px: 2,
        }}
      >
        <Typography
          variant="body2"
          sx={{ color: "#c4b5fd", mt: 2, mb: 3, letterSpacing: 1 }}
        >
          Para ti, para tu negocio, para el ecosistema
        </Typography>
        <Typography variant="h2" className="ms-hero-title" sx={{ mb: 3 }}>
          Membresías y servidores de Ciudadan
        </Typography>
        <Typography
          variant="h5"
          sx={{ color: "#e7e0ff", maxWidth: 960, mx: "auto", mb: 4 }}
        >
          Elige cómo quieres participar: una membresía mensual para tu agencia o
          la compra de un servidor para llevar la red contigo. Precios en pesos
          MXN y labores, sin compromisos de más de 30 días.
        </Typography>
        <Box
          sx={{
            display: { xs: "block", md: "flex" },
            gap: 2,
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          {!isAuthenticated ? (
            <Button
              component="a"
              href="/login?returnTo=/membresias/detalles"
              variant="contained"
              size="large"
              sx={{
                backgroundColor: "#7C3AED",
                color: "#fff",
                textTransform: "none",
                fontWeight: 800,
                py: 2,
                borderRadius: 3,
                "&:hover": { backgroundColor: "#6D28D9" },
              }}
            >
              Elegir tu modalidad
            </Button>
          ) : (
            <Box component={MercadoPagoBoton} order={10} label="Quiero mi modalidad" />
          )}
        </Box>
      </Box>


      {/* 1) MEMBRESÍAS PERSONAL Y NEGOCIOS */}
      <Seccion
        id="membresias"
        kicker="Membresías"
        title="Elige tu forma de estar en la red"
        sx={{ maxWidth: 1200, margin: "0 auto", px: 2 }}
      >
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={5}>
            {!isAuthenticated ? (
              <MercadoPagoBoton order={1} label={MEMBRESIAS.personal.cta} />
            ) : (
              <MercadoPagoBoton
                order={1}
                email={email}
                precioMostrado={`${fmtMxn(MEMBRESIAS.personal.precio)} MXN mensuales`}
                label={MEMBRESIAS.personal.cta}
                labelCargando="Preparando tu contratación..."
              />
            )}
          </Grid>
          <Grid item xs={12} sm={6} md={7}>
            <TarjetaMembresia data={MEMBRESIAS.personal} email={email} />
          </Grid>
        </Grid>
        <Grid container spacing={3} sx={{ mt: 6 }}>
          <Grid item xs={12} sm={6} md={5}>
            {!isAuthenticated ? (
              <MercadoPagoBoton order={3} label={MEMBRESIAS.negocios.cta} />
            ) : (
              <MercadoPagoBoton
                order={3}
                email={email}
                precioMostrado={`${fmtMxn(MEMBRESIAS.negocios.precio)} MXN mensuales`}
                label={MEMBRESIAS.negocios.cta}
                labelCargando="Preparando tu contratación..."
              />
            )}
          </Grid>
          <Grid item xs={12} sm={6} md={7}>
            <TarjetaMembresia data={MEMBRESIAS.negocios} email={email} />
          </Grid>
        </Grid>
      </Seccion>

      {/* 2) SERVIDORES */}
      <Seccion
        id="servidores"
        kicker="Servidores"
        title="Alquila capacidad y lleva la red contigo"
        sx={{ maxWidth: 1200, margin: "0 auto", px: 2 }}
      >
        <Grid container spacing={3} sx={{ mb: 6 }}>
          <Grid item xs={12} md={5}>
            <Typography sx={{ color: "#e7e0ff" }}>
              El servidor no es una suscripción: es una compra de hardware con
              renta mensual en labores (50 labores/mes). Dos formas de operar:
            </Typography>
          </Grid>
          <Grid item xs={12} md={7}>
            {!isAuthenticated ? (
              <MercadoPagoBoton order={SERVIDOR.order} label="Ver opciones de servidor" />
            ) : (
              <Box component={MercadoPagoBoton} order={SERVIDOR.order} label="Ver opciones de servidor" />
            )}
          </Grid>
        </Grid>
        <Grid container spacing={3} sx={{ mb: 6 }}>
          <Grid item xs={12} md={6}>
            <ModalidadServidor data={MODALIDADES_SERVIDOR.compartido} email={email} />
          </Grid>
          <Grid item xs={12} md={6}>
            <ModalidadServidor data={MODALIDADES_SERVIDOR.privado} email={email} />
          </Grid>
        </Grid>
      </Seccion>


      {/* 3) COMPARACIÓN */}
      <Seccion
        id="comparacion"
        kicker="Comparativa"
        title="Compartido vs privado, a simple vista"
        sx={{ maxWidth: 1200, margin: "0 auto", px: 2 }}
      >
        <Grid container spacing={3}>
          {COMPARACION_SERVIDOR.map((row) => (
            <Grid item xs={12} md={6} key={row.criterio}>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { md: "1fr 1fr" },
                  gap: 2,
                  alignItems: "center",
                }}
              >
                <Typography variant="overline" sx={{ color: "#a78bfa", fontWeight: 700 }}>
                  {row.criterio}
                </Typography>
                <Box
                  sx={{
                    p: 2.5,
                    borderRadius: 2,
                    backgroundColor: "rgba(124,58,237,0.08)",
                    border: "1px solid rgba(167,139,250,0.25)",
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{ color: "#e7e0ff", whiteSpace: "pre-wrap" }}
                  >
                    {row.compartido}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    p: 2.5,
                    borderRadius: 2,
                    backgroundColor: "rgba(37,99,235,0.1)",
                    border: "1px solid rgba(37,99,235,0.35)",
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{ color: "#e7e0ff", whiteSpace: "pre-wrap" }}
                  >
                    {row.privado}
                  </Typography>
                </Box>
              </Box>
            </Grid>
          ))}
        </Grid>
        <Box sx={{ mt: 5, textAlign: { xs: "center", md: "left" } }}>
          <Button
            variant="contained"
            size="large"
            sx={{
              backgroundColor: "#2563EB",
              color: "#fff",
              textTransform: "none",
              fontWeight: 800,
              py: 2,
              borderRadius: 3,
              "&:hover": { backgroundColor: "#1d4ed8" },
            }}
          >
            Más detalle de cada modalidad
          </Button>
        </Box>
      </Seccion>

      {/* 4) EQUIVALENCIA DE LA RENTA */}
      <Seccion
        id="renta"
        kicker="Valor de la renta"
        title="¿Cuánto cuesta la renta mensual?"
        sx={{ maxWidth: 1200, margin: "0 auto", px: 2 }}
      >
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={6}>
            <Typography sx={{ color: "#e7e0ff" }}>
              En el servidor compartido, la renta fija es de{" "}
              <Typography
                component="span"
                sx={{ fontWeight: 900, color: "#fff" }}
              >
                {RENTA_COMPARTIDO_LAB} Labory al mes
              </Typography>
              {`, con una referencia interna de 1 Labory ≈ ${fmtMxn(LAB_REFERENCIA)}
              de pesos. La equivalencia en tu moneda local depende del tipo de
              cambio aplicable y del par a que se referencie.`}
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card className="ms-card" sx={{ textAlign: "center", py: 4 }}>
              <Typography
                variant="h2"
                sx={{ fontWeight: 900, color: "#fff", mb: 1 }}
              >
                {fmtMxn(EQUIVALENCIA_RENTA.total)}
              </Typography>
              <Typography variant="body2" sx={{ color: "#cfc4f0" }}>
                ≈ renta mensual en pesos (referencia interna)
              </Typography>
            </Card>
          </Grid>
        </Grid>
      </Seccion>


      {/* 5) PAGOS Y RENOVACIÓN */}
      <Seccion
        id="pagos"
        kicker="Pagos"
        title="Cómo se paga cada opción"
        sx={{ maxWidth: 1200, margin: "0 auto", px: 2 }}
      >
        <Grid container spacing={3}>
          <Grid item xs={12} md={7}>
            <Typography sx={{ color: "#e7e0ff" }}>
              {PAGOS.notaMsi}
            </Typography>
            <Divider sx={{ my: 3 }} />
            <Typography sx={{ color: "#e7e0ff" }}>
              {PAGOS.notaRenovacion}
            </Typography>
          </Grid>
          <Grid item xs={12} md={5}>
            <Card className="ms-card" sx={{ p: 4 }}>
              <Typography
                variant="overline"
                sx={{ color: "#a78bfa", fontWeight: 700, mb: 2 }}
              >
                Resumen del punto de venta
              </Typography>
              <Typography variant="h3" sx={{ fontWeight: 900, color: "#fff" }}>
                {fmtMxn(PAGOS.precioServidor)}
              </Typography>
              <Typography variant="body2" sx={{ color: "#cfc4f0", mb: 3 }}>
                {PAGOS.moneda}, sin recargos de entidad de crédito en los meses sin
                interés ({PAGOS.plazoObjetivo} meses como objetivo).
              </Typography>
              <MercadoPagoBoton
                order={SERVIDOR.order}
                label="Contratar servidor"
                labelCargando="Generando tu compra..."
              />
            </Card>
          </Grid>
        </Grid>
      </Seccion>

      {/* 6) Preguntas frecuentes */}
      <Seccion
        id="faq"
        kicker="Ayuda"
        title="Preguntas frecuentes"
        sx={{ maxWidth: 1200, margin: "0 auto", px: 2 }}
      >
        <Box sx={{ maxWidth: 900, mx: "auto" }}>
          {FAQ.map((item, i) => (
            <Accordion
              key={i}
              sx={{
                boxShadow: "none",
                border: "1px solid rgba(167,139,250,0.25)",
                bgcolor: "transparent",
                "&:before": { display: "none" },
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon sx={{ color: "#a78bfa" }} />}
                sx={{ color: "#fff" }}
              >
                <Typography sx={{ fontWeight: 700, color: "#fff" }}>{item.p}</Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ color: "#e7e0ff" }}>
                <Typography>{item.r}</Typography>
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      </Seccion>


      {/* 7) SERVICIOS DE PUBLIA */}
      <Seccion
        id="publia"
        kicker="Servicios"
        title={PUBLIA.nombre}
        sx={{ maxWidth: 1200, margin: "0 auto", px: 2 }}
      >
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={6}>
            <Typography sx={{ color: "#e7e0ff" }}>{PUBLIA.intro}</Typography>
            <Box sx={{ mt: 3, display: "flex", flexWrap: "wrap", gap: 2 }}>
              <Button
                variant="outlined"
                startIcon={<WhatsAppIcon />}
                onClick={() => sendToWhatsApp("Conocer servicios de PubliA")}
                sx={{
                  textTransform: "none",
                  fontWeight: 700,
                  borderColor: "#2563EB",
                  color: "#2563EB",
                  borderRadius: 2,
                }}
              >
                Contactar
              </Button>
              <Button
                component="a"
                href="/media/contacto.pdf"
                variant="outlined"
                sx={{
                  textTransform: "none",
                  fontWeight: 700,
                  borderColor: "#a78bfa",
                  color: "#a78bfa",
                  borderRadius: 2,
                }}
              >
                Descargar catálogo
              </Button>
            </Box>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card className="ms-card" sx={{ p: 4, height: "100%" }}>
              <Typography variant="overline" sx={{ color: "#a78bfa", fontWeight: 700, mb: 3 }}>
                Servicios de PubliA
              </Typography>
              <List dense disablePadding>
                {[
                  "Servicio de alojamiento de nodos",
                  "Servicios de telecomunicaciones y acceso a la red",
                  "Servicios de empresas y publiempresarial",
                  "Servicios de soporte y operación",
                ].map((s, i) => (
                  <ListItem
                    key={i}
                    disableGutters
                    sx={{
                      py: 1,
                      "&:not(:last-child)": { borderBottom: "1px solid rgba(167,139,250,0.15)" },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 32, color: "#a78bfa" }}>
                      <CheckCircleIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText
                      primary={<Typography sx={{ color: "#e7e0ff" }}>{s}</Typography>}
                    />
                  </ListItem>
                ))}
              </List>
              <Typography
                variant="caption"
                sx={{ color: "#8b7ec9", mt: 3, display: "block" }}
              >
                Los servicios y precios concretos de PubliA se consultan de su
                base de datos. Sin precios ni prestaciones inventadas.
              </Typography>
            </Card>
          </Grid>
        </Grid>
      </Seccion>
    </Box>
  );
}

