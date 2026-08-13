import type { User } from "@/core/A-domain/entities/user/User";
import { GetCurrentUserUseCase } from "@/core/B-application/use-cases/auth/GetCurrentUserUseCase";
import { LoginUseCase } from "@/core/B-application/use-cases/auth/LoginUseCase";
import { LogoutUseCase } from "@/core/B-application/use-cases/auth/LogoutUseCase";
import { AuthRepositoryImpl } from "@/core/C-infra/repositories/auth/AuthRepositoryImpl";
import { AUTH_TOKEN_KEY, SESSION_EXPIRED_EVENT } from "@/core/D-config/axiosInterceptor";
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
  login: (correo: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  syncUser: (updatedUser: User) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState(() => localStorage.getItem(AUTH_TOKEN_KEY));
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(Boolean(token));
  const [sessionExpired, setSessionExpired] = useState(false);
  const hadActiveSession = useRef(false);

  const useCases = useMemo(() => {
    const repository = new AuthRepositoryImpl();
    return {
      login: new LoginUseCase(repository),
      current: new GetCurrentUserUseCase(repository),
      logout: new LogoutUseCase(repository),
    };
  }, []);

  const clearSession = useCallback(() => {
    hadActiveSession.current = false;
    localStorage.removeItem(AUTH_TOKEN_KEY);
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
    if (!token) {
      setLoading(false);
      return;
    }
    if (user) {
      setLoading(false);
      return;
    }
    useCases.current.execute()
      .then((currentUser) => {
        hadActiveSession.current = true;
        setUser(currentUser);
      })
      .catch(clearSession)
      .finally(() => setLoading(false));
  }, [token, user, useCases, clearSession]);

  const login = async (correo: string, password: string) => {
    setLoading(true);
    try {
      const response = await useCases.login.execute({ correo, password });
      localStorage.setItem(AUTH_TOKEN_KEY, response.token);
      hadActiveSession.current = true;
      setSessionExpired(false);
      setToken(response.token);
      setUser(response.user);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      if (token) await useCases.logout.execute();
    } finally {
      clearSession();
    }
  };

  const syncUser = useCallback((updatedUser: User) => setUser(updatedUser), []);

  return <>
    <AuthContext.Provider
      value={{ user, token, loading, isAuthenticated: Boolean(token && user), login, logout,
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
