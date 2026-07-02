import React, { useEffect, useRef } from "react";
import { ReactComponent as BotonMovil } from "../../assets/boton-robot.svg";
import io from "socket.io-client";

function BotonCircular({ clase, mediaQ, onClick, searchText }) {
  const socketRef = useRef(null);

  // Conectar al socket cuando el componente se monte
  useEffect(() => {
    console.log("Intentando conectar al socket...");

    // Conectar al socket en el servidor de localhost
    socketRef.current = io(process.env.REACT_APP_SOCKET_URL || "http://localhost:3033"); // Ajusta la URL según tu servidor

    // Si la conexión es exitosa
    socketRef.current.on("connect", () => {
      console.log("Conectado al socket con éxito.");
    });

    // Si hay un error al intentar conectar
    socketRef.current.on("connect_error", (error) => {
      console.error("Error al conectar con el socket:", error);
    });

    // Si se desconecta del socket
    socketRef.current.on("disconnect", () => {
      console.log("Desconectado del socket.");
    });

    // Desconectar al desmontarse el componente
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        console.log("Socket desconectado.");
      }
    };
  }, []);

  // Función para manejar el click y enviar el texto al socket
  const handleClick = (e) => {
    console.log("¡BotonCircular clickeado!");

    // Verificamos si el socket está conectado antes de enviar el texto
    if (socketRef.current && socketRef.current.connected) {
      console.log("ANTES de enviar el texto, se va a enviar:", searchText);

      // Enviar el texto al socket
      socketRef.current.emit("speakTTS", searchText);

      console.log("DESPUÉS de enviar el texto, texto enviado:", searchText);
    } else {
      console.error("Socket no está conectado. No se puede enviar el texto.");
    }

    // Llamamos a onClick si es que existe
    if (onClick) onClick(e);
  };

  // Mostrar el botón según el media query
  if (mediaQ) {
    return (
      <button className={clase} onClick={handleClick}>
        <BotonMovil className="asistente-ia" />
      </button>
    );
  } else {
    return (
      <button className={clase} onClick={handleClick}>
        <BotonMovil className="asistente-ia asistente-ia-svg" />
      </button>
    );
  }
}

export default BotonCircular;
