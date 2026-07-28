import React from "react";
import "../styles/LaboryBadge.css";
import labory from "../assets/labory.png";

const LaboryBadge = () => {
  return (
    <div className="labory-container">
      {/* Imagen del logo */}
      <img src={labory} alt="Labory Logo" className="labory-image" />

      {/* SVG Circular para probar la posición */}
      <svg className="labory-svg" viewBox="0 0 220 220">
        <defs>
          <path id="circle-path" d="M 110,10 A 100,100 0 1,1 109.9,10" />
        </defs>

        {/* Agrupamos el texto para animarlo */}
        <g className="labory-text-group">
          <text className="labory-text">
            <textPath href="#circle-path" startOffset="50%" textAnchor="middle">
              L A B O R Y
            </textPath>
          </text>
        </g>
      </svg>
    </div>
  );
};

export default LaboryBadge;
