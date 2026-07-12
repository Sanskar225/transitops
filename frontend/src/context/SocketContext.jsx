import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:4000';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [listeners] = useState(() => new Map());

  useEffect(() => {
    if (!user) return undefined;

    const token = localStorage.getItem('transitops_hint_token'); // optional hint; real auth is via cookie refresh
    const socket = io(SOCKET_URL, { auth: { token }, transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    const forward = (event) => (payload) => {
      const set = listeners.get(event);
      if (set) set.forEach((cb) => cb(payload));
    };
    const events = ['vehicle.updated', 'driver.updated', 'trip.updated', 'maintenance.updated', 'fuel.updated', 'expense.updated', 'notification.new'];
    events.forEach((ev) => socket.on(ev, forward(ev)));

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user, listeners]);

  const subscribe = (event, callback) => {
    if (!listeners.has(event)) listeners.set(event, new Set());
    listeners.get(event).add(callback);
    return () => listeners.get(event).delete(callback);
  };

  return (
    <SocketContext.Provider value={{ connected, subscribe }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used within SocketProvider');
  return ctx;
}

/** Convenience hook: re-fetch or react whenever one of `events` fires. */
export function useSocketEvent(event, handler) {
  const { subscribe } = useSocket();
  useEffect(() => subscribe(event, handler), [event, handler, subscribe]);
}
