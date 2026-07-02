// src/components/GenerarCodigoReferido/GenerarCodigoReferido.jsx

import React, { useEffect, useState, useMemo } from "react";
import { useAuth0 } from "@auth0/auth0-react";

import {
  Box,
  Paper,
  TextField,
  Button,
  Chip,
  Typography,
  CircularProgress,
  Alert,
  Stack,
  Divider,
} from "@mui/material";

import CheckIcon from "@mui/icons-material/Check";
import { motion } from "framer-motion";

import MostrarCodigoReferido from "./MostrarCodigoReferido";

const STRAPI_URL =
  process.env.REACT_APP_STRAPI_URL?.replace(/\/$/, "") || "";

const STRAPI_TOKEN =
  process.env.REACT_APP_STRAPI_TOKEN || "";

const SUFIJOS = [
  "ciudadan",
  "citocracia",
  "cooperativa",
  "nodo",
  "federacion",
  "confederacion",
  "autonomia",
  "ecosistema",
  "opensource",
  "openfactory",
  "maker",
  "fablab",
  "digital",
  "ia",
  "blockchain",
  "cripto",
  "web3",
  "comunidad",
  "asamblea",
  "gobernanza",
  "descentralizado",
  "innovacion",
  "productividad",
  "redglobal",
  "futuro",
  "revolucion",
  "tecnologia",
  "autosustentable",
  "colectivo",
  "inteligencia",
  "solidaridad",
  "metaverso",
  "protocolo",
];

export default function GenerarCodigoReferido({
  open = true,
  onClose = () => {},
}) {

  const {
    user,
    isAuthenticated,
    isLoading: authLoading,
  } = useAuth0();

  const [prefijo, setPrefijo] = useState("");
  const [sufijo, setSufijo] = useState("");
  const [userIdStrapi, setUserIdStrapi] = useState(null);

  const [loading, setLoading] = useState(false);

  const [checkingPrefijo, setCheckingPrefijo] = useState(false);

  const [prefijoDisponible, setPrefijoDisponible] =
    useState(null);

  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [initializing, setInitializing] =
    useState(true);

  const [existingCodigo, setExistingCodigo] =
    useState(null);

  const [checkingExisting, setCheckingExisting] =
    useState(false);

  const localpartFromEmail = (email = "") => {
    if (!email) return "";
    return email.split("@")[0] || email;
  };

  useEffect(() => {

    let mounted = true;

    const bootstrap = async () => {

      setInitializing(true);

      try {

        if (!isAuthenticated) {
          setInitializing(false);
          return;
        }

        const email = user?.email || "";

        if (!email) {
          setInitializing(false);
          return;
        }

        try {

          const usersEndpoint =
            STRAPI_URL +
            `/api/users?filters[email][$eq]=${encodeURIComponent(email)}&fields=id,email`;

          const res = await fetch(usersEndpoint, {
            headers: {
              "Content-Type": "application/json",
              ...(STRAPI_TOKEN
                ? {
                    Authorization: `Bearer ${STRAPI_TOKEN}`,
                  }
                : {}),
            },
          });

          if (res.ok) {

            const json = await res.json();

            if (
              json &&
              Array.isArray(json.data) &&
              json.data.length > 0
            ) {

              const u = json.data[0];

              const id =
                u.id ??
                u?.attributes?.id ??
                null;

              if (mounted) {

                setUserIdStrapi(id);

                setPrefijo(
                  localpartFromEmail(
                    u.attributes?.email ?? user.email
                  )
                );
              }

            } else {

              if (mounted) {
                setPrefijo(localpartFromEmail(email));
              }
            }

          } else {

            if (mounted) {
              setPrefijo(localpartFromEmail(email));
            }
          }

        } catch {

          if (mounted) {
            setPrefijo(localpartFromEmail(email));
          }
        }

      } catch (err) {

        console.error(err);

        setError("Error inicializando.");

      } finally {

        if (mounted) {
          setInitializing(false);
        }
      }
    };

    bootstrap();

    return () => {
      mounted = false;
    };

  }, [isAuthenticated, user]);

  useEffect(() => {

    let mounted = true;

    const checkExisting = async () => {

      if (!isAuthenticated) return;

      setCheckingExisting(true);

      try {

        if (userIdStrapi) {

          const q =
            `${STRAPI_URL}/api/codigosreferidos?filters[usuario][id][$eq]=${userIdStrapi}&filters[activo][$eq]=true&populate=*&pagination[limit]=1`;

          const res = await fetch(q, {
            headers: {
              "Content-Type": "application/json",
              ...(STRAPI_TOKEN
                ? {
                    Authorization: `Bearer ${STRAPI_TOKEN}`,
                  }
                : {}),
            },
          });

          if (res.ok) {

            const json = await res.json();

            if (
              json &&
              Array.isArray(json.data) &&
              json.data.length > 0
            ) {

              if (mounted) {
                setExistingCodigo(json.data[0]);
              }

              return;
            }
          }
        }

      } catch (err) {

        console.error(err);

      } finally {

        if (mounted) {
          setCheckingExisting(false);
        }
      }
    };

    if (!initializing) {
      checkExisting();
    }

    return () => {
      mounted = false;
    };

  }, [
    isAuthenticated,
    user,
    userIdStrapi,
    initializing,
  ]);

  useEffect(() => {

    let mounted = true;

    if (!prefijo) {
      setPrefijoDisponible(null);
      return;
    }

    const timer = setTimeout(async () => {

      setCheckingPrefijo(true);

      try {

        const q =
          `${STRAPI_URL}/api/codigosreferidos?filters[prefijo][$eq]=${encodeURIComponent(prefijo)}&filters[activo][$eq]=true&pagination[limit]=1`;

        const res = await fetch(q, {
          headers: {
            "Content-Type": "application/json",
            ...(STRAPI_TOKEN
              ? {
                  Authorization: `Bearer ${STRAPI_TOKEN}`,
                }
              : {}),
          },
        });

        if (!mounted) return;

        if (!res.ok) {

          setPrefijoDisponible(null);

        } else {

          const json = await res.json();

          const found =
            json &&
            Array.isArray(json.data) &&
            json.data.length > 0;

          setPrefijoDisponible(!found);
        }

      } catch {

        setPrefijoDisponible(null);

      } finally {

        if (mounted) {
          setCheckingPrefijo(false);
        }
      }

    }, 500);

    return () => {
      mounted = false;
      clearTimeout(timer);
    };

  }, [prefijo]);

  const handleSelectChip = (word) => {
    setSufijo(word);
    setError("");
    setSuccessMsg("");
  };

  const handleCrear = async () => {

    setError("");
    setSuccessMsg("");

    if (!prefijo) {
      setError("El prefijo no puede estar vacío.");
      return;
    }

    if (!sufijo) {
      setError("Selecciona un sufijo.");
      return;
    }

    if (prefijoDisponible === false) {
      setError("Ese prefijo ya existe.");
      return;
    }

    setLoading(true);

    try {

      const payload = {
        data: {
          usuario: userIdStrapi ?? null,
          prefijo,
          sufijo,
          descuento: 0,
          fecha_creado: new Date().toISOString(),
          metadata: {
            createdFrom: "ciudadan-ui",
            emailAuth0: user?.email ?? null,
          },
          activo: true,
          comision: 0,
        },
      };

      const res = await fetch(
        `${STRAPI_URL}/api/codigosreferidos`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(STRAPI_TOKEN
              ? {
                  Authorization: `Bearer ${STRAPI_TOKEN}`,
                }
              : {}),
          },
          body: JSON.stringify(payload),
        }
      );

      if (!res.ok) {

        setError(
          `No se pudo crear el código (${res.status})`
        );

      } else {

        const json = await res.json();

        setSuccessMsg(
          "Código creado correctamente."
        );

        setExistingCodigo(json.data ?? json);

        setPrefijoDisponible(false);
      }

    } catch (err) {

      console.error(err);

      setError("Error creando el código.");

    } finally {

      setLoading(false);
    }
  };

  const previewCodigo = useMemo(() => {

    if (!prefijo) return "";

    return sufijo
      ? `${prefijo}-${sufijo}`
      : `${prefijo}-...`;

  }, [prefijo, sufijo]);

  const styles = {

    paper: {
      borderRadius: 18,
      padding: 18,
      boxShadow:
        "0 8px 30px rgba(0,0,0,0.30)",
      border:
        "1px solid rgba(255,255,255,0.06)",
      background:
        "linear-gradient(180deg, rgba(8,15,35,0.98) 0%, rgba(10,25,50,0.98) 100%)",
    },

    chipsContainer: {
      display: "flex",
      flexWrap: "wrap",
      gap: 4,
      marginTop: 6,
    },

    chip: {
      borderRadius: 999,
      padding: "4px 8px",
      fontWeight: 700,
      cursor: "pointer",
      userSelect: "none",
      fontSize: 11,
      lineHeight: "18px",
    },

    neonPurple: {
      background:
        "linear-gradient(90deg, rgba(59,130,246,0.16), rgba(14,165,233,0.10))",
      color: "#eef6ff",
      border:
        "1px solid rgba(120,180,255,0.18)",
    },

    neonGreen: {
      background:
        "linear-gradient(90deg, rgba(0,255,180,0.12), rgba(0,180,255,0.08))",
      color: "#eaffff",
      border:
        "1px solid rgba(0,255,220,0.16)",
    },
  };

  if (checkingExisting || initializing) {

    return (
      <Paper
        sx={{
          ...styles.paper,
          width: "100%",
          maxWidth: 980,
          margin: "12px auto",
          textAlign: "center",
          p: 4,
        }}
      >
        <CircularProgress />

        <Typography
          sx={{
            color: "#dbeafe",
            mt: 1,
          }}
        >
          Comprobando tu código...
        </Typography>
      </Paper>
    );
  }

  if (existingCodigo) {

    return (
      <Paper
        sx={{
          ...styles.paper,
          width: "100%",
          maxWidth: 980,
          margin: "12px auto",
        }}
      >
        <MostrarCodigoReferido
          codigo={existingCodigo}
          onClose={onClose}
        />
      </Paper>
    );
  }

  return (

    <Paper
      sx={{
        ...styles.paper,
        width: "100%",
        maxWidth: 980,
        margin: "12px auto",
      }}
    >

      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={1}
      >

        <Typography
          variant="h6"
          sx={{
            color: "#fff",
            fontWeight: 700,
          }}
        >
          Generar Código Ciudadan
        </Typography>

        <Box
          display="flex"
          gap={1}
          alignItems="center"
        >

          {authLoading || initializing
            ? <CircularProgress size={20} />
            : null}

          <Typography
            sx={{
              color: "#d9e7ff",
              fontSize: 13,
            }}
          >
            {user?.email ?? "no autenticado"}
          </Typography>

        </Box>

      </Box>

      <Divider
        sx={{
          mb: 2,
          borderColor:
            "rgba(255,255,255,0.06)",
        }}
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {successMsg && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {successMsg}
        </Alert>
      )}

      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
      >

        <Box flex={1}>

          <Typography
            sx={{
              color: "#d7e8ff",
              mb: 1,
            }}
          >
            Prefijo
          </Typography>

          <TextField
            size="small"
            fullWidth
            value={prefijo}
            onChange={(e) => {
              setPrefijo(
                e.target.value
                  .replace(/\s+/g, "-")
                  .toLowerCase()
              );

              setPrefijoDisponible(null);
            }}
            helperText={
              checkingPrefijo
                ? "Comprobando disponibilidad..."
                : prefijoDisponible === true
                ? "Disponible ✔️"
                : prefijoDisponible === false
                ? "Ese prefijo ya existe."
                : "Puedes editar el prefijo."
            }
            inputProps={{ maxLength: 40 }}
            sx={{
              background:
                "rgba(255,255,255,0.03)",
              borderRadius: 1,
              "& .MuiInputBase-root": {
                color: "#fff",
              },
            }}
          />

          <Box mt={2}>

            <Typography
              sx={{
                color: "#d7e8ff",
                mb: 1,
              }}
            >
              Sufijo
            </Typography>

            <TextField
              size="small"
              fullWidth
              value={sufijo}
              onChange={(e) =>
                setSufijo(
                  e.target.value
                    .replace(/\s+/g, "-")
                    .toLowerCase()
                )
              }
              helperText="O selecciona uno abajo."
              sx={{
                background:
                  "rgba(255,255,255,0.03)",
                borderRadius: 1,
                "& .MuiInputBase-root": {
                  color: "#fff",
                },
              }}
            />

          </Box>

          <Box mt={2}>

            <Typography
              sx={{
                color: "#d7e8ff",
                mb: 1,
              }}
            >
              Preview
            </Typography>

            <Paper
              elevation={2}
              sx={{
                p: 1,
                borderRadius: 2,
                display: "inline-block",
                background:
                  "linear-gradient(90deg,#081224,#10345e)",
                color: "#dff6ff",
                fontWeight: 700,
                border:
                  "1px solid rgba(120,180,255,0.18)",
              }}
            >
              {previewCodigo}
            </Paper>

          </Box>

          <Box
            mt={3}
            display="flex"
            gap={2}
          >

            <Button
              variant="contained"
              onClick={handleCrear}
              startIcon={<CheckIcon />}
              disabled={loading}
              sx={{
                background:
                  "linear-gradient(90deg, rgba(59,130,246,0.96), rgba(14,165,233,0.96))",
                color: "#fff",
                fontWeight: 700,
                "&:hover": {
                  filter: "brightness(1.08)",
                },
              }}
            >
              {loading
                ? (
                  <CircularProgress
                    size={18}
                    color="inherit"
                  />
                )
                : "Crear código"}
            </Button>

            <Button
              variant="outlined"
              onClick={() => {
                setPrefijo(
                  localpartFromEmail(user?.email)
                );

                setSufijo("");
                setError("");
                setSuccessMsg("");
              }}
              sx={{
                color: "#d9ecff",
                borderColor:
                  "rgba(255,255,255,0.10)",
              }}
            >
              Reset
            </Button>

          </Box>

        </Box>

        <Box
          flex={1}
          ml={{ sm: 2 }}
          sx={{ minWidth: 260 }}
        >

          <Typography
            sx={{
              color: "#d7e8ff",
              mb: 1,
            }}
          >
            Sufijos disponibles
          </Typography>

          <Box sx={styles.chipsContainer}>

            {SUFIJOS.map((w) => {

              const selected = w === sufijo;

              return (

                <motion.div
                  key={w}
                  whileHover={{
                    scale: 1.06,
                    y: -2,
                  }}
                  whileTap={{
                    scale: 0.98,
                  }}
                >

                  <Chip
                    label={w}
                    onClick={() =>
                      handleSelectChip(w)
                    }
                    sx={{
                      ...styles.chip,
                      ...(selected
                        ? styles.neonGreen
                        : styles.neonPurple),
                    }}
                    clickable
                  />

                </motion.div>
              );
            })}

          </Box>

          <Box mt={3}>

            <Typography
              sx={{
                color: "#d7e8ff",
                mb: 1,
              }}
            >
              Notas
            </Typography>

            <Typography
              sx={{
                color: "#dfe6ff",
                fontSize: 13,
                mb: 1,
              }}
            >
              - El prefijo debe ser único mientras
              esté activo.
              <br />
              - El sufijo puede repetirse.
              <br />
              - Código final:
              {" "}
              <strong>{previewCodigo}</strong>
            </Typography>

          </Box>

        </Box>

      </Stack>

    </Paper>
  );
}