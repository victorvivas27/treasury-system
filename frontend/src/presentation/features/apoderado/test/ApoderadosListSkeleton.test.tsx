import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ApoderadosListSkeleton } from "../ApoderadosListSkeleton";

describe("ApoderadosListSkeleton Component", () => {
  afterEach(() => {
    cleanup();
  });

  // ========== 1. ESTRUCTURA Y SEMÁNTICA ==========

  it("[ApoderadosListSkeleton #01] Debe renderizar el título de la sección para mantener el contexto.", () => {
    const { getByText } = render(<ApoderadosListSkeleton />);
    expect(getByText("Lista de Apoderados")).toBeInTheDocument();
  });

  it("[ApoderadosListSkeleton #02] Debe renderizar la estructura de tabla completa.", () => {
    const { container } = render(<ApoderadosListSkeleton />);
    expect(container.querySelector("table")).toBeInTheDocument();
    expect(container.querySelector("thead")).toBeInTheDocument();
    expect(container.querySelector("tbody")).toBeInTheDocument();
  });

  it("[ApoderadosListSkeleton #03] Debe renderizar las 3 columnas de encabezado correctas.", () => {
    const { getByText } = render(<ApoderadosListSkeleton />);
    expect(getByText("Nombre Completo")).toBeInTheDocument();
    expect(getByText("Correo Electrónico")).toBeInTheDocument();
    expect(getByText("Teléfono")).toBeInTheDocument();
  });

  // ========== 2. CONTROL DE FILAS Y BLOQUES ==========

  it("[ApoderadosListSkeleton #04] Debe renderizar exactamente 2 filas de carga.", () => {
    const { container } = render(<ApoderadosListSkeleton />);
    const rows = container.querySelectorAll("tbody tr.apoderados-table__row--data");
    expect(rows.length).toBe(2);
  });

  it("[ApoderadosListSkeleton #05] Cada fila debe contener 3 celdas con bloques de skeleton.", () => {
    const { container } = render(<ApoderadosListSkeleton />);
    const firstRowCells = container.querySelectorAll("tbody tr:first-child td");

    expect(firstRowCells.length).toBe(3);
    firstRowCells.forEach(cell => {
      expect(cell.querySelector(".skeleton-block")).toBeInTheDocument();
    });
  });

  // ========== 3. CLASES Y ESTILOS ==========

  it("[ApoderadosListSkeleton #06] Debe aplicar las clases de ancho específicas a los bloques.", () => {
    const { container } = render(<ApoderadosListSkeleton />);

    // Verificamos que existan bloques con los anchos definidos en el componente
    expect(container.querySelector(".w-80")).toBeInTheDocument();
    expect(container.querySelector(".w-90")).toBeInTheDocument();
    expect(container.querySelector(".w-60")).toBeInTheDocument();
  });

  it("[ApoderadosListSkeleton #07] El contenedor principal debe tener la clase apoderados-container.", () => {
    const { container } = render(<ApoderadosListSkeleton />);
    const mainArticle = container.querySelector("article");
    expect(mainArticle).toHaveClass("apoderados-container");
  });

  it("[ApoderadosListSkeleton #08] Los elementos de carga deben tener la clase skeleton-block.", () => {
    const { container } = render(<ApoderadosListSkeleton />);
    const blocks = container.querySelectorAll(".skeleton-block");

    // 2 filas * 3 columnas = 6 bloques
    expect(blocks.length).toBe(6);
    blocks.forEach(block => {
      expect(block).toBeInTheDocument();
    });
  });
});
