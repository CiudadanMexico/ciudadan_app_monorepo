import '../../styles/AccountMenu.css';
import { useState, useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import axios from 'axios';

const MessagesMenu = ({ isOpen, onClose, onLogout }) => {
  const { user, isAuthenticated } = useAuth0();
  const [messages, setMessages] = useState([]); // Estado para los mensajes
  const [loading, setLoading] = useState(true); // Estado para saber si está cargando
  const [error, setError] = useState(null); // Estado para manejar errores

  useEffect(() => {
    // Asegurarse de que el usuario esté autenticado antes de hacer la petición
    if (isAuthenticated && user) {
      axios
        .get(`http://localhost:1337/api/messages?filters[sender_id][email]=${user.email}`)
        .then((response) => {
          setMessages(response.data.data); // Guardar los mensajes
          setLoading(false); // Cambiar estado de carga a falso
        })
        .catch((err) => {
          setError(err.message); // Si hay un error, lo guardamos
          setLoading(false); // Cambiar estado de carga a falso
        });
    }
  }, [isAuthenticated, user]);

  // Mostrar mensajes o mostrar estado de carga/error
  if (loading) {
    return (
      <div className={`message-menu ${isOpen ? 'open' : 'closed'}`}>
        <ul>
          <li>Cargando mensajes...</li>
        </ul>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`message-menu ${isOpen ? 'open' : 'closed'}`}>
        <ul>
          <li>Error al cargar mensajes: {error}</li>
        </ul>
      </div>
    );
  }

  return (
    <div className={`message-menu ${isOpen ? 'open' : 'closed'}`}>
      <div>
        y acá va a ir el menú
      </div>
      <ul>
        {messages.length > 0 ? (
          messages.map((message) => (
            <li key={message.id}>
              <p>{message.attributes.text ? message.attributes.text : 'Mensaje sin texto'}</p>
              <p><small>{message.attributes.createdAt}</small></p>
            </li>
          ))
        ) : (
          <li>No tienes mensajes nuevos.</li>
        )}
      </ul>
    </div>
  );
};

export default MessagesMenu;
