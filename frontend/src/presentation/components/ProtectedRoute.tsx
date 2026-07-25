import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/presentation/context/AuthContext";
import { LoadingState } from "@/shared/ui/loading/LoadingState";

export const ProtectedRoute = () => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingState mesage="Validando sesión..." />;
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
};
