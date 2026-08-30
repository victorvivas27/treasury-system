import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/presentation/context/AuthContext";

export const SuperAdminRoute = () => {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) return null;
  if (!isAuthenticated) {
    return <Navigate to="/" replace state={{ from: location.pathname, sessionEnded: true }} />;
  }
  if (user?.rol !== "SUPER_ADMIN") return <Navigate to="/" replace />;
  return <Outlet />;
};
