import type { AxiosInstance } from "axios";

export const AUTH_TOKEN_KEY = "treasury.auth.token";
export const SESSION_EXPIRED_EVENT = "treasury:session-expired";

export const configureAxiosInterceptors = (client: AxiosInstance) => {
  client.interceptors.request.use((config) => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        const hadSession = Boolean(localStorage.getItem(AUTH_TOKEN_KEY));
        localStorage.removeItem(AUTH_TOKEN_KEY);
        if (hadSession) {
          window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
        }
      }
      return Promise.reject(error);
    },
  );
};
