const path = require("path");

// Permite que cada instancia defina su puerto del dev server vía .env (PORT),
// en vez de tenerlo hardcodeado en git. Default: 3001 (instancia 1).
require("dotenv").config();

module.exports = {
  webpack: {
    alias: {
      "@": path.resolve(__dirname, "src")
    }
  },
  devServer: {
    host: "0.0.0.0",
    port: Number(process.env.PORT) || 3001,
    allowedHosts: "all"
  }
};
