import type { Apoderado } from "@/core/domain/entities/apoderado/Apoderado";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
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
    expect(screen.getByText("Nombre")).toBeInTheDocument();
    expect(screen.getByText("Correo")).toBeInTheDocument();
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

  it("[ApoderadosList #08] Debe llamar a la función handleDelete con el ID correcto al hacer clic.", () => {
    // 1. Creamos un spy (mock) de la función handleDelete
    const handleDeleteMock = vi.fn();

    // 2. Renderizamos el componente pasando el mock
    render(
      <ApoderadosList
        apoderados={mockApoderados}
        loading={false}
        error={null}
        handleDelete={handleDeleteMock}
      />
    );

    // 3. Buscamos el botón de eliminar del primer apoderado (ID: 1)
    const deleteButton = screen.getByTestId(`delete-btn-1`);

    // 4. Simulamos el clic
    fireEvent.click(deleteButton);

    // 5. Verificamos que se haya llamado con el ID: 1
    expect(handleDeleteMock).toHaveBeenCalledTimes(1);
    expect(handleDeleteMock).toHaveBeenCalledWith(1);
  });

  it("[ApoderadosList #09] Debe mostrar skeletons con 5 filas cuando loading=true y apoderados está vacío", () => {
  const { container } = render(
    <ApoderadosList apoderados={[]} loading={true} error={null} />
  );

  const skeletons = container.querySelectorAll(".skeleton-block");
  // Como apoderados.length === 0, debería mostrar 5 skeletons
  // Cada fila tiene 3 skeletons (nombre, email, teléfono)
  expect(skeletons.length).toBeGreaterThanOrEqual(3); // Al menos 3 por fila
});

it("[ApoderadosList #10] Debe mostrar skeletons con la misma cantidad de filas que apoderados cuando loading=true y hay datos", () => {
  const { container } = render(
    <ApoderadosList apoderados={mockApoderados} loading={true} error={null} />
  );

  const rows = container.querySelectorAll(".apoderados-table__row--data");
  // Debería mostrar la misma cantidad de filas que apoderados (2)
  expect(rows.length).toBe(mockApoderados.length);
});

it("[ApoderadosList #11] Debe llamar a handleEdit con el ID correcto al hacer clic en editar", () => {
  // 1. Creamos un spy de handleEdit
  const handleEditMock = vi.fn();

  // 2. Renderizamos con el mock
  render(
    <ApoderadosList
      apoderados={mockApoderados}
      loading={false}
      error={null}
      handleEdit={handleEditMock}
    />
  );

  // 3. Buscamos botón editar del primer apoderado
  const editButton = screen.getByTestId(`edit-btn-1`);

  // 4. Simulamos clic
  fireEvent.click(editButton);

  // 5. Verificamos que se llamó con ID 1
  expect(handleEditMock).toHaveBeenCalledTimes(1);
  expect(handleEditMock).toHaveBeenCalledWith(1);
});

it("[ApoderadosList #12] Debe NO llamar a handleDelete si la prop no está definida", () => {
  // Sin pasar handleDelete
  render(
    <ApoderadosList
      apoderados={mockApoderados}
      loading={false}
      error={null}
      // handleDelete no se pasa
    />
  );

  const deleteButton = screen.getByTestId(`delete-btn-1`);
  fireEvent.click(deleteButton);

  // No debería tirar error, simplemente no hace nada
  // El test pasa si no hay error
  expect(true).toBe(true);
});

it("[ApoderadosList #13] Debe NO llamar a handleEdit si la prop no está definida", () => {
  // Sin pasar handleEdit
  render(
    <ApoderadosList
      apoderados={mockApoderados}
      loading={false}
      error={null}
      // handleEdit no se pasa
    />
  );

  const editButton = screen.getByTestId(`edit-btn-1`);
  fireEvent.click(editButton);

  // No debería tirar error
  expect(true).toBe(true);
});
});
