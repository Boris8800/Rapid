import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from './constants';

let socket: Socket | null = null;

export function getSocket(token?: string) {
  if (socket) return socket;

  socket = io(API_BASE_URL, {
    path: '/socket.io',
    transports: ['websocket'],
    auth: token ? { token } : undefined,
  });

  return socket;
}
