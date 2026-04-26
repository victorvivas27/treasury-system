import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ApoderadosList } from "../ApoderadosList";
import type { Apoderado } from "@/core/domain/entities/apoderado/Apoderado";

describe("Apoderado List", () => {

  it('TEST 01 - Debería mostrar Loading - muestra skeleton de apoderados', () => {
    render(
      <ApoderadosList
        apoderados={[]}
        loading={true}
        error={null}
        onRefresh={() => { }}
      />
    );

    // Verifica que existe el skeleton (clase CSS)
    const skeletonBlocks = document.querySelectorAll('.skeleton-block');
    expect(skeletonBlocks.length).toBeGreaterThan(0);

    // Verifica que NO se renderiza la tabla
    const table = screen.queryByRole('apoderados-table');
    expect(table).not.toBeInTheDocument();

    // Verifica que NO se muestra mensaje de error
    const errorMessage = screen.queryByText(/error|falló/i);
    expect(errorMessage).not.toBeInTheDocument();
  });

  it('TEST 02 - Error muestra mensaje y botón de reintentar', () => {
    const errorMessage = 'Error de conexión';
    const mockOnRefresh = vi.fn();

    render(
      <ApoderadosList
        apoderados={[]}
        loading={false}
        error={errorMessage}
        onRefresh={mockOnRefresh}
      />
    );

    // Verifica que muestra el mensaje (el párrafo, no el título)
    expect(screen.getByText(errorMessage)).toBeInTheDocument();

    // Verifica que muestra el título por defecto
    expect(screen.getByText('Hubo un problema')).toBeInTheDocument();

    // Verifica que muestra el botón de reintentar
    const refreshButton = screen.getByText('Intentar de nuevo');
    expect(refreshButton).toBeInTheDocument();

    // Verifica que al hacer clic ejecuta onRefresh
    refreshButton.click();
    expect(mockOnRefresh).toHaveBeenCalledTimes(1);
  });



  it('TEST 03 - Vacío muestra "No hay apoderados"', () => {
    const mockOnRefresh = vi.fn();
  render(
    <ApoderadosList
      apoderados={[]}
      loading={false}
      error={null}
      onRefresh={mockOnRefresh}
    />
  );

  // Verifica que muestra el título del EmptyState
  expect(screen.getByText('No hay apoderados')).toBeInTheDocument();

  // Verifica que muestra el mensaje
  expect(screen.getByText('No se encontraron apoderados registrados en el sistema.')).toBeInTheDocument();

  // Verifica que NO muestra la tabla
  const table = document.querySelector('table');
  expect(table).not.toBeInTheDocument();

  // Verifica que NO muestra el skeleton
  const skeleton = document.querySelector('.skeleton-block');
  expect(skeleton).not.toBeInTheDocument();

  // Verifica que NO muestra mensaje de error
  const errorElement = screen.queryByText('Hubo un problema');
  expect(errorElement).not.toBeInTheDocument();
});

it('TEST 04 - Con datos renderiza la tabla con los apoderados', () => {
   const mockOnRefresh = vi.fn();
const mockApoderados: Apoderado[] = [
  { id: 1, nombre: 'Juan Pérez', email: 'juan@test.com', telefono: '123456789' },
  { id: 2, nombre: 'María García', email: 'maria@test.com', telefono: '987654321' },
];

  render(
    <ApoderadosList
      apoderados={mockApoderados}
      loading={false}
      error={null}
      onRefresh={mockOnRefresh}
    />
  );

  // Verifica que existe la tabla
  const table = document.querySelector('table');
  expect(table).toBeInTheDocument();

  // Verifica los encabezados de las columnas
  expect(screen.getByText('Nombre Completo')).toBeInTheDocument();
  expect(screen.getByText('Correo Electrónico')).toBeInTheDocument();
  expect(screen.getByText('Teléfono')).toBeInTheDocument();

  // Verifica los datos del primer apoderado
  expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
  expect(screen.getByText('juan@test.com')).toBeInTheDocument();
  expect(screen.getByText('123456789')).toBeInTheDocument();

  // Verifica los datos del segundo apoderado
  expect(screen.getByText('María García')).toBeInTheDocument();
  expect(screen.getByText('maria@test.com')).toBeInTheDocument();
  expect(screen.getByText('987654321')).toBeInTheDocument();

  // Verifica que NO muestra skeleton, error ni vacío
  expect(document.querySelector('.skeleton-block')).not.toBeInTheDocument();
  expect(screen.queryByText('Hubo un problema')).not.toBeInTheDocument();
  expect(screen.queryByText('No hay apoderados')).not.toBeInTheDocument();
});
});


