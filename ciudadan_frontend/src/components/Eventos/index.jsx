import React, { useEffect, useState } from 'react';
import EventosGrid from '../../Pages/Eventos/EventosGrid';
import { Box, Typography } from '@mui/material';

// Placeholder de eventos
const eventosDummy = [
  {
    titulo: 'Festival Psicoactivo',
    slug: 'festival-psicoactivo',
    ciudad: 'CDMX',
    estado: 'CDMX',
    fecha_inicio: '2025-06-15',
    hora_inicio: '20:00'
  },
  {
    titulo: 'Círculo de Plantas',
    slug: 'circulo-de-plantas',
    ciudad: 'Guadalajara',
    estado: 'Jalisco',
    fecha_inicio: '2025-06-17',
    hora_inicio: '18:00'
  },
  {
    titulo: 'Ceremonia del Sol',
    slug: 'ceremonia-del-sol',
    ciudad: 'Oaxaca',
    estado: 'Oaxaca',
    fecha_inicio: '2025-06-18',
    hora_inicio: '16:00'
  },
  {
    titulo: 'Música y Medicina',
    slug: 'musica-y-medicina',
    ciudad: 'Morelia',
    estado: 'Michoacán',
    fecha_inicio: '2025-06-20',
    hora_inicio: '21:00'
  },
  {
    titulo: 'Arte y Psicodelia',
    slug: 'arte-y-psicodelia',
    ciudad: 'Puebla',
    estado: 'Puebla',
    fecha_inicio: '2025-06-22',
    hora_inicio: '19:00'
  }
];

export default function EventosPage() {
  const [eventos, setEventos] = useState([]);

  useEffect(() => {
    // Cuando conectemos con la API, se reemplaza esta parte
    setEventos(eventosDummy);
  }, []);

  return (
    <Box sx={{ backgroundColor: '#121212', minHeight: '100vh', py: 4 }}>
      <EventosGrid eventos={eventos} />
    </Box>
  );
}
