import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { HomePage } from "../pages/home/HomePage";
import { LoginPage } from "../pages/auth/LoginPage";
import { CheckEmailPage, ForgotPasswordPage, PasswordUpdatedPage, ResetPasswordPage,
  VerifyEmailPage } from "../pages/auth/AccountFlowPages";

const PrivateRoutes = lazy(() => import("./PrivateRoutes").then(module => ({
  default: module.PrivateRoutes,
})));

export const AppRouter = () => (
  <Routes>
    <Route path="/" element={<HomePage />} />
    <Route path="/login" element={<LoginPage />} />
    <Route path="/register" element={<Navigate to="/login" replace />} />
    <Route path="/aceptar-invitacion" element={<ResetPasswordPage invitation />} />
    <Route path="/revisa-tu-correo" element={<CheckEmailPage />} />
    <Route path="/verificar-correo" element={<VerifyEmailPage />} />
    <Route path="/olvide-password" element={<ForgotPasswordPage />} />
    <Route path="/restablecer-password" element={<ResetPasswordPage />} />
    <Route path="/password-actualizada" element={<PasswordUpdatedPage />} />
    <Route path="/*" element={<Suspense fallback={null}><PrivateRoutes /></Suspense>} />
  </Routes>
);
