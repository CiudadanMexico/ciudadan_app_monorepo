// CartIcon.jsx
import { MdShoppingCart } from "react-icons/md";
import { useNavigate } from "react-router-dom";
import { useCart } from "../../Contexts/CartContext";
import { useEffect, useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import "../../styles/MessagesIcon.css";

const CartIcon = () => {
  const navigate = useNavigate();
  const { getItemCount } = useCart();
  const { isAuthenticated } = useAuth0();
  const [itemCountLocal, setItemCountLocal] = useState(() => {
    const raw = localStorage.getItem("itemCount");
    return raw ? parseInt(raw) : 0;
  });

  // Escuchar eventos del carrito local (cuando no hay sesión)
  useEffect(() => {
    if (!isAuthenticated) {
      const handleUpdate = (e) => {
        console.log("🟢 CartIcon.jsx - evento recibido:", e.detail);
        setItemCountLocal(e.detail.itemCount);
      };

      window.addEventListener("carritoLocalActualizado", handleUpdate);

      return () => {
        window.removeEventListener("carritoLocalActualizado", handleUpdate);
      };
    }
  }, [isAuthenticated]);

  const handleClick = () => {
    navigate("/carrito");
  };

  const totalUnidades = isAuthenticated ? getItemCount() : itemCountLocal;

  return (
    <div className="message-icon-container" onClick={handleClick}>
      <MdShoppingCart className="message-icon" />
      {totalUnidades > 0 && (
        <span className="message-count">{totalUnidades}</span>
      )}
    </div>
  );
};

export default CartIcon;
