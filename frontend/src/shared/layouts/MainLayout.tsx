import { Outlet } from "react-router-dom";
import { Sidebar } from "@/shared/layouts/sidebar/Sidebar";

interface Props { }

export const MainLayout = ({ }: Props) => {
  return (
    <section>
      <Sidebar />
      <main>
        <Outlet />
      </main>
    </section>
  );
};


