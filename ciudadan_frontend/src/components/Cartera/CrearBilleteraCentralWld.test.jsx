import React from "react";
import { MemoryRouter } from "react-router-dom";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import CrearBilleteraCentralWld from "./CrearBilleteraCentralWld";

// Mock de ethers: en jsdom no hay crypto.getRandomValues para generar claves.
jest.mock("ethers", () => ({
  ethers: {
    Wallet: {
      createRandom: () => ({
        address: "0xABCDEF1234567890abcdef1234567890ABCDEF12",
        privateKey: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcd",
      }),
    },
  },
}));

// Mock de Auth0: sesión válida con token.
jest.mock("@auth0/auth0-react", () => ({
  useAuth0: () => ({
    isAuthenticated: true,
    getAccessTokenSilently: async () => "fake-token",
  }),
}));

const renderInRouter = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>);

const respuestaOk = (carteraId) => ({
  ok: true,
  json: async () => ({ cartera: { id: carteraId }, message: "Wallet vinculada" }),
});

const respuestaError = (mensaje) => ({
  ok: false,
  json: async () => ({ error: { message: mensaje } }),
});

beforeEach(() => {
  global.fetch = jest.fn();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("CrearBilleteraCentralWld", () => {
  it("tras vincular OK permite continuar y no muestra reintento", async () => {
    global.fetch.mockResolvedValueOnce(respuestaOk(7));

    renderInRouter(<CrearBilleteraCentralWld />);
    fireEvent.click(screen.getByText("Generar y Vincular Cartera"));

    // La clave se genera y se muestra para copiar.
    expect(await screen.findByText("He guardado mi clave en lugar seguro")).toBeInTheDocument();
    // El usuario confirma que guardó su clave (como en el flujo real).
    fireEvent.click(screen.getByLabelText(/He guardado mi clave/i));
    // El backend confirmó: aparece continuar, no reintento.
    expect(await screen.findByText("Continuar a mi cartera")).toBeInTheDocument();
    expect(screen.queryByText("Reintentar vinculación")).not.toBeInTheDocument();
    expect(screen.getByText(/Wallet vinculada a tu usuario \(cartera id 7\)/)).toBeInTheDocument();
  });

  it("si la vinculación falla conserva la clave y permite reintentar sin regenerar", async () => {
    global.fetch.mockResolvedValueOnce(respuestaError("Esa dirección ya está en uso"));

    renderInRouter(<CrearBilleteraCentralWld />);
    fireEvent.click(screen.getByText("Generar y Vincular Cartera"));

    // Error visible, clave conservada y botón de reintento.
    expect(await screen.findByText("Reintentar vinculación")).toBeInTheDocument();
    expect(await screen.findByText((_, el) => el?.textContent === "❌ Error: Esa dirección ya está en uso")).toBeInTheDocument();
    expect(screen.getByText("He guardado mi clave en lugar seguro")).toBeInTheDocument();
    // Sin vinculación confirmada NO aparece el botón de continuar.
    fireEvent.click(screen.getByLabelText(/He guardado mi clave/i));
    expect(screen.queryByText("Continuar a mi cartera")).not.toBeInTheDocument();
    expect(screen.getByText(/aún no quedó vinculada en el servidor/)).toBeInTheDocument();

    // El reintento usa la MISMA dirección (sin regenerar): un solo POST más.
    global.fetch.mockResolvedValueOnce(respuestaOk(9));
    fireEvent.click(screen.getByText("Reintentar vinculación"));

    expect(await screen.findByText("Continuar a mi cartera")).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledTimes(2);
    const primerBody = JSON.parse(global.fetch.mock.calls[0][1].body);
    const segundoBody = JSON.parse(global.fetch.mock.calls[1][1].body);
    expect(segundoBody.wallet_address).toBe(primerBody.wallet_address);
  });
});
