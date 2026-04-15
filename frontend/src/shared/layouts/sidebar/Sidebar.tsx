import { NavLink } from "react-router-dom";



export const Sidebar = () => {
  return (
    <aside>
      <h3>Tesorería Admin</h3>
      <nav >
        <NavLink to="/">
          Home
        </NavLink>

        <NavLink to="/dashboard" >
          Dashboard
        </NavLink>

        <NavLink to="/apoderados" >
          Apoderados
        </NavLink>
      </nav>
    </aside>
  );
};
