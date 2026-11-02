// Tests de la página /candidatos (postulación a socio).
//
// Se verifica el flujo completo de UI: carga de catálogos, validación del
// formulario, envío al servicio (que arma el multipart) y estados de éxito y
// error. Los catálogos y el servicio se aíslan con mocks; el resto de la
// página (incluido RegistrationField) se renderiza de verdad.

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import Candidatos from './Candidatos';
import { getAvailableRootAreas, getAgencias } from '../services/cowork/queryServices.js';
import { crearPostulacionSocio } from '../services/cowork/candidatosService.js';

jest.mock('@auth0/auth0-react', () => ({
  useAuth0: () => ({
    isAuthenticated: false,
    isLoading: false,
    user: undefined,
    loginWithRedirect: jest.fn(),
  }),
}));

jest.mock('../services/cowork/queryServices.js', () => ({
  getAvailableRootAreas: jest.fn(),
  getAgencias: jest.fn(),
}));

jest.mock('../services/cowork/candidatosService.js', () => ({
  crearPostulacionSocio: jest.fn(),
}));

const AREAS = { data: [{ id: 1, attributes: { name: 'Administrativo' } }] };
const AGENCIAS = { data: [{ id: 7, attributes: { nombre: 'Local Centro' } }] };

const renderPagina = () =>
  render(
    <MemoryRouter>
      <Candidatos />
    </MemoryRouter>
  );

/**
 * El botón de envío permanece deshabilitado mientras se cargan los catálogos
 * (áreas/agencias), así que hay que esperar a que esté habilitado para poder
 * disparar el submit.
 */
async function botonEnviar() {
  const boton = await screen.findByRole('button', { name: /Enviar postulación/i });
  await waitFor(() => expect(boton).toBeEnabled());
  return boton;
}

/** Rellena el formulario con datos válidos (sin CV). */
async function rellenarFormulario() {
  const nombre = await screen.findByLabelText(/Nombre/i);
  const apellidos = screen.getByLabelText(/Apellidos/i);
  const email = screen.getByLabelText(/Correo electrónico/i);
  const telefono = screen.getByLabelText(/Teléfono \/ WhatsApp/i);
  const descripcion = screen.getByLabelText(/¿Por qué quieres ser socio\?/i);

  fireEvent.change(nombre, { target: { value: 'Ana' } });
  fireEvent.change(apellidos, { target: { value: 'Candidate' } });
  fireEvent.change(email, { target: { value: 'ana@example.com' } });
  fireEvent.change(telefono, { target: { value: '5512345678' } });
  fireEvent.change(descripcion, { target: { value: 'Quiero participar en el proyecto' } });

  // Área y agencia (select de MUI).
  fireEvent.mouseDown(screen.getByLabelText(/Área de interés/i));
  fireEvent.click(await screen.findByRole('option', { name: 'Administrativo' }));
  fireEvent.mouseDown(screen.getByLabelText(/Agencia a la que te postulas/i));
  fireEvent.click(await screen.findByRole('option', { name: 'Local Centro' }));

  // Consentimiento.
  fireEvent.click(screen.getByRole('checkbox'));
}

beforeEach(() => {
  jest.clearAllMocks();
  getAvailableRootAreas.mockResolvedValue(AREAS);
  getAgencias.mockResolvedValue(AGENCIAS);
  crearPostulacionSocio.mockResolvedValue({ data: { id: 1, estado: 'pendiente' } });
});

describe('Candidatos — carga de catálogos', () => {
  it('pide las áreas y las agencias al backend al montar', async () => {
    renderPagina();

    await waitFor(() => expect(getAvailableRootAreas).toHaveBeenCalled());
    expect(getAgencias).toHaveBeenCalled();
  });

  it('ofrece las áreas y agencias recibidas como opciones', async () => {
    renderPagina();

    fireEvent.mouseDown(await screen.findByLabelText(/Área de interés/i));
    expect(await screen.findByRole('option', { name: 'Administrativo' })).toBeInTheDocument();
  });

  it('si los catálogos fallan, avisa y deja continuar sin ellos', async () => {
    getAvailableRootAreas.mockRejectedValue(new Error('boom'));
    getAgencias.mockRejectedValue(new Error('boom'));

    renderPagina();

    expect(
      await screen.findByText(/No pudimos cargar las áreas y agencias/i)
    ).toBeInTheDocument();
    // Sin catálogo, área y agencia dejan de ser obligatorias.
    expect(screen.getByText(/Todavía no hay áreas publicadas/i)).toBeInTheDocument();
    expect(screen.getByText(/Todavía no hay agencias publicadas/i)).toBeInTheDocument();
  });
});

describe('Candidatos — validación y envío', () => {
  it('no envía si faltan campos obligatorios y los marca con error', async () => {
    renderPagina();
    await screen.findByLabelText(/Nombre/i);

    fireEvent.click(await botonEnviar());

    // Varios campos a la vez están vacíos: el error aparece en cada uno.
    const errores = await screen.findAllByText('Este campo es obligatorio.');
    expect(errores.length).toBeGreaterThan(0);
    expect(crearPostulacionSocio).not.toHaveBeenCalled();
  });

  it('exige el consentimiento antes de enviar', async () => {
    renderPagina();
    await screen.findByLabelText(/Nombre/i);

    // Se rellena todo menos el consentimiento.
    fireEvent.change(screen.getByLabelText(/Nombre/i), { target: { value: 'Ana' } });
    fireEvent.change(screen.getByLabelText(/Apellidos/i), { target: { value: 'Candidate' } });
    fireEvent.change(screen.getByLabelText(/Correo electrónico/i), {
      target: { value: 'ana@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/Teléfono \/ WhatsApp/i), {
      target: { value: '5512345678' },
    });
    fireEvent.change(screen.getByLabelText(/¿Por qué quieres ser socio\?/i), {
      target: { value: 'Quiero participar' },
    });

    fireEvent.click(await botonEnviar());

    expect(await screen.findAllByText('Este campo es obligatorio.')).not.toHaveLength(0);
    expect(crearPostulacionSocio).not.toHaveBeenCalled();
  });

  it('rechaza un email con formato inválido', async () => {
    renderPagina();
    await screen.findByLabelText(/Nombre/i);

    fireEvent.change(screen.getByLabelText(/Correo electrónico/i), {
      target: { value: 'no-es-un-email' },
    });
    fireEvent.click(await botonEnviar());

    expect(
      await screen.findByText('Escribe un correo electrónico válido.')
    ).toBeInTheDocument();
    expect(crearPostulacionSocio).not.toHaveBeenCalled();
  });

  it('envía la postulación con los datos del visitante cuando todo es válido', async () => {
    renderPagina();
    await rellenarFormulario();

    fireEvent.click(await botonEnviar());

    await waitFor(() => expect(crearPostulacionSocio).toHaveBeenCalledTimes(1));

    const payload = crearPostulacionSocio.mock.calls[0][0];
    expect(payload.nombre_completo).toBe('Ana Candidate');
    expect(payload.email).toBe('ana@example.com');
    expect(payload.telefono).toBe('5512345678');
    expect(payload.descripcion).toBe('Quiero participar en el proyecto');
    expect(payload.consentimiento).toBe(true);
    expect(payload.area).toBe('1');
    expect(payload.agencia).toBe('7');
    expect(payload.cv).toBeNull();
  });

  it('muestra la confirmación tras enviar correctamente', async () => {
    renderPagina();
    await rellenarFormulario();

    fireEvent.click(await botonEnviar());

    expect(
      await screen.findByText(/Recibimos tu postulación/i, undefined, { timeout: 4000 })
    ).toBeInTheDocument();
  });

  it('muestra el error del backend y permite reintentar', async () => {
    crearPostulacionSocio.mockRejectedValueOnce(
      new Error('El área seleccionada ya no está disponible.')
    );

    renderPagina();
    await rellenarFormulario();

    fireEvent.click(await botonEnviar());

    expect(
      await screen.findByText('El área seleccionada ya no está disponible.')
    ).toBeInTheDocument();
    // El botón vuelve a estar disponible para reintentar.
    expect(screen.getByRole('button', { name: /Enviar postulación/i })).toBeEnabled();
  });
});
