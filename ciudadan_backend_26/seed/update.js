// seed/update.js

const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
const path = require("path");

// URL base de tu Strapi (localhost:1337)
const API_URL = "http://localhost:1337/api";
const AUTOR_ID = 4;                   // ID fijo del autor existente en Strapi
const ESTADO_PUBLICADO = "publicado"; // Valor exacto de tu enum “publicado”
const PLACEHOLDER_PATH = path.join(__dirname, "placeholder.jpg");

// 30 títulos temáticos sobre cannabis
const titles = [
  "Cannabis y Bienestar Holístico",
  "Uso Medicinal del Cannabis",
  "Historia del Cannabis en México",
  "Cannabis y Manejo del Dolor Crónico",
  "Propiedades Antiinflamatorias del Cannabis",
  "Cannabis en el Tratamiento de la Ansiedad",
  "Diferencias entre CBD y THC",
  "Cultivo Responsable de Cannabis en Casa",
  "Cannabis y Salud Mental",
  "El Rol del Cannabis en la Epilepsia",
  "Cannabis como Alternativa al Opioide",
  "Aspectos Legales del Cannabis en México",
  "Impacto del Cannabis en la Creatividad",
  "Beneficios Nutricionales del Aceite de Cannabis",
  "Cannabis y Deporte: Recuperación Muscular",
  "La Ciencia Detrás del CBD",
  "Cannabis y Sistema Endocannabinoide",
  "Tendencias de Mercado del Cannabis Medicinal",
  "Cannabis y Sueño Reparador",
  "Extracción Segura de Aceites de Cannabis",
  "Cannabis para el Síndrome de Tourette",
  "Uso del Cannabis en Oncología",
  "Cannabis y Epilepsia Refractaria",
  "Cannabis y Control de Náuseas",
  "El Futuro del Cannabis Genéticamente Modificado",
  "Cannabis y Terapias Complementarias",
  "Cannabis en la Agricultura Sostenible",
  "Mitigación de Efectos Secundarios con Cannabinoides",
  "Cannabis para Pacientes Geriátricos",
  "Innovaciones en Productos de Cannabis"
];

// 30 párrafos temáticos sobre cannabis (uno por post)
const paragraphs = [
  "El cannabis ha sido utilizado durante siglos con fines terapéuticos. Su uso en el bienestar holístico está ganando popularidad gracias a sus propiedades equilibrantes.",
  "Numerosos estudios demuestran que el cannabis, especialmente el CBD, puede aliviar síntomas de enfermedades crónicas sin los efectos secundarios de los opioides.",
  "En México, la historia del cannabis se remonta a prácticas ancestrales. Su reciente legalización abre un nuevo capítulo en la investigación y el mercado local.",
  "Para quienes padecen dolor crónico, el cannabis ofrece una opción alternativa que puede reducir inflamación y mejorar la calidad de vida sin adicción.",
  "Las propiedades antiinflamatorias del cannabis provienen de compuestos como el CBD, que inhiben mediadores inflamatorios sin causar psicoactividad.",
  "El uso del cannabis en pacientes con ansiedad ha mostrado resultados prometedores, ayudando a regular neurotransmisores como la serotonina.",
  "El CBD y el THC son dos cannabinoides con efectos distintos. El CBD no es psicoactivo y ayuda con inflamación, mientras que el THC produce euforia controlada.",
  "Cultivar cannabis en casa de manera responsable implica controlar la humedad, la luz y la calidad del suelo para obtener cogollos libres de contaminantes.",
  "Diversas investigaciones vinculan el consumo moderado de cannabis con mejoras en la salud mental, como reducción de estrés y manejo de crisis de pánico.",
  "En el tratamiento de la epilepsia, especialmente en niños, el CBD ha mostrado reducir drásticamente la frecuencia de las convulsiones.",
  "Frente a la epidemia de opioides, el cannabis se presenta como una alternativa más segura para el manejo del dolor, con menor riesgo adictivo.",
  "Aunque el consumo recreativo sigue siendo controversial, el marco legal en México avanza hacia la regulación médica y el autoconsumo responsable.",
  "Muchos creadores y artistas afirman que el cannabis estimula la creatividad, permitiendo nuevas conexiones neuronales durante el proceso artístico.",
  "El aceite de cannabis contiene ácidos grasos esenciales que benefician la salud cardiovascular y pueden fortalecer el sistema inmune.",
  "Deportistas están explorando el cannabis para acelerar la recuperación muscular, reducir inflamación y mejorar la calidad del sueño post-entrenamiento.",
  "El CBD actúa modulando receptores del sistema endocannabinoide, disminuyendo la ansiedad y favoreciendo la neuroprotección.",
  "El sistema endocannabinoide regula funciones como el apetito, la memoria y el sueño. El cannabis interactúa con receptores CB1 y CB2 para restablecer el equilibrio.",
  "El mercado del cannabis medicinal en México está en auge. Se esperan inversiones en investigación y desarrollo para nuevos productos farmacéuticos.",
  "Para quienes sufren insomnio, el cannabis puede ser la clave para un descanso reparador, gracias a su influencia en ciclos de sueño profundo.",
  "Las técnicas de extracción determinan la pureza del aceite de cannabis. Métodos como CO₂ supercrítico garantizan calidad farmacéutica.",
  "Pacientes con síndrome de Tourette han experimentado disminución de tics al usar dosis controladas de cannabinoides como el CBD.",
  "El cannabis en oncología ayuda a controlar náuseas y mejora el apetito durante quimioterapias, aumentando la adherencia al tratamiento.",
  "En epilepsias refractarias, el cannabis medicinal demostró eficacia donde otros anticonvulsivos fallaron, ofreciendo esperanza a familias.",
  "El efecto antiemético del cannabis es esencial para pacientes que reciben quimioterapia, aliviando náuseas sin recurrir a fármacos invasivos.",
  "La biotecnología avanza en variantes de cannabis mejoradas genéticamente, con mayor concentración de cannabinoides benéficos y menor THC.",
  "El uso de cannabis en terapias complementarias, como acupuntura y yoga, potencia resultados al combinar lo físico con lo mental.",
  "El cultivo de cannabis puede ser sostenible si se emplean técnicas como riego por goteo y energías renovables para el control climático.",
  "Los cannabinoides menores, como el CBG, ayudan a mitigar efectos secundarios de otros tratamientos, ofreciendo un espectro terapéutico más amplio.",
  "Para la población geriátrica, el cannabis puede aliviar dolores articulares y mejorar el ánimo, siempre bajo supervisión médica cuidadosa.",
  "Innovaciones en productos de cannabis incluyen comestibles, parches transdérmicos y sprays sublinguales que ofrecen dosificación precisa."
];

// 1) Subir placeholder.jpg y devolver su ID, con logging detallado
async function uploadImage() {
  try {
    const form = new FormData();
    form.append("files", fs.createReadStream(PLACEHOLDER_PATH));

    console.log("👉 Subiendo placeholder.jpg a Strapi...");
    const res = await axios.post(`${API_URL}/upload`, form, {
      headers: form.getHeaders(),
    });
    const imageId = res.data[0].id;
    console.log(`✅ Imagen subida correctamente. ID = ${imageId}`);
    return imageId;
  } catch (err) {
    console.error("❌ Error subiendo placeholder.jpg:");
    if (err.response) {
      console.error(`   → STATUS: ${err.response.status}`);
      console.error(`   → DATA:   ${JSON.stringify(err.response.data, null, 2)}`);
    } else {
      console.error(`   → ERROR:  ${err.message}`);
      console.error(`   → STACK:  ${err.stack}`);
    }
    process.exit(1);
  }
}

// 2) Obtener todos los posts existentes
async function fetchAllPosts() {
  try {
    const res = await axios.get(`${API_URL}/publicaciones?pagination[limit]=100`);
    return res.data.data; // Array de { id, attributes }
  } catch (err) {
    console.error("❌ Error obteniendo posts:");
    if (err.response) {
      console.error(`   → STATUS: ${err.response.status}`);
      console.error(`   → DATA:   ${JSON.stringify(err.response.data, null, 2)}`);
    } else {
      console.error(`   → ERROR:  ${err.message}`);
      console.error(`   → STACK:  ${err.stack}`);
    }
    process.exit(1);
  }
}

// 3) Actualizar un post: añadir título (h2), párrafo cannabis y asignar imagen
async function updatePost(post, imageId, index) {
  const postId = post.id;
  const attrs = post.attributes;
  // Mostrar el contenido anterior para diagnosticar
  console.log(`\n── Contenido anterior del post ID ${postId} ──`);
  console.log(attrs.contenido);
  console.log("───────────────────────────────────────────────");

  const title = titles[index % titles.length];
  const paragraph = paragraphs[index % paragraphs.length];

  // Construir contenido nuevo: H2 + contenido anterior + párrafo adicional
  const newContent = `
    <h2>${title}</h2>
    ${attrs.contenido || ""}
    <p>${paragraph}</p>
  `;
  console.log(`\n~~ Contenido NUEVO que se va a enviar para post ID ${postId} ~~`);
  console.log(newContent);
  console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~");

  const newArchivos = [imageId];
  const body = {
    data: {
      contenido: newContent,
      archivos: newArchivos,
    },
  };

  const ruta = `${API_URL}/publicaciones/${postId}`;
  console.log(`\n📤 PUT → ${ruta}`);
  console.log(JSON.stringify(body, null, 2));

  try {
    // Usamos PUT en lugar de PATCH ya que Strapi valida PUT para actualizar
    await axios.put(ruta, body, {
      headers: { "Content-Type": "application/json" },
    });
    console.log(`✅ Post ID ${postId} actualizado correctamente.`);
  } catch (err) {
    console.error(`❌ Error actualizando post ID ${postId}:`);
    if (err.response) {
      console.error(`   → STATUS: ${err.response.status}`);
      console.error(`   → DATA:   ${JSON.stringify(err.response.data, null, 2)}`);
    } else {
      console.error(`   → ERROR:  ${err.message}`);
      console.error(`   → STACK:  ${err.stack}`);
    }
  }
}

// 4) Función principal: sube imagen, obtiene posts y actualiza cada uno
async function seedUpdate() {
  const imageId = await uploadImage();
  const posts = await fetchAllPosts();

  console.log(`\n✅ Encontrados ${posts.length} posts en Strapi. Iniciando actualización...\n`);
  for (let i = 0; i < posts.length; i++) {
    await updatePost(posts[i], imageId, i);
  }

  console.log("✅ Todos los posts han sido actualizados.");
}

seedUpdate();
