'use strict';
/* Seed idempotente tienda oficial + 30 productos (Bloque 2).
   node seed/seed-plaza-tecnologia.js            (valida local, sin BD)
   node seed/seed-plaza-tecnologia.js --apply    (crea/actualiza en BD)
   node seed/seed-plaza-tecnologia.js --apply --publish  (ademas publica listos)
   Owner/email: PLAZA_STORE_OWNER_ID / PLAZA_STORE_EMAIL (sin desvincular ajenas).
   Solo toca campos administrados; conserva financieros/operativos y datos ajenos.
*/
const fs = require('fs');
const path = require('path');
const DIR = __dirname;
const MODO_APLICAR = process.argv.includes('--apply');
const MODO_PUBLICAR = process.argv.includes('--publish');
const TIENDA = {
  name: 'La plaza de la tecnología a tu casa',
  slug: 'la-plaza-de-la-tecnologia-a-tu-casa',
  isOfficial: true,
  descripcion: 'Del Eje Central a tu escritorio. Somos la tienda oficial de Ciudadan que lleva la experiencia de la Plaza de la Tecnología del Centro de la Ciudad de México hasta tu casa. Encuentra computadoras, laptops, monitores, componentes y accesorios para estudiar, trabajar, crear y jugar. Seleccionamos equipos con información clara y precios transparentes, acercando la tecnología a nuestra comunidad con atención humana y el respaldo de nuestra red cooperativa.',
  localidad: 'zona Centro, Ciudad de México, México',
  direccion_texto: 'Eje Central Lázaro Cárdenas, zona Centro, Ciudad de México, México',
};
const precioDesdeCosto = (costo) => Math.round(Number(costo) * 1.05 * 100) / 100;
const leer = (f) => JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'));
const validarLocal = () => {
  const cat = leer('catalogo.json');
  const prod = leer('catalogo-productos.json');
  const porSku = {};
  for (const f of cat.fotos) (porSku[f.sku] = porSku[f.sku] || []).push(f);
  let errores = 0;
  for (const p of prod.productos) {
    if (!(p.costo_mxn > 0)) { console.log('SIN COSTO: ' + p.sku); errores += 1; continue; }
    const fotos = porSku[p.sku] || [];
    if (fotos.length === 0) { console.log('SIN FOTOS: ' + p.sku); errores += 1; continue; }
    if (!fotos.some((f) => f.portada)) { console.log('SIN PORTADA: ' + p.sku); errores += 1; }
    for (const f of fotos) {
      if (!fs.existsSync(path.join(DIR, 'images', f.archivo))) { console.log('FALTA ARCHIVO: ' + f.archivo); errores += 1; }
    }
    const esperado = precioDesdeCosto(p.costo_mxn);
    if (p.precio_mxn && Number(p.precio_mxn) !== esperado) console.log('PRECIO DIFIERE ' + p.sku + ': ' + p.precio_mxn + ' vs ' + esperado);
  }
  console.log('Tienda: ' + TIENDA.slug + ' | isOfficial: ' + TIENDA.isOfficial + ' | modo: ' + (MODO_APLICAR ? 'apply' : 'validar'));
  console.log('SKU: ' + prod.productos.length + ' | fotos: ' + cat.total_fotos);
  return errores;
};
const aplicar = async () => {
  const BACKEND_DIR = path.resolve(DIR, '..');
  process.env.ENV_PATH = path.join(BACKEND_DIR, '.env');
  try { require('dotenv').config({ path: process.env.ENV_PATH }); } catch (_) {}
  const Strapi = require('@strapi/strapi');
  const app = await Strapi({ appDir: BACKEND_DIR }).load();
  const stats = { tienda: 'reutilizada', creados: 0, actualizados: 0, imgNuevas: 0, imgReutil: 0, errores: 0 };
  try {
    const prod = leer('catalogo-productos.json');
    const cat = leer('catalogo.json');
    const fotosPorSku = {};
    for (const f of cat.fotos) (fotosPorSku[f.sku] = fotosPorSku[f.sku] || []).push(f);
    const tiendas = await app.db.query('api::store.store').findMany({ where: { slug: TIENDA.slug } });
    if (tiendas.length > 1) throw new Error('Conflicto: ' + tiendas.length + ' tiendas con slug ' + TIENDA.slug + '. No se crea copia.');
    let tienda = tiendas[0] || null;
    const ownerId = process.env.PLAZA_STORE_OWNER_ID ? Number(process.env.PLAZA_STORE_OWNER_ID) : null;
    const ownerEmail = process.env.PLAZA_STORE_EMAIL || null;
    if (!tienda) {
      const data = { name: TIENDA.name, slug: TIENDA.slug, descripcion: TIENDA.descripcion, localidad: TIENDA.localidad, isOfficial: true };
      if (ownerId) data.users_permissions_user = ownerId;
      if (ownerEmail) data.email = ownerEmail;
      tienda = await app.entityService.create('api::store.store', { data });
      stats.tienda = 'creada id=' + tienda.id;
    } else {
      await app.entityService.update('api::store.store', tienda.id, { data: { name: TIENDA.name, descripcion: TIENDA.descripcion, localidad: TIENDA.localidad, isOfficial: true } });
      const full = await app.entityService.findOne('api::store.store', tienda.id, { populate: ['users_permissions_user'] });
      const tieneOwner = (full && full.users_permissions_user && (full.users_permissions_user.id || full.users_permissions_user)) || null;
      if (!tieneOwner && ownerId) await app.entityService.update('api::store.store', tienda.id, { data: { users_permissions_user: ownerId } });
      if (!(full && full.email) && ownerEmail) await app.entityService.update('api::store.store', tienda.id, { data: { email: ownerEmail } });
    }
    const dirs = await app.db.query('api::direccion.direccion').findMany({ where: { store_id: tienda.id } });
    if (dirs.length === 0) {
      const d = await app.entityService.create('api::direccion.direccion', { data: { direccion: { texto: TIENDA.direccion_texto, ciudad: 'Ciudad de México', estado: 'Ciudad de México', pais: 'México' }, ciudad: 'Ciudad de México', estado: 'Ciudad de México', pais: 'México', store_id: tienda.id, activa: true, predeterminada: true } });
      await app.entityService.update('api::store.store', tienda.id, { data: { direccion: d.id } });
    }
    const catIds = {};
    for (const slug of ['computacion', 'electronica-y-tecnologia']) {
      const rows = await app.db.query('api::store-categorie.store-categorie').findMany({ where: { slug } });
      if (rows.length === 0) throw new Error('Falta categoria slug=' + slug + ' (reutilizar, no crear aqui).');
      catIds[slug] = rows[0].id;
    }
    const subirSiFalta = async (nombreArchivo, alt) => {
      const filePath = path.join(DIR, 'images', nombreArchivo);
      const ex = await app.db.query('plugin::upload.file').findMany({ where: { name: nombreArchivo } });
      if (ex && ex.length) { stats.imgReutil += 1; return ex[0]; }
      const sub = await app.plugin('upload').service('upload').upload({
        data: { fileInfo: { name: nombreArchivo, alternativeText: alt, caption: alt } },
        files: { name: nombreArchivo, type: nombreArchivo.endsWith('.png') ? 'image/png' : 'image/jpeg', size: fs.statSync(filePath).size, path: filePath },
      });
      stats.imgNuevas += 1;
      return sub[0];
    };
    for (const p of prod.productos) {
      try {
        const slug = p.sku.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-plaza-tecnologia';
        const rows = await app.db.query('api::producto.producto').findMany({ where: { slug } });
        if (rows.length > 1) { console.log('CONFLICTO slug duplicado ' + slug + ': no se toca'); stats.errores += 1; continue; }
        const fotos = (fotosPorSku[p.sku] || []).slice().sort((a, b) => (a.portada ? -1 : 1));
        const precio = precioDesdeCosto(p.costo_mxn);
        const existente = rows[0] || null;
        if (existente) {
          const patch = { nombre: p.nombre, precio, store: tienda.id, store_id: String(tienda.id), store_category: catIds[p.categoria_slug], tags: 'plaza-tecnologia,plaza-tecnologia-a-tu-casa,' + p.sku };
          if (ownerEmail) patch.store_email = ownerEmail;
          await app.entityService.update('api::producto.producto', existente.id, { data: patch });
          stats.actualizados += 1;
        } else {
          const galeria = [];
          for (const f of fotos) galeria.push((await subirSiFalta(f.archivo, p.nombre + ' (' + p.sku + ')')).id);
          const data = { nombre: p.nombre, slug, descripcion: p.nombre, precio, marca: (p.sku.split(/[-/_]/)[0] || p.sku), store: tienda.id, store_id: String(tienda.id), store_category: catIds[p.categoria_slug], tags: 'plaza-tecnologia,plaza-tecnologia-a-tu-casa,' + p.sku, stock: -1, usa_stock: false, activo: true, imagenes: galeria, imagen_predeterminada: galeria.slice(0, 1) };
          if (ownerEmail) data.store_email = ownerEmail;
          if (MODO_PUBLICAR) data.publishedAt = new Date().toISOString();
          await app.entityService.create('api::producto.producto', { data });
          stats.creados += 1;
        }
      } catch (e) { console.log('ERROR ' + p.sku + ': ' + e.message); stats.errores += 1; }
    }
    console.log('Tienda ' + stats.tienda + ' | creados: ' + stats.creados + ' | actualizados: ' + stats.actualizados + ' | img nuevas: ' + stats.imgNuevas + ' | img reutilizadas: ' + stats.imgReutil + ' | errores: ' + stats.errores);
    if (stats.errores > 0) process.exitCode = 1;
  } finally { await app.destroy(); }
};
(async () => {
  const errores = validarLocal();
  if (errores > 0) { process.exitCode = 1; return; }
  if (MODO_APLICAR) await aplicar();
})();
