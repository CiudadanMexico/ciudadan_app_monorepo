import React from "react";
import axios from "axios";

const NotificationTester = () => {
  const handleSendNotification = async () => {
    try {
      const payload = {
        title: "🔔 Notificación de prueba",
        body: "Este es un mensaje de prueba enviada desde el componente NotificationTester",
        email: "ciudadanmx@gmail.com", // o el email del usuario destino
        meta: {
          tipo: "prueba",
          fecha: new Date().toISOString(),
        },
      };

      // 👉 Llama a tu backend (usa tu URL real del servidor, no Strapi)
      const response = await axios.post(
        `${process.env.REACT_APP_SOCKET_URL || "http://localhost:3033"}/notifica`,
        payload,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      console.log("✅ Notificación enviada correctamente:", response.data);
      alert("✅ Notificación enviada al servidor y emitida por socket");
    } catch (error) {
      console.error("❌ Error al enviar la notificación:", error);
      alert("❌ Error al enviar la notificación. Revisa la consola.");
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <button
        onClick={handleSendNotification}
        style={{
          backgroundColor: "#fff200",
          color: "#000",
          border: "2px solid #6d6e71",
          borderRadius: "12px",
          padding: "10px 20px",
          fontWeight: "bold",
          cursor: "pointer",
        }}
      >
        Enviar notificación
      </button>
    </div>
  );
};

export default NotificationTester;
