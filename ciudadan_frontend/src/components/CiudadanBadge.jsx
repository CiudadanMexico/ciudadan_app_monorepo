import React from "react";
import "../styles/CiudadanBadge.css";

const CiudadanBadge = () => {
  return (
    <div className="ciudadan-container">
      {/* Imagen del logo */}
      

      {/* SVG Circular para probar la posición */}
      <svg className="ciudadan-svg" id="ciudadan-svg" viewBox="0 0 220 220">
        <defs>
          <path id="ciudadan-circle-path" d="M 110,10 A 100,100 0 0,1 110,210" />
        </defs>

        {/* Agrupamos el texto para animarlo */}
        <g className="ciudadan-text-group">
          <text className="ciudadan-text">
            <textPath href="#ciudadan-circle-path" startOffset="50%" textAnchor="middle">
              C I U D A D A N *ORG
            </textPath>
          </text>
        </g>
      </svg>
    </div>
  );
};

export default CiudadanBadge;
