import { Route, Routes } from "react-router-dom"
import { MainLayout } from "@/shared/layouts/MainLayout";
import { HomePage } from "../pages/home/HomePage";
import { DashboardPage } from "@/presentation/pages/dashboard/DashboardPage";
import { ApoderadoPage } from "@/presentation/pages/apoderado/ApoderadoPage";
import { NotFoundPage } from "../pages/NotFoundPage/NotFoundPage";
import { User } from "../pages/user/User";
import { Alumno } from "../pages/alumno/Alumno";
import { Tesoreria } from "../pages/tesoreria/Tesoreria";
import { Notificacion } from "../pages/notificacion/Notificacion";
import { Configuracion } from "../pages/configuracion/Configuracion";
import { ApoderadoEditFormPage } from "../pages/apoderado/ApoderadoEditFormPage";
import { ApoderadoCrearFormPage } from "../pages/apoderado/ApoderadoCreateFormPage";

export const AppRouter = () => {
  return (

    <Routes>
      <Route path="/" element={<MainLayout />} >
        <Route index element={<HomePage />} />
        <Route path="users" element={<User />} />
        <Route path="students" element={<Alumno />} />
        <Route path="parents" element={<ApoderadoPage />} />
        <Route path="treasury" element={<Tesoreria />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="notifications" element={<Notificacion />} />
        <Route path="configuration" element={<Configuracion />} />
        <Route path="parents/new" element={< ApoderadoCrearFormPage/>} />
        <Route path="/parents/edit/:id" element={<ApoderadoEditFormPage />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>

  )
}
