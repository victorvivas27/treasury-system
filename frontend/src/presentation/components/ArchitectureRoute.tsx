import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/presentation/context/AuthContext";
import { useArchitectureAccess } from "@/presentation/hooks/architecture/useArchitectureAccess";
import { FeedbackState } from "@/shared/ui/feedback/FeedbackState";

export const ArchitectureRoute = () => {
  const auth = useAuth();
  const access = useArchitectureAccess(auth.user?.id, auth.user?.rol);
  if (auth.loading) return null;
  if (!auth.isAuthenticated || auth.user?.rol !== "SUPER_ADMIN") return <Navigate to="/" replace />;
  if (access.loading) return <p role="status">Comprobando acceso a la arquitectura…</p>;
  if (access.error) return <FeedbackState message="No se pudo comprobar el acceso."
    actionText="Reintentar" onRefresh={access.retry} />;
  if (!access.allowed) return <FeedbackState type="info" title="Acceso reservado"
    message="Esta sección está disponible únicamente para la cuenta dueña del sistema." />;
  return <Outlet />;
};
