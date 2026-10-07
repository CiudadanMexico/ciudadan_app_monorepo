import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AgregarSocio from './AgregarSocio';
import { getMiembrosAgencia, buscarSociosSinAgencia } from '../../services/cowork/queryServices.js';
import { agregarSocio } from '../../services/cowork/mutationsServices.js';

// --- Mocks controlables -----------------------------------------------------
// `getToken` debe ser UNA referencia estable: si el hook devolviera una función
// nueva en cada render, `useCallback`/`useEffect` entrarían en bucle infinito.
const mockGetToken = jest.fn();
let mockTokenError = null;
let mockIsAuthenticated = true;
let mockIsLoading = false;

jest.mock('../../hooks/useAuth0Token', () => ({
  __esModule: true,
  default: () => ({
    getToken: mockGetToken,
    tokenError: mockTokenError,
    isAuthenticated: mockIsAuthenticated,
    isLoading: mockIsLoading,
    reintentarSesion: jest.fn(),
    setTokenError: jest.fn(),
  }),
}));

jest.mock('../../services/cowork/queryServices.js', () => ({
  getMiembrosAgencia: jest.fn(),
  buscarSociosSinAgencia: jest.fn(),
}));

jest.mock('../../services/cowork/mutationsServices.js', () => ({
  agregarSocio: jest.fn(),
  darDeBajaSocio: jest.fn(),
}));

const renderPagina = () => render(
  <MemoryRouter>
    <AgregarSocio />
  </MemoryRouter>
);

beforeEach(() => {
  jest.clearAllMocks();
  mockTokenError = null;
  mockIsAuthenticated = true;
  mockIsLoading = false;
});

describe('AgregarSocio — sin token no se llama a la API', () => {
  it('no consulta miembros ni búsqueda cuando getToken() devuelve null', async () => {
    mockGetToken.mockResolvedValue(null);

    renderPagina();

    // Se rinde el estado inicial (sin disparar ninguna llamada a Strapi).
    await screen.findByText(/Miembros actuales/i);

    expect(getMiembrosAgencia).not.toHaveBeenCalled();
    expect(buscarSociosSinAgencia).not.toHaveBeenCalled();
    expect(agregarSocio).not.toHaveBeenCalled();
    // Y se explica el motivo en lugar de un "Forbidden" crudo.
    expect(
      await screen.findByText(/No pudimos validar tu sesión/i)
    ).toBeInTheDocument();
  });

  it('muestra el error de sesión con botón de re-login cuando tokenError existe', async () => {
    mockGetToken.mockResolvedValue(null);
    mockTokenError = 'Tu sesión no es válida (login_required). Vuelve a iniciar sesión para continuar.';

    renderPagina();

    expect(await screen.findByRole('alert')).toHaveTextContent(/login_required/);
    expect(
      screen.getByRole('button', { name: /Volver a iniciar sesión/i })
    ).toBeInTheDocument();
  });

  it('avisa a los no autenticados con botón de inicio de sesión', async () => {
    mockGetToken.mockResolvedValue(null);
    mockIsAuthenticated = false;

    renderPagina();

    expect(
      await screen.findByText(/Inicia sesión para ver y agregar socios/i)
    ).toBeInTheDocument();
    expect(getMiembrosAgencia).not.toHaveBeenCalled();
  });

  it('carga los miembros cuando SÍ hay token', async () => {
    mockGetToken.mockResolvedValue('token-de-prueba');
    getMiembrosAgencia.mockResolvedValue({
      ok: true,
      agencia: { id: 1, nombre: 'Agencia Federal' },
      data: [{ id: 9, email: 'miembro@ciudadan.org', roles: { extra: ['socio'] } }],
    });

    renderPagina();

    await waitFor(() => {
      expect(getMiembrosAgencia).toHaveBeenCalledWith('token-de-prueba');
    });
    expect(await screen.findByText('miembro@ciudadan.org')).toBeInTheDocument();
  });
});
