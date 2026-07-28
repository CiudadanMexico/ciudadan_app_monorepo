import React, { useEffect, useState } from "react";
import {
  Box,
  TextField,
  Button,
  Typography,
  MenuItem,
  CircularProgress,
} from "@mui/material";

const STRAPI_URL = process.env.REACT_APP_STRAPI_URL;

const generarHoras = () => {
  const horas = [];
  let start = 9 * 60; // 9:00
  let end = 18 * 60; // 18:00

  for (let t = start; t < end; t += 20) {
    const h = Math.floor(t / 60).toString().padStart(2, "0");
    const m = (t % 60).toString().padStart(2, "0");
    horas.push(`${h}:${m}`);
  }
  return horas;
};

const PreregistroConductor = () => {
  const [form, setForm] = useState({
    nombre_completo: "",
    email: "",
    telefono: "",
    ciudad: "CDMX",
  });

  const [fecha, setFecha] = useState("");
  const [hora, setHora] = useState("");
  const [horasDisponibles, setHorasDisponibles] = useState([]);
  const [loadingHoras, setLoadingHoras] = useState(false);
  const [loadingSubmit, setLoadingSubmit] = useState(false);

  const HORAS_BASE = generarHoras();

  // ============================
  // 🔥 CARGAR HORAS DISPONIBLES
  // ============================
  useEffect(() => {
    if (!fecha) return;

    const fetchHoras = async () => {
      setLoadingHoras(true);

      try {
        const res = await fetch(
          `${STRAPI_URL}/api/agenda?filters[observaciones][$eq]=conductor&filters[fecha_inicio][$contains]=${fecha}`
        );

        const data = await res.json();

        const ocupadas = (data.data || []).map((item) => {
          const date = new Date(item.attributes.fecha_inicio);
          return date.toTimeString().slice(0, 5);
        });

        const disponibles = HORAS_BASE.filter(
          (h) => !ocupadas.includes(h)
        );

        setHorasDisponibles(disponibles);
      } catch (err) {
        console.error("Error cargando agenda:", err);
      }

      setLoadingHoras(false);
    };

    fetchHoras();
  }, [fecha]);

  // ============================
  // 🔥 HANDLE INPUT
  // ============================
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // ============================
  // 🔥 SUBMIT
  // ============================
  const handleSubmit = async () => {
    if (!form.nombre_completo || !form.email || !hora || !fecha) {
      alert("Completa todos los campos");
      return;
    }

    setLoadingSubmit(true);

    try {
      // 🔥 1. Crear usuario
      const userRes = await fetch(`${STRAPI_URL}/api/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: form.email,
          email: form.email,
          password: Math.random().toString(36).slice(-8),
          nombre_completo: form.nombre_completo,
          telefono: form.telefono,
          ciudad: form.ciudad,
          observaciones: "conductor",
          confirmed: true,
        }),
      });

      const userData = await userRes.json();

      const userId = userData.id;

      // 🔥 2. Crear cita en agenda
      const fechaISO = new Date(`${fecha}T${hora}:00`).toISOString();

      await fetch(`${STRAPI_URL}/api/agenda`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          data: {
            titulo: `Cita conductor ${form.nombre_completo}`,
            fecha_inicio: fechaISO,
            ciudad: "CDMX",
            estado: "pendiente",
            observaciones: "conductor",
            usuario: userId,
            descripcion: "Preregistro conductor",
          },
        }),
      });

      alert("Registro exitoso, cita agendada correctamente");

      setForm({
        nombre_completo: "",
        email: "",
        telefono: "",
        ciudad: "CDMX",
      });
      setFecha("");
      setHora("");
    } catch (err) {
      console.error(err);
      alert("Error en el registro");
    }

    setLoadingSubmit(false);
  };

  return (
    <Box sx={{ maxWidth: 600, mx: "auto", p: 3 }}>
      <Typography variant="h4" sx={{ mb: 2 }}>
        Preregistro de Conductor
      </Typography>

      <Typography sx={{ mb: 2 }}>
        Agenda tu cita para verificación en:
        <br />
        <b>Ejército Nacional 1150 - 301, Col. Polanco, CDMX</b>
      </Typography>

      <TextField
        fullWidth
        label="Nombre completo"
        name="nombre_completo"
        value={form.nombre_completo}
        onChange={handleChange}
        sx={{ mb: 2 }}
      />

      <TextField
        fullWidth
        label="Correo"
        name="email"
        value={form.email}
        onChange={handleChange}
        sx={{ mb: 2 }}
      />

      <TextField
        fullWidth
        label="Teléfono"
        name="telefono"
        value={form.telefono}
        onChange={handleChange}
        sx={{ mb: 2 }}
      />

      <TextField
        type="date"
        fullWidth
        value={fecha}
        onChange={(e) => setFecha(e.target.value)}
        sx={{ mb: 2 }}
      />

      {loadingHoras ? (
        <CircularProgress />
      ) : (
        <TextField
          select
          fullWidth
          label="Hora disponible"
          value={hora}
          onChange={(e) => setHora(e.target.value)}
          sx={{ mb: 2 }}
        >
          {horasDisponibles.map((h) => (
            <MenuItem key={h} value={h}>
              {h}
            </MenuItem>
          ))}
        </TextField>
      )}

      <Button
        fullWidth
        variant="contained"
        onClick={handleSubmit}
        disabled={loadingSubmit}
        sx={{ bgcolor: "#fff200", color: "black" }}
      >
        {loadingSubmit ? "Enviando..." : "Agendar cita"}
      </Button>
    </Box>
  );
};

export default PreregistroConductor;