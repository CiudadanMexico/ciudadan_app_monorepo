import { useEffect, useState } from 'react';
import io from 'socket.io-client';
import { useNotifications } from '../Contexts/NotificationsContext';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL;

export default function useNotificationsSocket() {
  const { refreshNotificaciones } = useNotifications();
  const [optimisticUnread, setOptimisticUnread] = useState(0);

  useEffect(() => {
    if (!SOCKET_URL) {
      console.warn('Socket URL no definida');
      return;
    }

    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      console.log('[notifications] socket conectado', socket.id);
    });

    socket.on('notification', async () => {
      // feedback inmediato
      setOptimisticUnread(v => v + 1);

      // sincroniza con backend
      try {
        if (typeof refreshNotificaciones === 'function') {
          await refreshNotificaciones();
          setOptimisticUnread(0);
        }
      } catch (err) {
        console.error('[notifications] refresh error', err);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [refreshNotificaciones]);

  return {
    optimisticUnread,
  };
}
