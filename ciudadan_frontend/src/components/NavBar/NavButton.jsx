import React from "react";
import "../../styles/NavBar.css"; // Importa los estilos necesarios

const NavButton = ({
  section,
  label,
  path,
  activeTab,
  handleNavigation,
  iconMap,
  icon,
}) => {
  const targetPath = path || `/${section}`;
  const buttonLabel = label || (section ? section.charAt(0).toUpperCase() + section.slice(1) : "");
  const buttonIcon = icon || (section ? iconMap?.[section] : null);
  const isActive = activeTab === targetPath;
  

  return (
    <div
      className={`nav-link ${isActive ? "active" : ""}`}
      onClick={() => handleNavigation(targetPath)}
      style={{ cursor: "pointer", position: "relative" }}
    >
      <div className="small-icon" style={{ position: "relative" }}>
        {buttonIcon}
      
      </div>
      <div className="nav-text">
        {buttonLabel}
      </div>
    </div>
  );
};

export default NavButton;