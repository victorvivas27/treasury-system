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

export const AppRouter = () => {
  return (

    <Routes>
      <Route path="/" element={<MainLayout />} >
        <Route index element={<HomePage />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="apoderados" element={<ApoderadoPage />} />
        <Route path="usuarios" element={<User />} />
        <Route path="alumnos" element={<Alumno />} />
        <Route path="tesoreria" element={<Tesoreria />} />
        <Route path="notificaciones" element={<Notificacion />} />
        <Route path="configuracion" element={<Configuracion />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>

  )
}
