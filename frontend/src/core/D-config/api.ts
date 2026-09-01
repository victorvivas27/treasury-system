import axios from 'axios';
import { configureAxiosInterceptors } from './axiosInterceptor';

const DEFAULT_API_URL = 'http://localhost:5055/tesoreria/api/v1';
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1']);

export const resolveApiBaseUrl = (
  configuredUrl = import.meta.env.VITE_API_URL || DEFAULT_API_URL,
  pageHostname = typeof window === 'undefined' ? undefined : window.location.hostname,
) => {
  if (!pageHostname || !LOOPBACK_HOSTS.has(pageHostname)) return configuredUrl;
  try {
    const url = new URL(configuredUrl);
    if (!LOOPBACK_HOSTS.has(url.hostname)) return configuredUrl;
    url.hostname = pageHostname;
    return url.toString().replace(/\/$/, '');
  } catch {
    return configuredUrl;
  }
};

export const apiClient = axios.create({
  baseURL: resolveApiBaseUrl(),
  // Cloud Run puede necesitar despertar la instancia y abrir la conexión con Neon.
  // Las pantallas de tesorería realizan varias lecturas al mismo tiempo, por lo que 10 s
  // cancelaba solicitudes válidas durante un arranque en frío.
  timeout: 30000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

configureAxiosInterceptors(apiClient);
