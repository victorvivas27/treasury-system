import axios from 'axios';
import { configureAxiosInterceptors } from './axiosInterceptor';
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5055/tesoreria/api/v1',
  // Cloud Run puede necesitar despertar la instancia y abrir la conexión con Neon.
  // Las pantallas de tesorería realizan varias lecturas al mismo tiempo, por lo que 10 s
  // cancelaba solicitudes válidas durante un arranque en frío.
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

configureAxiosInterceptors(apiClient);
