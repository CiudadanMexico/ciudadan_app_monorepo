import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAuth0 } from "@auth0/auth0-react";
import { useNavigate } from "react-router-dom";
import { Avatar } from "@mui/material";
import { useRoles } from "../../Contexts/RolesContext";
import { useStores } from "../../hooks/useStores";

const MENU_WIDTH = 320;

const UserMenu = ({
  isProfileMenuOpen,
  onClose,
  containerRef,
  defaultProfileImage,
}) => {
  const { user, isAuthenticated, loginWithRedirect, logout } = useAuth0();
  const {
    isAdmin,
    isEditor,
    isRoot,
    isActivaMembresia,
    isClub,
    haveClub,
    userData
  } = useRoles();

  const { getStoreByEmail } = useStores();
  const navigate = useNavigate();

  const menuRef = useRef(null);
  const [position, setPosition] = useState({ top: 80, right: 20 });

  // POSICIONAMIENTO CORRECTO
  useEffect(() => {
    if (!isProfileMenuOpen || !containerRef?.current) return;

    const rect = containerRef.current.getBoundingClientRect();

    // Usar right desde el borde de la pantalla para alinear cerca del ícono
    let right = window.innerWidth - rect.right - 20;

    setPosition({
      top: rect.bottom + 8,
      right,
    });
  }, [isProfileMenuOpen, containerRef]);

  // CERRAR CLICK FUERA


  if (!isProfileMenuOpen) return null;

  const safeNavigate = (path) => {
    navigate(path);
    setTimeout(() => {
      onClose();
    }, 0);
  };

  const handleVender = async () => {
    if (!isAuthenticated || !user?.email) return;

    try {
      const stores = await getStoreByEmail(user.email);
      if (stores?.length > 0 && stores[0]?.attributes?.terminado) {
        safeNavigate(`/market/store/${stores[0].attributes.slug}`);
      } else {
        safeNavigate("/registro-vendedor");
      }
    } catch {
      safeNavigate("/registro-vendedor");
    }
  };

  const menu = (
    <div
      ref={menuRef}
      style={{
        position: "fixed",
        top: position.top,
        right: position.right,
        width: MENU_WIDTH,
        maxHeight: `calc(100dvh - ${position.top + 16}px)`,
        overflowY: "auto",
        overflowX: "hidden",
        overscrollBehavior: "contain",
        WebkitOverflowScrolling: "touch",
        background: "#ffffff",
        borderRadius: 14,
        boxShadow: "0 25px 70px rgba(0,0,0,0.35)",
        zIndex: 2147483647,
        padding: 12,
        fontFamily: "system-ui, sans-serif",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* PERFIL */}
      {isAuthenticated && user && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: 12,
            borderBottom: "1px solid #eee",
            cursor: "pointer",
          }}
          onClick={() =>
            safeNavigate(
              `/perfil/${(user.name || "").replace(/\s+/g, "-")}`
            )
          }
        >
          <Avatar
            src={
              userData?.foto_credencial ||
              user.picture ||
              defaultProfileImage
            }
            sx={{ width: 48, height: 48 }}
          />
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>
              {userData?.nombre_completo || user.name}
            </div>
            <div style={{ fontSize: 12, color: "#666" }}>
              Tu Perfil / QR
            </div>
          </div>
        </div>
      )}

      {/* OPCIONES */}
      <MenuItem
        label={isActivaMembresia() ? "Mi Membresía" : "Membresías"}
        onClick={() => safeNavigate("/membresias")}
      />

      {isAuthenticated && (
        <>
          <MenuItem
            label="Tu Club"
            onClick={() =>
              safeNavigate(
                isClub() || haveClub()
                  ? "/clubs/miclub/info"
                  : "/clubs"
              )
            }
          />

          <MenuItem
            label="Tus Anuncios"
            onClick={() =>
              safeNavigate("/comunidad/mis-anuncios")
            }
          />

          <MenuItem
            label="Tus Compras"
            onClick={() =>
              safeNavigate("/market/compras/pedidos")
            }
          />

          <MenuItem label="Tu Tienda" onClick={handleVender} />

          <MenuItem
            label="Tus Cursos"
            onClick={() =>
              safeNavigate("/cursos/mis-cursos")
            }
          />
        </>
      )}

      {isAdmin() && (
        <MenuItem
          label="Dashboard Admin"
          onClick={() => safeNavigate("/admin/dashboard")}
        />
      )}

      {isEditor() && (
        <MenuItem
          label="Editor"
          onClick={() => safeNavigate("/editor")}
        />
      )}

      {isRoot() && (
        <MenuItem
          label="Root Tools"
          onClick={() => safeNavigate("/root/tools")}
        />
      )}

      <div style={{ height: 1, background: "#eee", margin: "10px 0" }} />

      {isAuthenticated ? (
        <MenuItem
          label="Salir"
          onClick={() =>
            logout({ returnTo: window.location.origin })
          }
        />
      ) : (
        <MenuItem
          label="Ingresar"
          onClick={() => loginWithRedirect()}
        />
      )}
    </div>
  );

  return createPortal(menu, document.body);
};

const MenuItem = ({ label, onClick }) => (
  <div
    onClick={(e) => {
      e.stopPropagation();
      onClick();
    }}
    style={{
      padding: "10px 14px",
      borderRadius: 10,
      cursor: "pointer",
      fontSize: 14,
      transition: "background 0.15s ease",
    }}
    onMouseEnter={(e) =>
      (e.currentTarget.style.background = "#f4f4f4")
    }
    onMouseLeave={(e) =>
      (e.currentTarget.style.background = "transparent")
    }
  >
    {label}
  </div>
);

export default UserMenu;