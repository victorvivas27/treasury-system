import { FamiliaAlumnoManager } from "@/presentation/features/familia/FamiliaAlumnoManager";
import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";

export const AlumnoFamiliaPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const alumnoId = useMemo(() => (id ? Number(id) : undefined), [id]);

  if (!alumnoId || Number.isNaN(alumnoId)) {
    return <main className="page-container">ID de alumno no válido</main>;
  }

  return (
    <FamiliaAlumnoManager
      alumnoId={alumnoId}
      onBack={() => navigate("/students")}
    />
  );
};
