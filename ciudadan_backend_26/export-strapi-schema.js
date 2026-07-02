// export-strapi-schema.js
const fs = require("fs");
const path = require("path");

const apiDir = path.join(__dirname, "src", "api");
let output = `# 📘 Estructura de Colecciones Strapi\n\n`;

function processSchema(schemaPath) {
  const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
  const name = schema.info?.displayName || schema.info?.singularName;
  const attrs = schema.attributes || {};

  output += `## 📦 ${name}\n`;
  for (const [key, val] of Object.entries(attrs)) {
    output += `- **${key}** → \`${val.type}\``;
    if (val.required) output += " *(requerido)*";
    if (val.relation) output += ` (relación con ${val.target})`;
    output += "\n";
  }
  output += "\n";
}

function walkApiFolder() {
  const apis = fs.readdirSync(apiDir);
  for (const api of apis) {
    const schemaPath = path.join(apiDir, api, "content-types", api, "schema.json");
    if (fs.existsSync(schemaPath)) processSchema(schemaPath);
  }
}

walkApiFolder();

fs.writeFileSync("strapi-schema-export.md", output);
console.log("✅ Archivo generado: strapi-schema-export.md");