import axios, { AxiosHeaders, type AxiosInstance } from "axios";
import type { LoginResponse } from "@/core/A-domain/entities/auth/Auth";

export const SESSION_EXPIRED_EVENT = "treasury:session-expired";
export const SESSION_REFRESHED_EVENT = "treasury:session-refreshed";
export const SERVICE_UNAVAILABLE_EVENT = "treasury:service-unavailable";
const CSRF_COOKIE = "treasury_csrf";
const CSRF_STORAGE_KEY = "treasury.auth.csrf";
let accessToken: string | null = null;

let refreshPromise: Promise<LoginResponse> | null = null;
let checkingAvailability = false;

const checkAvailability = (client: AxiosInstance) => {
  if (checkingAvailability) return;
  checkingAvailability = true;
  void fetch(`${client.defaults.baseURL}/service-availability`, { cache: "no-store" })
    .then((response) => {
      if (response.status === 503) window.dispatchEvent(new Event(SERVICE_UNAVAILABLE_EVENT));
    })
    .catch(() => undefined)
    .finally(() => { checkingAvailability = false; });
};

export const getAccessToken = () => accessToken;

export const setAccessToken = (token: string | null) => {
  accessToken = token;
};

export const clearAccessToken = (token?: string | null) => {
  if (token && accessToken !== token) return;
  accessToken = null;
};

export const setCsrfToken = (token?: string | null) => {
  // El CSRF debe sobrevivir al cierre de la PWA cuando la cookie está en el
  // dominio de la API. Los tokens de acceso y renovación no se guardan aquí.
  try {
    if (token) localStorage.setItem(CSRF_STORAGE_KEY, token);
    else localStorage.removeItem(CSRF_STORAGE_KEY);
  } catch { /* El navegador puede restringir el almacenamiento persistente. */ }
  if (typeof sessionStorage === "undefined") return;
  if (token) sessionStorage.setItem(CSRF_STORAGE_KEY, token);
  else sessionStorage.removeItem(CSRF_STORAGE_KEY);
};

export const clearCsrfToken = () => setCsrfToken(null);

const csrfToken = () => {
  if (typeof document === "undefined") return null;
  const cookie = document.cookie
    .split("; ")
    .find((value) => value.startsWith(`${CSRF_COOKIE}=`));
  if (cookie) return decodeURIComponent(cookie.slice(CSRF_COOKIE.length + 1));
  if (typeof sessionStorage === "undefined") return null;
  try {
    const persisted = localStorage.getItem(CSRF_STORAGE_KEY);
    if (persisted) return persisted;
  } catch { /* Usar el respaldo de la pestaña si no hay almacenamiento persistente. */ }
  return sessionStorage.getItem(CSRF_STORAGE_KEY);
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
  const refreshToken = () => {
    const previousToken = getAccessToken();
    return refreshSession(client).then((data) => {
      if (data.token && getAccessToken() === data.token) return data.token;
      if (!data.token || getAccessToken() !== previousToken) throw new Error("Session changed");
      setAccessToken(data.token);
      setCsrfToken(data.csrfToken);
      window.dispatchEvent(new CustomEvent(SESSION_REFRESHED_EVENT, { detail: data.token }));
      return data.token;
    });
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

      if (isTransientNetworkFailure || [502, 503, 504].includes(error.response?.status)) {
        window.dispatchEvent(new Event(SERVICE_UNAVAILABLE_EVENT));
      }
      if (error.response?.status === 500) checkAvailability(client);

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

export const refreshSession = (client: AxiosInstance): Promise<LoginResponse> => {
  const csrf = csrfToken();
  refreshPromise ??= axios.post<LoginResponse>(`${client.defaults.baseURL}/auth/refresh`, {}, {
    timeout: client.defaults.timeout ?? 30000,
    withCredentials: true,
    headers: { ...(csrf && { "X-CSRF-Token": csrf }) },
  }).then(({ data }) => data).catch((error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 500) checkAvailability(client);
    if (axios.isAxiosError(error) && ((!error.response && ["ERR_NETWORK", "ECONNABORTED", "ETIMEDOUT"].includes(error.code ?? ""))
      || [502, 503, 504].includes(error.response?.status ?? 0))) {
      window.dispatchEvent(new Event(SERVICE_UNAVAILABLE_EVENT));
    }
    throw error;
  }).finally(() => { refreshPromise = null; });
  return refreshPromise;
};
