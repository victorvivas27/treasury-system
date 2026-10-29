import { fireEvent, render, screen } from "@testing-library/react";
import { Link, MemoryRouter } from "react-router-dom";
import { expect, it, vi } from "vitest";
import { AppRouter } from "./AppRouter";

vi.mock("./PrivateRoutes", () => ({ PrivateRoutes: () => <h1>Pantalla interna preparada</h1> }));
vi.mock("../pages/home/HomePage", () => ({ HomePage: () => <Link to="/birthdays">Cumpleaños</Link> }));
vi.mock("../pages/auth/LoginPage", () => ({ LoginPage: () => null }));
vi.mock("../pages/auth/AccountFlowPages", () => ({
  CheckEmailPage: () => null, ForgotPasswordPage: () => null, PasswordUpdatedPage: () => null,
  ResetPasswordPage: () => null, VerifyEmailPage: () => null,
}));

it("abre las pantallas internas sin volver a mostrar el loader de entrada", async () => {
  render(<MemoryRouter><AppRouter /></MemoryRouter>);
  fireEvent.click(screen.getByRole("link", { name: "Cumpleaños" }));
  expect(document.querySelector(".app-loader")).not.toBeInTheDocument();
  expect(document.querySelector(".react-loading-skeleton")).not.toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Pantalla interna preparada" })).toBeVisible();
  expect(screen.queryByRole("status", { name: "Abriendo tu espacio" })).not.toBeInTheDocument();
});
