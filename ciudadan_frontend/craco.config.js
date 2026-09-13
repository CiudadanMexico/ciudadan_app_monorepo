const path = require("path");

module.exports = {
  webpack: {
    alias: {
      "@": path.resolve(__dirname, "src")
    }
  },
  devServer: {
    host: "0.0.0.0",
    port: 3002,
    allowedHosts: "all"
  }
};
