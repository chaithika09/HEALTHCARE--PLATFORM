import { io } from 'socket.io-client';
import { SOCKET_URL } from './api';

let socket = null;

export const getSocket = (token) => {
  if (socket && socket.connected) return socket;

  if (socket) {
    if (token) socket.auth = { token };
    socket.connect();
    return socket;
  }

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
  });

  socket.on('connect', () => {
    console.log('Mobile Socket Connected');
  });

  socket.on('connect_error', (err) => {
    console.warn('Mobile Socket Connection Error:', err.message);
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export default getSocket;
