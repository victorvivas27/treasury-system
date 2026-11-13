import { Navigate, Route, Routes } from "react-router-dom";
import { HomePage } from "../pages/home/HomePage";
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { LoginPage } from "../pages/auth/LoginPage";
import { PageTransitionBoundary, PageTransitionOutlet } from "@/shared/ui/loading/PageTransition";
import { CheckEmailPage, ForgotPasswordPage, PasswordUpdatedPage, ResetPasswordPage,
  VerifyEmailPage } from "../pages/auth/AccountFlowPages";

import { PrivateRoutes } from "./PrivateRoutes";

export const AppRouter = () => {
  const { loading } = useAuth();
  const [sessionResolved, setSessionResolved] = useState(() => !loading);

  useEffect(() => {
    if (!loading) setSessionResolved(true);
  }, [loading]);

  // Esperar solo al arranque: el envío del login no debe desmontar su formulario.
  if (loading && !sessionResolved) return null;

  return (
  <Routes>
    <Route path="/" element={<HomePage />} />
    <Route path="/login" element={<PageTransitionBoundary animateOnEntry><LoginPage /></PageTransitionBoundary>} />
    <Route path="/register" element={<Navigate to="/login" replace />} />
    <Route element={<PageTransitionOutlet />}>
    <Route path="/aceptar-invitacion" element={<ResetPasswordPage invitation />} />
    <Route path="/revisa-tu-correo" element={<CheckEmailPage />} />
    <Route path="/verificar-correo" element={<VerifyEmailPage />} />
    <Route path="/olvide-password" element={<ForgotPasswordPage />} />
    <Route path="/restablecer-password" element={<ResetPasswordPage />} />
    <Route path="/password-actualizada" element={<PasswordUpdatedPage />} />
    </Route>
    <Route path="/*" element={<PrivateRoutes />} />
  </Routes>
  );
};
