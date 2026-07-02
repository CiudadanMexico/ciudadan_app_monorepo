import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  CircularProgress,
} from '@mui/material';
import { useParams } from 'react-router-dom';

const PagosTienda = () => {
  const { slug } = useParams();
  const [pagos, setPagos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState('todo'); // 'semana', 'mes', 'todo'
  const STRAPI_URL = process.env.REACT_APP_STRAPI_URL;

  // Obtener lista completa de pagos de esta tienda
  useEffect(() => {
    const fetchPagos = async () => {
      try {
        // Filtramos por slug de store en Strapi
        const url = `${STRAPI_URL}/api/pagos?populate=*&filters[store][slug][$eq]=${slug}&sort=fecha_pagado:desc`;
        const res = await fetch(url);
        const { data } = await res.json();
        setPagos(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('❌ Error cargando pagos:', err);
        setPagos([]);
      } finally {
        setCargando(false);
      }
    };
    if (slug) fetchPagos();
  }, [STRAPI_URL, slug]);

  // Filtrar por rango de fechas según filtro
  const pagosFiltrados = pagos.filter((p) => {
    if (!p.attributes.fecha_pagado) return false;
    const fechaPago = new Date(p.attributes.fecha_pagado);
    const ahora = new Date();
    if (filtro === 'semana') {
      const hace7 = new Date(); hace7.setDate(ahora.getDate() - 7);
      return fechaPago >= hace7;
    }
    if (filtro === 'mes') {
      const hace30 = new Date(); hace30.setDate(ahora.getDate() - 30);
      return fechaPago >= hace30;
    }
    return true;
  });

  if (cargando) {
    return (
      <Box display="flex" justifyContent="center" mt={4}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box width="100%" p={3}>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        Historial de pagos
      </Typography>

      <Box mb={3} display="flex" alignItems="center" gap={2}>
        <FormControl sx={{ minWidth: 120 }} size="small">
          <InputLabel id="filtro-label">Periodo</InputLabel>
          <Select
            labelId="filtro-label"
            value={filtro}
            label="Periodo"
            onChange={(e) => setFiltro(e.target.value)}
          >
            <MenuItem value="todo">Todo</MenuItem>
            <MenuItem value="semana">Última semana</MenuItem>
            <MenuItem value="mes">Último mes</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {pagosFiltrados.length === 0 ? (
        <Typography>No se encontraron pagos en este periodo.</Typography>
      ) : (
        <Table sx={{ minWidth: 650 }}>
          <TableHead>
            <TableRow>
              <TableCell>Fecha pago</TableCell>
              <TableCell>Método</TableCell>
              <TableCell align="right">Monto ($)</TableCell>
              <TableCell align="right">Guía ($)</TableCell>
              <TableCell align="right">Comisión Stripe ($)</TableCell>
              <TableCell align="right">Comisión Plataforma ($)</TableCell>
              <TableCell align="right">Recibe vendedor ($)</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pagosFiltrados.map((p) => {
              const a = p.attributes;
              const fecha = a.fecha_pagado ? new Date(a.fecha_pagado).toLocaleDateString() : '-';
              return (
                <TableRow key={p.id} hover>
                  <TableCell>{fecha}</TableCell>
                  <TableCell>
                    {/* Icono CDN y texto */}
                    <Box display="flex" alignItems="center" gap={1}>
                      <i className="material-icons">payment</i>
                      <Typography>{a.metodo_pago || '-'}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell align="right">{a.monto?.toFixed(2) || '-'}</TableCell>
                  <TableCell align="right">{a.pago_guia?.toFixed(2) || '-'}</TableCell>
                  <TableCell align="right">{a.comisionStripe?.toFixed(2) || '-'}</TableCell>
                  <TableCell align="right">{a.comisionPlataforma?.toFixed(2) || '-'}</TableCell>
                  <TableCell align="right">{a.pago_vendedor?.toFixed(2) || '-'}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </Box>
  );
};

export default PagosTienda;
