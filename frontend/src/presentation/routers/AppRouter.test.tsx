import { fireEvent, render, screen } from "@testing-library/react";
import { Link, MemoryRouter } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";
import { AppRouter } from "./AppRouter";

const auth = vi.hoisted(() => ({ loading: false }));
vi.mock("../context/AuthContext", () => ({ useAuth: () => auth }));
beforeEach(() => { auth.loading = false; });

vi.mock("./PrivateRoutes", () => ({ PrivateRoutes: () => <h1>Pantalla interna preparada</h1> }));
vi.mock("../pages/home/HomePage", () => ({ HomePage: () => <Link to="/birthdays">Cumpleaños</Link> }));
vi.mock("../pages/auth/LoginPage", () => ({ LoginPage: () => <h1>Login</h1> }));
vi.mock("../pages/auth/AccountFlowPages", () => ({
  CheckEmailPage: () => null, ForgotPasswordPage: () => null, PasswordUpdatedPage: () => null,
  ResetPasswordPage: () => null, VerifyEmailPage: () => null,
}));

it("no muestra la home de visitante mientras restaura la sesión", () => {
  auth.loading = true;
  const { rerender } = render(<MemoryRouter><AppRouter /></MemoryRouter>);
  expect(screen.queryByRole("link", { name: "Cumpleaños" })).not.toBeInTheDocument();
  auth.loading = false;
  rerender(<MemoryRouter><AppRouter /></MemoryRouter>);
  expect(screen.getByRole("link", { name: "Cumpleaños" })).toBeVisible();
});

it("espera la restauración antes de mostrar login y mantiene el formulario al enviarlo", () => {
  auth.loading = true;
  const { rerender } = render(<MemoryRouter initialEntries={["/login"]}><AppRouter /></MemoryRouter>);
  expect(screen.queryByRole("heading", { name: "Login" })).not.toBeInTheDocument();
  auth.loading = false;
  rerender(<MemoryRouter initialEntries={["/login"]}><AppRouter /></MemoryRouter>);
  const form = screen.getByRole("heading", { name: "Login" });
  auth.loading = true;
  rerender(<MemoryRouter initialEntries={["/login"]}><AppRouter /></MemoryRouter>);
  expect(screen.getByRole("heading", { name: "Login" })).toBe(form);
});

it("abre las pantallas internas sin volver a mostrar el loader de entrada", async () => {
  render(<MemoryRouter><AppRouter /></MemoryRouter>);
  fireEvent.click(screen.getByRole("link", { name: "Cumpleaños" }));
  expect(document.querySelector(".app-loader")).not.toBeInTheDocument();
  expect(document.querySelector(".react-loading-skeleton")).not.toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Pantalla interna preparada" })).toBeVisible();
  expect(screen.queryByRole("status", { name: "Abriendo tu espacio" })).not.toBeInTheDocument();
});
