// CartIcon.jsx
import { MdShoppingCart } from "react-icons/md";
import { useNavigate } from "react-router-dom";
import { useCart } from "../../Contexts/CartContext";
import { useEffect, useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import "../../styles/MessagesIcon.css";
import { MdShoppingBag } from "react-icons/md";
import CartMarketFoodIcon from '../svgs/CartMarketFoodIcon'
import { useFoodCart } from "../../Contexts/FoodCartContext";

const CartIcon = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth0();
  // Carrito Marketplace
  const { getItemCount } = useCart();
  // Carrito Food
  const { totalItems } = useFoodCart();

  // Cantidad local del carrito Marketplace para usuarios no autenticados
  const [itemCountLocal, setItemCountLocal] = useState(() => {
    const raw = localStorage.getItem("itemCount");
    return raw ? parseInt(raw) : 0;
  });

  // Cantidad local del carrito Food para usuarios no autenticados
  const [foodItemCountLocal, setFoodItemCountLocal] = useState(() => {
    const raw = localStorage.getItem("foodCartItemCount");
    return raw ? parseInt(raw, 10) : 0;
  });


  /**
   * Marketplace
   *
   * Escuchamos los cambios del carrito local cuando el usuario no está autenticado.
  */
  useEffect(() => {
    if (!isAuthenticated) {
      const handleUpdate = (e) => {
        console.log("🛒 CartIcon - actualización carrito Marketplace:", e.detail);
        setItemCountLocal(e.detail?.itemCount ?? 0);
      };

      window.addEventListener("carritoLocalActualizado", handleUpdate);

      return () => {
        window.removeEventListener("carritoLocalActualizado", handleUpdate);
      };
    }
  }, [isAuthenticated]);

  /**
  * Food
  *
  * Si tu FoodCartContext dispara un evento cuando cambia el carrito local, lo escuchamos aquí.
  */
  useEffect(() => {
    if (isAuthenticated) return;

    const handleFoodCartUpdate = (e) => {
      console.log("🍔 CartIcon - actualización carrito Food:", e.detail);
      setFoodItemCountLocal(e.detail?.itemCount ?? 0);
    };

    window.addEventListener("foodCartLocalActualizado", handleFoodCartUpdate);

    return () => {
      window.removeEventListener("foodCartLocalActualizado", handleFoodCartUpdate);
    };
  }, [isAuthenticated]);



  /**
   * Cantidad Marketplace
   */
  const marketCount = isAuthenticated ? getItemCount() : itemCountLocal;

  /**
   * Cantidad Food
  */
  const foodCount = isAuthenticated ? totalItems : foodItemCountLocal;

  /**
   * Total de unidades de ambos carritos
   */
  const totalItemsCart = marketCount + foodCount;

  /**
 * Determinar icono
 */
  const renderCartIcon = () => {
    // Ningún producto
    if (marketCount === 0 && foodCount === 0) {
      return <MdShoppingCart className="message-icon" />;
    }

    // Solo Marketplace
    if (marketCount > 0 && foodCount === 0) {
      return <MdShoppingCart className="message-icon" />;
    }

    // Solo Food
    if (marketCount === 0 && foodCount > 0) {
      return <MdShoppingBag className="message-icon" />;
    }

    // Marketplace + Food
    if (marketCount > 0 && foodCount > 0) {
      return (
        <CartMarketFoodIcon
          className="message-icon"
        />
      );
    }

    return <MdShoppingCart className="message-icon" />;
  };

  const handleClick = () => {
    navigate("/carrito");
  };

  return (
    <div
      className="message-icon-container"
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          navigate("/carrito");
        }
      }}
    >
      {renderCartIcon()}

      {totalItemsCart > 0 && (
        <span className="message-count">
          {totalItemsCart}
        </span>
      )}
    </div>
  );
};

export default CartIcon;
