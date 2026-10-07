import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SociosEstatalesMap from './SociosEstatalesMap';
import mxMeta from '../../data/geo/mx/states.meta.json';
import sociosData from '../../data/maps/socios-estatales.json';


const renderWithRouter = (ui) =>
  render(<MemoryRouter>{ui}</MemoryRouter>);

/**
 * Tests del wrapper de negocio Socios Estatales:
 * ficha lateral, selector movil (mismo resultado que el mapa), nulls y CTAs.
 */
describe('SociosEstatalesMap — Wrapper de negocio', () => {
  it('renderiza el mapa con las 32 entidades y la ficha de CDMX por defecto', () => {
    const { container } = renderWithRouter(<SociosEstatalesMap />);
    expect(container.querySelectorAll('.geo-region').length).toBe(32);
    // CDMX viene seleccionada por defecto
    expect(screen.getAllByText('Ciudad de México').length).toBeGreaterThan(0);
  });

  it('el selector ofrece las 32 entidades federativas', async () => {
    renderWithRouter(<SociosEstatalesMap />);
    const input = screen.getByPlaceholderText(/Escribe o selecciona un estado/i);
    fireEvent.mouseDown(input);
    const options = await screen.findAllByRole('option');
    expect(options.length).toBe(32);
  });

  it('seleccionar Tlaxcala (entidad pequena) desde el selector actualiza la ficha igual que el mapa', async () => {
    const onSelect = jest.fn();
    const { container } = renderWithRouter(<SociosEstatalesMap onStateSelect={onSelect} />);

    const input = screen.getByPlaceholderText(/Escribe o selecciona un estado/i);
    fireEvent.mouseDown(input);
    const opciones = await screen.findAllByRole('option');
    const opcionTlaxcala = opciones.find((o) => (o.textContent || '').includes('Tlaxcala'));
    expect(opcionTlaxcala).toBeTruthy();
    fireEvent.click(opcionTlaxcala);

    expect(onSelect).toHaveBeenCalledWith('MX-TLA', expect.any(Object), expect.any(Object));
    // La ficha lateral debe reflejar el cambio de entidad
    const ficha = container.querySelector('.MuiCard-root');
    expect(within(ficha).getByText('MX-TLA · Tlax.')).toBeInTheDocument();
  });

  it('seleccionar Colima desde el selector actualiza la ficha (accesibilidad en entidades minimas)', async () => {
    const onSelect = jest.fn();
    const { container } = renderWithRouter(<SociosEstatalesMap onStateSelect={onSelect} />);

    const input = screen.getByPlaceholderText(/Escribe o selecciona un estado/i);
    fireEvent.mouseDown(input);
    const opciones = await screen.findAllByRole('option');
    const opcionColima = opciones.find((o) => (o.textContent || '').startsWith('Colima'));
    expect(opcionColima).toBeTruthy();
    fireEvent.click(opcionColima);

    expect(onSelect).toHaveBeenCalledWith('MX-COL', expect.any(Object), expect.any(Object));
    const ficha = container.querySelector('.MuiCard-root');
    expect(within(ficha).getByText('MX-COL · Col.')).toBeInTheDocument();
  });

  it('la ficha no muestra campos desconocidos: nunca NaN, $null ni 0 conductores falsos', () => {
    const { container } = renderWithRouter(<SociosEstatalesMap />);
    const texto = container.textContent;
    expect(texto).not.toMatch(/NaN/);
    expect(texto).not.toMatch(/\$null/);
    expect(texto).not.toMatch(/undefined/);
    expect(texto).not.toMatch(/Conductores afiliados estimados/);
    expect(texto).not.toMatch(/Aportación estimada/);
  });

  it('muestra los campos conocidos de la ficha: participacion 5% y hasta 12 MSI', () => {
    renderWithRouter(<SociosEstatalesMap />);
    const texto = document.body.textContent;
    expect(texto).toMatch(/5% de las membres/);
    expect(texto).toMatch(/Hasta 12 meses sin intereses/);
  });

  it('la CTA cambia segun el estatus de la entidad (assigned -> Otras formas de participar)', () => {
    renderWithRouter(<SociosEstatalesMap initialSelectedRegion="MX-CMX" />);
    expect(screen.getByRole('button', { name: /Otras formas de participar/i })).toBeInTheDocument();
  });

  it('la CTA de una entidad disponible ofrece Ver estado', () => {
    renderWithRouter(<SociosEstatalesMap initialSelectedRegion="MX-OAX" />);
    expect(screen.getByRole('button', { name: /Ver estado/i })).toBeInTheDocument();
  });

  it('los datos productivos declaran exactamente 2 entidades asignadas y 30 disponibles', () => {
    expect(sociosData.filter((d) => d.status === 'assigned').map((d) => d.regionId).sort()).toEqual(['MX-CMX', 'MX-MEX']);
    expect(sociosData.filter((d) => d.status === 'available').length).toBe(30);
  });

  it('la metadata geografica expone slug y abreviatura para futuras rutas', () => {
    const oaxaca = mxMeta.regions.find((r) => r.regionId === 'MX-OAX');
    expect(oaxaca.slug).toBe('oaxaca');
    expect(oaxaca.abbreviation).toBe('Oax.');
  });
});
