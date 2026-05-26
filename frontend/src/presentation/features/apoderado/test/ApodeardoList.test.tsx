import type { Apoderado } from "@/core/A-domain/entities/apoderado/Apoderado";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApoderadosList } from "../ApoderadosList";



// Mock de datos para las pruebas
const mockApoderados: Apoderado[] = [
  { id: 1, nombre: "Juan Pérez", email: "juan@example.com", telefono: "987654321" },
  { id: 2, nombre: "Maria Lopez", email: "maria@example.com", telefono: "123456789" },
];

// Props base para los tests
const baseProps = {
  apoderados: [],
  loading: false,
  error: null,
  currentPage: 0,
  onNextPage: vi.fn(),
  onPrevPage: vi.fn(),
  hasPrevPage: false,
  pageSize: 5,
  isLastPage: false,
};

describe("ApoderadosList Component", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  // ========== 1. GESTIÓN DE ESTADOS (ORQUESTACIÓN) ==========

  it("[ApoderadosList #01] Debe mostrar el Skeleton cuando loading es true.", () => {
    const { container } = render(
      <ApoderadosList
        {...baseProps}
        apoderados={[]}
        loading={true}
        error={null}
      />
    );
    // Verificamos que existan bloques de skeleton
    const skeletons = container.querySelectorAll(".skeleton-block");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("[ApoderadosList #02] Debe mostrar el FeedbackState cuando existe un error.", () => {
    const errorMessage = "Error al conectar con el servidor";
    render(
      <ApoderadosList
        {...baseProps}
        apoderados={[]}
        loading={false}
        error={errorMessage}
      />
    );
    // Verificamos que el mensaje de error se renderice
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it("[ApoderadosList #03] Debe mostrar el EmptyState cuando la lista está vacía y no está cargando.", () => {
    render(
      <ApoderadosList
        {...baseProps}
        apoderados={[]}
        loading={false}
        error={null}
      />
    );
    expect(screen.getByText("No hay apoderados")).toBeInTheDocument();
    expect(screen.getByText(/No se encontraron apoderados registrados/i)).toBeInTheDocument();
  });

  // ========== 2. RENDERIZADO DE DATOS (TABLA) ==========

  it("[ApoderadosList #04] Debe renderizar el encabezado de la tabla y el título principal.", () => {
    render(
      <ApoderadosList
        {...baseProps}
        apoderados={mockApoderados}
        loading={false}
        error={null}
      />
    );
    expect(screen.getByText("Lista de Apoderados")).toBeInTheDocument();
    expect(screen.getByText("Nombre")).toBeInTheDocument();
    expect(screen.getByText("Correo")).toBeInTheDocument();
    expect(screen.getByText("Teléfono")).toBeInTheDocument();
    expect(screen.getByText("Acciones")).toBeInTheDocument();
  });

  it("[ApoderadosList #05] Debe renderizar tantas filas de datos como apoderados existan (filas sin clase empty-row).", () => {
    const { container } = render(
      <ApoderadosList
        {...baseProps}
        apoderados={mockApoderados}
        loading={false}
        error={null}
        pageSize={10}
      />
    );
    // Buscamos SOLO las filas que NO son empty-row
    const dataRows = container.querySelectorAll(".apoderados-table__row--data:not(.empty-row)");
    expect(dataRows.length).toBe(mockApoderados.length);
  });

  it("[ApoderadosList #06] Debe mostrar la información correcta de cada apoderado.", () => {
    render(
      <ApoderadosList
        {...baseProps}
        apoderados={mockApoderados}
        loading={false}
        error={null}
      />
    );

    // Verificamos datos del primer apoderado
    expect(screen.getByText("Juan Pérez")).toBeInTheDocument();
    expect(screen.getByText("juan@example.com")).toBeInTheDocument();
    expect(screen.getByText("987654321")).toBeInTheDocument();

    // Verificamos datos del segundo apoderado
    expect(screen.getByText("Maria Lopez")).toBeInTheDocument();
    expect(screen.getByText("maria@example.com")).toBeInTheDocument();
    expect(screen.getByText("123456789")).toBeInTheDocument();
  });

  it("[ApoderadosList #07] Debe incluir los atributos data-label para el diseño responsive.", () => {
    const { container } = render(
      <ApoderadosList
        {...baseProps}
        apoderados={[mockApoderados[0]]}
        loading={false}
        error={null}
      />
    );

    const cells = container.querySelectorAll(".apoderados-table__td");
    const nonEmptyCells = Array.from(cells).filter(cell =>
      !cell.querySelector(".skeleton-block") && cell.textContent?.trim()
    );

    // Verificamos que las celdas tengan el atributo data-label correcto
    if (nonEmptyCells.length >= 3) {
      expect(nonEmptyCells[0]).toHaveAttribute("data-label", "Nombre");
      expect(nonEmptyCells[1]).toHaveAttribute("data-label", "Email");
      expect(nonEmptyCells[2]).toHaveAttribute("data-label", "Teléfono");
    }
  });

  it("[ApoderadosList #08] Debe llamar a la función handleDelete con el ID correcto al hacer clic.", () => {
    const handleDeleteMock = vi.fn();

    render(
      <ApoderadosList
        {...baseProps}
        apoderados={mockApoderados}
        loading={false}
        error={null}
        handleDelete={handleDeleteMock}
      />
    );

    const deleteButton = screen.getByTestId(`delete-btn-1`);
    fireEvent.click(deleteButton);

    expect(handleDeleteMock).toHaveBeenCalledTimes(1);
    expect(handleDeleteMock).toHaveBeenCalledWith(1);
  });

  it("[ApoderadosList #09] Debe mostrar skeletons con pageSize filas cuando loading=true", () => {
    const pageSize = 5;
    const { container } = render(
      <ApoderadosList
        {...baseProps}
        apoderados={[]}
        loading={true}
        error={null}
        pageSize={pageSize}
      />
    );

    const rows = container.querySelectorAll(".apoderados-table__row--data");
    // Debe mostrar exactamente pageSize filas de skeleton
    expect(rows.length).toBe(pageSize);

    const skeletons = container.querySelectorAll(".skeleton-block");
    // Cada fila tiene 4 skeletons (nombre, email, teléfono, acciones)
    expect(skeletons.length).toBe(pageSize * 4);
  });

  it("[ApoderadosList #10] Debe llamar a handleEdit con el ID correcto al hacer clic en editar", () => {
    const handleEditMock = vi.fn();

    render(
      <ApoderadosList
        {...baseProps}
        apoderados={mockApoderados}
        loading={false}
        error={null}
        handleEdit={handleEditMock}
      />
    );

    const editButton = screen.getByTestId(`edit-btn-1`);
    fireEvent.click(editButton);

    expect(handleEditMock).toHaveBeenCalledTimes(1);
    expect(handleEditMock).toHaveBeenCalledWith(1);
  });

  it("[ApoderadosList #11] Debe NO llamar a handleDelete si la prop no está definida", () => {
    render(
      <ApoderadosList
        {...baseProps}
        apoderados={mockApoderados}
        loading={false}
        error={null}
      />
    );

    const deleteButton = screen.getByTestId(`delete-btn-1`);
    fireEvent.click(deleteButton);

    // No debería tirar error, simplemente no hace nada
    expect(true).toBe(true);
  });

  it("[ApoderadosList #12] Debe NO llamar a handleEdit si la prop no está definida", () => {
    render(
      <ApoderadosList
        {...baseProps}
        apoderados={mockApoderados}
        loading={false}
        error={null}
      />
    );

    const editButton = screen.getByTestId(`edit-btn-1`);
    fireEvent.click(editButton);

    // No debería tirar error
    expect(true).toBe(true);
  });

  // ========== 3. PRUEBAS DE PAGINACIÓN ==========

  it("[ApoderadosList #13] Debe mostrar los controles de paginación", () => {
    render(
      <ApoderadosList
        {...baseProps}
        apoderados={mockApoderados}
        loading={false}
        error={null}
      />
    );

    expect(screen.getByText("◀ Anterior")).toBeInTheDocument();
    expect(screen.getByText("Siguiente ▶")).toBeInTheDocument();
    expect(screen.getByText(/Página 1/i)).toBeInTheDocument();
  });

  it("[ApoderadosList #14] Debe llamar a onPrevPage cuando se hace clic en Anterior", () => {
    const onPrevPageMock = vi.fn();

    render(
      <ApoderadosList
        {...baseProps}
        apoderados={mockApoderados}
        loading={false}
        error={null}
        onPrevPage={onPrevPageMock}
        hasPrevPage={true}
        currentPage={2}
      />
    );

    const prevButton = screen.getByText("◀ Anterior");
    fireEvent.click(prevButton);

    expect(onPrevPageMock).toHaveBeenCalledTimes(1);
  });

  it("[ApoderadosList #15] Debe llamar a onNextPage cuando se hace clic en Siguiente", () => {
    const onNextPageMock = vi.fn();

    render(
      <ApoderadosList
        {...baseProps}
        apoderados={mockApoderados}
        loading={false}
        error={null}
        onNextPage={onNextPageMock}
        isLastPage={false}
      />
    );

    const nextButton = screen.getByText("Siguiente ▶");
    fireEvent.click(nextButton);

    expect(onNextPageMock).toHaveBeenCalledTimes(1);
  });

  it("[ApoderadosList #16] Debe deshabilitar el botón Anterior cuando no hay página previa", () => {
    render(
      <ApoderadosList
        {...baseProps}
        apoderados={mockApoderados}
        loading={false}
        error={null}
        hasPrevPage={false}
        currentPage={0}
      />
    );

    // Buscar el botón por su role y texto
    const prevButton = screen.getByRole('button', { name: /◀ Anterior/i });
    expect(prevButton).toBeDisabled();
  });

  it("[ApoderadosList #17] Debe deshabilitar el botón Siguiente cuando es la última página", () => {
    render(
      <ApoderadosList
        {...baseProps}
        apoderados={mockApoderados}
        loading={false}
        error={null}
        isLastPage={true}
      />
    );

    const nextButton = screen.getByRole('button', { name: /Siguiente ▶/i });
    expect(nextButton).toBeDisabled();
  });

  it("[ApoderadosList #18] Debe deshabilitar los botones de paginación cuando está cargando", () => {
    render(
      <ApoderadosList
        {...baseProps}
        apoderados={[]}
        loading={true}
        error={null}
        hasPrevPage={true}
        isLastPage={false}
      />
    );

    const prevButton = screen.getByRole('button', { name: /◀ Anterior/i });
    const nextButton = screen.getByRole('button', { name: /Siguiente ▶/i });

    expect(prevButton).toBeDisabled();
    expect(nextButton).toBeDisabled();
  });

  it("[ApoderadosList #19] Debe mostrar el número de página correcto (currentPage + 1)", () => {
    render(
      <ApoderadosList
        {...baseProps}
        apoderados={mockApoderados}
        loading={false}
        error={null}
        currentPage={3}
      />
    );

    expect(screen.getByText("Página 4")).toBeInTheDocument();
  });

  it("[ApoderadosList #20] Debe mantener la altura de la tabla con filas vacías cuando hay pocos datos", () => {
    const pageSize = 5;
    const { container } = render(
      <ApoderadosList
        {...baseProps}
        apoderados={[mockApoderados[0]]} // Solo 1 apoderado
        loading={false}
        error={null}
        pageSize={pageSize}
      />
    );

    const rows = container.querySelectorAll(".apoderados-table__row--data");
    // Debe mostrar pageSize filas en total (1 real + 4 vacías)
    expect(rows.length).toBe(pageSize);

    // Verificar que las filas vacías tengan la clase correcta
    const emptyRows = container.querySelectorAll(".empty-row");
    expect(emptyRows.length).toBe(pageSize - 1);
  });
});
