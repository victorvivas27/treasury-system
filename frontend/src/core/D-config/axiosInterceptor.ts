import type { AxiosInstance } from "axios";

export const AUTH_TOKEN_KEY = "treasury.auth.token";
export const SESSION_EXPIRED_EVENT = "treasury:session-expired";

const requestToken = (authorization: unknown) => {
  if (typeof authorization !== "string" || !authorization.startsWith("Bearer ")) return null;
  return authorization.slice("Bearer ".length);
};

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
        const currentToken = localStorage.getItem(AUTH_TOKEN_KEY);
        const failedToken = requestToken(error.config?.headers?.Authorization);

        // Un 401 anterior al login o perteneciente a otro token no debe
        // eliminar una sesión que acaba de iniciarse.
        if (currentToken && failedToken === currentToken) {
          localStorage.removeItem(AUTH_TOKEN_KEY);
          window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
        }
      }
      return Promise.reject(error);
    },
  );
};
