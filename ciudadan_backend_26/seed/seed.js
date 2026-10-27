// seed/seed.js

const axios = require("axios");

// Usamos "localhost" porque con 127.0.0.1/::1 no alcanzamos a Strapi
const API_URL = "http://localhost:1337/api";
const AUTOR_ID = 4;                   // ID fijo del autor existente en Strapi
const ESTADO_PUBLICADO = "publicado"; // Valor exacto de tu enum "publicado"

// FIX: el campo `contenido` del content-type es tipo `blocks` (array JSON de
// bloques de Strapi), no un string HTML. Antes se enviaba HTML crudo.
function makeBlocksContent(index) {
  return [
    {
      type: 'paragraph',
      children: [{ type: 'text', text: `Este es un párrafo de ejemplo para poblar la colección – Post #${index + 1}.` }],
    },
    {
      type: 'paragraph',
      children: [{ type: 'text', text: 'Segundo párrafo de prueba para verificar que el Rich Text funcione.' }],
    },
  ];
}

// 1) Verificar con GET que Strapi responde en /api/publicaciones
async function checkStrapiReachable() {
  const ruta = `${API_URL}/publicaciones`;
  try {
    console.log(`👉 Probando GET a ${ruta} ...`);
    const res = await axios.get(ruta);
    console.log(`✅ Strapi responde con STATUS ${res.status} y ${res.data.data.length} registros.`);
  } catch (err) {
    console.error("❌ No se pudo conectar con Strapi en /api/publicaciones:");
    if (err.response) {
      console.error(`   → STATUS: ${err.response.status}`);
      console.error(`   → DATA:   ${JSON.stringify(err.response.data, null, 2)}`);
    } else {
      console.error(`   → ERROR:  ${err.message}`);
    }
    process.exit(1);
  }
}

// 2) Crear UNA publicación enviando contenido como HTML
async function createPost(index) {
  const uid = `post-ejemplo-${index + 1}`;
  const timestamp = new Date().toISOString();
  const blocksContent = makeBlocksContent(index);

  const body = {
    data: {
      uid,
      contenido: blocksContent, // Rich Text como blocks de Strapi
      autor: AUTOR_ID,
      archivos: [],            // vacío para no subir archivos
      timestamp,
      publishedAt: timestamp, // FIX: publicar directo (draftAndPublish)
      publicado: ESTADO_PUBLICADO,
    },
  };

  const ruta = `${API_URL}/publicaciones`;
  console.log("--------------------------------------------------");
  console.log(`📤 POST #${index + 1} → ${ruta}`);
  console.log(JSON.stringify(body, null, 2));

  try {
    const res = await axios.post(ruta, body, {
      headers: { "Content-Type": "application/json" },
    });
    console.log(`✅ Publicación ${uid} creada (ID interno: ${res.data.data.id})\n`);
  } catch (err) {
    console.error(`❌ Error al crear publicación #${index + 1} (UID: ${uid}):`);
    if (err.response) {
      console.error(`   → STATUS: ${err.response.status}`);
      console.error(`   → DATA:   ${JSON.stringify(err.response.data, null, 2)}`);
    } else {
      console.error(`   → ERROR:  ${err.message}`);
    }
    console.log("");
  }
}

// 3) Función principal: verificar y luego crear 30 posts
async function seed() {
  await checkStrapiReachable();
  for (let i = 0; i < 30; i++) {
    await createPost(i);
  }
  console.log("✅ Seed finalizado.");
}

seed();
