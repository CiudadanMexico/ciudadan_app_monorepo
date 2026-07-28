import React from "react";
import { motion } from "framer-motion";

const MapAnimation = ({taxiMovilPosicionY, direction = "right"}) => {
    //const TaxiMovilPosicionY = "20%";
    return (
      <div className="map-animation-wrapper">
        {/* Fondo con imagen de mapa */}
        <motion.div
          className="map-bg"
          // Pequeño efecto de zoom in/out continuo
          initial={{ scale: 1 }}
          animate={{ scale: 1.05 }}
          transition={{
            duration: 10,
            repeat: Infinity,
            repeatType: "reverse",
            ease: "easeInOut",
          }}
        />
  
        {/* SVG con animaciones de shapes y paths */}
        <motion.svg
          className="map-svg"
          viewBox="0 0 800 600"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
        >
          {/* Path que se dibuja y se borra en bucle */}
          <motion.path
            d="M100,500 C200,300 400,300 600,100"
            fill="none"
            stroke="#ffeb3b"
            strokeWidth="3"
            strokeDasharray="0 1"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{
              duration: 4,
              ease: "easeInOut",
              repeat: Infinity,
              repeatType: "reverse",
            }}
          />
  
          {/* Círculo pulsante al inicio del path */}
          <motion.circle
            cx="100"
            cy="500"
            r="10"
            fill="#e99db7"
            initial={{ scale: 1 }}
            animate={{ scale: 1.3 }}
            transition={{
              duration: 1,
              repeat: Infinity,
              repeatType: "reverse",
              ease: "easeInOut",
            }}
          />
  
          {/* Polígono que rota en el fondo */}
          <motion.polygon
            points="400,300 450,350 400,400 350,350"
            fill="rgba(255,255,255,0.3)"
            initial={{ rotate: 0, originX: "400", originY: "350" }}
            animate={{ rotate: 360 }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: "linear",
            }}
          />
        </motion.svg>
  
        {/* Ícono de taxi desplazándose horizontalmente */}
        <motion.div
      className="taxi-icon"
      initial={{ x: direction === "right" ? -50 : 800 }} // Empieza desde la izquierda o la derecha
      animate={{ x: direction === "right" ? 800 : -50 }} // Se mueve hacia la derecha o la izquierda
      transition={{
        duration: 6,
        repeat: Infinity,
        repeatType: "reverse",
        ease: "easeInOut",
      }}
      style={{
        top: taxiMovilPosicionY,
        zIndex: 2000,
      }}
    >
      <i className="material-icons" style={{ fontSize: "40px", color: "#e05c88" }}>
        local_taxi
      </i>
    </motion.div>
      </div>
    );
  };
  
  export default MapAnimation;
  