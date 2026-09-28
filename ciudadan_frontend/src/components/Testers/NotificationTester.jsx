import React from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useNotifications } from "../../Contexts/NotificationsContext";

/**
 * Tester de notificaciones (ruta: /notificationtester).
 *
 * Prueba EXACTAMENTE la misma API pública que usarán los componentes (§25):
 *   const { toast, send } = useNotifications();
 * No usa endpoints especiales.
 */
const NotificationTester = () => {
  const { user } = useAuth0();
  const { toast, send, loading } = useNotifications();
  const [sending, setSending] = React.useState(false);

  const handleToast = () => {
    toast.success("Toast funcionando");
  };

  const handleToastError = () => {
    toast.error("Error de prueba");
  };

  const handleSend = async () => {
    const to = user?.email;
    if (!to) {
      toast.warning("Inicia sesión para probar send() (falta user.email)");
      return;
    }

    setSending(true);
    try {
      await send({
        to,
        title: "Prueba de notificaciones",
        message: "Esta notificación debe persistir y llegar por socket.",
        type: "system.info",
        link: "/notificaciones",
      });
      toast.success("Notificación enviada y persistida");
    } catch (err) {
      console.error("NotificationTester.send error", err);
      toast.error(err?.message || "No se pudo enviar la notificación");
    } finally {
      setSending(false);
    }
  };

  const buttonStyle = {
    backgroundColor: "#fff200",
    color: "#000",
    border: "2px solid #6d6e71",
    borderRadius: "12px",
    padding: "10px 20px",
    fontWeight: "bold",
    cursor: "pointer",
    marginRight: 8,
  };

  return (
    <div style={{ padding: 20 }}>
      <h3>Tester de notificaciones</h3>
      <p style={{ color: "#666" }}>
        {user ? `Destinatario: ${user.email}` : "No hay sesión iniciada"}
      </p>

      <button onClick={handleToast} style={buttonStyle}>
        toast.success("Toast funcionando")
      </button>

      <button onClick={handleToastError} style={buttonStyle}>
        toast.error("Error de prueba")
      </button>

      <button onClick={handleSend} style={buttonStyle} disabled={sending || loading}>
        {sending ? "Enviando..." : "send({ ... })"}
      </button>
    </div>
  );
};

export default NotificationTester;
