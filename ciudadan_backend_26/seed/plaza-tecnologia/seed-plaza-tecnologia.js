'use strict';
/* Seed idempotente tienda oficial + 30 productos (Bloque 3: catalogo oficial).
   node seed/plaza-tecnologia/seed-plaza-tecnologia.js            (valida local, sin BD)
   node seed/plaza-tecnologia/seed-plaza-tecnologia.js --apply    (crea/actualiza en BD)
   node seed/plaza-tecnologia/seed-plaza-tecnologia.js --apply --publish  (ademas publica listos)
   Fuentes: catalogo-oficial.json (seed_key ciudadan-plaza-beta-v1) + revalidacion-26oct.json.
   Slugs: productos nuevos usan el slug oficial del catalogo (ptc-cp-*); el lookup incluye
   el slug oficial y el legacy (<sku>-plaza-tecnologia de corridas previas) para no duplicar.
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
const SEED_KEY = 'ciudadan-plaza-beta-v1';
const CATEGORIAS = ['computacion', 'electronica-y-tecnologia'];
const precioDesdeCosto = (costo) => Math.round(Number(costo) * 1.05 * 100) / 100;
const leer = (f) => JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'));
const slugLegacy = (p) => p.sku.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-plaza-tecnologia';
const costoCatalogo = (p) => (p.supplier && p.supplier.cost_centavos != null ? p.supplier.cost_centavos / 100 : null);

/* Precio por SKU: base = catalogo oficial. Los 26 revalidados aplican
   precio = redondear(costo_observado * 1.05, 2). La anomalia documentada
   (DTXM/128GB) y los sin_cambios mantienen el precio del catalogo. */
const resolverPrecios = (productos, reval) => {
  const cambios = new Map((reval.cambios || []).map((c) => [c.sku, c]));
  const anomalias = new Map((reval.anomalias || []).map((a) => [a.sku, a]));
  const sinCambios = new Set(reval.sin_cambios || []);
  const porSku = new Map(productos.map((p) => [p.sku, p]));
  const precios = new Map();
  const avisos = [];
  const errores = [];
  for (const c of cambios.values()) {
    if (!porSku.has(c.sku)) errores.push('revalidacion: SKU desconocido en cambios: ' + c.sku);
    else if (!(c.costo_observado > 0)) errores.push('revalidacion: costo_observado invalido: ' + c.sku);
  }
  for (const a of anomalias.values()) if (!porSku.has(a.sku)) errores.push('revalidacion: SKU desconocido en anomalias: ' + a.sku);
  for (const s of sinCambios) if (!porSku.has(s)) errores.push('revalidacion: SKU desconocido en sin_cambios: ' + s);
  for (const p of productos) {
    const base = Number(p.precio);
    const cambio = cambios.get(p.sku);
    if (cambio) {
      const cat = costoCatalogo(p);
      if (cat != null && Math.abs(cat - cambio.costo_anterior) > 0.005) avisos.push(p.sku + ': costo_anterior revalidacion (' + cambio.costo_anterior + ', baseline scrape 12-oct) difiere del costo del catalogo (' + cat + '); se aplica costo_observado ' + cambio.costo_observado);
      precios.set(p.sku, { precio: precioDesdeCosto(cambio.costo_observado), anterior: base, origen: 'revalidacion-26oct' });
    } else if (anomalias.has(p.sku)) {
      precios.set(p.sku, { precio: base, origen: 'anomalia-documentada', nota: anomalias.get(p.sku).nota || '' });
    } else if (sinCambios.has(p.sku)) {
      precios.set(p.sku, { precio: base, origen: 'catalogo-oficial' });
    } else {
      errores.push(p.sku + ': sin cobertura en revalidacion (cambios/anomalias/sin_cambios)');
    }
  }
  return { precios, avisos, errores };
};

/* Validacion local: sin BD, sin Strapi (el require de Strapi solo vive dentro de aplicar()). */
const validarLocal = () => {
  const cat = leer('catalogo-oficial.json');
  const reval = leer('revalidacion-26oct.json');
  const productos = cat.products || [];
  let errores = 0;
  const fail = (m) => { console.log('ERROR ' + m); errores += 1; };
  if (cat.seed_key !== SEED_KEY) fail('seed_key inesperado: ' + cat.seed_key);
  if (productos.length !== 30) fail('productos: ' + productos.length + ' (se esperan 30)');
  const todosSlugs = productos.flatMap((p) => [p.slug, slugLegacy(p)]);
  const dup = todosSlugs.filter((s, i) => todosSlugs.indexOf(s) !== i);
  if (dup.length) fail('slugs duplicados: ' + dup.join(', '));
  const vistos = new Set();
  let totalImg = 0;
  let totalDestacados = 0;
  for (const p of productos) {
    if (!p.sku || vistos.has(p.sku)) { fail('SKU vacio/duplicado: ' + p.sku); continue; }
    vistos.add(p.sku);
    if (!p.nombre) fail(p.sku + ': sin nombre');
    if (!p.descripcion || !String(p.descripcion).trim()) fail(p.sku + ': sin descripcion');
    if (!p.marca || !String(p.marca).trim()) fail(p.sku + ': sin marca');
    if (!p.slug) fail(p.sku + ': sin slug oficial');
    if (!p.especificaciones || typeof p.especificaciones !== 'object' || Array.isArray(p.especificaciones) || Object.keys(p.especificaciones).length === 0) fail(p.sku + ': especificaciones invalidas');
    if (!CATEGORIAS.includes(p.categoria_slug)) fail(p.sku + ': categoria_slug fuera de rango: ' + p.categoria_slug);
    if (p.destacado) totalDestacados += 1;
    const costo = costoCatalogo(p);
    if (!(costo > 0)) fail(p.sku + ': sin supplier.cost_centavos');
    else if (!(p.precio > 0)) fail(p.sku + ': sin precio');
    else if (Math.abs(precioDesdeCosto(costo) - Number(p.precio)) > 0.005) fail(p.sku + ': precio ' + p.precio + ' != redondear(costo*1.05,2) = ' + precioDesdeCosto(costo));
    const fotos = (p.images || []).map((i) => i.filename).filter(Boolean);
    totalImg += fotos.length;
    if (fotos.length === 0) fail(p.sku + ': sin imagenes');
    if (!fotos.some((f) => /-01\.(jpe?g|png)$/i.test(f))) fail(p.sku + ': sin portada -01');
    for (const f of fotos) if (!fs.existsSync(path.join(DIR, 'images', f))) fail(p.sku + ': falta archivo images/' + f);
  }
  const r = resolverPrecios(productos, reval);
  for (const e of r.errores) fail(e);
  console.log('=== Plaza Tecnologia - validacion local (sin BD, sin --apply) ===');
  console.log('Tienda: ' + TIENDA.slug + ' | isOfficial: ' + TIENDA.isOfficial + ' | modo: ' + (MODO_APLICAR ? 'apply' : 'validar'));
  console.log('Fuente: catalogo-oficial.json (' + cat.seed_key + ' | ' + cat.currency + ' | markup ' + cat.markup_percent + '%) + revalidacion-26oct.json (' + reval.fecha + ')');
  console.log('SKU: ' + productos.length + ' | imagenes: ' + totalImg + ' | destacados: ' + totalDestacados + ' | refrescados: ' + (reval.cambios || []).length + ' | anomalias: ' + (reval.anomalias || []).length + ' | sin cambios: ' + (reval.sin_cambios || []).length);
  for (const p of productos) {
    const rp = r.precios.get(p.sku);
    if (!rp || rp.origen !== 'revalidacion-26oct') continue;
    const c = (reval.cambios || []).find((x) => x.sku === p.sku);
    console.log('REFRESCO ' + p.sku + ': costo ' + costoCatalogo(p) + ' -> ' + c.costo_observado + ' | precio ' + p.precio + ' -> ' + rp.precio);
  }
  for (const a of reval.anomalias || []) console.log('ANOMALIA ' + a.sku + ': mantiene precio ' + ((r.precios.get(a.sku) || {}).precio) + ' del catalogo — ' + (a.nota || ''));
  for (const s of reval.sin_cambios || []) { const p = productos.find((x) => x.sku === s); console.log('SIN-CAMBIO ' + s + ': costo ' + costoCatalogo(p) + ' | precio ' + p.precio); }
  for (const a of r.avisos) console.log('AVISO trazabilidad ' + a);
  console.log('Errores: ' + errores + (errores === 0 ? ' — catalogo y revalidacion consistentes; listo para --apply (pendiente de orden).' : ' — CORREGIR ANTES DE APLICAR'));
  return errores;
};

/* Aplicacion en BD (solo con --apply; NO se ejecuta en validacion). */
const aplicar = async () => {
  const BACKEND_DIR = path.resolve(DIR, '..', '..');
  process.env.ENV_PATH = path.join(BACKEND_DIR, '.env');
  try { require('dotenv').config({ path: process.env.ENV_PATH }); } catch (_) {}
  const Strapi = require('@strapi/strapi');
  const app = await Strapi({ appDir: BACKEND_DIR }).load();
  const stats = { tienda: 'reutilizada', creados: 0, actualizados: 0, imgNuevas: 0, imgReutil: 0, preciosRefrescados: 0, avisos: 0, errores: 0 };
  try {
    const cat = leer('catalogo-oficial.json');
    const reval = leer('revalidacion-26oct.json');
    const { precios, avisos } = resolverPrecios(cat.products, reval);
    stats.avisos = avisos.length;
    for (const a of avisos) console.log('AVISO trazabilidad ' + a);
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
    for (const slug of CATEGORIAS) {
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
    for (const p of cat.products) {
      try {
        if (!precios.has(p.sku)) { console.log('ERROR ' + p.sku + ': sin precio resuelto'); stats.errores += 1; continue; }
        const slugOficial = p.slug;
        const slugViejo = slugLegacy(p);
        const rows = await app.db.query('api::producto.producto').findMany({ where: { slug: { $in: [slugOficial, slugViejo] } } });
        if (rows.length > 1) { console.log('CONFLICTO ' + p.sku + ': ' + rows.length + ' productos con slugs ' + slugOficial + '/' + slugViejo + ': no se toca'); stats.errores += 1; continue; }
        const fotos = (p.images || []).slice().sort((a, b) => (a.filename < b.filename ? -1 : a.filename > b.filename ? 1 : 0));
        const res = precios.get(p.sku);
        if (res.origen === 'revalidacion-26oct') stats.preciosRefrescados += 1;
        const existente = rows[0] || null;
        if (existente) {
          const patch = { nombre: p.nombre, descripcion: p.descripcion, marca: p.marca, especificaciones: p.especificaciones, destacado: !!p.destacado, precio: res.precio, store: tienda.id, store_id: String(tienda.id), store_category: catIds[p.categoria_slug], tags: 'plaza-tecnologia,plaza-tecnologia-a-tu-casa,' + p.sku };
          if (ownerEmail) patch.store_email = ownerEmail;
          const full = await app.entityService.findOne('api::producto.producto', existente.id, { populate: ['imagenes'] });
          if (!full || !Array.isArray(full.imagenes) || full.imagenes.length === 0) {
            const galeria = [];
            for (const f of fotos) galeria.push((await subirSiFalta(f.filename, p.nombre + ' (' + p.sku + ')')).id);
            patch.imagenes = galeria;
            patch.imagen_predeterminada = galeria.slice(0, 1);
          }
          await app.entityService.update('api::producto.producto', existente.id, { data: patch });
          stats.actualizados += 1;
        } else {
          const galeria = [];
          for (const f of fotos) galeria.push((await subirSiFalta(f.filename, p.nombre + ' (' + p.sku + ')')).id);
          const data = { nombre: p.nombre, slug: slugOficial, descripcion: p.descripcion, marca: p.marca, especificaciones: p.especificaciones, destacado: !!p.destacado, precio: res.precio, store: tienda.id, store_id: String(tienda.id), store_category: catIds[p.categoria_slug], tags: 'plaza-tecnologia,plaza-tecnologia-a-tu-casa,' + p.sku, stock: -1, usa_stock: false, activo: true, imagenes: galeria, imagen_predeterminada: galeria.slice(0, 1) };
          if (ownerEmail) data.store_email = ownerEmail;
          if (MODO_PUBLICAR) data.publishedAt = new Date().toISOString();
          await app.entityService.create('api::producto.producto', { data });
          stats.creados += 1;
        }
      } catch (e) { console.log('ERROR ' + p.sku + ': ' + e.message); stats.errores += 1; }
    }
    console.log('Tienda ' + stats.tienda + ' | creados: ' + stats.creados + ' | actualizados: ' + stats.actualizados + ' | precios refrescados: ' + stats.preciosRefrescados + ' | img nuevas: ' + stats.imgNuevas + ' | img reutilizadas: ' + stats.imgReutil + ' | avisos: ' + stats.avisos + ' | errores: ' + stats.errores);
    if (stats.errores > 0) process.exitCode = 1;
  } finally { await app.destroy(); }
};
(async () => {
  const errores = validarLocal();
  if (errores > 0) { process.exitCode = 1; return; }
  if (MODO_APLICAR) await aplicar();
})();
