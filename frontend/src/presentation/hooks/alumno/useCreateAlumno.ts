import { CreateAlumnoUseCase } from "@/core/B-application/use-cases/alumno/create/CreateAlumnoUseCase";
import type { CreateAlumnoDTO } from "@/core/A-domain/entities/alumno/Alumno";
import { AlumnoRepositoryImpl } from "@/core/C-infra/repositories/alumno/AlumnoRepositoryImpl";
import { TreasuryRepositoryImpl } from "@/core/C-infra/repositories/treasury/TreasuryRepositoryImpl";
import axios from "axios";
import { useEffect, useState, type ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";

export const useCreateAlumno = () => {

  const navigate = useNavigate();
  const initialFormState: CreateAlumnoDTO & { apoderadoId?: number } = {
    nombre: "",
    curso: "",
    observacion: "",
    genero: "OTROS",
    apoderadoId: 0,
  };

  const [formData, setFormData] = useState<CreateAlumnoDTO & { apoderadoId?: number }>({
    ...initialFormState,
  });

  const [loading, setLoading] = useState(false);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [courses, setCourses] = useState<string[]>([]);
  const [coursesError, setCoursesError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [modal, setModal] = useState({
    isOpen: false,
    message: "",
    type: "success" as "success" | "error",
  });

  useEffect(() => {
    let active = true;
    const repository = new TreasuryRepositoryImpl();

    const applyManagedCourse = (course: string) => {
      const normalized = course.trim().toUpperCase();
      if (!active || !normalized) return;
      setCourses([normalized]);
      setFormData((current) => ({
        ...current,
        curso: current.curso || normalized,
      }));
      setCoursesError("");
    };

    repository.getManagedCourse()
      .then(applyManagedCourse)
      .catch(() => {
        if (active) setCoursesError("No fue posible cargar los cursos de Administración");
      })
      .finally(() => {
        if (active) setLoadingCourses(false);
      });

    const handleManagedCourseChange = (event: Event) => {
      applyManagedCourse((event as CustomEvent<string>).detail);
    };
    window.addEventListener("managed-course-changed", handleManagedCourseChange);

    return () => {
      active = false;
      window.removeEventListener("managed-course-changed", handleManagedCourseChange);
    };
  }, []);

  const showAlert = (message: string, type: "success" | "error") => {
    setModal({ isOpen: true, message, type });
  };


  const closeModal = () => {
    setModal((prev) => ({ ...prev, isOpen: false }));
    if (modal.type === "success") navigate("/students");
  };

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name.endsWith("Id") ? (value ? Number(value) : 0) : value,
    }));

    if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleActionSubmit = async () => {
    setLoading(true);
    setFieldErrors({});

    const repository = new AlumnoRepositoryImpl();
    const useCase = new CreateAlumnoUseCase(repository);

    try {
      await useCase.execute(formData);

      showAlert("¡Datos guardados con éxito!", "success");
      setFormData(initialFormState);
      setFieldErrors({});
    } catch (error: any) {
      if (!axios.isAxiosError(error) || !error.response) {
        showAlert("Ocurrió un error inesperado", "error");
        return;
      }

      const { errors, message } = error.response.data;

      if (errors && Object.keys(errors).length > 0) {
        setFieldErrors(errors);
        return;
      }

      showAlert(message || "Error al procesar la solicitud", "error");
    } finally {
      setLoading(false);
    }
  };

  return {
    formData,
    loading,
    loadingCourses,
    courses,
    coursesError,
    fieldErrors,
    modal,
    handleChange,
    handleActionSubmit,
    closeModal,
    navigate,
    setModal,
  };
};
