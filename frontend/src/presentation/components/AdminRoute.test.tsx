import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminRoute } from "./AdminRoute";
import { useAuth } from "@/presentation/context/AuthContext";

vi.mock("@/presentation/context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

describe("AdminRoute", () => {
  beforeEach(() => vi.clearAllMocks());

  const renderRoute = () => render(
    <MemoryRouter initialEntries={["/students"]}>
      <Routes>
        <Route path="/" element={<p>Inicio</p>} />
        <Route element={<AdminRoute />}>
          <Route path="/students" element={<p>Alumnos privados</p>} />
        </Route>
        <Route path="/login" element={<p>Login</p>} />
      </Routes>
    </MemoryRouter>,
  );

  it("[AdminRoute #01] debe permitir acceso al ADMIN", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { rol: "ADMIN" },
      isAuthenticated: true,
      loading: false,
    } as ReturnType<typeof useAuth>);
    renderRoute();
    expect(screen.getByText("Alumnos privados")).toBeInTheDocument();
  });

  it("[AdminRoute #02] debe redirigir al USER", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { rol: "USER" },
      isAuthenticated: true,
      loading: false,
    } as ReturnType<typeof useAuth>);
    renderRoute();
    expect(screen.getByText("Inicio")).toBeInTheDocument();
    expect(screen.queryByText("Alumnos privados")).not.toBeInTheDocument();
  });
});
