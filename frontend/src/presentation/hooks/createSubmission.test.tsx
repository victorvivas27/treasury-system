import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useCreateAlumno } from "./alumno/useCreateAlumno";
import { useCreateApoderado } from "./apoderado/useCreateApoderado";
import { useCreateFamilia } from "./familia/useCreateFamilia";
const { execute, navigate } = vi.hoisted(() => ({ execute: vi.fn(), navigate: vi.fn() }));
vi.mock("react-router-dom", () => ({ useNavigate: () => navigate }));
vi.mock("./alumno/useManagedCourses", () => ({ useManagedCourses: () => ({ courses: [], loadingCourses: false, coursesError: "" }) }));
vi.mock("./alumno/useAlumnos", () => ({ useAlumnos: () => ({ alumnos: [], loading: false, error: null }) }));
vi.mock("./apoderado/useApoderados", () => ({ useApoderados: () => ({ apoderados: [], loading: false, error: null }) }));
vi.mock("@/core/B-application/use-cases/alumno/create/CreateAlumnoUseCase", () => ({ CreateAlumnoUseCase: class { execute = execute; } }));
vi.mock("@/core/B-application/use-cases/apoderado/create/CreateApoderadoUseCase", () => ({ CreateApoderadoUseCase: class { execute = execute; } }));
vi.mock("@/core/B-application/use-cases/familia/create/CreateFamiliaUseCase", () => ({ CreateFamiliaUseCase: class { execute = execute; } }));
const cases = [
 { name: "alumno", hook: useCreateAlumno, path: "/students", fill: (h: any) => h.handleChange({ target: { name: "nombre", value: "Ana" } }) },
 { name: "apoderado", hook: useCreateApoderado, path: "/parents", fill: (h: any) => { h.handleChange({ target: { name: "nombre", value: "Ana" } }); h.handleChange({ target: { name: "telefono", value: "+56986348085" } }); } },
 { name: "familia", hook: useCreateFamilia, path: "/family", fill: (h: any) => { h.setAlumnoId(1); h.setApoderadoId(0, 2); h.setParentesco(0, "Madre"); } },
];
beforeEach(() => vi.resetAllMocks());
describe.each(cases)("crear $name", ({ hook, fill, path }) => {
 it("ignora doble envio y redirige al completar sin limpiar ni habilitar de nuevo", async () => {
  let resolve!: (value: unknown) => void;
  execute.mockReturnValue(new Promise(done => { resolve = done; }));
  const { result } = renderHook(() => hook());
  act(() => fill(result.current));
  const input = result.current.formData;
  let first!: Promise<void>;
  act(() => { first = result.current.handleActionSubmit(); void result.current.handleActionSubmit(); });
  expect(execute).toHaveBeenCalledTimes(1);
  expect(result.current.loading).toBe(true);
  expect(navigate).not.toHaveBeenCalled();
  await act(async () => { resolve({}); await first; });
  expect(navigate).toHaveBeenCalledWith(path, { replace: true, state: { successMessage: expect.any(String) } });
  expect(result.current.loading).toBe(true);
  expect(result.current.formData).toEqual(input);
  expect(result.current.modal.isOpen).toBe(false);
  await act(async () => { await result.current.handleActionSubmit(); });
  expect(execute).toHaveBeenCalledTimes(1);
 });
 it("conserva los datos y permite reintentar despues de un fallo", async () => {
  execute.mockRejectedValueOnce(new Error("Sin conexion")).mockResolvedValueOnce({});
  const { result } = renderHook(() => hook());
  act(() => fill(result.current));
  const input = result.current.formData;
  await act(async () => { await result.current.handleActionSubmit(); });
  expect(result.current.loading).toBe(false);
  expect(result.current.formData).toEqual(input);
  expect(result.current.modal.type).toBe("error");
  expect(navigate).not.toHaveBeenCalled();
  act(() => result.current.closeModal());
  await act(async () => { await result.current.handleActionSubmit(); });
  expect(execute).toHaveBeenCalledTimes(2);
  expect(navigate).toHaveBeenCalledTimes(1);
 });
});
