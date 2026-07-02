import { createContext, useContext, useEffect, useState, useRef } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { guardarCarritoLocal, sincronizarCarrito } from './CartLocal';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const STRAPI_URL = process.env.REACT_APP_STRAPI_URL;
  const { user, isAuthenticated } = useAuth0();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);

  // Evita múltiples fetch iniciales
  const initialized = useRef(false);

  const precotizarStripe = (precioProducto, envio, comisionPlataforma) => {
    const subTotal = precioProducto + envio + (comisionPlataforma * 1.16);
    const total = (subTotal * 0.036) + 3;
    return parseFloat((total).toFixed(2));
  };

  const precotizarPlataforma = (precioProducto) => {
    const tarifa = precioProducto < 200 ? 5 : 10;
    const iva = tarifa * 0.16;
    return parseFloat((tarifa + iva).toFixed(2));
  };

  const precotizarMienvio = async (
    cpOrigen,
    cpDestino,
    largo,
    ancho,
    alto,
    peso,
    cantidad
  ) => {
    try {
      console.log(
        "precotizarMienvio - parámetros:",
        cpOrigen,
        cpDestino,
        largo,
        ancho,
        alto,
        peso,
        cantidad
      );
      const res = await fetch(
        `${STRAPI_URL}/api/shipping/calcular`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cpOrigen, cpDestino, largo, ancho, alto, peso, cantidad }),
        }
      );
      console.log("precotizarMienvio - status:", res.status);
      const data = await res.json();
      console.log("precotizarMienvio - respuesta:", data);
      return parseFloat(data.costo || 0);
    } catch (error) {
      console.error("Error en cálculo de envío:", error);
      return 0;
    }
  };

  // ─── 1) SOLO AL MONTAR, SINCRONIZAR Y LUEGO CARGAR CARRITO DE STRAPI ────────────────
  useEffect(() => {
    const initCart = async () => {
      if (isAuthenticated && user && !initialized.current) {
        console.log("🟡 initCart - usuario autenticado, comenzando sincronización...");
        await sincronizarCarrito(user, precotizarPlataforma, precotizarMienvio, precotizarStripe);
        console.log("🟢 initCart - sincronización completada, cargando carrito desde Strapi...");
        initialized.current = true;
        await fetchCarrito();
      }
    };

    const fetchCarrito = async () => {
      console.log("fetchCarrito - inicio, isAuthenticated=", isAuthenticated, ", user=", user);
      if (!isAuthenticated || !user) {
        console.log("fetchCarrito - no autenticado o sin usuario");
        return;
      }

      try {
        const urlFetch = `${process.env.REACT_APP_STRAPI_URL}/api/carritos?filters[usuario_email][$eq]=${encodeURIComponent(
          user.email
        )}&filters[estado][$eq]=activo&populate[productos][populate][producto][populate]=imagen_predeterminada,store`;
        console.log("fetchCarrito - URL de fetch:", urlFetch);

        const res = await fetch(urlFetch);
        console.log("fetchCarrito - status:", res.status);
        const json = await res.json();
        console.log("fetchCarrito - json completo:", JSON.stringify(json, null, 2));

        const carritoEntry = json?.data?.[0];
        if (!carritoEntry) {
          console.log("fetchCarrito - no existe carrito activo");
          setItems([]);
          setTotal(0);
          return;
        }

        const attrs = carritoEntry.attributes;
        console.log("fetchCarrito - attrs.productos raw:", attrs.productos);

        let productos = [];

        if (Array.isArray(attrs.productos)) {
          console.log("fetchCarrito - caso arreglo plano, count:", attrs.productos.length);
          productos = attrs.productos.map((item, idx) => {
            const prodRel = item.producto?.data;
            const prodId = prodRel?.id || item.producto;
            const imgArr = prodRel?.attributes?.imagen_predeterminada?.data;
            let relativeUrl = "";
            if (Array.isArray(imgArr) && imgArr.length > 0) {
              relativeUrl = imgArr[0].attributes.url;
            }
            const imagenUrl = relativeUrl
              ? `${process.env.REACT_APP_STRAPI_URL}${relativeUrl}`
              : "";

            let storeObj = null;
            const storeData = prodRel?.attributes?.store?.data;
            if (storeData) {
              storeObj = {
                id: storeData.id,
                name: storeData.attributes.name,
              };
            }

            console.log(
              `🛒 fetchCarrito - plano [${idx}] nombre="${item.nombre}", tienda="${storeObj?.name}", imagenUrl="${imagenUrl}"`
            );
            return {
              ...item,
              producto: prodId,
              imagen: imagenUrl,
              store: storeObj,
            };
          });
        }

        const totalCarrito = attrs.total || 0;
        console.log("fetchCarrito - productos finales:", productos);
        console.log("fetchCarrito - totalCarrito:", totalCarrito);

        setItems(productos);
        setTotal(totalCarrito);
      } catch (error) {
        console.error("Error al cargar carrito desde Strapi:", error);
      }
    };

    initCart();
  }, [isAuthenticated, user]);

  const calcularTotal = (productos) =>
    productos.reduce(
      (acc, item) =>
        acc + (item.total || item.precio_unitario * item.cantidad),
      0
    );

  const getItemCount = () =>
    items.reduce((acc, item) => acc + (item.cantidad || 0), 0);

  const addToCart = async (producto, cantidad = 1) => {
    if (!isAuthenticated || !user) {
      console.log("addToCart - no autenticado o sin usuario");
      guardarCarritoLocal(producto, cantidad);
      return;
    }

    console.log("addToCart - producto recibido:", producto);
    console.log("addToCart - cantidad deseada:", cantidad);

    let imagenId = null;
    let imagenUrl = "";
    let storeObjFromProd = null;
    try {
      const urlProd = `${process.env.REACT_APP_STRAPI_URL}/api/productos/${producto.id}?populate=imagen_predeterminada,store`;
      console.log("addToCart - URL fetch producto:", urlProd);

      const prodRes = await fetch(urlProd);
      console.log("addToCart - status fetch producto:", prodRes.status);
      const prodJson = await prodRes.json();
      console.log("addToCart - prodJson completo:", JSON.stringify(prodJson, null, 2));

      const prodAttrs = prodJson.data.attributes;
      const imgArr = prodAttrs.imagen_predeterminada?.data;
      if (Array.isArray(imgArr) && imgArr.length > 0) {
        imagenId = imgArr[0].id;
        const relativeUrl = imgArr[0].attributes.url;
        imagenUrl = relativeUrl
          ? `${process.env.REACT_APP_STRAPI_URL}${relativeUrl}`
          : "";
      }
      const storeData = prodAttrs.store?.data;
      if (storeData) {
        storeObjFromProd = {
          id: storeData.id,
          name: storeData.attributes.name,
        };
      }
      console.log("addToCart - imagenId obtenida:", imagenId);
      console.log("addToCart - imagenUrl obtenida:", imagenUrl);
      console.log("addToCart - store obtenida:", storeObjFromProd);
    } catch (err) {
      console.error("addToCart - error obteniendo imagen/store del producto:", err);
    }

    let carritoExistente = null;
    try {
      const urlCarritoFetch = `${process.env.REACT_APP_STRAPI_URL}/api/carritos?filters[usuario_email][$eq]=${encodeURIComponent(
        user.email
      )}&filters[estado][$eq]=activo&populate[productos][populate][producto][populate]=imagen_predeterminada,store`;
      console.log("addToCart - URL fetch carrito existente:", urlCarritoFetch);

      const res = await fetch(urlCarritoFetch);
      console.log("addToCart - status fetch carrito existente:", res.status);
      const json = await res.json();
      console.log("addToCart - json fetch carrito existente:", JSON.stringify(json, null, 2));

      carritoExistente = json?.data?.[0] || null;
      console.log("addToCart - carritoExistente:", carritoExistente);
    } catch (err) {
      console.error("Error obteniendo carrito de Strapi:", err);
      carritoExistente = null;
    }

    let productosDesdeBackend = [];
    let carritoId = null;
    if (carritoExistente) {
      carritoId = carritoExistente.id;
      const attrs = carritoExistente.attributes;
      console.log("addToCart - attrs.productos raw:", attrs.productos);

      if (Array.isArray(attrs.productos)) {
        console.log("addToCart - caso plano, count:", attrs.productos.length);
        productosDesdeBackend = attrs.productos.map((item, idx) => {
          const prodRel = item.producto?.data;
          const prodId = prodRel?.id || item.producto;
          const imgArr = prodRel?.attributes?.imagen_predeterminada?.data;
          let relativeUrl = "";
          if (Array.isArray(imgArr) && imgArr.length > 0) {
            relativeUrl = imgArr[0].attributes.url;
          }
          const existingUrl = relativeUrl
            ? `${process.env.REACT_APP_STRAPI_URL}${relativeUrl}`
            : "";

          let storeObj = null;
          const storeData = prodRel?.attributes?.store?.data;
          if (storeData) {
            storeObj = {
              id: storeData.id,
              name: storeData.attributes.name,
            };
          }

          console.log(
            `addToCart - plano [${idx}] nombre="${item.nombre}", tienda="${storeObj?.name}", existingUrl="${existingUrl}"`
          );
          return {
            ...item,
            producto: prodId,
            imagen: existingUrl,
            store: storeObj,
          };
        });
      } else if (attrs.productos && Array.isArray(attrs.productos.data)) {
        console.log("addToCart - caso anidado, count:", attrs.productos.data.length);
        productosDesdeBackend = attrs.productos.data.map((p, idx) => {
          const itemAttrs = p.attributes;
          const prodRel = itemAttrs.producto?.data;
          const prodId = prodRel?.id;
          const imgArr = prodRel?.attributes?.imagen_predeterminada?.data;
          let relativeUrl = "";
          if (Array.isArray(imgArr) && imgArr.length > 0) {
            relativeUrl = imgArr[0].attributes.url;
          }
          const existingUrl = relativeUrl
            ? `${process.env.REACT_APP_STRAPI_URL}${relativeUrl}`
            : "";

          let storeObj = null;
          const storeData = prodRel?.attributes?.store?.data;
          if (storeData) {
            storeObj = {
              id: storeData.id,
              name: storeData.attributes.name,
            };
          }

          console.log(
            `addToCart - anidado [${idx}] nombre="${itemAttrs.nombre}", tienda="${storeObj?.name}", existingUrl="${existingUrl}"`
          );
          return {
            ...itemAttrs,
            producto: prodId,
            imagen: existingUrl,
            store: storeObj,
          };
        });
      } else {
        console.log("addToCart - attrs.productos no reconocido:", attrs.productos);
      }
    } else {
      console.log("addToCart - no existe carrito existente, se va a crear nuevo");
    }
    console.log("addToCart - productosDesdeBackend resultante:", productosDesdeBackend);

    const comisionPlataforma = precotizarPlataforma(producto.subtotal || producto.precio * cantidad);
    const subtotal          = producto.precio * cantidad;
    const envio             = await precotizarMienvio(
      producto.cp,
      producto.cp_destino || "11560",
      producto.largo,
      producto.ancho,
      producto.alto,
      producto.peso,
      cantidad
    );
    const comisionStripe    = precotizarStripe(subtotal, envio, comisionPlataforma);
    const totalItem = parseFloat(
      (subtotal + comisionStripe + comisionPlataforma + envio).toFixed(2)
    );
    console.log(
      "addToCart - comisiones/envío:",
      comisionPlataforma,
      comisionStripe,
      envio,
      "subtotal:",
      subtotal,
      "totalItem:",
      totalItem
    );

    let mergedItems = [...productosDesdeBackend];
    const existingIndex = mergedItems.findIndex((i) => i.producto === producto.id);
    if (existingIndex !== -1) {
      const i = mergedItems[existingIndex];
      const nuevaCantidad = i.cantidad + cantidad;
      const nuevoSubtotal = i.precio_unitario * nuevaCantidad;
      const nuevoTotalItem = parseFloat(
        (nuevoSubtotal + i.comisionStripe + i.envio + i.comisionPlataforma).toFixed(2)
      );
      mergedItems[existingIndex] = {
        ...i,
        cantidad: nuevaCantidad,
        subtotal: nuevoSubtotal,
        total: nuevoTotalItem,
      };
      console.log("addToCart - existing actualizado:", mergedItems[existingIndex]);
    } else {
      const newItem = {
        producto: producto.id,
        nombre: producto.nombre,
        marca: producto.marca,
        precio_unitario: producto.precio,
        cantidad,
        imagen_predeterminada: imagenId,
        imagen: imagenUrl,
        subtotal,
        comisionPlataforma,
        comisionStripe,
        envio,
        total: totalItem,
        store: storeObjFromProd,
      };
      console.log("addToCart - newItem a agregar:", newItem);
      mergedItems.push(newItem);
    }

    console.log("addToCart - mergedItems antes de setItems:", mergedItems);

    const nuevoTotal = calcularTotal(mergedItems);
    console.log("addToCart - nuevoTotal calculado:", nuevoTotal);
    setItems(mergedItems);
    setTotal(nuevoTotal);

    const productosParaPayload = mergedItems.map((item) => ({
      producto: item.producto,
      nombre: item.nombre,
      precio_unitario: item.precio_unitario,
      cantidad: item.cantidad,
      subtotal: item.subtotal,
      envio: item.envio,
      comisionStripe: item.comisionStripe,
      comisionPlataforma: item.comisionPlataforma,
      total: item.total,
      imagen_predeterminada: item.imagen_predeterminada || null,
      store: item.store?.id || null,
    }));
    console.log("addToCart - productosParaPayload:", productosParaPayload);

    const payload = {
      data: {
        usuario_email: user.email,
        productos: productosParaPayload,
        total: nuevoTotal,
        estado: "activo",
        ultima_actualizacion: new Date().toISOString(),
      },
    };
    console.log("addToCart - payload final:", payload);

    try {
      const endpoint = `${process.env.REACT_APP_STRAPI_URL}/api/carritos`;
      if (carritoId) {
        console.log("addToCart - haciendo PUT en Strapi carritoId:", carritoId);
        const response = await fetch(`${endpoint}/${carritoId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        console.log("addToCart - PUT response status:", response.status);
      } else {
        console.log("addToCart - haciendo POST en Strapi para crear carrito");
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        console.log("addToCart - POST response status:", response.status);
      }
    } catch (error) {
      console.error("Error al guardar el carrito en Strapi:", error);
    }
  };

  const removeFromCart = async (productoId) => {
    if (!isAuthenticated || !user) {
      console.log("removeFromCart - no autenticado o sin usuario");
      const carritoLocal = JSON.parse(localStorage.getItem("carrito")) || [];
      const nuevoLocal = carritoLocal.filter((item) => item.producto !== productoId);
      localStorage.setItem("carrito", JSON.stringify(nuevoLocal));
      setItems(nuevoLocal);
      setTotal(calcularTotal(nuevoLocal));
      return;
    }

    try {
      const urlCheck = `${process.env.REACT_APP_STRAPI_URL}/api/carritos?filters[usuario_email][$eq]=${encodeURIComponent(
        user.email
      )}&filters[estado][$eq]=activo`;
      const checkRes = await fetch(urlCheck);
      const checkJson = await checkRes.json();
      const carritoData = checkJson?.data?.[0];
      if (!carritoData) return;

      const existingItems = carritoData.attributes.productos.data || [];
      const nuevosProductos = existingItems
        .filter((p) => p.attributes.producto.data.id !== productoId)
        .map((p) => ({
          id: p.id,
          producto: p.attributes.producto.data.id,
          cantidad: p.attributes.cantidad,
          precio_unitario: p.attributes.precio_unitario,
          nombre: p.attributes.nombre,
          imagen_predeterminada: p.attributes.imagen_predeterminada.data?.[0]?.id,
          store: p.attributes.store.data?.id,
        }));

      const payloadUpdate = { data: { productos: nuevosProductos } };
      await fetch(
        `${process.env.REACT_APP_STRAPI_URL}/api/carritos/${carritoData.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payloadUpdate),
        }
      );

      const resFinal = await fetch(
        `${process.env.REACT_APP_STRAPI_URL}/api/carritos?filters[usuario_email][$eq]=${encodeURIComponent(
          user.email
        )}&filters[estado][$eq]=activo&populate[productos][populate][producto][populate]=imagen_predeterminada,store`
      );
      const jsonFinal = await resFinal.json();
      const carritoFinal = jsonFinal.data[0];
      const productosFinal = carritoFinal.attributes.productos.data.map((p) => {
        const attr = p.attributes;
        const prodRel = attr.producto.data;
        const prodId = prodRel.id;
        const imgArr = prodRel.attributes.imagen_predeterminada.data;
        let relativeUrl = "";
        if (Array.isArray(imgArr) && imgArr.length > 0) {
          relativeUrl = imgArr[0].attributes.url;
        }
        const imagenUrl = relativeUrl
          ? `${process.env.REACT_APP_STRAPI_URL}${relativeUrl}`
          : "";
        const storeDataFinal = prodRel.attributes.store.data;
        let storeObjFinal = null;
        if (storeDataFinal) {
          storeObjFinal = {
            id: storeDataFinal.id,
            name: storeDataFinal.attributes.name,
          };
        }
        return {
          producto: prodId,
          cantidad: attr.cantidad,
          precio_unitario: attr.precio_unitario,
          nombre: attr.nombre,
          imagen: imagenUrl,
          store: storeObjFinal,
        };
      });
      const totalFinal = carritoFinal.attributes.total || 0;

      setItems(productosFinal);
      setTotal(totalFinal);
    } catch (error) {
      console.error("removeFromCart - error:", error);
    }
  };

  const updateQuantity = async (productoId, nuevaCantidad) => {
    if (!isAuthenticated || !user) {
      console.log("updateQuantity - no autenticado o sin usuario");
      const carritoLocal = JSON.parse(localStorage.getItem("carrito")) || [];
      const nuevoLocal = carritoLocal.map((item) =>
        item.producto === productoId
          ? { ...item, cantidad: nuevaCantidad }
          : item
      );
      localStorage.setItem("carrito", JSON.stringify(nuevoLocal));
      setItems(nuevoLocal);
      setTotal(calcularTotal(nuevoLocal));
      return;
    }

    try {
      const urlCheck = `${process.env.REACT_APP_STRAPI_URL}/api/carritos?filters[usuario_email][$eq]=${encodeURIComponent(
        user.email
      )}&filters[estado][$eq]=activo&populate[productos][populate][producto][populate]=imagen_predeterminada,store`;
      console.log("updateQuantity - URL fetch carrito:", urlCheck);

      const res = await fetch(urlCheck);
      console.log("updateQuantity - status fetch carrito:", res.status);
      const json = await res.json();
      console.log("updateQuantity - json fetch carrito:", JSON.stringify(json, null, 2));

      const carritoExistente = json?.data?.[0] || null;
      console.log("updateQuantity - carritoExistente:", carritoExistente);

      let productosDesdeBackend = [];
      let carritoId = null;
      if (carritoExistente) {
        carritoId = carritoExistente.id;
        const attrs = carritoExistente.attributes;
        console.log("updateQuantity - attrs.productos raw:", attrs.productos);

        if (Array.isArray(attrs.productos)) {
          console.log("updateQuantity - caso plano, count:", attrs.productos.length);
          productosDesdeBackend = attrs.productos.map((item, idx) => {
            const prodRel = item.producto?.data;
            const prodId = prodRel?.id || item.producto;
            const imgArr = prodRel?.attributes?.imagen_predeterminada?.data;
            let relativeUrl = "";
            if (Array.isArray(imgArr) && imgArr.length > 0) {
              relativeUrl = imgArr[0].attributes.url;
            }
            const existingUrl = relativeUrl
              ? `${process.env.REACT_APP_STRAPI_URL}${relativeUrl}`
              : "";

            let storeObj = null;
            const storeData = prodRel?.attributes?.store?.data;
            if (storeData) {
              storeObj = {
                id: storeData.id,
                name: storeData.attributes.name,
              };
            }

            console.log(
              `updateQuantity - plano [${idx}] nombre="${item.nombre}", tienda="${storeObj?.name}", existingUrl="${existingUrl}"`
            );
            return {
              ...item,
              producto: prodId,
              imagen_predeterminada: item.imagen_predeterminada?.id || null,
              imagen: existingUrl,
              store: storeObj,
            };
          });
        } else if (attrs.productos && Array.isArray(attrs.productos.data)) {
          console.log("updateQuantity - caso anidado, count:", attrs.productos.data.length);
          productosDesdeBackend = attrs.productos.data.map((p, idx) => {
            const itemAttrs = p.attributes;
            const prodRel = itemAttrs.producto?.data;
            const prodId = prodRel?.id;
            const imgArr = prodRel?.attributes?.imagen_predeterminada?.data;
            let relativeUrl = "";
            if (Array.isArray(imgArr) && imgArr.length > 0) {
              relativeUrl = imgArr[0].attributes.url;
            }
            const existingUrl = relativeUrl
              ? `${process.env.REACT_APP_STRAPI_URL}${relativeUrl}`
              : "";

            let storeObj = null;
            const storeData = prodRel?.attributes?.store?.data;
            if (storeData) {
              storeObj = {
                id: storeData.id,
                name: storeData.attributes.name,
              };
            }

            console.log(
              `updateQuantity - anidado [${idx}] nombre="${itemAttrs.nombre}", tienda="${storeObj?.name}", existingUrl="${existingUrl}"`
            );
            return {
              ...itemAttrs,
              producto: prodId,
              imagen_predeterminada: itemAttrs.imagen_predeterminada?.data?.id || null,
              imagen: existingUrl,
              store: storeObj,
            };
          });
        } else {
          console.log("updateQuantity - attrs.productos no reconocido:", attrs.productos);
        }
      } else {
        console.log("updateQuantity - no existe carrito existente");
      }
      console.log("updateQuantity - productosDesdeBackend resultante:", productosDesdeBackend);

      const tempItems = productosDesdeBackend
        .map((i) => {
          if (i.producto === productoId) {
            const nuevoSubtotal = i.precio_unitario * nuevaCantidad;
            console.log(
              `updateQuantity - item "${i.nombre}" cantidad a ${nuevaCantidad}, subtotal provisional ${nuevoSubtotal}`
            );
            return { ...i, cantidad: nuevaCantidad, subtotal: nuevoSubtotal };
          }
          return i;
        })
        .filter((i) => i.cantidad > 0);

      let mergedItems = await Promise.all(
        tempItems.map(async (item, idx) => {
          console.log(
            `updateQuantity [${idx}] - Parámetros antes de recálculo:`,
            {
              nombre: item.nombre,
              precio_unitario: item.precio_unitario,
              cantidad: item.cantidad,
              cpOrigen: item.cp,
              cpDestino: item.cp_destino || "11560",
              largo: item.largo,
              ancho: item.ancho,
              alto: item.alto,
              peso: item.peso,
            }
          );

          const nuevoSubtotal = item.subtotal;
          const comisionPlataformaNueva = precotizarPlataforma(nuevoSubtotal);
          const envioRecalculado = await precotizarMienvio(
            item.cp,
            item.cp_destino || "11560",
            item.largo,
            item.ancho,
            item.alto,
            item.peso,
            item.cantidad
          );
          const comisionStripeNueva = precotizarStripe(nuevoSubtotal, envioRecalculado, comisionPlataformaNueva);

          console.log(
            `updateQuantity [${idx}] - comisionPlataforma recalculada: ${comisionPlataformaNueva}, comisionStripe recalculada: ${comisionStripeNueva}`
          );

          let nuevaEnvio = item.envio;
          if (item.producto) {
            try {
              nuevaEnvio = await precotizarMienvio(
                item.cp,
                item.cp_destino || "11560",
                item.largo,
                item.ancho,
                item.alto,
                item.peso,
                item.cantidad
              );
              console.log(
                `updateQuantity [${idx}] - precotizarMienvio devolvió:`,
                nuevaEnvio
              );
            } catch (e) {
              console.error("updateQuantity - error recalc envío:", e);
            }
          }

          const nuevoTotal = parseFloat(
            (nuevoSubtotal + comisionStripeNueva + comisionPlataformaNueva + nuevaEnvio).toFixed(2)
          );
          console.log(
            `updateQuantity [${idx}] - item "${item.nombre}" recalculado: subtotal ${nuevoSubtotal}, comisionPlataforma ${comisionPlataformaNueva}, comisionStripe ${comisionStripeNueva}, envío ${nuevaEnvio}, total ${nuevoTotal}`
          );

          return {
            ...item,
            comisionPlataforma: comisionPlataformaNueva,
            comisionStripe: comisionStripeNueva,
            envio: nuevaEnvio,
            total: nuevoTotal,
          };
        })
      );

      console.log("updateQuantity - mergedItems antes de setItems:", mergedItems);

      const nuevoTotal = calcularTotal(mergedItems);
      console.log("updateQuantity - nuevoTotal:", nuevoTotal);
      setItems(mergedItems);
      setTotal(nuevoTotal);

      const productosParaPayload = mergedItems.map((item) => ({
        producto: item.producto,
        nombre: item.nombre,
        precio_unitario: item.precio_unitario,
        cantidad: item.cantidad,
        subtotal: item.subtotal,
        envio: item.envio,
        comisionStripe: item.comisionStripe,
        comisionPlataforma: item.comisionPlataforma,
        total: item.total,
        imagen_predeterminada: item.imagen_predeterminada || null,
        store: item.store?.id || null,
      }));
      console.log("updateQuantity - productosParaPayload:", productosParaPayload);

      const payload2 = {
        data: {
          usuario_email: user.email,
          productos: productosParaPayload,
          total: nuevoTotal,
          estado: "activo",
          ultima_actualizacion: new Date().toISOString(),
        },
      };
      console.log("updateQuantity - payload final:", payload2);

      const endpoint = `${process.env.REACT_APP_STRAPI_URL}/api/carritos`;
      if (carritoId) {
        console.log("updateQuantity - haciendo PUT en Strapi carritoId:", carritoId);
        const response2 = await fetch(`${endpoint}/${carritoId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload2),
        });
        console.log("updateQuantity - PUT response status:", response2.status);
      } else {
        console.log("updateQuantity - haciendo POST en Strapi para crear carrito");
        const response2 = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload2),
        });
        console.log("updateQuantity - POST response status:", response2.status);
      }
    } catch (error) {
      console.error("updateQuantity - error:", error);
    }
  };

  const clearCart = async () => {
    if (!isAuthenticated || !user) {
      console.log("clearCart - no autenticado o sin usuario");
      localStorage.removeItem("carrito");
      setItems([]);
      setTotal(0);
      return;
    }

    console.log("clearCart - comenzando limpieza de carrito");

    let carritoExistente = null;
    try {
      const urlFetch = `${process.env.REACT_APP_STRAPI_URL}/api/carritos?filters[usuario_email][$eq]=${encodeURIComponent(
        user.email
      )}&filters[estado][$eq]=activo`;
      console.log("clearCart - URL fetch carrito:", urlFetch);

      const res = await fetch(urlFetch, { credentials: "include" });
      console.log("clearCart - status fetch carrito:", res.status);
      const json = await res.json();
      console.log("clearCart - json fetch carrito:", JSON.stringify(json, null, 2));

      carritoExistente = json?.data?.[0] || null;
      console.log("clearCart - carritoExistente:", carritoExistente);
    } catch (err) {
      console.error("Error obteniendo carrito de Strapi:", err);
      carritoExistente = null;
    }

    setItems([]);
    setTotal(0);
    console.log("clearCart - contexto local vaciado");

    if (carritoExistente) {
      const carritoId = carritoExistente.id;
      const payload = {
        data: {
          usuario_email: user.email,
          productos: [],
          total: 0,
          estado: "inactivo",
          ultima_actualizacion: new Date().toISOString(),
        },
      };
      console.log("clearCart - payload a enviar:", payload);
      try {
        const response = await fetch(`${process.env.REACT_APP_STRAPI_URL}/api/carritos/${carritoId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        });
        console.log("clearCart - PUT response status:", response.status);
      } catch (err) {
        console.error("Error marcando carrito inactivo:", err);
      }
    } else {
      console.log("clearCart - no había carrito activo para marcar inactivo");
    }
  };

  useEffect(() => {
    setTotal(calcularTotal(items));
  }, [items]);

  return (
    <CartContext.Provider
      value={{
        items,
        total,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        getItemCount,
        precotizarStripe,
        precotizarPlataforma,
        precotizarMienvio,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
