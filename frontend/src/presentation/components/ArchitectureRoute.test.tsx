import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ArchitectureRoute } from "./ArchitectureRoute";

const state = vi.hoisted(() => ({
  auth: { user:{id:7,rol:"SUPER_ADMIN"},isAuthenticated:true,loading:false },
  access: { allowed:false,loading:false,error:false,retry:vi.fn() },
}));
vi.mock("@/presentation/context/AuthContext",()=>({useAuth:()=>state.auth}));
vi.mock("@/presentation/hooks/architecture/useArchitectureAccess",()=>({useArchitectureAccess:()=>state.access}));

const mount = () => render(<MemoryRouter initialEntries={["/admin/arquitectura"]}><Routes>
  <Route path="/" element={<p>Inicio</p>} />
  <Route element={<ArchitectureRoute />}><Route path="/admin/arquitectura" element={<p>Contenido privado</p>} /></Route>
</Routes></MemoryRouter>);

describe("Ruta de arquitectura",()=>{
  beforeEach(()=>{
    state.auth={user:{id:7,rol:"SUPER_ADMIN"},isAuthenticated:true,loading:false};
    state.access={allowed:false,loading:false,error:false,retry:vi.fn()};
  });
  it("bloquea SUPER_ADMIN sin permiso del servidor",()=>{
    mount();
    expect(screen.getByText("Acceso reservado")).toBeInTheDocument();
    expect(screen.queryByText("Contenido privado")).not.toBeInTheDocument();
  });
  it("redirige sesiones ausentes y otros roles aunque el estado local declare permiso",()=>{
    state.auth.isAuthenticated=false;
    state.access.allowed=true;
    mount();
    expect(screen.getByText("Inicio")).toBeInTheDocument();
    expect(screen.queryByText("Contenido privado")).not.toBeInTheDocument();
  });
  it("muestra el contenido únicamente tras la aprobación",()=>{
    state.access.allowed=true;
    mount();
    expect(screen.getByText("Contenido privado")).toBeInTheDocument();
  });
});
