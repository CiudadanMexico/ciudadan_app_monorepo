import "@testing-library/jest-dom";
import { useCarteraUsuario } from "./useCarteraUsuario";
import { renderHook, act } from "@testing-library/react";

// Mock de Auth0: sesión válida con token.
jest.mock("@auth0/auth0-react", () => ({
  useAuth0: () => ({
    isAuthenticated: true,
    getAccessTokenSilently: async () => "fake-token",
  }),
}));

// Normalizador (debe coincidir con Billetera.jsx): el controlador puede
// devolver la cartera directa o envuelta en uno o dos niveles de data.
const normalizarCartera = (data) =>
  data?.data?.data ?? data?.data ?? data ?? null;

describe("useCarteraUsuario.getCarteraUsuario", () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("construye la URL con ?filters (no 404) y devuelve result.data", async () => {
    global.fetch.mockResolvedValueOnce({
      json: async () => ({ data: [{ id: 3, wallet_address: "0xabc" }] }),
    });

    const { result } = renderHook(() => useCarteraUsuario());
    let carteras;
    await act(async () => {
      carteras = await result.current.getCarteraUsuario(42);
    });

    const url = global.fetch.mock.calls[0][0];
    expect(url).toContain("?filters[user_id][id][$eq]=42");
    expect(carteras).toEqual([{ id: 3, wallet_address: "0xabc" }]);
  });

  it("normaliza los tres envelopes de respuesta de /api/cartera", () => {
    const cuerpo = { wallet_address: "0xabc", laborysSaldo: 5 };
    expect(normalizarCartera(cuerpo)?.wallet_address).toBe("0xabc");
    expect(normalizarCartera({ data: cuerpo })?.wallet_address).toBe("0xabc");
    expect(normalizarCartera({ data: { data: cuerpo } })?.wallet_address).toBe("0xabc");
    expect(normalizarCartera(null)).toBeNull();
  });
});
