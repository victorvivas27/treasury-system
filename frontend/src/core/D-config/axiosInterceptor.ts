import axios, { type AxiosInstance } from "axios";

export const AUTH_TOKEN_KEY = "treasury.auth.token";
export const SESSION_EXPIRED_EVENT = "treasury:session-expired";

const requestToken = (authorization: unknown) => {
  if (typeof authorization !== "string" || !authorization.startsWith("Bearer ")) return null;
  return authorization.slice("Bearer ".length);
};

const expiresSoon = (token: string) => {
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return typeof payload.exp === "number" && payload.exp * 1000 - Date.now() < 5 * 60 * 1000;
  } catch {
    return false;
  }
};

export const configureAxiosInterceptors = (client: AxiosInstance) => {
  let refreshPromise: Promise<string> | null = null;

  client.interceptors.request.use(async (config) => {
    let token = localStorage.getItem(AUTH_TOKEN_KEY);
    const isAuthRequest = config.url?.includes("/auth/") ?? false;
    if (token && !isAuthRequest && expiresSoon(token)) {
      refreshPromise ??= axios.post<{ token: string }>(
        `${client.defaults.baseURL}/auth/refresh`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      ).then(({ data }) => {
        localStorage.setItem(AUTH_TOKEN_KEY, data.token);
        return data.token;
      }).finally(() => {
        refreshPromise = null;
      });
      try {
        token = await refreshPromise;
      } catch {
        // La respuesta original determinará si corresponde cerrar la sesión.
      }
    }
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
