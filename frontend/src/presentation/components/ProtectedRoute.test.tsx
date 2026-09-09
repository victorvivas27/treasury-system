import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { expect, it, vi } from "vitest";
import { ProtectedRoute } from "./ProtectedRoute";

vi.mock("@/presentation/context/AuthContext", () => ({
  useAuth: () => ({ isAuthenticated: false, loading: false }),
}));

const Destination = () => {
  const location = useLocation();
  return <p>{location.pathname} · {location.state?.from}</p>;
};

it("conserva el retorno de Mercado Pago al solicitar inicio de sesión", async () => {
  const back = "/tesoreria/pagos?mp_return=1&year=2026&payment_id=42";
  render(<MemoryRouter initialEntries={[back]}><Routes>
    <Route element={<ProtectedRoute />}><Route path="/tesoreria/pagos" element={<p>Pagos</p>} /></Route>
    <Route path="/login" element={<Destination />} />
  </Routes></MemoryRouter>);
  expect(await screen.findByText(`/login · ${back}`)).toBeInTheDocument();
});
