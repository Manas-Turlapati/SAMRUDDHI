import { io } from "socket.io-client";

const API_BASE_URL = import.meta.env.VITE_API_URL || "https://samruddhi-r1qe.onrender.com/api";
const SOCKET_URL = API_BASE_URL.replace(/\/api\/?$/, "");

export const createAuthenticatedSocket = () => io(SOCKET_URL, {
  auth: { token: localStorage.getItem("ldfrs_token") },
  // Start with HTTP long-polling so a blocked WebSocket upgrade cannot prevent
  // the authenticated Socket.IO connection from receiving server events.
  transports: ["polling"],
});
