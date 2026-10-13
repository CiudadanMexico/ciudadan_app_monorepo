import React from "react";
import { MemoryRouter } from "react-router-dom";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import MembresiasDetalles from "./MembresiasDetalles";

// Polyfill de jsdom: framer-motion necesita IntersectionObserver para el
// viewport de las secciones. Se limita a este entorno de prueba.
if (typeof globalThis.IntersectionObserver === "undefined") {
  globalThis.IntersectionObserver = class {
    constructor(callback) {
      this.callback = callback;
    }
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// Mock de Auth0: la página decide entre pago inmediato o redirección a login.
jest.mock("@auth0/auth0-react", () => ({
  useAuth0: () => ({
    isAuthenticated: true,
    email: "test@ciudadan.mx",
  }),
}));

jest.mock("../styles/membresias-servidores.css", () => ({}));

// MercadoPagoBoton lee useLocation, por eso el render va dentro de un router.
const renderInRouter = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe("MembresiasDetalles", () => {
  it("renderiza el hero y las secciones de membresías, servidores y FAQ", () => {
    renderInRouter(<MembresiasDetalles />);

    expect(
      screen.getByText("Membresías y servidores de Ciudadan")
    ).toBeInTheDocument();
    expect(screen.getByText("Elige tu forma de estar en la red")).toBeInTheDocument();
    expect(
      screen.getByText("Alquila capacidad y lleva la red contigo")
    ).toBeInTheDocument();
    expect(screen.getByText("Preguntas frecuentes")).toBeInTheDocument();
    expect(screen.getByText("Personal")).toBeInTheDocument();
    expect(screen.getByText("Negocios")).toBeInTheDocument();
    expect(screen.getByText("Servidor compartido")).toBeInTheDocument();
    expect(screen.getByText("Servidor privado")).toBeInTheDocument();
  });
});
