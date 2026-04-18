
import { FiSearch } from "react-icons/fi";
import "./style/SidebarSearch.css";
export const SidebarSearch = () => {
  return (
    <div className="sidebar-search">
      <span className="sidebar-search-icon">
        <FiSearch />
      </span>
      <input
        className="sidebar-search-input"
        type="text"
        placeholder="Buscar"
        aria-label="Buscar"
      />
    </div>
  );
};
