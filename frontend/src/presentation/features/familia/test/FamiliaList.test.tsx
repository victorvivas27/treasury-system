import type { FamiliaDetalle } from "@/core/A-domain/entities/familia/Familia";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FamiliaList } from "../FamiliaList";

const crearFamilia = (conSecundarios = true): FamiliaDetalle => ({
  familiaId: 1,
  codigoFamilia: "FAM-12345678",
  observacionesGenerales: null,
  alumno: {
    alumnoId: 1,
    codigo: "AL-12345678",
    nombre: "JUAN PEREZ",
  },
  apoderados: [
    {
      apoderadoId: 1,
      codigo: "AP-12345678",
      nombre: "MARIA PEREZ",
      email: "maria@example.com",
      telefono: "912345678",
      relacion: {
        parentesco: "Madre",
        esPrincipal: true,
      },
    },
    ...(conSecundarios
      ? [
          {
            apoderadoId: 2,
            codigo: "AP-87654321",
            nombre: "PEDRO PEREZ",
            email: "pedro@example.com",
            telefono: "987654321",
            relacion: {
              parentesco: "Padre",
              esPrincipal: false,
            },
          },
        ]
      : []),
  ],
});

const renderList = (familias: FamiliaDetalle[]) =>
  render(
    <FamiliaList
      familias={familias}
      loading={false}
      error={null}
      currentPage={0}
      onNextPage={vi.fn()}
      onPrevPage={vi.fn()}
      pageSize={5}
      isLastPage
    />,
  );

describe("FamiliaList", () => {
  it("[FamiliaList #01] Debe mostrar el nombre del apoderado secundario", () => {
    renderList([crearFamilia()]);

    expect(screen.getByRole("columnheader", { name: "Secundarios" })).toBeInTheDocument();
    expect(screen.getByText("PEDRO PEREZ")).toBeInTheDocument();
  });

  it("[FamiliaList #02] Debe mostrar un guion cuando no existen apoderados secundarios", () => {
    renderList([crearFamilia(false)]);

    expect(document.querySelector(".badge-secondary")).toHaveTextContent("-");
  });

  it("[FamiliaList #03] permite revelar los códigos desde el alumno", () => {
    renderList([crearFamilia()]);

    expect(screen.queryByRole("columnheader", { name: "Código familia" }))
      .not.toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "Código alumno" }))
      .not.toBeInTheDocument();
    const trigger = screen.getByRole("button", { name: "Ver códigos" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(trigger);

    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("dialog", { name: "Código de registro" })).toBeInTheDocument();
    expect(screen.getByText("FAM-12345678")).toBeInTheDocument();
    expect(screen.getByText("AL-12345678")).toBeInTheDocument();
  });
});
