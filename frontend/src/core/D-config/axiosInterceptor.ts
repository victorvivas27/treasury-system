import type { AxiosInstance } from "axios";

export const AUTH_TOKEN_KEY = "treasury.auth.token";

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
        localStorage.removeItem(AUTH_TOKEN_KEY);
      }
      return Promise.reject(error);
    },
  );
};
