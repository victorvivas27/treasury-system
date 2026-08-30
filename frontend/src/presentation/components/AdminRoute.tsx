import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/presentation/context/AuthContext";
import { isAdminRole } from "@/core/A-domain/entities/user/User";

export const AdminRoute = () => {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) return null;
  if (!isAuthenticated) {
    return <Navigate to="/" replace state={{ from: location.pathname, sessionEnded: true }} />;
  }
  if (!isAdminRole(user?.rol)) return <Navigate to="/" replace />;
  return <Outlet />;
};
