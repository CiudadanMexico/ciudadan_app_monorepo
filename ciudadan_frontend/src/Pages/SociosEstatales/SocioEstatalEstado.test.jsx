import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import SocioEstatalEstado from './SocioEstatalEstado';
import SociosEstatalesPage from './SociosEstatalesPage';

describe('Vistas de Socios Estatales', () => {
  it('la pagina /socios-estatales renderiza el mapa', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/socios-estatales']}>
        <Routes>
          <Route path='/socios-estatales' element={<SociosEstatalesPage />} />
        </Routes>
      </MemoryRouter>
    );
    expect(container.querySelectorAll('.geo-region').length).toBe(32);
    expect(screen.getAllByText(/Socios Estatales/i).length).toBeGreaterThan(0);
  });

  it('la vista de detalle /socios-estatales/oaxaca renderiza encabezado, CTA y mapa', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/socios-estatales/oaxaca']}>
        <Routes>
          <Route path='/socios-estatales/:estado' element={<SocioEstatalEstado />} />
        </Routes>
      </MemoryRouter>
    );
    // encabezado del estado
    expect(screen.getAllByText('Oaxaca').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/MX-OAX/).length).toBeGreaterThan(0);
    // enlace de regreso al mapa
    expect(screen.getByRole('link', { name: /Todos los estados/i })).toBeInTheDocument();
    // la ficha del wrapper tiene su CTA "Ver estado" (status available)
    expect(screen.getByRole('button', { name: /Ver estado/i })).toBeInTheDocument();
    // el mapa de las 32 entidades esta presente
    expect(container.querySelectorAll('.geo-region').length).toBe(32);
  });

  it('el CTA de la vista de detalle lleva al formulario real de postulación', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/socios-estatales/oaxaca']}>
        <Routes>
          <Route path='/socios-estatales/:estado' element={<SocioEstatalEstado />} />
        </Routes>
      </MemoryRouter>
    );
    // El estado Oaxaca esta "available": se muestra el formulario real
    expect(screen.getByText(/Postúlate como Socio Estatal de Oaxaca/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Nombre completo/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Enviar postulación/i })).toBeInTheDocument();
    // El CTA del mapa hace scroll al formulario (no abre un aviso de "próximamente")
    fireEvent.click(screen.getByRole('button', { name: /Ver estado/i }));
    expect(container.querySelector('form')).toBeInTheDocument();
  });

  it('un estado asignado NO muestra formulario sino el aviso de otras formas', () => {
    render(
      <MemoryRouter initialEntries={['/socios-estatales/ciudad-de-mexico']}>
        <Routes>
          <Route path='/socios-estatales/:estado' element={<SocioEstatalEstado />} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.queryByLabelText(/Nombre completo/i)).not.toBeInTheDocument();
    expect(screen.getByText(/ya cuenta con Socio Estatal confirmado/i)).toBeInTheDocument();
  });

  it('clic en "Ver estado" en el mapa navega a la vista de detalle del estado', () => {
    render(
      <MemoryRouter initialEntries={['/socios-estatales']}>
        <Routes>
          <Route path='/socios-estatales' element={<SociosEstatalesPage />} />
          <Route path='/socios-estatales/:estado' element={<SocioEstatalEstado />} />
        </Routes>
      </MemoryRouter>
    );

    // El estado CDMX esta seleccionado por defecto => su CTA es "Otras formas de participar"
    const cta = screen.getByRole('button', { name: /Otras formas de participar/i });
    fireEvent.click(cta);

    // Se navego a la vista de detalle de Ciudad de México
    expect(screen.getAllByText('Ciudad de México').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/MX-CMX/).length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: /Todos los estados/i })).toBeInTheDocument();
  });

  it('una ruta invalida muestra Entidad no encontrada', () => {
    render(
      <MemoryRouter initialEntries={['/socios-estatales/no-existe']}>
        <Routes>
          <Route path='/socios-estatales/:estado' element={<SocioEstatalEstado />} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText(/Entidad no encontrada/i)).toBeInTheDocument();
  });
});
