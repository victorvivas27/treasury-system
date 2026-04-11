import { Route, Routes } from "react-router-dom"
import { MainLayout } from "@/shared/layouts/MainLayout";
import { HomePage } from "../pages/HomePage";
import { DashboardPage } from "@/presentation/pages/DashboardPage";
import { ApoderadoPage } from "@/presentation/pages/ApoderadoPage";
import { NotFoundPage } from "../pages/NotFoundPage";

export const AppRouter = () => {
  return (

    <Routes>
      <Route path="/" element={<MainLayout />} >
        <Route index element={<HomePage />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="apoderados" element={<ApoderadoPage />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>

  )
}
