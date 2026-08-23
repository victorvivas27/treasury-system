import { Navigate, Route, Routes } from "react-router-dom"
import { MainLayout } from "@/shared/layouts/MainLayout";
import { HomePage } from "../pages/home/HomePage";
import { DashboardPage } from "@/presentation/pages/dashboard/DashboardPage";
import { ApoderadoPage } from "@/presentation/pages/apoderado/ApoderadoPage";
import { NotFoundPage } from "../pages/NotFoundPage/NotFoundPage";
import { User } from "../pages/user/User";
import { AlumnoPage } from "../pages/alumno/AlumnoPage";
import { TreasurySectionPage } from "../pages/tesoreria/TreasurySectionPage";
import { AnnualFeesPage } from "../pages/tesoreria/AnnualFeesPage";
import { TreasuryReportsPage } from "../pages/tesoreria/TreasuryReportsPage";
import { Notificacion } from "../pages/notificacion/Notificacion";
import { Configuracion } from "../pages/configuracion/Configuracion";
import { ApoderadoEditFormPage } from "../pages/apoderado/ApoderadoEditFormPage";
import { ApoderadoCrearFormPage } from "../pages/apoderado/ApoderadoCreateFormPage";
import { AlumnoCrearFormPage } from "../pages/alumno/AlumnoCrearFormPage";
import { AlumnoEditFormPage } from "../pages/alumno/AlumnoEditFormPage";
import { FamiliaPage } from "../pages/familia/FamiliaPage";
import { FamiliaEditFormPage } from "../pages/familia/FamiliaEditFormPage";
import { FamiliaCrearFormPage } from "../pages/familia/FamiliaCreateFormPage";
import { LoginPage } from "../pages/auth/LoginPage";
import { RegisterPage } from "../pages/auth/RegisterPage";
import { CheckEmailPage, ForgotPasswordPage, PasswordUpdatedPage, ResetPasswordPage,
  VerifyEmailPage } from "../pages/auth/AccountFlowPages";
import { ProtectedRoute } from "../components/ProtectedRoute";
import { AdminRoute } from "../components/AdminRoute";
import { ProfilePage } from "../pages/user/ProfilePage";
import { FamilyContributionsPage } from "../pages/tesoreria/FamilyContributionsPage";
import { ExpensesPage } from "../pages/tesoreria/ExpensesPage";
import { IncomesPage } from "../pages/tesoreria/IncomesPage";
import { EventsPage } from "../pages/tesoreria/EventsPage";
import { StandManagementPage } from "../pages/stand/StandManagementPage";
import { AboutManagementPage } from "../pages/community/AboutManagementPage";
import { CoursePhotoManagementPage } from "../pages/community/CoursePhotoManagementPage";
import { BoardManagementPage } from "../pages/community/BoardManagementPage";

export const AppRouter = () => {
  return (

    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/revisa-tu-correo" element={<CheckEmailPage />} />
      <Route path="/verificar-correo" element={<VerifyEmailPage />} />
      <Route path="/olvide-password" element={<ForgotPasswordPage />} />
      <Route path="/restablecer-password" element={<ResetPasswordPage />} />
      <Route path="/password-actualizada" element={<PasswordUpdatedPage />} />
      <Route element={<MainLayout />} >
        <Route element={<ProtectedRoute />}>
          <Route path="profile" element={<ProfilePage />} />
          <Route path="tesoreria" element={<Navigate to="/dashboard" replace />} />
          <Route path="tesoreria/resumen" element={<Navigate to="/dashboard" replace />} />
          <Route path="treasury" element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="notifications" element={<Notificacion />} />
          <Route path="tesoreria/stands" element={<StandManagementPage />} />
          <Route path="tesoreria/ingresos" element={<IncomesPage />} />
          <Route path="tesoreria/gastos" element={<ExpensesPage />} />
        </Route>
        <Route element={<AdminRoute />}>
          <Route path="admin/sobre-nosotros" element={<AboutManagementPage />} />
          <Route path="admin/fotos-del-curso" element={<CoursePhotoManagementPage />} />
          <Route path="admin/directiva" element={<BoardManagementPage />} />
          <Route path="tesoreria/cuotas" element={<AnnualFeesPage />} />
          <Route path="tesoreria/aportes" element={<FamilyContributionsPage />} />
          <Route path="tesoreria/pagos" element={<TreasurySectionPage section="Pagos" />} />
          <Route path="tesoreria/eventos" element={<EventsPage />} />
          <Route path="tesoreria/reportes" element={<TreasuryReportsPage />} />
          <Route path="users" element={<User />} />
          <Route path="students" element={<AlumnoPage />} />
          <Route path="parents" element={<ApoderadoPage />} />
          <Route path="family" element={<FamiliaPage />} />
          <Route path="parents/new" element={< ApoderadoCrearFormPage/>} />
          <Route path="/parents/edit/:apoderadoId" element={<ApoderadoEditFormPage />} />
          <Route path="students/new" element={<AlumnoCrearFormPage />} />
          <Route path="/students/edit/:codigo" element={<AlumnoEditFormPage />} />
          <Route path="family/new" element={<FamiliaCrearFormPage/>} />
          <Route path="/family/edit/:familiaId" element={<FamiliaEditFormPage />} />
        </Route>
        <Route path="configuration" element={<Configuracion />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>

  )
}
