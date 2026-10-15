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
    user: { email: "test@ciudadan.mx" },
  }),
}));

jest.mock("../styles/membresias-servidores.css", () => ({}));

// MercadoPagoBoton lee useLocation, por eso el render va dentro de un router.
const renderInRouter = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe("MembresiasDetalles", () => {
  it("renderiza el hero y las secciones de membresías, servidores y FAQ", () => {
    renderInRouter(<MembresiasDetalles />);

    // Hero
    expect(screen.getByText("Todo lo que necesitas saber")).toBeInTheDocument();

    // Membresías (nombres por defecto cuando el fetch de Strapi no responde)
    expect(screen.getByText("Personal")).toBeInTheDocument();
    expect(screen.getByText("Conductor")).toBeInTheDocument();
    expect(screen.getByText("Negocios")).toBeInTheDocument();

    // Servidores: modalidad activa (toggle + tarjeta -> 2 coincidencias)
    expect(screen.getAllByText("Servidor compartido").length).toBeGreaterThanOrEqual(2);

    // Comparativa con encabezados explícitos
    expect(screen.getByText("Aspecto")).toBeInTheDocument();
    expect(screen.getByText("Compartido")).toBeInTheDocument();
    expect(screen.getByText("Privado")).toBeInTheDocument();

    // FAQ
    expect(screen.getByText("Preguntas frecuentes")).toBeInTheDocument();

    // PubliA sin frases internas
    expect(screen.getByText("Servicios de PubliA")).toBeInTheDocument();
  });

  it("muestra la renta en Labory con equivalencia válida (sin NaN)", () => {
    renderInRouter(<MembresiasDetalles />);
    expect(screen.getAllByText("50 Labory mensuales").length).toBeGreaterThanOrEqual(1);
    // La equivalencia debe formatear $7,358.00 y jamás NaN
    expect(screen.getByText(/\$7,358\.00/)).toBeInTheDocument();
    expect(screen.queryByText(/NaN/)).not.toBeInTheDocument();
  });
});
