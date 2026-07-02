// CartLocal.js

/**
 * guardarCarritoLocal ahora acepta:
 * - Un objeto “producto” completo (con campos: id, nombre, precio, imagen, imagen_predeterminada, store, cp, cp_destino, largo, ancho, alto, peso)
 *   o bien
 * - Un simple ID (número o string), en cuyo caso sí hará fetch a Strapi para obtener los datos faltantes.
 *
 * De esa forma NO rompe tu lógica existente en CartContext (que llama guardarCarritoLocal(producto, cantidad))
 * y a la vez sigue pudiendo usarse pasando sólo el ID, si en otro lugar lo necesitas.
 */
export const guardarCarritoLocal = async (productoOrId, cantidad) => {
  try {
    let prodId;
    let nombre;
    let precio_unitario;
    let imagen_predeterminada = null;
    let imagen = "";
    let store = null;
    let largo = null;
    let ancho = null;
    let alto = null;
    let peso = null;
    let cp = "";
    let cp_destino = "";

    if (typeof productoOrId === "object" && productoOrId !== null) {
      console.log("📦 guardarCarritoLocal - producto recibido como objeto:", productoOrId);

      prodId = productoOrId.id;
      nombre = productoOrId.nombre;
      precio_unitario = productoOrId.precio;

      // Extrae imagen si viene como objeto anidado
      if (productoOrId.imagen_predeterminada) {
        if (Array.isArray(productoOrId.imagen_predeterminada)) {
          const imgData = productoOrId.imagen_predeterminada[0];
          imagen_predeterminada = imgData.id;
          const relUrl = imgData.url || imgData.attributes?.url;
          if (relUrl) {
            imagen = `${process.env.REACT_APP_STRAPI_URL}${relUrl}`;
          }
        } else if (productoOrId.imagen_predeterminada.data) {
          const imgData = productoOrId.imagen_predeterminada.data[0];
          imagen_predeterminada = imgData.id;
          const relUrl = imgData.attributes?.url;
          if (relUrl) {
            imagen = `${process.env.REACT_APP_STRAPI_URL}${relUrl}`;
          }
        }
      }

      console.log("🖼 imagen procesada:", imagen);

      store = productoOrId.store || null;
      largo = productoOrId.largo || null;
      ancho = productoOrId.ancho || null;
      alto = productoOrId.alto || null;
      peso = productoOrId.peso || null;
      cp = productoOrId.cp || "";
      cp_destino = productoOrId.cp_destino || "";
    } else {
      console.log("🔍 guardarCarritoLocal - producto recibido como ID:", productoOrId);
      prodId = productoOrId;
      const urlProd = `${process.env.REACT_APP_STRAPI_URL}/api/productos/${prodId}?populate=imagen_predeterminada,store`;
      const resProd = await fetch(urlProd);
      if (!resProd.ok) {
        console.error("❌ Error al hacer fetch del producto:", resProd.status);
        return;
      }
      const jsonProd = await resProd.json();
      const prodData = jsonProd.data;
      if (!prodData) {
        console.error("❌ Producto no encontrado en Strapi:", prodId);
        return;
      }

      const attrs = prodData.attributes;
      nombre = attrs.nombre;
      precio_unitario = attrs.precio;

      const imgArr = attrs.imagen_predeterminada?.data;
      console.log("🖼 imagen_predeterminada.data recibido desde Strapi:", imgArr);
      if (Array.isArray(imgArr) && imgArr.length > 0) {
        imagen_predeterminada = imgArr[0].id;
        const relUrl = imgArr[0].attributes?.url;
        imagen = relUrl ? `${process.env.REACT_APP_STRAPI_URL}${relUrl}` : "";
      }

      store = attrs.store?.data?.id || null;
      largo = attrs.largo || null;
      ancho = attrs.ancho || null;
      alto = attrs.alto || null;
      peso = attrs.peso || null;
      cp = attrs.cp || "";
      cp_destino = attrs.cp_destino || "";
    }

    const raw = JSON.parse(localStorage.getItem("carrito"));
    const carritoLocal = Array.isArray(raw) ? raw : [];
    console.log("🛒 carritoLocal antes de agregar:", carritoLocal);

    const idxExist = carritoLocal.findIndex((item) => item.producto === prodId);
    if (idxExist !== -1) {
      carritoLocal[idxExist].cantidad += cantidad;
      console.log(`➕ Producto ya en carrito, nueva cantidad: ${carritoLocal[idxExist].cantidad}`);
    } else {
      const nuevoItem = {
        producto: prodId,
        cantidad,
        precio_unitario,
        nombre,
        imagen_predeterminada,
        imagen,
        store,
        largo,
        ancho,
        alto,
        peso,
        cp,
        cp_destino,
      };
      carritoLocal.push(nuevoItem);
      console.log("🆕 Agregado nuevo producto al carritoLocal:", nuevoItem);
    }

    localStorage.setItem("carrito", JSON.stringify(carritoLocal));


    const itemCount = carritoLocal.reduce((acc, item) => acc + item.cantidad, 0);
localStorage.setItem("itemCount", itemCount);
console.log("🔢 itemCount actualizado en localStorage:", itemCount);

// 🔔 Emitimos evento personalizado para notificar cambios (React no se entera solo)
window.dispatchEvent(new CustomEvent("carritoLocalActualizado", { detail: { itemCount } }));


    console.log("💾 carritoLocal guardado en localStorage:", carritoLocal);
  } catch (error) {
    console.error("⚠️ Error en guardarCarritoLocal:", error);
  }
};


export const sincronizarCarrito = async (
  user,
  precotizarPlataforma,
  precotizarMienvio,
  precotizarStripe
) => {
  const raw = JSON.parse(localStorage.getItem("carrito"));
  const carritoLocal = Array.isArray(raw) ? raw : [];
  console.log("sincronizarCarrito - carritoLocal desde localStorage:", carritoLocal);

  if (carritoLocal.length === 0) {
    console.log("sincronizarCarrito - sin items en local, regresando");
    return;
  }

  try {
    // 1) Definimos calcularItem ANTES de usarla:
    const calcularItem = async (item) => {
      // ********* esta parte hay que arreglar esta línea ********
      const cpDestino = item.cp_destino || "11560"; // puedes ajustar si conoces el CP real del usuario
      const subtotal = item.precio_unitario * item.cantidad;
      const comisionPlataforma = precotizarPlataforma(subtotal);
      const envio = await precotizarMienvio(
        item.cp || "",
        cpDestino,
        item.largo || 1,
        item.ancho || 1,
        item.alto || 1,
        item.peso || 1,
        item.cantidad
      );
      const comisionStripe = precotizarStripe(subtotal, envio, comisionPlataforma);
      const total = parseFloat(
        (subtotal + envio + comisionPlataforma + comisionStripe).toFixed(2)
      );

      console.log(
        `🧮 calcularItem - producto ${item.producto}: subtotal=${subtotal}, envio=${envio}, plataforma=${comisionPlataforma}, stripe=${comisionStripe}, total=${total}`
      );

      return {
        ...item,
        subtotal,
        envio,
        comisionPlataforma,
        comisionStripe,
        total,
      };
    };

    // 2) Recalculamos totales sobre carritoLocal:
    const carritoLocalConTotales = await Promise.all(
      carritoLocal.map((item) => calcularItem(item))
    );
    console.log("sincronizarCarrito - carritoLocalConTotales:", carritoLocalConTotales);

    // 3) Verificamos si ya existe un carrito activo en Strapi para este usuario:
    const urlCheck = `${process.env.REACT_APP_STRAPI_URL}/api/carritos?filters[usuario_email][$eq]=${encodeURIComponent(
      user.email
    )}&filters[estado][$eq]=activo`;
    console.log("sincronizarCarrito - URL para verificar carrito en Strapi:", urlCheck);

    const checkRes = await fetch(urlCheck);
    console.log("sincronizarCarrito - respuesta fetchStrapi status:", checkRes.status);
    const checkJson = await checkRes.json();
    console.log("sincronizarCarrito - checkJson:", checkJson);
    const carritoData = checkJson?.data?.[0];
    console.log("sincronizarCarrito - carritoData existente:", carritoData);

    if (!carritoData) {
      // 4.a) Si no existe carrito activo, lo creamos con los items ya incluyendo totales:
      console.log(
        "sincronizarCarrito - no existe carrito en Strapi, creando nuevo con items locales"
      );
      const payload = {
        data: {
          usuario_email: user.email,
          estado: "activo",
          total: carritoLocalConTotales.reduce((acc, it) => acc + it.total, 0),
          productos: carritoLocalConTotales.map((item) => ({
            producto: item.producto,
            cantidad: item.cantidad,
            precio_unitario: item.precio_unitario,
            nombre: item.nombre,
            envio: item.envio,
            comisionPlataforma: item.comisionPlataforma,
            comisionStripe: item.comisionStripe,
            subtotal: item.subtotal,
            total: item.total,
            imagen_predeterminada: item.imagen_predeterminada || null,
            store: item.store || null,
            largo: item.largo || null,
            ancho: item.ancho || null,
            alto: item.alto || null,
            peso: item.peso || null,
            cp: item.cp || "",
            cp_destino: item.cp_destino || "",
          })),
        },
      };
      console.log("sincronizarCarrito - payload POST:", payload);
      const postRes = await fetch(`${process.env.REACT_APP_STRAPI_URL}/api/carritos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      console.log("sincronizarCarrito - POST status:", postRes.status);
    } else {
      // 4.b) Si ya hay carrito activo, fusionamos con lo que venga de Strapi:
      console.log("sincronizarCarrito - existe carrito en Strapi, fusionando items");

      const rawProductos = carritoData.attributes.productos;
      const existingItems = Array.isArray(rawProductos?.data)
        ? rawProductos.data
        : Array.isArray(rawProductos)
        ? rawProductos
        : [];

      console.log("sincronizarCarrito - existingItems normalizado:", existingItems);

      // 5) Extraemos los items actuales de Strapi e incluimos imagen_predeterminada/store:
      const nuevosProductos = existingItems.map((p) => {
        const attr = p.attributes;
        return {
          id: p.id,
          producto: attr.producto.data.id,
          cantidad: attr.cantidad,
          precio_unitario: attr.precio_unitario,
          nombre: attr.nombre,
          envio: attr.envio,
          comisionPlataforma: attr.comisionPlataforma,
          comisionStripe: attr.comisionStripe,
          subtotal: attr.subtotal,
          total: attr.total,
          imagen_predeterminada: attr.imagen_predeterminada?.data?.[0]?.id || null,
          store: attr.store?.data?.id || null,
          largo: attr.largo || null,
          ancho: attr.ancho || null,
          alto: attr.alto || null,
          peso: attr.peso || null,
          cp: attr.cp || "",
          cp_destino: attr.cp_destino || "",
        };
      });
      console.log(
        "sincronizarCarrito - nuevosProductos inicial (desde Strapi):",
        nuevosProductos
      );

      // 6) Fusionamos cantidades e información de localStorage sobre esos productos:
      carritoLocal.forEach((localItem) => {
        const idx = nuevosProductos.findIndex(
          (p) => p.producto === localItem.producto
        );
        if (idx !== -1) {
          // Si existe, incrementamos la cantidad; conservamos los campos de imagen/store
          nuevosProductos[idx].cantidad += localItem.cantidad;
          console.log(
            `sincronizarCarrito - sumada cantidad local al producto existente ${localItem.producto}, nueva cantidad:`,
            nuevosProductos[idx].cantidad
          );
        } else {
          // Si no existía en Strapi, lo agregamos como nuevo (con los campos de imagen/store/dimensiones)
          nuevosProductos.push({
            producto: localItem.producto,
            cantidad: localItem.cantidad,
            precio_unitario: localItem.precio_unitario,
            nombre: localItem.nombre,
            envio: 0,
            comisionPlataforma: 0,
            comisionStripe: 0,
            subtotal: 0,
            total: 0,
            imagen_predeterminada: localItem.imagen_predeterminada || null,
            store: localItem.store || null,
            largo: localItem.largo || null,
            ancho: localItem.ancho || null,
            alto: localItem.alto || null,
            peso: localItem.peso || null,
            cp: localItem.cp || "",
            cp_destino: localItem.cp_destino || "",
          });
          console.log(
            `sincronizarCarrito - agregado nuevo producto local ${localItem.producto}:`,
            localItem
          );
        }
      });

      console.log(
        "sincronizarCarrito - nuevosProductos tras fusionar cantidades:",
        nuevosProductos
      );

      // 7) Recalculamos envío/comisiones/total sobre toda la lista fusionada:
      const productosConTotales = await Promise.all(
        nuevosProductos.map((item) => calcularItem(item))
      );
      console.log(
        "sincronizarCarrito - productosConTotales (recalculados):",
        productosConTotales
      );

      // 8) Preparamos el payload de actualización, incluyendo imagen/store:
      const payloadUpdate = {
        data: {
          productos: productosConTotales.map((item) => ({
            id: item.id, // si viene de Strapi, lo conserva; si es nuevo, Strapi lo ignorará y creará
            producto: item.producto,
            cantidad: item.cantidad,
            precio_unitario: item.precio_unitario,
            nombre: item.nombre,
            envio: item.envio,
            comisionPlataforma: item.comisionPlataforma,
            comisionStripe: item.comisionStripe,
            subtotal: item.subtotal,
            total: item.total,
            imagen_predeterminada: item.imagen_predeterminada || null,
            store: item.store || null,
            largo: item.largo || null,
            ancho: item.ancho || null,
            alto: item.alto || null,
            peso: item.peso || null,
            cp: item.cp || "",
            cp_destino: item.cp_destino || "",
          })),
          total: productosConTotales.reduce((acc, it) => acc + it.total, 0),
        },
      };
      console.log("sincronizarCarrito - payload PUT:", payloadUpdate);

      const putRes = await fetch(
        `${process.env.REACT_APP_STRAPI_URL}/api/carritos/${carritoData.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payloadUpdate),
        }
      );
      console.log("sincronizarCarrito - PUT status:", putRes.status);
    }

    // 9) Finalmente, limpiamos el carrito local
    localStorage.removeItem("carrito");
    console.log("sincronizarCarrito - localStorage eliminado");
  } catch (error) {
    console.error("sincronizarCarrito - error:", error);
  }
};
