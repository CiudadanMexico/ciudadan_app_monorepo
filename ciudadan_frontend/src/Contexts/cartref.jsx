import { createContext, useContext, useEffect, useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth0();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);

  // Cargar del localStorage al inicio
  useEffect(() => {
    const stored = localStorage.getItem("carrito");
    if (stored) {
      const data = JSON.parse(stored);
      setItems(data.items || []);
      setTotal(data.total || 0);
    }
  }, []);

  // Guardar en localStorage cada que cambia
  useEffect(() => {
    if (!isAuthenticated) {
      localStorage.setItem("carrito", JSON.stringify({ items, total }));
    }
  }, [items, total, isAuthenticated]);

  const calcularTotal = (productos) =>
    productos.reduce((acc, item) => acc + item.precio_unitario * item.cantidad, 0);

  const addToCart = (producto) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.producto === producto.id);
      let updated;
      if (existing) {
        updated = prev.map((i) =>
          i.producto === producto.id
            ? { ...i, cantidad: i.cantidad + 1 }
            : i
        );
      } else {
        updated = [
          ...prev,
          {
            producto: producto.id,
            nombre: producto.nombre,
            marca: producto.marca,
            precio_unitario: producto.precio,
            cantidad: 1,
            imagen: producto.imagen_predeterminada?.url || "",
          },
        ];
      }
      const nuevoTotal = calcularTotal(updated);
      setTotal(nuevoTotal);
      return updated;
    });
  };

  const updateQuantity = (productoId, cantidad) => {
    setItems((prev) => {
      const updated = prev
        .map((i) =>
          i.producto === productoId ? { ...i, cantidad } : i
        )
        .filter((i) => i.cantidad > 0);
      setTotal(calcularTotal(updated));
      return updated;
    });
  };

  const clearCart = () => {
    setItems([]);
    setTotal(0);
  };

  // Guardar en Strapi si autenticado
  useEffect(() => {
    const saveToStrapi = async () => {
      if (isAuthenticated && items.length > 0) {
        console.log(`Buscando al usuario ${user.email}`)
        try {
          const endpoint = `${process.env.REACT_APP_STRAPI_URL}/api/carritos`;
          const query = `?filters[usuario_email][$eq]=${user.email}&filters[estado][$eq]=activo`;
          const res = await fetch(endpoint + query);
          const json = await res.json();
          const carritoExistente = json?.data?.[0];
          console.log("resultado api carritos: ", carritoExistente?.attributes);

          const payload = {
            data: {
              usuario_email: user.email,
              productos: items.map((item) => ({
                producto: item.producto,
                nombre: item.nombre,
                precio_unitario: item.precio_unitario,
                cantidad: item.cantidad,
                subtotal: item.precio_unitario * item.cantidad,
              })),
              total,
              estado: "activo",
              ultima_actualizacion: new Date().toISOString(),
            },
          };

          if (carritoExistente) {
  const response = await fetch(`${endpoint}/${carritoExistente.id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const result = await response.json();

  console.log("Status del PUT:", response.status);
console.log("¿OK?:", response.ok);
const text = await response.text();
console.log("Texto plano de la respuesta:", text);
  console.log("Resultado del PUT:", result);
} else {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const result = await response.json();
  console.log("Resultado del POST:", result);
}
        } catch (error) {
          console.error("Error al guardar en Strapi:", error);
        }
      }
    };
    saveToStrapi();
  }, [isAuthenticated, user, items, total]);

  return (
    <CartContext.Provider
      value={{ items, total, addToCart, updateQuantity, clearCart }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
