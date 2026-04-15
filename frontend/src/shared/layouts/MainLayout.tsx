import { Outlet } from "react-router-dom";
import { Sidebar } from "@/shared/layouts/sidebar/Sidebar";



export const MainLayout = () => {
  return (
    <section>
      <Sidebar />
      <main>
        <Outlet />
      </main>
    </section>
  );
};


