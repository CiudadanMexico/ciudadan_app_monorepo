// routes/wiki.js
const express = require("express");
const { Client } = require("@notionhq/client");
const router = express.Router();

const notion = new Client({ auth: process.env.NOTION_TOKEN });

// Escapa texto para HTML
function escapeHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// --- NUEVO: convierte rich_text a HTML manteniendo enlaces y anotaciones básicas ---
function richTextToHtml(rtArr = []) {
  return (rtArr || [])
    .map((seg) => {
      const plain = escapeHtml(seg.plain_text || "");
      const url = seg?.text?.link?.url || null;

      let content = plain;
      const a = seg.annotations || {};
      if (a.code) content = `<code>${content}</code>`;
      if (a.bold) content = `<strong>${content}</strong>`;
      if (a.italic) content = `<em>${content}</em>`;
      if (a.strikethrough) content = `<s>${content}</s>`;
      if (a.underline) content = `<u>${content}</u>`;

      if (url) {
        return `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${content}</a>`;
      }

      if (seg.type === "mention") {
        return escapeHtml(seg.plain_text || "");
      }

      return content;
    })
    .join("");
}
// --- FIN NUEVO ---

// Trae todos los hijos (paginado)
async function fetchAllChildren(blockId) {
  const all = [];
  let cursor = undefined;
  try {
    do {
      const resp = await notion.blocks.children.list({
        block_id: blockId,
        page_size: 100,
        start_cursor: cursor,
      });
      all.push(...(resp.results || []));
      cursor = resp.next_cursor;
    } while (cursor);
  } catch (err) {
    console.error("❌ Error paginando hijos de", blockId, err.message || err);
    throw err;
  }
  return all;
}

function textFromRichText(rtArr = []) {
  return (rtArr || []).map((t) => t.plain_text || "").join("");
}

// --- NUEVO: función auxiliar para detectar si una URL es de YouTube ---
function isYouTubeUrl(url = "") {
  return /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//.test(url);
}

// --- NUEVO: obtiene la URL pública de una página si es posible ---
function buildNotionPageUrl(pageId = "") {
  if (!pageId) return "";
  const cleanId = pageId.replace(/-/g, "");
  return `https://www.notion.so/${cleanId}`;
}

// Renderiza un bloque NOTION como HTML
async function renderBlockAsHtml(block) {
  if (!block || !block.type) return "";

  switch (block.type) {
    case "paragraph": {
      const txt = richTextToHtml(block.paragraph.rich_text);
      return txt ? `<p>${txt}</p>` : "";
    }

    case "heading_1":
      return `<h1>${richTextToHtml(block.heading_1.rich_text)}</h1>`;
    case "heading_2":
      return `<h2>${richTextToHtml(block.heading_2.rich_text)}</h2>`;
    case "heading_3":
      return `<h3>${richTextToHtml(block.heading_3.rich_text)}</h3>`;

    case "bulleted_list_item":
    case "numbered_list_item": {
      const type = block.type;
      const txt = richTextToHtml(block[type].rich_text);
      let hijosHtml = "";
      if (block.has_children) {
        const hijos = await fetchAllChildren(block.id);
        hijosHtml = (await Promise.all(hijos.map((c) => renderBlockAsHtml(c)))).filter(Boolean).join("");
      }
      return `<li>${txt}${hijosHtml ? `<div class="sub-list">${hijosHtml}</div>` : ""}</li>`;
    }

    case "toggle": {
      const titulo = richTextToHtml(block.toggle.rich_text);
      if (!block.has_children) {
        return `<details><summary>${titulo}</summary></details>`;
      }
      const hijos = await fetchAllChildren(block.id);
      const hijosHtml = (await Promise.all(hijos.map((c) => renderBlockAsHtml(c)))).filter(Boolean).join("");
      return `<details><summary>${titulo}</summary>${hijosHtml}</details>`;
    }

    case "image": {
      const url =
        block.image?.external?.url || block.image?.file?.url || "";
      const alt = escapeHtml(block.image?.caption ? textFromRichText(block.image.caption) : "");
      return url ? `<img src="${escapeHtml(url)}" alt="${alt}" />` : "";
    }

    case "divider":
      return `<hr />`;

    case "quote":
      return `<blockquote>${richTextToHtml(block.quote.rich_text)}</blockquote>`;

    case "callout":
      return `<div class="callout">${richTextToHtml(block.callout.rich_text)}</div>`;

    // --- NUEVOS casos ---
    case "embed": {
      const url = block.embed?.url || "";
      if (!url) return "";

      // Si es un link de YouTube, insertamos iframe embebido
      if (isYouTubeUrl(url)) {
        const videoIdMatch = url.match(/(?:v=|youtu\.be\/)([\w-]+)/);
        const videoId = videoIdMatch ? videoIdMatch[1] : null;
        if (videoId) {
          return `<div class="notion-youtube">
            <iframe width="100%" height="315"
              src="https://www.youtube.com/embed/${videoId}"
              frameborder="0"
              allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
              allowfullscreen>
            </iframe>
          </div>`;
        }
      }

      // Otro embed genérico
      return `<div class="notion-embed">
        <iframe src="${escapeHtml(url)}" frameborder="0" allowfullscreen style="width:100%;min-height:240px;"></iframe>
      </div>`;
    }

    case "video": {
      const url = block.video?.external?.url || block.video?.file?.url || "";
      if (!url) return "";

      // Si es YouTube, usar iframe
      if (isYouTubeUrl(url)) {
        const videoIdMatch = url.match(/(?:v=|youtu\.be\/)([\w-]+)/);
        const videoId = videoIdMatch ? videoIdMatch[1] : null;
        if (videoId) {
          return `<div class="notion-youtube">
            <iframe width="100%" height="315"
              src="https://www.youtube.com/embed/${videoId}"
              frameborder="0"
              allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
              allowfullscreen>
            </iframe>
          </div>`;
        }
      }

      // Si no es YouTube, usar video nativo
      return `<video controls style="max-width:100%">
        <source src="${escapeHtml(url)}">Tu navegador no soporta video.
      </video>`;
    }

    case "audio": {
      const url = block.audio?.external?.url || block.audio?.file?.url || "";
      if (!url) return "";
      return `<audio controls style="width:100%">
        <source src="${escapeHtml(url)}">Tu navegador no soporta audio.
      </audio>`;
    }

    case "file": {
      const url = block.file?.external?.url || block.file?.file?.url || "";
      const name =
        block.file?.caption
          ? textFromRichText(block.file.caption)
          : block.file?.file?.name || "Archivo";
      if (!url) return "";
      return `<div class="notion-file">
        <a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(name)}</a>
      </div>`;
    }

    case "bookmark": {
      const url = block.bookmark?.url || "";
      const caption = block.bookmark?.caption
        ? richTextToHtml(block.bookmark.caption)
        : escapeHtml(url);
      return `<div class="notion-bookmark">
        <a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${caption}</a>
      </div>`;
    }

    case "child_page": {
      const title = escapeHtml(block.child_page?.title || "Subpágina");
      const url = buildNotionPageUrl(block.id);
      return `<div class="notion-child-page">
        Página: <a href="${url}" target="_blank" rel="noopener noreferrer"><strong>${title}</strong></a>
      </div>`;
    }

    case "link_preview": {
      const url = block.link_preview?.url || "";
      return url
        ? `<div class="notion-link-preview">
            <a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(url)}</a>
          </div>`
        : "";
    }

    default: {
      if (block.has_children) {
        const hijosFallback = await fetchAllChildren(block.id);
        return (
          await Promise.all(hijosFallback.map((c) => renderBlockAsHtml(c)))
        )
          .filter(Boolean)
          .join("");
      }
      return "";
    }
  }
}

// Obtiene y renderiza toda la página
async function obtenerContenido(paginaId) {
  console.log("☀️ [BACKEND] Consultando página Notion ID:", paginaId);
  try {
    const allTop = await fetchAllChildren(paginaId);
    const htmlPieces = [];

    for (let i = 0; i < allTop.length; i++) {
      const b = allTop[i];

      // Agrupar listas
      if (b.type === "bulleted_list_item" || b.type === "numbered_list_item") {
        const listType = b.type === "bulleted_list_item" ? "ul" : "ol";
        const items = [];
        let j = i;
        while (j < allTop.length && allTop[j].type === b.type) {
          items.push(allTop[j]);
          j++;
        }
        i = j - 1;
        const itemsHtml = (
          await Promise.all(items.map((it) => renderBlockAsHtml(it)))
        )
          .filter(Boolean)
          .join("");
        htmlPieces.push(`<${listType}>${itemsHtml}</${listType}>`);
        continue;
      }

      const rendered = await renderBlockAsHtml(b);
      if (rendered) htmlPieces.push(rendered);
    }

    const fullHtml = htmlPieces.join("\n");
    console.log("✅ [BACKEND] HTML generado correctamente.");
    return fullHtml;
  } catch (err) {
    console.error("❌ [BACKEND] Error al obtener contenido:", err.message);
    throw err;
  }
}

// Endpoint principal
router.get("/:pageId", async (req, res) => {
  const { pageId } = req.params;
  console.log("📡 [API] /wiki/:pageId llamado con ID:", pageId);
  try {
    const html = await obtenerContenido(pageId);
    res.type("text/html").send(html);
  } catch (err) {
    console.error("💥 [API] Falló al enviar contenido:", err.message);
    res.status(500).json({ error: "No se pudo obtener la nota de Notion" });
  }
});

module.exports = router;
