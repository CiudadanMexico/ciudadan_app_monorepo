'use strict';
/* Valida localmente catalogo.json + images/ (sin BD, sin --apply, sin schemas).
   Uso: node ciudadan_backend_26/seed/plaza-tecnologia/seed-plaza.cjs */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DIR = __dirname;
const CAT = path.join(DIR, 'catalogo.json');
const IMG = path.join(DIR, 'images');

const firma = (buf) => {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpeg';
  if (buf.length >= 8 && buf[0] === 0x89 && buf.toString('ascii', 1, 4) === 'PNG') return 'png';
  return null;
};

const dim = (buf, tipo) => {
  try {
    if (tipo === 'png' && buf.length > 33) {
      return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
    }
    if (tipo === 'jpeg') {
      let i = 2;
      while (i < buf.length - 9) {
        if (buf[i] !== 0xff) { i += 1; continue; }
        const m = buf[i + 1];
        if (m === 0xc0 || m === 0xc2) {
          return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) };
        }
        i += 2 + buf.readUInt16BE(i + 2);
      }
    }
  } catch (_) { /* sin dimensiones */ }
  return null;
};

const main = () => {
  const cat = JSON.parse(fs.readFileSync(CAT, 'utf8'));
  const fotos = cat.fotos || [];
  const skus = [...new Set(fotos.map((f) => f.sku))];
  const rep = { total_sku: skus.length, total_fotos: fotos.length, ok: [], fallos: [] };
  for (const f of fotos) {
    const p = path.join(IMG, f.archivo);
    const item = { archivo: f.archivo, sku: f.sku, url: f.url, portada: !!f.portada };
    if (!fs.existsSync(p)) { item.error = 'falta archivo'; rep.fallos.push(item); continue; }
    const buf = fs.readFileSync(p);
    const t = firma(buf);
    if (!t) { item.error = 'firma invalida (no JPEG/PNG)'; item.bytes = buf.length; rep.fallos.push(item); continue; }
    const ext = path.extname(f.archivo).toLowerCase();
    if ((t === 'jpeg' && ext !== '.jpg' && ext !== '.jpeg') || (t === 'png' && ext !== '.png')) {
      item.error = `extension ${ext} no coincide con firma ${t}`;
      item.bytes = buf.length; rep.fallos.push(item); continue;
    }
    const d = dim(buf, t);
    item.bytes = buf.length;
    item.formato = t;
    item.resolucion = d ? `${d.w}x${d.h}` : 'desconocida';
    item.sha256 = crypto.createHash('sha256').update(buf).digest('hex');
    rep.ok.push(item);
  }
  fs.writeFileSync(path.join(DIR, 'reporte-validacion.json'), JSON.stringify(rep, null, 2));
  console.log(`SKU: ${rep.total_sku} | fotos: ${rep.total_fotos} | ok: ${rep.ok.length} | fallos: ${rep.fallos.length}`);
  for (const x of rep.fallos) console.log(`FALLO ${x.archivo} (${x.sku}): ${x.error} :: ${x.url}`);
  if (rep.total_sku !== 30 || rep.total_fotos !== 58) { console.error('Totales inesperados (se esperan 30 SKU / 58 fotos)'); process.exitCode = 1; }
  if (rep.fallos.length > 0) process.exitCode = 1;
};

main();
