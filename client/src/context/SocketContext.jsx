import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) { if (socket) { socket.disconnect(); setSocket(null); } return; }

    const token = localStorage.getItem('accessToken');
    const newSocket = io(window.location.origin, { auth: { token }, transports: ['websocket', 'polling'] });

    newSocket.on('connect', () => console.log('🔌 Socket connected'));
    newSocket.on('connect_error', (err) => console.log('Socket error:', err.message));

    setSocket(newSocket);
    return () => newSocket.disconnect();
  }, [user]);

  return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>;
}

export const useSocket = () => useContext(SocketContext);
