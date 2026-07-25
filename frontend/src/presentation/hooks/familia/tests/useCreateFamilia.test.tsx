import type { ReactNode } from "react";
import { act, renderHook } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useCreateFamilia } from "../useCreateFamilia";

const execute = vi.fn();

vi.mock("@/core/B-application/use-cases/familia/create/CreateFamiliaUseCase", () => ({
  CreateFamiliaUseCase: vi.fn().mockImplementation(function () {
    return { execute };
  }),
}));

vi.mock("@/presentation/hooks/alumno/useAlumnos", () => ({
  useAlumnos: () => ({ alumnos: [], loading: false, error: null }),
}));

vi.mock("@/presentation/hooks/apoderado/useApoderados", () => ({
  useApoderados: () => ({ apoderados: [], loading: false, error: null }),
}));

describe("useCreateFamilia", () => {
  beforeEach(() => vi.clearAllMocks());

  it("[useCreateFamilia #01] muestra errores por campo si se envía vacío", async () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <MemoryRouter>{children}</MemoryRouter>
    );
    const { result } = renderHook(() => useCreateFamilia(), { wrapper });

    await act(async () => {
      await result.current.handleActionSubmit();
    });

    expect(result.current.fieldErrors).toEqual({
      alumnoId: "Seleccione un alumno",
      "apoderados.0.apoderadoId": "Seleccione un apoderado",
      "apoderados.0.parentesco": "Seleccione un parentesco",
    });
    expect(execute).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
  });
});
