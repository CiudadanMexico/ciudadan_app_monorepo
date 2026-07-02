// seed/test.js
const axios = require("axios");

axios
  .get("http://localhost:1337/api/publicaciones")
  .then(res => {
    console.log("✅ Conexión OK (localhost), status:", res.status);
  })
  .catch(err => {
    console.error("❌ Error de conexión (localhost):", err.message);
  });
