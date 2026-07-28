import React, { useState, useEffect } from 'react';
import { AiFillMessage } from "react-icons/ai";
import { useAuth0 } from '@auth0/auth0-react';
import '../../styles/MessagesIcon.css';
import MessagesMenu from './MessagesMenu.jsx';
import axios from 'axios';

const MessagesIcon =  () => {
    const { user, isAuthenticated } = useAuth0();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [messageCount, setMessageCount] = useState(0);
    const [loading, setLoading] = useState(true); // Para indicar que se están cargando los mensajes
    const [error, setError] = useState(null); // Para manejar errores de la API

    // Función para obtener el número de mensajes
    const fetchMessageCount = async () => {
        if (isAuthenticated && user && user.email) { // Verificar si está autenticado y si tiene un email
            try {
                const response = await axios.get(`${process.env.REACT_APP_STRAPI_URL}/api/messages?filters[sender_id][email]=${user.email}`);
                setMessageCount(response.data.data.length); // Asumimos que la respuesta tiene un campo "count"
                console.log(response.data.data.length);
                setLoading(false); // Dejamos de cargar
            } catch (error) {
                setError(error.message); // Guardamos el error
                setLoading(false); // Dejamos de cargar
            }
        } else {
            setLoading(false); // Deja de cargar si el usuario no está autenticado
        }
    };

    useEffect(() => {
        fetchMessageCount(); // Llamar a la función cuando el componente se monte
    }, [isAuthenticated, user]); // Re-ejecutar cuando el usuario cambie

    const toggleMenu = () => {
        setIsMenuOpen(!isMenuOpen);
    };

    if (loading) {
        return (
            <div className="message-icon-container" onClick={toggleMenu}>
                <AiFillMessage className="message-icon-small" />
                <span className="message-count">..</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="message-icon-container" onClick={toggleMenu}>
                <AiFillMessage className="message-icon-small" />
                <span className="message-count">**</span>
            </div>
        );
    }

    return (
        <div className="message-icon-container" onClick={toggleMenu}>
            <AiFillMessage className="message-icon-small" />
            {messageCount > 0 && <span className="message-count">{messageCount}</span>}
            <MessagesMenu 
                isOpen={isMenuOpen} 
                onClose={() => setIsMenuOpen(false)} 
            />
        </div>
    );
};

export default MessagesIcon;
