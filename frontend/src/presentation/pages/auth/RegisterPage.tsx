import { useMemo, useState } from "react";
import type { UserPayload } from "@/core/A-domain/entities/user/User";
import { AuthRepositoryImpl } from "@/core/C-infra/repositories/auth/AuthRepositoryImpl";
import { UserForm } from "@/presentation/features/user/UserForm";
import { ModalAlert } from "@/shared/ui/modalalert/ModalAler";
import { ButtonBack } from "@/shared/ui/buttonback/ButtonBack";
import { useNavigate } from "react-router-dom";
import { BrandLogo } from "@/shared/ui/brandlogo/BrandLogo";

export const RegisterPage = () => {
  const repository = useMemo(() => new AuthRepositoryImpl(), []);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);

  const register = async (payload: UserPayload) => {
    setLoading(true);
    setError(null);
    try {
      await repository.register(payload);
      setFormKey((current) => current + 1);
      navigate("/revisa-tu-correo", { replace: true, state: { email: payload.correo } });
    } catch {
      setError("No fue posible completar el registro. Revisa los datos e intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="form-page-container register-page">
      <header className="form-page-header">
        <BrandLogo className="login-brand-logo" />
        <h1 className="form-page-header__title">Regístrate como usuario</h1>
        <p className="form-page-header__subtitle">Accede al Sistema de Tesorería</p>
      </header>
      <UserForm
        key={formKey}
        onSubmit={register}
        loading={loading}
        submitLabel="Crear cuenta"
        showRole={false}
        showAccountStatus={false}
      />
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
