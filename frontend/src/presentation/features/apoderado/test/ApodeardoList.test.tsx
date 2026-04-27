import type { Apoderado } from "@/core/domain/entities/apoderado/Apoderado";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ApoderadosList } from "../ApoderadosList";


// Mock de datos para las pruebas
const mockApoderados: Apoderado[] = [
  { id: 1, nombre: "Juan Pérez", email: "juan@example.com", telefono: "987654321" },
  { id: 2, nombre: "Maria Lopez", email: "maria@example.com", telefono: "123456789" },
];

describe("ApoderadosList Component", () => {
  afterEach(() => {
    cleanup();
  });

  // ========== 1. GESTIÓN DE ESTADOS (ORQUESTACIÓN) ==========

  it("[ApoderadosList #01] Debe mostrar el Skeleton cuando loading es true.", () => {
    const { container } = render(
      <ApoderadosList apoderados={[]} loading={true} error={null} />
    );
    // Verificamos que existan bloques de skeleton
    expect(container.querySelector(".skeleton-block")).toBeInTheDocument();
  });

  it("[ApoderadosList #02] Debe mostrar el FeedbackState cuando existe un error.", () => {
    const errorMessage = "Error al conectar con el servidor";
    render(
      <ApoderadosList apoderados={[]} loading={false} error={errorMessage} />
    );
    // Verificamos que el mensaje de error se renderice
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
    expect(screen.getByText("Hubo un problema")).toBeInTheDocument(); // Título por defecto de FeedbackState
  });

  it("[ApoderadosList #03] Debe mostrar el EmptyState cuando la lista está vacía.", () => {
    render(
      <ApoderadosList apoderados={[]} loading={false} error={null} />
    );
    expect(screen.getByText("No hay apoderados")).toBeInTheDocument();
    expect(screen.getByText(/No se encontraron apoderados registrados/i)).toBeInTheDocument();
  });

  // ========== 2. RENDERIZADO DE DATOS (TABLA) ==========

  it("[ApoderadosList #04] Debe renderizar el encabezado de la tabla y el título principal.", () => {
    render(
      <ApoderadosList apoderados={mockApoderados} loading={false} error={null} />
    );
    expect(screen.getByText("Lista de Apoderados")).toBeInTheDocument();
    expect(screen.getByText("Nombre Completo")).toBeInTheDocument();
    expect(screen.getByText("Correo Electrónico")).toBeInTheDocument();
  });

  it("[ApoderadosList #05] Debe renderizar tantas filas como apoderados existan.", () => {
    const { container } = render(
      <ApoderadosList apoderados={mockApoderados} loading={false} error={null} />
    );
    // Buscamos las filas de datos por su clase
    const rows = container.querySelectorAll(".apoderados-table__row--data");
    expect(rows.length).toBe(mockApoderados.length);
  });

  it("[ApoderadosList #06] Debe mostrar la información correcta de cada apoderado.", () => {
    render(
      <ApoderadosList apoderados={mockApoderados} loading={false} error={null} />
    );

    // Verificamos datos del primer apoderado
    expect(screen.getByText("Juan Pérez")).toBeInTheDocument();
    expect(screen.getByText("juan@example.com")).toBeInTheDocument();

    // Verificamos datos del segundo apoderado
    expect(screen.getByText("Maria Lopez")).toBeInTheDocument();
    expect(screen.getByText("123456789")).toBeInTheDocument();
  });

  it("[ApoderadosList #07] Debe incluir los atributos data-label para el diseño responsive.", () => {
    const { container } = render(
      <ApoderadosList apoderados={[mockApoderados[0]]} loading={false} error={null} />
    );

    const cells = container.querySelectorAll(".apoderados-table__td");

    // Verificamos que las celdas tengan el atributo data-label correcto
    expect(cells[0]).toHaveAttribute("data-label", "Nombre");
    expect(cells[1]).toHaveAttribute("data-label", "Email");
    expect(cells[2]).toHaveAttribute("data-label", "Teléfono");
  });
});
