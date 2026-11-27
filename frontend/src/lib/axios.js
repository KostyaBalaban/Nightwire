import axios from "axios";

// Empty / unset VITE_API_BASE_URL means "same origin" (production build served by the backend).
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

export const axiosInstance = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  withCredentials: true,
  timeout: 15000,
});
