import type { User } from "@/core/A-domain/entities/user/User";
import { GetCurrentUserUseCase } from "@/core/B-application/use-cases/auth/GetCurrentUserUseCase";
import { LoginUseCase } from "@/core/B-application/use-cases/auth/LoginUseCase";
import { LogoutUseCase } from "@/core/B-application/use-cases/auth/LogoutUseCase";
import { AuthRepositoryImpl } from "@/core/C-infra/repositories/auth/AuthRepositoryImpl";
import { AUTH_TOKEN_KEY } from "@/core/D-config/axiosInterceptor";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
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
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState(() => localStorage.getItem(AUTH_TOKEN_KEY));
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(Boolean(token));

  const useCases = useMemo(() => {
    const repository = new AuthRepositoryImpl();
    return {
      login: new LoginUseCase(repository),
      current: new GetCurrentUserUseCase(repository),
      logout: new LogoutUseCase(repository),
    };
  }, []);

  const clearSession = useCallback(() => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

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
      .then(setUser)
      .catch(clearSession)
      .finally(() => setLoading(false));
  }, [token, user, useCases, clearSession]);

  const login = async (correo: string, password: string) => {
    setLoading(true);
    try {
      const response = await useCases.login.execute({ correo, password });
      localStorage.setItem(AUTH_TOKEN_KEY, response.token);
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

  return (
    <AuthContext.Provider
      value={{ user, token, loading, isAuthenticated: Boolean(token && user), login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return context;
};

export const useOptionalAuth = () => useContext(AuthContext);
