import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Direccionador = ({ eventUrl, eventKey, redirectPath }) => {
  const navigate = useNavigate();

  useEffect(() => {
    console.log("[Direccionador] Inicializando con:");
    console.log("  eventUrl:", eventUrl);
    console.log("  eventKey:", eventKey);
    console.log("  redirectPath:", redirectPath);

    const eventSource = new EventSource(eventUrl);

    eventSource.onopen = () => {
      console.log("[Direccionador] Conexión abierta al endpoint:", eventUrl);
    };

    eventSource.onmessage = (event) => {
      console.log("[Direccionador] Mensaje recibido:", event.data);
      if (event.data.includes(eventKey)) {
        console.log("[Direccionador] Evento detectado ('" + eventKey + "'). Redirigiendo a:", redirectPath);
        navigate(redirectPath);
      } else {
        console.log("[Direccionador] Mensaje no coincide con la clave indicada.");
      }
    };

    eventSource.onerror = (error) => {
      console.error("[Direccionador] Error en EventSource:", error);
      eventSource.close();
    };

    return () => {
      console.log("[Direccionador] Cerrando conexión EventSource.");
      eventSource.close();
    };
  }, [eventUrl, eventKey, redirectPath, navigate]);

  return null;
};

export default Direccionador;
