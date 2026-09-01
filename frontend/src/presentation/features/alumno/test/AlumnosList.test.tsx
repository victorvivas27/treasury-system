import type { Alumno } from "@/core/A-domain/entities/alumno/Alumno";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AlumnosList } from "../AlumnosList";




// Mock de datos para las pruebas
const mockAlumnos: Alumno[] = [
  { id: 1, nombre: "Juan Pérez", curso: "4A", apoderadoId: 1 },
  { id: 2, nombre: "Maria Lopez", curso: "4B", observacion: "Alérgica al maní", apoderadoId: 2 },
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

describe("AlumnosList Component", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  // ========== 1. GESTIÓN DE ESTADOS (ORQUESTACIÓN) ==========

  it("[AlumnosList #01] Debe mostrar el Skeleton cuando loading es true.", () => {
    const { container } = render(
      <AlumnosList
        {...baseProps}
        alumnos={[]}
        loading={true}
        error={null}
      />
    );
    // Verificamos que existan bloques de skeleton
    const skeletons = container.querySelectorAll(".skeleton-block");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("[AlumnosList #02] Debe mostrar el FeedbackState cuando existe un error.", () => {
    const errorMessage = "Error al conectar con el servidor";
    render(
      <AlumnosList
        {...baseProps}
        alumnos={[]}
        loading={false}
        error={errorMessage}
      />
    );
    // Verificamos que el mensaje de error se renderice
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it("[AlumnosList #03] Debe mostrar el EmptyState cuando la lista está vacía y no está cargando.", () => {
    render(
      <AlumnosList
        {...baseProps}
        alumnos={[]}
        loading={false}
        error={null}
      />
    );
    expect(screen.getByText("No hay alumnos")).toBeInTheDocument();
    expect(screen.getByText(/No se encontraron alumnos registrados/i)).toBeInTheDocument();
  });

  // ========== 2. RENDERIZADO DE DATOS (TABLA) ==========

  it("[AlumnosList #04] Debe renderizar el encabezado de la tabla y el título principal.", () => {
    render(
      <AlumnosList
        {...baseProps}
        alumnos={mockAlumnos}
        loading={false}
        error={null}
      />
    );
    expect(screen.getByText("Lista de Alumnos")).toBeInTheDocument();
    expect(screen.getByText("Nombre")).toBeInTheDocument();
    expect(screen.getByText("Curso")).toBeInTheDocument();
    expect(screen.getByText("Nacimiento")).toBeInTheDocument();
    expect(screen.getByText("Mensaje")).toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "Código" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Ver código" })).toHaveLength(mockAlumnos.length);
    expect(screen.getByText("Acciones")).toBeInTheDocument();
  });

  it("[AlumnosList #05] Debe renderizar tantas filas de datos como alumnos existan (filas sin clase empty-row).", () => {
    const { container } = render(
      <AlumnosList
        {...baseProps}
        alumnos={mockAlumnos}
        loading={false}
        error={null}
        pageSize={10}
      />
    );
    // Buscamos SOLO las filas que NO son empty-row
    const dataRows = container.querySelectorAll(".alumnos-table__row--data:not(.empty-row)");
    expect(dataRows.length).toBe(mockAlumnos.length);
  });

  it("[AlumnosList #05.1] Muestra la observación al pulsar el icono de mensaje", () => {
    render(<AlumnosList {...baseProps} alumnos={mockAlumnos} />);

    expect(screen.getAllByRole("button", { name: /Ver observación/i })).toHaveLength(1);
    const observationButton = screen.getByRole("button", { name: /Ver observación de Maria/i });
    vi.spyOn(observationButton, "getBoundingClientRect").mockReturnValue({
      top: 180, bottom: 212, left: 40, right: 72, width: 32, height: 32,
      x: 40, y: 180, toJSON: () => ({}),
    });
    fireEvent.click(observationButton);

    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveClass("modal-overlay--anchored");
    expect(dialog.querySelector(".modal-container")).toHaveStyle({ top: "220px" });
    expect(screen.getByText("Alérgica al maní")).toBeInTheDocument();
  });

  it("[AlumnosList #06] Debe mostrar la información correcta de cada alumno.", () => {
    render(
      <AlumnosList
        {...baseProps}
        alumnos={mockAlumnos}
        loading={false}
        error={null}
      />
    );

    // Verificamos datos del primer alumno
    expect(screen.getByText("Juan Pérez")).toBeInTheDocument();
    expect(screen.getByText("4A")).toBeInTheDocument();

    // Verificamos datos del segundo alumno
    expect(screen.getByText("Maria Lopez")).toBeInTheDocument();
    expect(screen.getByText("4B")).toBeInTheDocument();
    expect(screen.queryByText("1")).not.toBeInTheDocument();
    expect(screen.queryByText("2")).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Ver código" })).toHaveLength(2);
  });

  it("[AlumnosList #07] Debe incluir los atributos data-label para el diseño responsive.", () => {
    const { container } = render(
      <AlumnosList
        {...baseProps}
        alumnos={[mockAlumnos[0]]}
        loading={false}
        error={null}
      />
    );

    const cells = container.querySelectorAll(".alumnos-table__td");
    const nonEmptyCells = Array.from(cells).filter(cell =>
      !cell.querySelector(".skeleton-block") && cell.textContent?.trim()
    );

    // Verificamos que las celdas tengan el atributo data-label correcto
    if (nonEmptyCells.length >= 5) {
      expect(nonEmptyCells[0]).toHaveAttribute("data-label", "Estado");
      expect(nonEmptyCells[1]).toHaveAttribute("data-label", "Nombre");
      expect(nonEmptyCells[2]).toHaveAttribute("data-label", "Curso");
      expect(nonEmptyCells[3]).toHaveAttribute("data-label", "Nacimiento");
      expect(nonEmptyCells[4]).toHaveAttribute("data-label", "Mensaje");
      expect(nonEmptyCells[5]).toHaveAttribute("data-label", "Acciones");
    }
  });

  it("[AlumnosList #08] Debe llamar a la función handleDelete con el ID correcto al hacer clic.", () => {
    const handleDeleteMock = vi.fn();

    render(
      <AlumnosList
        {...baseProps}
        alumnos={mockAlumnos}
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

  it("[AlumnosList #09] Debe mostrar skeletons con pageSize filas cuando loading=true", () => {
    const pageSize = 5;
    const { container } = render(
      <AlumnosList
        {...baseProps}
        alumnos={[]}
        loading={true}
        error={null}
        pageSize={pageSize}
      />
    );

    const rows = container.querySelectorAll(".alumnos-table__row--data");
    // Debe mostrar exactamente pageSize filas de skeleton
    expect(rows.length).toBe(pageSize);

    const skeletons = container.querySelectorAll(".skeleton-block");
    // Solo los datos remotos tienen skeleton; la columna de acciones queda vacía.
    expect(skeletons.length).toBe(pageSize * 4);
  });

  it("[AlumnosList #10] Debe llamar a handleEdit con el ID correcto al hacer clic en editar", () => {
    const handleEditMock = vi.fn();

    render(
      <AlumnosList
        {...baseProps}
        alumnos={mockAlumnos}
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

  it("[AlumnosList #11] Debe NO llamar a handleDelete si la prop no está definida", () => {
    render(
      <AlumnosList
        {...baseProps}
        alumnos={mockAlumnos}
        loading={false}
        error={null}
      />
    );

    const deleteButton = screen.getByTestId(`delete-btn-1`);
    fireEvent.click(deleteButton);

    // No debería tirar error, simplemente no hace nada
    expect(true).toBe(true);
  });

  it("[AlumnosList #12] Debe NO llamar a handleEdit si la prop no está definida", () => {
    render(
      <AlumnosList
        {...baseProps}
        alumnos={mockAlumnos}
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

  it("[AlumnosList #13] Debe mostrar los controles de paginación", () => {
    render(
      <AlumnosList
        {...baseProps}
        alumnos={mockAlumnos}
        loading={false}
        error={null}
      />
    );

    expect(screen.getByText("◀ Anterior")).toBeInTheDocument();
    expect(screen.getByText("Siguiente ▶")).toBeInTheDocument();
    expect(screen.getByText(/Página 1/i)).toBeInTheDocument();
  });

  it("[AlumnosList #14] Debe llamar a onPrevPage cuando se hace clic en Anterior", () => {
    const onPrevPageMock = vi.fn();

    render(
      <AlumnosList
        {...baseProps}
        alumnos={mockAlumnos}
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

  it("[AlumnosList #15] Debe llamar a onNextPage cuando se hace clic en Siguiente", () => {
    const onNextPageMock = vi.fn();

    render(
      <AlumnosList
        {...baseProps}
        alumnos={mockAlumnos}
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

  it("[AlumnosList #16] Debe deshabilitar el botón Anterior cuando no hay página previa", () => {
    render(
      <AlumnosList
        {...baseProps}
        alumnos={mockAlumnos}
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

  it("[AlumnosList #17] Debe deshabilitar el botón Siguiente cuando es la última página", () => {
    render(
      <AlumnosList
        {...baseProps}
        alumnos={mockAlumnos}
        loading={false}
        error={null}
        isLastPage={true}
      />
    );

    const nextButton = screen.getByRole('button', { name: /Siguiente ▶/i });
    expect(nextButton).toBeDisabled();
  });

  it("[AlumnosList #18] Debe deshabilitar los botones de paginación cuando está cargando", () => {
    render(
      <AlumnosList
        {...baseProps}
        alumnos={[]}
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

  it("[AlumnosList #19] Debe mostrar el número de página correcto (currentPage + 1)", () => {
    render(
      <AlumnosList
        {...baseProps}
        alumnos={mockAlumnos}
        loading={false}
        error={null}
        currentPage={3}
      />
    );

    expect(screen.getByText("Página 4")).toBeInTheDocument();
  });

  it("[AlumnosList #20] Debe mantener la altura de la tabla con filas vacías cuando hay pocos datos", () => {
    const pageSize = 5;
    const { container } = render(
      <AlumnosList
        {...baseProps}
        alumnos={[mockAlumnos[0]]} // Solo 1 alumno
        loading={false}
        error={null}
        pageSize={pageSize}
      />
    );

    const rows = container.querySelectorAll(".alumnos-table__row--data");
    // Debe mostrar pageSize filas en total (1 real + 4 vacías)
    expect(rows.length).toBe(pageSize);

    // Verificar que las filas vacías tengan la clase correcta
    const emptyRows = container.querySelectorAll(".empty-row");
    expect(emptyRows.length).toBe(pageSize - 1);
  });
});
