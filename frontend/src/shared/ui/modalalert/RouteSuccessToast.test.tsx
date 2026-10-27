import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation, useNavigate } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
import { RouteSuccessToast } from "./RouteSuccessToast";
function Location() {
 const location = useLocation();
 const navigate = useNavigate();
 return <><output data-testid="state">{JSON.stringify(location.state)}</output>
 <button onClick={() => navigate("/students")}>Otra lista</button></>;
}
afterEach(() => vi.useRealTimers());
it("muestra exito en el destino, consume el aviso y no bloquea el scroll", async () => {
 render(<MemoryRouter initialEntries={[{ pathname: "/parents", state: { successMessage: "Apoderado creado", filter: "activo" } }]}>
  <RouteSuccessToast /><Location />
 </MemoryRouter>);
 expect(await screen.findByText("Apoderado creado")).toBeInTheDocument();
 await waitFor(() => expect(screen.getByTestId("state")).toHaveTextContent('{"filter":"activo"}'));
 expect(document.body.style.overflow).not.toBe("hidden");
 expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
 fireEvent.click(screen.getByRole("button", { name: "Otra lista" }));
 expect(screen.queryByText("Apoderado creado")).not.toBeInTheDocument();
});
it("cierra automaticamente y no reproduce el aviso al volver a montar", async () => {
 vi.useFakeTimers();
 const first=render(<MemoryRouter initialEntries={[{ pathname: "/parents", state: { successMessage: "Creado" } }]}>
  <RouteSuccessToast /><Location />
 </MemoryRouter>);
 expect(screen.getByText("Creado")).toBeInTheDocument();
 expect(screen.getByTestId("state")).toHaveTextContent("null");
 act(() => vi.advanceTimersByTime(3000));
 expect(screen.queryByText("Creado")).not.toBeInTheDocument();
 first.unmount();
 render(<MemoryRouter initialEntries={[{ pathname: "/parents", state: null }]}><RouteSuccessToast /></MemoryRouter>);
 expect(screen.queryByRole("status")).not.toBeInTheDocument();
});
