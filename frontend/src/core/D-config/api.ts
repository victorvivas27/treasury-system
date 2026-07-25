import axios from 'axios';
import { configureAxiosInterceptors } from './axiosInterceptor';
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5055/tesoreria/api/v1',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

configureAxiosInterceptors(apiClient);
