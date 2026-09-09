import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/presentation/context/AuthContext";

export const ProtectedRoute = () => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) return null;
  if (!isAuthenticated) {
    const paymentReturn = location.pathname === "/tesoreria/pagos"
      && new URLSearchParams(location.search).get("mp_return") === "1";
    if (paymentReturn) {
      return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
    }
    return <Navigate to="/" replace state={{ from: location.pathname, sessionEnded: true }} />;
  }
  return <Outlet />;
};
