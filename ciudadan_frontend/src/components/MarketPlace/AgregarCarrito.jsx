import { useCart } from "react-use-cart";

const AgregarCarrito= ({ producto }) => {
  const { addItem } = useCart();

  const handleAdd = () => {
    const item = {
      id: producto.id,
      name: producto.nombre,
      price: producto.precio,
      image: producto.imagen_predeterminada?.url || "",
      stock: producto.stock,
    };
    addItem(item);
  };

  return (
    <button
      onClick={handleAdd}
      className="bg-gradient-to-r from-green-600 to-purple-700 text-white font-bold py-2 px-4 rounded-full shadow-lg flex items-center gap-2 hover:scale-105 transition-transform duration-200"
    >
      <i className="material-icons">add_shopping_cart</i>
      Agregar al carrito
    </button>
  );
};

export default AgregarCarrito;
