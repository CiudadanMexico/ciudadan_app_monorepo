// src/pages/Membresias.jsx
import React, { useEffect, useState } from "react";
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Zoom,
  Alert,
  Button
} from "@mui/material";

import '../styles/membresias.css';
import membresiasImg from '../assets/como.png';

import { useRoles } from '../Contexts/RolesContext';
import MiMembresia from '../components/Membresias/MiMembresia.jsx';
import { useNavigate } from 'react-router-dom';
import PreLoader from '../components/PreLoader.jsx';

const COLLECTION_ENDPOINT = "membresias-tipos";

const Membresias = () => {
  const chargeText = 'Cargando Membresías';
  const { isActivaMembresia } = useRoles();

  const [planes, setPlanes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const strapiUrl = (process.env.REACT_APP_STRAPI_URL || "http://localhost:1337").replace(/\/$/, "");
  const navigate = useNavigate();

  const handleMembresiaClick = (plan) => (e) => {
    e.preventDefault();

    const order = plan?.order || plan?.id;

    let path;

    if (order === 1) {
      path = '/membresias/comunidad/order';
    } else if (order === 2) {
      path = '/membresias/impulsor/order';
    } else if (order === 3) {
      path = '/membresias/nodo/order';
    } else {
      path = `/membresias/pagar/order/${order}`;
    }

    navigate(path);
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

          let picUrl = null;

          if (attrs.pic?.data?.attributes?.url) {
            picUrl = attrs.pic.data.attributes.url;
          } else if (attrs.pic?.url) {
            picUrl = attrs.pic.url;
          }

          return {
            id: r.id,
            order: attrs.order ?? 0,
            nombre: attrs.nombre || "Membresía",
            precio: attrs.precio || 0,
            beneficios: attrs.beneficios || [],
            color: attrs.color || "#4F46E5",
            destacado: attrs.destacado || false,
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

    return () => {
      mounted = false;
    };

  }, [strapiUrl]);

  if (isActivaMembresia()) {
    return <MiMembresia />;
  }

  return (
    <Box
      className="membresias-container"
      sx={{
        px: 2,
        py: 5,
        background:
          "linear-gradient(180deg, #f5f7ff 0%, #ffffff 100%)",
        minHeight: "100vh"
      }}
    >

      <Typography
        variant="h3"
        align="center"
        gutterBottom
        sx={{
          fontWeight: 800,
          color: "#1E293B"
        }}
      >
        Membresías Ciudadan
      </Typography>

      <Typography
        variant="h6"
        align="center"
        sx={{
          maxWidth: 900,
          mx: "auto",
          mb: 6,
          color: "#475569"
        }}
      >
        Forma parte de una red de cooperación productiva,
        tecnología abierta y gobernanza digital orientada
        a crear comunidades autónomas conectadas.
      </Typography>

      {loading ? (
        <Box display="flex" justifyContent="center" my={6}>
          <PreLoader text={chargeText} />
        </Box>
      ) : error ? (
        <Box display="flex" justifyContent="center" my={4}>
          <Alert severity="error">
            Error cargando membresías: {error}
          </Alert>
        </Box>
      ) : (
        <Grid container spacing={4} justifyContent="center">

          {planes.map((plan, index) => (

            <Grid
              item
              xs={12}
              sm={6}
              md={4}
              key={plan.id}
            >

              <Zoom in style={{ transitionDelay: `${index * 120}ms` }}>

                <Card
                  sx={{
                    height: "100%",
                    borderRadius: "24px",
                    overflow: "hidden",
                    position: "relative",
                    background: `linear-gradient(135deg, ${plan.color}20, white)`,
                    border: plan.destacado
                      ? `3px solid ${plan.color}`
                      : "1px solid #e5e7eb",
                    boxShadow: plan.destacado
                      ? `0 0 25px ${plan.color}55`
                      : "0 10px 30px rgba(0,0,0,0.06)",
                    transition: "0.3s",
                    '&:hover': {
                      transform: "translateY(-6px)"
                    }
                  }}
                >

                  {plan.destacado && (
                    <Chip
                      label="Recomendada"
                      sx={{
                        position: "absolute",
                        top: 14,
                        right: 14,
                        background: plan.color,
                        color: "#fff",
                        fontWeight: 700
                      }}
                    />
                  )}

                  <CardContent sx={{ p: 4 }}>

                    <Box
                      display="flex"
                      flexDirection="column"
                      alignItems="center"
                    >

                      {plan.picUrl && (
                        <img
                          src={
                            plan.picUrl.startsWith("http")
                              ? plan.picUrl
                              : strapiUrl + plan.picUrl
                          }
                          alt={plan.nombre}
                          style={{
                            width: 82,
                            height: 82,
                            borderRadius: 18,
                            objectFit: "cover",
                            marginBottom: 16
                          }}
                        />
                      )}

                      <Typography
                        variant="h5"
                        sx={{
                          fontWeight: 800,
                          color: "#0F172A",
                          mb: 1
                        }}
                      >
                        {plan.nombre}
                      </Typography>

                      <Typography
                        variant="h3"
                        sx={{
                          fontWeight: 900,
                          color: plan.color,
                          mb: 3
                        }}
                      >
                        $
                        {new Intl.NumberFormat("es-MX").format(plan.precio)}

                        <span
                          style={{
                            fontSize: "0.4em",
                            marginLeft: 4
                          }}
                        >
                          MXN
                        </span>
                      </Typography>

                    </Box>

                    <ul
                      style={{
                        listStyle: "none",
                        padding: 0,
                        margin: 0
                      }}
                    >
                      {plan.beneficios?.map((beneficio, i) => (
                        <li
                          key={i}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            marginBottom: 12
                          }}
                        >

                          <span
                            className="material-icons"
                            style={{
                              color: plan.color,
                              marginRight: 10
                            }}
                          >
                            check_circle
                          </span>

                          <Typography
                            variant="body1"
                            sx={{
                              color: "#334155"
                            }}
                          >
                            {beneficio}
                          </Typography>

                        </li>
                      ))}
                    </ul>

                    <Box mt={4}>

                      <Button
                        fullWidth
                        variant="contained"
                        onClick={handleMembresiaClick(plan)}
                        sx={{
                          backgroundColor: plan.color,
                          color: "#fff",
                          py: 1.4,
                          borderRadius: "14px",
                          fontWeight: 800,
                          textTransform: "none",
                          fontSize: "1rem",
                          '&:hover': {
                            backgroundColor: plan.color
                          }
                        }}
                      >
                        Unirme a Ciudadan
                      </Button>

                    </Box>

                  </CardContent>

                </Card>

              </Zoom>

            </Grid>

          ))}

        </Grid>
      )}

      <Box
        mt={8}
        display="flex"
        justifyContent="center"
      >
        <img
          src={membresiasImg}
          alt="Ecosistema Ciudadan"
          style={{
            maxWidth: "100%",
            borderRadius: "24px"
          }}
        />
      </Box>

    </Box>
  );
};

export default Membresias;