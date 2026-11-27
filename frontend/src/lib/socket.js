import { io } from "socket.io-client";

// Empty / unset VITE_API_BASE_URL means "same origin" (production build served by the backend).
export const socket = io(import.meta.env.VITE_API_BASE_URL || undefined, {
  autoConnect: false,
  withCredentials: true,
});
