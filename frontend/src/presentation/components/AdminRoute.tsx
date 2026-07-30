import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/presentation/context/AuthContext";
import { LoadingState } from "@/shared/ui/loading/LoadingState";

export const AdminRoute = () => {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingState mesage="Validando permisos..." />;
  if (!isAuthenticated) {
    return <Navigate to="/" replace state={{ from: location.pathname, sessionEnded: true }} />;
  }
  if (user?.rol !== "ADMIN") return <Navigate to="/" replace />;
  return <Outlet />;
};
