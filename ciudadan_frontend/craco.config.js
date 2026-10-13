const path = require("path");

// Permite que cada instancia defina su puerto del dev server vía .env (PORT),
// en vez de tenerlo hardcodeado en git. Default: 3001 (instancia 1).
require("dotenv").config();

module.exports = {
  webpack: {
    alias: {
      "@": path.resolve(__dirname, "src")
    },
    // En dev, el bundle lleva hash en el nombre. Motivo: este dev server se
    // expone por un túnel de Cloudflare y CF cachea los .js del borde (ver
    // devServer.headers más abajo). Con un nombre fijo (/static/js/bundle.js)
    // la clave de caché nunca cambia y el borde sirve código de hace horas,
    // aunque el dev server ya haya recompilado: síntomas de "ya lo arreglé y
    // sigue el error de antes". Con hash, cada build cambia la URL y el borde
    // no tiene otra opción que pedir al origen.
    configure: (config, { env }) => {
      if (env === "development") {
        config.output.filename = "static/js/bundle.[contenthash:8].js";
        config.output.chunkFilename = "static/js/[name].chunk.[contenthash:8].js";
      }
      return config;
    }
  },
  devServer: {
    host: "0.0.0.0",
    port: Number(process.env.PORT) || 3001,
    allowedHosts: "all",
    // CRA no manda Cache-Control en dev, así que Cloudflare inyecta su
    // max-age=14400 para .js y se queda con una versión vieja del bundle
    // (cf-cache-status: STALE, age de horas). Un bundle en desarrollo jamás
    // debe ser cacheable.
    headers: {
      "Cache-Control": "no-store"
    }
  }
};
