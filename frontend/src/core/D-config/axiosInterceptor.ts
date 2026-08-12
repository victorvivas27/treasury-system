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

  const refreshToken = (token: string) => {
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
    return refreshPromise;
  };

  client.interceptors.request.use(async (config) => {
    let token = localStorage.getItem(AUTH_TOKEN_KEY);
    const isAuthRequest = config.url?.includes("/auth/") ?? false;
    if (token && !isAuthRequest && expiresSoon(token)) {
      try {
        token = await refreshToken(token);
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
    async (error) => {
      const requestConfig = error.config as
        | (typeof error.config & { _authRetry?: boolean; _networkRetry?: boolean })
        | undefined;
      const isSafeRead = requestConfig?.method?.toLowerCase() === "get";
      const isTransientNetworkFailure = !error.response
        && ["ECONNABORTED", "ETIMEDOUT", "ERR_NETWORK"].includes(error.code);

      // Una lectura puede coincidir con el arranque en frío de Cloud Run/Neon. Reintentar
      // una sola vez evita dejar las vistas vacías sin duplicar operaciones de escritura.
      if (requestConfig && isSafeRead && isTransientNetworkFailure
          && !requestConfig._networkRetry) {
        requestConfig._networkRetry = true;
        return client.request(requestConfig);
      }

      if (error.response?.status === 401) {
        const currentToken = localStorage.getItem(AUTH_TOKEN_KEY);
        const failedToken = requestToken(error.config?.headers?.Authorization);
        const isAuthRequest = requestConfig?.url?.includes("/auth/") ?? false;

        // Un 401 anterior al login o perteneciente a otro token no debe
        // eliminar una sesión que acaba de iniciarse.
        if (currentToken && failedToken === currentToken) {
          if (requestConfig && !requestConfig._authRetry && !isAuthRequest) {
            requestConfig._authRetry = true;
            try {
              const renewedToken = await refreshToken(currentToken);
              requestConfig.headers.Authorization = `Bearer ${renewedToken}`;
              return client.request(requestConfig);
            } catch {
              // Solo se cierra la sesión cuando también falla la renovación.
            }
          }
          localStorage.removeItem(AUTH_TOKEN_KEY);
          window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
        }
      }
      return Promise.reject(error);
    },
  );
};
