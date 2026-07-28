import React, { useState, useEffect } from "react";
import { useCart } from "../../Contexts/CartContext";
import { useAuth0 } from "@auth0/auth0-react";
import { useNavigate } from "react-router-dom";
import "../../styles/Carrito.css";

const Carrito = () => {
  const { items, total, updateQuantity, clearCart } = useCart();
  const { isAuthenticated, loginWithRedirect, user } = useAuth0();
  const navigate = useNavigate();

  const [localItems, setLocalItems] = useState([]);
  const [localTotal, setLocalTotal] = useState(0);

  useEffect(() => {
    if (!isAuthenticated) {
      const raw = JSON.parse(localStorage.getItem("carrito"));
      const carritoLocal = Array.isArray(raw) ? raw : [];
      console.log("🧾 carritoLocal antes de fetch:", carritoLocal);

      const fetchDetallesProductos = async () => {
        console.log("fetch de detalles de productos ...");
        const detalles = await Promise.all(
          carritoLocal.map(async (item) => {
            try {
              const res = await fetch(
                `${process.env.REACT_APP_STRAPI_URL}/api/productos/${item.producto}?populate=imagen_predeterminada`
              );
              const json = await res.json();
              // obtiene atributos
              const prod = json?.data?.attributes || {};
              const imagenData = prod?.imagen_predeterminada?.data?.[0]?.attributes;
              const imagenUrl =
                imagenData?.formats?.medium?.url || imagenData?.url || null;
              const imagenCompleta = imagenUrl
                ? `${process.env.REACT_APP_STRAPI_URL}${imagenUrl}`
                : "";

              return {
                ...item,
                marca: prod.marca || "",
                imagen: imagenCompleta,
              };
            } catch (err) {
              console.error("❌ Error al obtener producto:", item.producto, err);
              return item;
            }
          })
        );

        console.log("🧩 Carrito con detalles:", detalles);
        setLocalItems(detalles);

        const suma = detalles.reduce(
          (acc, item) => acc + (item.precio_unitario || 0) * (item.cantidad || 0),
          0
        );
        setLocalTotal(suma);
      };

      fetchDetallesProductos();
    }
  }, [isAuthenticated]);

  const handleVaciarCarrito = async () => {
    if (!isAuthenticated) {
      localStorage.removeItem("carrito");
      setLocalItems([]);
      setLocalTotal(0);
      localStorage.setItem("itemCount", "0");
      console.log("🧹 handleVaciarCarrito - carrito y itemCount eliminados");
      window.dispatchEvent(new CustomEvent("carritoLocalActualizado", { detail: { itemCount: 0 } }));
      return;
    }

    if (!user?.email) {
      console.warn("No hay email de usuario. No puedo vaciar.");
      return;
    }

    try {
      const resFetch = await fetch(
        `${process.env.REACT_APP_STRAPI_URL}/api/carritos?filters[usuario_email][$eq]=${encodeURIComponent(
          user.email
        )}&filters[estado][$eq]=activo`,
        {
          credentials: "include",
        }
      );
      const json = await resFetch.json();
      const carritoEntry = json?.data?.[0];
      if (!carritoEntry) {
        clearCart();
        return;
      }
      const carritoIdStrapi = carritoEntry.id;
      const payload = {
        data: {
          productos: [],
          total: 0,
          total_envios: 0,
          estado: "activo",
          ultima_actualizacion: new Date().toISOString(),
        },
      };
      const resPut = await fetch(
        `${process.env.REACT_APP_STRAPI_URL}/api/carritos/${carritoIdStrapi}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(payload),
        }
      );
      if (!resPut.ok) {
        const errText = await resPut.text();
        console.error("Error de Strapi:", errText);
        return;
      }
      clearCart();
    } catch (err) {
      console.error("Error en handleVaciarCarrito:", err);
    }
  };

  const updateLocalQuantity = (productoId, nuevaCantidad) => {
    const raw = JSON.parse(localStorage.getItem("carrito"));
    const carritoLocal = Array.isArray(raw) ? raw : [];
    const idxLocal = carritoLocal.findIndex((item) => item.producto === productoId);
    if (idxLocal !== -1) {
      if (nuevaCantidad <= 0) {
        carritoLocal.splice(idxLocal, 1);
      } else {
        carritoLocal[idxLocal].cantidad = nuevaCantidad;
      }
      localStorage.setItem("carrito", JSON.stringify(carritoLocal));

      const itemCount = carritoLocal.reduce((acc, item) => acc + item.cantidad, 0);
      localStorage.setItem("itemCount", itemCount);
      console.log("🧮 updateLocalQuantity - itemCount actualizado:", itemCount);
      window.dispatchEvent(new CustomEvent("carritoLocalActualizado", { detail: { itemCount } }));

      setLocalItems((prev) => {
        const nuevos = [...prev];
        const idxPrev = nuevos.findIndex((item) => item.producto === productoId);
        if (idxPrev !== -1) {
          if (nuevaCantidad <= 0) {
            nuevos.splice(idxPrev, 1);
          } else {
            nuevos[idxPrev].cantidad = nuevaCantidad;
          }
        }
        return nuevos;
      });

      const newTotal = carritoLocal.reduce(
        (acc, item) => acc + (item.precio_unitario || 0) * (item.cantidad || 0),
        0
      );
      setLocalTotal(newTotal);
    }
  };

  // -----------------------
  // Nuevo: sincronizar carrito con Strapi y navegar a /carrito/finalizar
  // -----------------------
  const handleFinalizarCompra = async () => {
    // Si no está autenticado -> forzar login y regresar a /carrito/finalizar
    if (!isAuthenticated) {
      // Devolvemos a la ruta de finalizar después del login
      await loginWithRedirect({ appState: { returnTo: "/carrito/finalizar" } });
      return;
    }

    // Debe existir email del usuario
    if (!user?.email) {
      console.error("No hay email del usuario, no puedo sincronizar el carrito.");
      // opcional: mostrar un aviso al usuario
      return;
    }

    try {
      // Armar el arreglo de productos para Strapi a partir del contexto `items`
      const productosPayload = (items || []).map((it) => ({
        producto: it.producto,
        cantidad: it.cantidad,
        precio_unitario: it.precio_unitario,
        subtotal: it.subtotal,
        envio: it.envio,
        comisionPlataforma: it.comisionPlataforma,
        comisionStripe: it.comisionStripe,
      }));

      const total_envios = (items || []).reduce(
        (acc, it) => acc + (it.envio || 0),
        0
      );

      const payload = {
        data: {
          productos: productosPayload,
          total: total || 0,
          total_envios: total_envios,
          estado: "activo",
          ultima_actualizacion: new Date().toISOString(),
          usuario_email: user.email,
        },
      };

      // Buscar carrito activo del usuario en Strapi
      const resFetch = await fetch(
        `${process.env.REACT_APP_STRAPI_URL}/api/carritos?filters[usuario_email][$eq]=${encodeURIComponent(
          user.email
        )}&filters[estado][$eq]=activo`,
        {
          credentials: "include",
        }
      );

      if (!resFetch.ok) {
        console.error("Error al buscar carrito en Strapi:", await resFetch.text());
        // seguimos: intentamos crear de todas formas
      }

      const json = await resFetch.json().catch(() => ({}));
      const carritoEntry = json?.data?.[0];

      if (carritoEntry) {
        // actualizar
        const carritoIdStrapi = carritoEntry.id;
        const resPut = await fetch(
          `${process.env.REACT_APP_STRAPI_URL}/api/carritos/${carritoIdStrapi}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(payload),
          }
        );
        if (!resPut.ok) {
          console.error("Error al actualizar carrito en Strapi:", await resPut.text());
          // opcional: notificar al usuario
        } else {
          console.log("Carrito actualizado en Strapi (PUT).");
        }
      } else {
        // crear
        const resPost = await fetch(`${process.env.REACT_APP_STRAPI_URL}/api/carritos`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        });
        if (!resPost.ok) {
          console.error("Error al crear carrito en Strapi:", await resPost.text());
        } else {
          console.log("Carrito creado en Strapi (POST).");
        }
      }

      // Finalmente, navegar a la ruta de finalizar compra
      navigate("/carrito/finalizar");
    } catch (err) {
      console.error("Error en handleFinalizarCompra:", err);
    }
  };

  // -----------------------
  // Render: no autenticado
  // -----------------------
  if (!isAuthenticated) {
    return (
      <div className="carrito-container">
        <h2>Carrito de compras</h2>
        {localItems.length === 0 ? (
          <p className="carrito-vacio">Tu carrito está vacío.</p>
        ) : (
          <div className="carrito-items">
            {localItems.map((item, index) => (
              <div key={index} className="carrito-item">
                {item.imagen && (
                  <img
                    src={item.imagen}
                    alt={item.nombre}
                    className="carrito-img"
                  />
                )}
                <div className="carrito-info">
                  <h4>{item.nombre}</h4>
                  <p>
                    Precio unitario: ${(item.precio_unitario || 0).toFixed(2)}
                  </p>
                  <p>
                    Subtotal: $
                    {(
                      (item.precio_unitario || 0) * (item.cantidad || 0)
                    ).toFixed(2)}
                  </p>
                  <div className="carrito-cantidad">
                    <button
                      onClick={() =>
                        updateLocalQuantity(
                          item.producto,
                          (item.cantidad || 0) - 1
                        )
                      }
                    >
                      -
                    </button>
                    <span>{item.cantidad || 0}</span>
                    <button
                      onClick={() =>
                        updateLocalQuantity(
                          item.producto,
                          (item.cantidad || 0) + 1
                        )
                      }
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            ))}

            <div className="carrito-resumen">
              <p>
                Total del carrito:{" "}
                <strong>${(localTotal || 0).toFixed(2)}</strong>
              </p>
              <button onClick={handleVaciarCarrito}>Vaciar carrito</button>
              {/* Botón Finalizar para no autenticados lanza login y redirige a /carrito/finalizar */}
              <button onClick={handleFinalizarCompra}>Finalizar compra</button>
            </div>
          </div>
        )}
        <div className="carrito-login">
          <p>Si quieres modificar o finalizar tu compra, inicia sesión:</p>
          <button onClick={() => loginWithRedirect()}>Iniciar sesión</button>
        </div>
      </div>
    );
  }

  // -----------------------
  // Render: autenticado
  // -----------------------
  const itemsPorTienda = items.reduce((acc, item) => {
    const nombreTienda = item.store?.name || "Sin tienda";
    if (!acc[nombreTienda]) {
      acc[nombreTienda] = [];
    }
    acc[nombreTienda].push(item);
    return acc;
  }, {});

  return (
    <div className="carrito-container">
      <h2>Carrito de compras</h2>

      {items.length === 0 ? (
        <p className="carrito-vacio">Tu carrito está vacío.</p>
      ) : (
        <div className="carrito-items">
          {Object.entries(itemsPorTienda).map(
            ([nombreTienda, itemsDeTienda], tiendaIndex) => {
              const subtotalTienda = itemsDeTienda.reduce(
                (acc, item) => acc + (item.subtotal || 0),
                0
              );
              const envioTienda = itemsDeTienda.reduce(
                (acc, item) => acc + (item.envio || 0),
                0
              );
              const comisionesTienda = itemsDeTienda.reduce(
                (acc, item) =>
                  acc +
                  ((item.comisionPlataforma || 0) + (item.comisionStripe || 0)),
                0
              );

              return (
                <div key={tiendaIndex} className="carrito-tienda">
                  <h3 className="carrito-tienda-nombre">
                    Tienda: {nombreTienda}
                  </h3>

                  {itemsDeTienda.map((item, index) => (
                    <div key={index} className="carrito-item">
                      {item.imagen && (
                        <img
                          src={item.imagen}
                          alt={item.nombre}
                          className="carrito-img"
                        />
                      )}
                      <div className="carrito-info">
                        <h4>{item.nombre}</h4>
                        <p>Marca: {item.marca}</p>
                        <p>
                          Precio unitario: $
                          {(item.precio_unitario || 0).toFixed(2)}
                        </p>
                        <p>
                          Subtotal: ${(item.subtotal || 0).toFixed(2)}
                        </p>
                        <div className="carrito-cantidad">
                          <button
                            onClick={() =>
                              updateQuantity(item.producto, item.cantidad - 1)
                            }
                          >
                            -
                          </button>
                          <span>{item.cantidad || 0}</span>
                          <button
                            onClick={() =>
                              updateQuantity(item.producto, item.cantidad + 1)
                            }
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  <div className="carrito-tienda-resumen">
                    <p>
                      Subtotal tienda:{" "}
                      <strong>${subtotalTienda.toFixed(2)}</strong>
                    </p>
                    <p>
                      Envío tienda:{" "}
                      <strong>${envioTienda.toFixed(2)}</strong>
                    </p>
                    <p>
                      Comisiones tienda:{" "}
                      <strong>${comisionesTienda.toFixed(2)}</strong>
                    </p>
                    <p>
                      Total tienda:{" "}
                      <strong>
                        {(subtotalTienda + envioTienda + comisionesTienda).toFixed(
                          2
                        )}
                      </strong>
                    </p>
                  </div>
                </div>
              );
            }
          )}

          <div className="carrito-resumen">
            <p>
              Total del carrito: <strong>${(total || 0).toFixed(2)}</strong>
            </p>
            <button onClick={handleVaciarCarrito}>Vaciar carrito</button>
            {/* Botón Finalizar sincroniza y navega */}
            <button onClick={handleFinalizarCompra}>Finalizar compra</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Carrito;
