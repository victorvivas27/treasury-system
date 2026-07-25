import type { Apoderado } from "@/core/A-domain/entities/apoderado/Apoderado";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApoderadosList } from "../ApoderadosList";


const mockApoderados: Apoderado[] = [
  { id: 1, nombre: "Juan Pérez", email: "juan@example.com", telefono: "987654321" },
  { id: 2, nombre: "Maria Lopez", email: "maria@example.com", telefono: "123456789" },
];

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

  it("[ApoderadosList #01] Debe mostrar el Skeleton cuando loading es true.", () => {
    const { container } = render(<ApoderadosList {...baseProps} loading={true} />);
    expect(container.querySelectorAll(".skeleton-block").length).toBeGreaterThan(0);
  });

  it("[ApoderadosList #02] Debe mostrar el FeedbackState cuando existe un error.", () => {
    render(<ApoderadosList
      {...baseProps}
      error="Error de conexión"
    />
    );
    expect(screen.getByText("Error de conexión")).toBeInTheDocument();
  });

  it("[ApoderadosList #03] Debe mostrar el EmptyState cuando la lista está vacía y no está cargando.", () => {
    render(<ApoderadosList
      {...baseProps}
      apoderados={[]}
    />
    );
    expect(screen.getByText("No hay apoderados")).toBeInTheDocument();
  });

  it("[ApoderadosList #04] Debe renderizar la lista de apoderados correctamente.", () => {
    render(<ApoderadosList
      {...baseProps}
      apoderados={mockApoderados}
    />
    );
    expect(screen.getByText("Juan Pérez")).toBeInTheDocument();
    expect(screen.getByText("juan@example.com")).toBeInTheDocument();
    expect(screen.getByText("Maria Lopez")).toBeInTheDocument();
  });

  it("[ApoderadosList #05] Debe llamar a handleDelete con el ID correcto al hacer clic.", () => {
    const handleDelete = vi.fn();
    render(<ApoderadosList
      {...baseProps}
      apoderados={mockApoderados}
      handleDelete={handleDelete}
    />
    );
    fireEvent.click(screen.getByTestId("delete-btn-1"));
    expect(handleDelete).toHaveBeenCalledWith(1);
  });

  it("[ApoderadosList #06] Debe llamar a handleEdit con el ID correcto al hacer clic.", () => {
    const handleEdit = vi.fn();
    render(<ApoderadosList
      {...baseProps}
      apoderados={mockApoderados}
      handleEdit={handleEdit}
    />
    );
    fireEvent.click(screen.getByTestId("edit-btn-1"));
    expect(handleEdit).toHaveBeenCalledWith("1");
  });

  it("[ApoderadosList #07] Debe manejar la navegación entre páginas.", () => {
    const onPrevPage = vi.fn();
    const onNextPage = vi.fn();
    render(<ApoderadosList
      {...baseProps}
      apoderados={mockApoderados}
      onPrevPage={onPrevPage}
      onNextPage={onNextPage}
      hasPrevPage={true}
    />
    );

    fireEvent.click(screen.getByText("◀ Anterior"));
    expect(onPrevPage).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText("Siguiente ▶"));
    expect(onNextPage).toHaveBeenCalledTimes(1);
  });

  it("[ApoderadosList #08] Debe deshabilitar botones de paginación cuando corresponde.", () => {
    render(
      <ApoderadosList
        {...baseProps}
        apoderados={mockApoderados}
        hasPrevPage={false}
        isLastPage={true}
      />
    );
    expect(screen.getByRole("button", { name: /◀ Anterior/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Siguiente ▶/i })).toBeDisabled();
  });
});
