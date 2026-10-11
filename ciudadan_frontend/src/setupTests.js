// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom

// Polyfills de entorno para paquetes que se adelantan a módulos ESM en jsdom
// (auth0-spa-js, framer-motion en pruebas). jsdom no expone TextEncoder/
// TextDecoder ni algunas APIs de red.
import { TextEncoder, TextDecoder } from "util";

if (typeof globalThis.TextEncoder === "undefined") {
  globalThis.TextEncoder = TextEncoder;
  globalThis.TextDecoder = TextDecoder;
}

if (typeof globalThis.fetch === "undefined") {
  globalThis.fetch = () =>
    Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
    });
}

import '@testing-library/jest-dom';
