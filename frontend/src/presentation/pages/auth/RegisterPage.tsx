import { useEffect, useMemo, useState } from "react";
import { OrganizationRepositoryImpl } from "@/core/C-infra/repositories/organization/OrganizationRepositoryImpl";
import type { OrganizationLoginOption } from "@/core/A-domain/entities/organization/Organization";
import type { UserPayload } from "@/core/A-domain/entities/user/User";
import { AuthRepositoryImpl } from "@/core/C-infra/repositories/auth/AuthRepositoryImpl";
import { UserForm } from "@/presentation/features/user/UserForm";
import { ModalAlert } from "@/shared/ui/modalalert/ModalAler";
import { ButtonBack } from "@/shared/ui/buttonback/ButtonBack";
import { useNavigate } from "react-router-dom";
import { BrandLogo } from "@/shared/ui/brandlogo/BrandLogo";
import { FiUserCheck } from "react-icons/fi";

export const RegisterPage = () => {
  const repository = useMemo(() => new AuthRepositoryImpl(), []);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [courses, setCourses] = useState<OrganizationLoginOption[]>([]);
  const [courseId, setCourseId] = useState("");
  const [courseError, setCourseError] = useState("");
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    setCoursesLoading(true);
    setCourseError("");
    new OrganizationRepositoryImpl().getLoginOptions().then((options) => {
      if (!active) return;
      const available = options.filter((option) => option.type === "COURSE"
        || (option.type === "LEGACY" && option.slug === "default"));
      setCourses(available);
      if (!available.length) setCourseError("No hay cursos activos disponibles para registrarse.");
    }).catch(() => {
      if (active) setCourseError("No fue posible cargar los cursos. Intenta nuevamente.");
    }).finally(() => {
      if (active) setCoursesLoading(false);
    });
    return () => { active = false; };
  }, [retry]);

  const register = async (payload: UserPayload) => {
    if (coursesLoading) return;
    if (!courses.some((course) => String(course.id) === courseId)) {
      setCourseError("Selecciona un curso para crear tu cuenta.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await repository.register({ ...payload, organizationId: Number(courseId) });
      setFormKey((current) => current + 1);
      navigate("/revisa-tu-correo", { replace: true,
        state: { email: payload.correo, organizationId: Number(courseId) } });
    } catch {
      setError("No fue posible completar el registro. Revisa los datos e intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="form-page-container register-page">
      <header className="form-page-header login-page-header">
        <BrandLogo className="login-brand-logo" />
        <div className="login-page-header__copy">
          <h1 className="form-page-header__title">Regístrate como usuario</h1>
          <p className="form-page-header__subtitle">Accede a Tesorería Escolar</p>
        </div>
      </header>
      <UserForm
        key={formKey}
        onSubmit={register}
        loading={loading}
        submitLabel="Crear cuenta"
        submitIcon={<FiUserCheck aria-hidden="true" />}
        showRole={false}
        showAccountStatus={false}
        showFieldIcons
      >
        <div className="form-group register-course-group">
          <label className="form-label" htmlFor="register-course">Selecciona tu curso</label>
          <select id="register-course" className="form-input" value={courseId}
            disabled={coursesLoading || loading || !courses.length} required
            aria-invalid={Boolean(courseError)}
            aria-describedby={courseError ? "register-course-error" : undefined}
            onChange={(event) => { setCourseId(event.target.value); setCourseError(""); }}>
            <option value="">{coursesLoading ? "Cargando cursos..." : "Selecciona un curso"}</option>
            {courses.map((course) => <option key={course.id} value={course.id}>{course.name}</option>)}
          </select>
          {courseError && <span id="register-course-error" className="error-message" role="alert">{courseError}</span>}
          {!coursesLoading && !courses.length && <button type="button" className="auth-text-link"
            onClick={() => setRetry((value) => value + 1)}>Volver a cargar cursos</button>}
        </div>
      </UserForm>
      <ButtonBack />
      <ModalAlert
        isOpen={Boolean(error)}
        message={error ?? ""}
        type="error"
        onClose={() => setError(null)}
      />
    </main>
  );
};
