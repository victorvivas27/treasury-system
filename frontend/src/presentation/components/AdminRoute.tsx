import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/presentation/context/AuthContext";
import { LoadingState } from "@/shared/ui/loading/LoadingState";

export const AdminRoute = () => {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingState mesage="Validando permisos..." />;
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if (user?.rol !== "ADMIN") return <Navigate to="/" replace />;
  return <Outlet />;
};
