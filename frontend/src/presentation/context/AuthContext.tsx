import { clearLoaderConfiguration, syncLoaderConfiguration } from '@/shared/ui/loading/loaderConfiguration';
import type { User } from "@/core/A-domain/entities/user/User";
import { resetHomeCommunity } from "@/shared/community/homeCommunityEvents";
import { resetDashboard } from "@/shared/treasury/dashboardEvents";
import type { LoginResponse } from "@/core/A-domain/entities/auth/Auth";
import { GetCurrentUserUseCase } from "@/core/B-application/use-cases/auth/GetCurrentUserUseCase";
import { LoginUseCase } from "@/core/B-application/use-cases/auth/LoginUseCase";
import { LogoutUseCase } from "@/core/B-application/use-cases/auth/LogoutUseCase";
import { AuthRepositoryImpl } from "@/core/C-infra/repositories/auth/AuthRepositoryImpl";
import {
  clearAccessToken,
  clearCsrfToken,
  getAccessToken,
  SESSION_EXPIRED_EVENT,
  SESSION_REFRESHED_EVENT,
  setAccessToken,
  setCsrfToken,
} from "@/core/D-config/axiosInterceptor";
import { detachPushSubscription } from
  "@/core/C-infra/repositories/notification/detachPushSubscription";
import {
  clearProfileImageCache,
  prefetchUserProfileImage,
} from "@/shared/ui/user-avatar/profileImageCache";
import { FiAlertCircle, FiX } from "react-icons/fi";
import "./AuthContext.css";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

interface AuthContextValue {
  user: User | null;
  token: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (correo: string, password: string, organizationId?: number) => Promise<LoginResponse>;
  establishSession: (response: import("@/core/A-domain/entities/auth/Auth").LoginResponse) => Promise<void>;
  logout: () => Promise<void>;
  syncUser: (updatedUser: User) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const AUTH_USER_KEY = "treasury.auth.user";
const MANUAL_LOGOUT_KEY = "treasury.auth.manual-logout";

const storedUser = () => {
  try {
    const value = JSON.parse(sessionStorage.getItem(AUTH_USER_KEY) ?? "null") as User | null;
    return value && typeof value.correo === "string" && typeof value.rol === "string" ? value : null;
  } catch {
    return null;
  }
};

const isAuthenticationRejection = (error: unknown) => {
  if (!error || typeof error !== "object" || !("response" in error)) return false;
  const response = error.response;
  if (!response || typeof response !== "object" || !("status" in response)) return false;
  return response.status === 401 || response.status === 403;
};

const tokenExpiration = (token: string) => {
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return typeof payload.exp === "number" ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState(() => getAccessToken());
  const [user, setUser] = useState<User | null>(() => getAccessToken() ? storedUser() : null);
  const [loading, setLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);
  const hadActiveSession = useRef(Boolean(token && user));
  const validatedToken = useRef<string | null>(null);

  useEffect(() => {
    if (loading) return;
    const loader = document.getElementById("app-boot-loader");
    const root = document.getElementById("root");
    if (!loader || !root) return;
    const risingFill = loader.dataset.variant === 'nneo-rising-fill';
    const entryPending = () => risingFill && Boolean(root.querySelector('.page-transition-content[inert]'));
    let removeTimer: number | undefined;
    let paintFrame: number | undefined;
    const leaveLoader = () => {
      loader.setAttribute("aria-hidden", "true");
      loader.classList.add("is-leaving");
      const exitDuration = ["cinematic", "video", "video-light"].includes(loader.dataset.variant ?? "")
        ? (window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0
          : Number(loader.dataset.exitDuration) || (loader.dataset.variant === "video" ? 1400 : 800)) : 180;
      removeTimer = window.setTimeout(() => loader.remove(), exitDuration);
    };
    const hideLoader = () => {
      const appStyles = document.querySelector("link[data-app-styles]");
      const stylesReady = !appStyles || document.documentElement.dataset.appStyles === "ready";
      const avatarPending = root.querySelector('.user-avatar[aria-busy="true"]');
      if (!root.firstElementChild || !stylesReady || avatarPending || entryPending() || paintFrame !== undefined) return;
      paintFrame = window.requestAnimationFrame(() => {
        // Recheck after React effects and image loading updates have committed.
        if (root.querySelector('.user-avatar[aria-busy="true"]') || entryPending()) {
          paintFrame = undefined;
          return;
        }
        window.dispatchEvent(new Event("app:boot-ready"));
        // Rising Fill owns its 100 -> final title -> panel opening lifecycle.
        if (risingFill) { observer.disconnect(); return; }
        const previewRemaining = ["cinematic", "video", "video-light"].includes(loader.dataset.variant ?? "")
          ? Math.max(0, Math.min(20000, Number(loader.dataset.previewUntil || 0) - performance.now())) : 0;
        if (previewRemaining > 0) removeTimer = window.setTimeout(leaveLoader, previewRemaining);
        else leaveLoader();
        observer.disconnect();
      });
    };
    const observer = new MutationObserver(hideLoader);
    observer.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ['aria-busy', 'inert'] });
    window.addEventListener("app:styles-ready", hideLoader);
    hideLoader();
    return () => {
      observer.disconnect();
      window.removeEventListener("app:styles-ready", hideLoader);
      if (paintFrame !== undefined) window.cancelAnimationFrame(paintFrame);
      if (removeTimer !== undefined) window.clearTimeout(removeTimer);
    };
  }, [loading]);

  const useCases = useMemo(() => {
    const repository = new AuthRepositoryImpl();
    return {
      login: new LoginUseCase(repository),
      current: new GetCurrentUserUseCase(repository),
      logout: new LogoutUseCase(repository),
      refresh: () => repository.refresh(),
    };
  }, []);

  const clearSession = useCallback(() => {
    resetHomeCommunity();
    resetDashboard();
    clearLoaderConfiguration();
    hadActiveSession.current = false;
    clearAccessToken();
    clearCsrfToken();
    sessionStorage.removeItem(AUTH_USER_KEY);
    clearProfileImageCache();
    validatedToken.current = null;
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    const handleSessionExpired = () => {
      const shouldNotify = hadActiveSession.current;
      clearSession();
      setLoading(false);
      if (shouldNotify) setSessionExpired(true);
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
  }, [clearSession]);

  useEffect(() => {
    const handleSessionRefreshed = (event: Event) => {
      const renewedToken = (event as CustomEvent<string>).detail;
      if (renewedToken) setToken(renewedToken);
    };
    window.addEventListener(SESSION_REFRESHED_EVENT, handleSessionRefreshed);
    return () => window.removeEventListener(SESSION_REFRESHED_EVENT, handleSessionRefreshed);
  }, []);

  useEffect(() => {
    if (!token || !user) return;
    let refreshing = false;
    const checkExpiration = () => {
      const currentToken = getAccessToken();
      if (!currentToken) return;
      const expiration = tokenExpiration(currentToken);
      if (expiration !== null && expiration <= Date.now()) {
        if (refreshing) return;
        refreshing = true;
        useCases.refresh().then((response) => {
          // Una respuesta anterior no debe reemplazar un login o una renovación más reciente.
          if (getAccessToken() !== currentToken || !response.token) return;
          setAccessToken(response.token);
          setCsrfToken(response.csrfToken);
          validatedToken.current = response.token;
          setToken(response.token);
        }).catch(() => undefined).finally(() => {
          refreshing = false;
        });
      } else if (currentToken !== token) {
        setToken(currentToken);
      }
    };
    const expiration = tokenExpiration(token);
    const delay = expiration === null
      ? 60_000
      : Math.max(0, Math.min(expiration - Date.now(), 2_147_483_647));
    const timer = window.setTimeout(checkExpiration, delay);
    const handleVisibility = () => {
      if (document.visibilityState === "visible") checkExpiration();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [token, user, useCases]);

  useEffect(() => {
    if (!token) {
      if (localStorage.getItem(MANUAL_LOGOUT_KEY) === "true") {
        setLoading(false);
        return;
      }
      useCases.refresh()
        .then(async (response) => {
          if (!response.token || !response.user) throw new Error("Respuesta de sesión inválida");
          setAccessToken(response.token);
          setCsrfToken(response.csrfToken);
          sessionStorage.setItem(AUTH_USER_KEY, JSON.stringify(response.user));
          prefetchUserProfileImage(response.user);
          await syncLoaderConfiguration();
          if (getAccessToken() !== response.token) return;
          validatedToken.current = response.token;
          hadActiveSession.current = true;
          setToken(response.token);
          setUser(response.user);
        })
        .catch((error: unknown) => {
          if (isAuthenticationRejection(error) && !getAccessToken()) clearSession();
        })
        .finally(() => setLoading(false));
      return;
    }
    if (validatedToken.current === token) {
      setLoading(false);
      return;
    }
    validatedToken.current = token;
    useCases.current.execute()
      .then(async (currentUser) => {
        await syncLoaderConfiguration();
        if (getAccessToken() !== token) return;
        hadActiveSession.current = true;
        sessionStorage.setItem(AUTH_USER_KEY, JSON.stringify(currentUser));
        prefetchUserProfileImage(currentUser);
        setUser(currentUser);
      })
      .catch((error: unknown) => {
        if (isAuthenticationRejection(error)) clearSession();
        else validatedToken.current = null;
      })
      .finally(() => setLoading(false));
  }, [token, useCases, clearSession]);

  useEffect(() => {
    if (!token || !user) return;
    const refreshSettings = () => { if (!document.hidden) void syncLoaderConfiguration(); };
    window.addEventListener('focus', refreshSettings);
    return () => window.removeEventListener('focus', refreshSettings);
  }, [token, user]);

  const login = async (correo: string, password: string, organizationId?: number) => {
    setLoading(true);
    try {
      const response = await useCases.login.execute({ correo, password, organizationId });
      if (response.requiresOrganizationSelection) return response;
      if (!response.token || !response.user) throw new Error("Respuesta de login inválida");
      resetHomeCommunity();
      resetDashboard();
      localStorage.removeItem(MANUAL_LOGOUT_KEY);
      setAccessToken(response.token);
      setCsrfToken(response.csrfToken);
      clearLoaderConfiguration();
      await syncLoaderConfiguration();
      if (getAccessToken() !== response.token) throw new Error("Session changed");
      sessionStorage.setItem(AUTH_USER_KEY, JSON.stringify(response.user));
      prefetchUserProfileImage(response.user);
      validatedToken.current = response.token;
      hadActiveSession.current = true;
      setSessionExpired(false);
      setToken(response.token);
      setUser(response.user);
      return response;
    } finally {
      setLoading(false);
    }
  };

  const establishSession = useCallback(async (response: import("@/core/A-domain/entities/auth/Auth").LoginResponse) => {
    if (!response.token || !response.user) throw new Error("Respuesta de sesión inválida");
    resetHomeCommunity();
    resetDashboard();
    localStorage.removeItem(MANUAL_LOGOUT_KEY);
    setAccessToken(response.token);
    setCsrfToken(response.csrfToken);
    clearLoaderConfiguration();
    await syncLoaderConfiguration();
    if (getAccessToken() !== response.token) return;
    sessionStorage.setItem(AUTH_USER_KEY, JSON.stringify(response.user));
    prefetchUserProfileImage(response.user);
    validatedToken.current = response.token;
    hadActiveSession.current = true;
    setSessionExpired(false);
    setToken(response.token);
    setUser(response.user);
    setLoading(false);
  }, []);

  const logout = async () => {
    // Inicia la revocación con el token todavía disponible, pero no bloquea la interfaz.
    const revocation = token ? useCases.logout.execute() : null;
    const pushCleanup = token ? detachPushSubscription(token) : null;
    localStorage.setItem(MANUAL_LOGOUT_KEY, "true");
    clearSession();
    void revocation?.catch(() => undefined);
    void pushCleanup?.catch(() => undefined);
  };

  const syncUser = useCallback((updatedUser: User) => {
    sessionStorage.setItem(AUTH_USER_KEY, JSON.stringify(updatedUser));
    prefetchUserProfileImage(updatedUser);
    setUser(updatedUser);
  }, []);

  return <>
    <AuthContext.Provider
      value={{ user, token, loading, isAuthenticated: Boolean(token && user), login, establishSession, logout,
        syncUser }}
    >
      {children}
    </AuthContext.Provider>
    {sessionExpired && (
      <aside className="session-notice" role="status" aria-live="polite">
        <FiAlertCircle aria-hidden="true" />
        <div>
          <strong>Tu sesión terminó</strong>
          <p>Inicia sesión nuevamente para continuar.</p>
        </div>
        <button aria-label="Cerrar aviso" onClick={() => setSessionExpired(false)}>
          <FiX aria-hidden="true" />
        </button>
      </aside>
    )}
  </>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return context;
};

export const useOptionalAuth = () => useContext(AuthContext);
