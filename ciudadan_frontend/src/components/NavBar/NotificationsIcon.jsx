// src/components/NavBar/NotificationsIcon.jsx
import React, { useState } from "react";
import { IoIosNotifications } from "react-icons/io";
import NotificationsMenu from "./NotificationsMenu";
import { useNotifications } from "../../Contexts/NotificationsContext";
import "../../styles/MessagesIcon.css";

/**
 * NotificationsIcon
 * Props:
 *  - count (number) optional: override
 *  - containerRef (ref) optional
 *  - handleLogout (fn) optional
 */
const NotificationsIcon = ({ count: propCount, handleLogout, containerRef }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { unreadCount, refreshNotificaciones, loading } = useNotifications();

  const count = typeof propCount === "number" ? propCount : Number(unreadCount || 0);

  const toggleMenu = async () => {
    const next = !isMenuOpen;
    setIsMenuOpen(next);

    if (next) {
      // al abrir, intentamos traer la lista actualizada (silencioso)
      try {
        if (typeof refreshNotificaciones === "function") {
          await refreshNotificaciones();
        }
      } catch (err) {
        console.error("NotificationsIcon: refreshNotificaciones error", err);
      }
    }
  };

  return (
    <div className="message-icon-container" onClick={toggleMenu} ref={containerRef}>
      <IoIosNotifications className="message-icon" />
      {/* si loading puedes mostrar spinner pequeño o seguir mostrando count */}
      {count > 0 && <span className="message-count">{count}</span>}

      <NotificationsMenu
        handleLogout={handleLogout}
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        onOpen={() => setIsMenuOpen(true)}
        containerRef={containerRef}
        className="notif-wrapper"
      />
    </div>
  );
};

export default NotificationsIcon;
