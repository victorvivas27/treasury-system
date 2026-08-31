import axios, { AxiosHeaders, type AxiosInstance } from "axios";

export const SESSION_EXPIRED_EVENT = "treasury:session-expired";
export const SESSION_REFRESHED_EVENT = "treasury:session-refreshed";
const CSRF_COOKIE = "treasury_csrf";
let accessToken: string | null = null;

export const getAccessToken = () => accessToken;

export const setAccessToken = (token: string | null) => {
  accessToken = token;
};

export const clearAccessToken = (token?: string | null) => {
  if (token && accessToken !== token) return;
  accessToken = null;
};

const csrfToken = () => {
  if (typeof document === "undefined") return null;
  const cookie = document.cookie
    .split("; ")
    .find((value) => value.startsWith(`${CSRF_COOKIE}=`));
  return cookie ? decodeURIComponent(cookie.slice(CSRF_COOKIE.length + 1)) : null;
};

const requestToken = (authorization: unknown) => {
  if (typeof authorization !== "string" || !authorization.startsWith("Bearer ")) return null;
  return authorization.slice("Bearer ".length);
};

const tokenExpiration = (token: string) => {
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return typeof payload.exp === "number" ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
};

const expiresSoon = (token: string) => {
  const expiration = tokenExpiration(token);
  return expiration !== null && expiration - Date.now() < 5 * 60 * 1000;
};

const expireSession = (token?: string | null) => {
  if (token && accessToken !== token) return;
  clearAccessToken(token);
  window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
};

export const configureAxiosInterceptors = (client: AxiosInstance) => {
  let refreshPromise: Promise<string> | null = null;

  const refreshToken = () => {
    const csrf = csrfToken();
    refreshPromise ??= axios.post<{ token: string }>(
      `${client.defaults.baseURL}/auth/refresh`,
      {},
      {
        timeout: client.defaults.timeout ?? 30000,
        withCredentials: true,
        headers: {
          ...(csrf && { "X-CSRF-Token": csrf }),
        },
      },
    ).then(({ data }) => {
      setAccessToken(data.token);
      window.dispatchEvent(new CustomEvent(SESSION_REFRESHED_EVENT, { detail: data.token }));
      return data.token;
    }).finally(() => {
      refreshPromise = null;
    });
    return refreshPromise;
  };

  client.interceptors.request.use(async (config) => {
    let token = getAccessToken();
    const isAuthRequest = config.url?.includes("/auth/") ?? false;
    const csrf = csrfToken();
    const headers = AxiosHeaders.from(config.headers);
    config.headers = headers;
    if (csrf && (config.url?.includes("/auth/refresh") || config.url?.includes("/auth/logout"))) {
      headers.set("X-CSRF-Token", csrf);
    }
    if (token && !isAuthRequest && expiresSoon(token)) {
      try {
        token = await refreshToken();
      } catch {
        // La respuesta original determinará si corresponde cerrar la sesión.
      }
    }
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
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
        const currentToken = getAccessToken();
        const failedToken = requestToken(error.config?.headers?.Authorization);
        const isAuthRequest = requestConfig?.url?.includes("/auth/") ?? false;

        // Un 401 anterior al login o perteneciente a otro token no debe
        // eliminar una sesión que acaba de iniciarse.
        if (currentToken && failedToken === currentToken) {
          if (requestConfig && !requestConfig._authRetry && !isAuthRequest) {
            requestConfig._authRetry = true;
            try {
              const renewedToken = await refreshToken();
              requestConfig.headers.Authorization = `Bearer ${renewedToken}`;
              return client.request(requestConfig);
            } catch (refreshError) {
              const refreshStatus = axios.isAxiosError(refreshError)
                ? refreshError.response?.status
                : undefined;
              if (refreshStatus === 401 || refreshStatus === 403) {
                expireSession(currentToken);
              }
              return Promise.reject(error);
            }
          }

          // Si un token recién renovado también recibe 401 en una ruta concreta,
          // el problema pertenece a esa ruta y no demuestra que la sesión sea inválida.
        }
      }
      return Promise.reject(error);
    },
  );
};
