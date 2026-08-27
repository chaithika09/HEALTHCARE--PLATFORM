/**
 * Singleton Socket.io client
 * One instance shared across the entire app.
 * Import and use `getSocket()` everywhere.
 */
import { io } from "socket.io-client";

const getSocketUrl = () => {
  if (process.env.REACT_APP_API_URL) return process.env.REACT_APP_API_URL.replace("/api/v1", "");

  const host = window.location.hostname;
  if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(host)) {
    return `http://${host}:5000`;
  }
  return "http://localhost:5000";
};

const SOCKET_URL = getSocketUrl();

let _socket = null;

/**
 * Returns the singleton socket instance.
 * Creates it on first call using the provided token.
 */
export const getSocket = (token) => {
  // If already connected, return existing
  if (_socket && _socket.connected) return _socket;

  // If exists but disconnected, reconnect
  if (_socket) {
    if (token) _socket.auth = { token };
    _socket.connect();
    return _socket;
  }

  // First time — create the socket
  _socket = io(SOCKET_URL, {
    auth: { token },
    transports: ["websocket"],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
  });

  return _socket;
};

/**
 * Disconnect and destroy the socket (on logout)
 */
export const destroySocket = () => {
  if (_socket) {
    _socket.disconnect();
    _socket = null;
  }
};

export default getSocket;
