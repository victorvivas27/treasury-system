import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { TreasurySectionPage } from "./TreasurySectionPage";

describe("TreasurySectionPage", () => {
  it("[Tesorería #01] muestra título, breadcrumb y espacio de contenido", () => {
    render(
      <MemoryRouter>
        <TreasurySectionPage section="Pagos" />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { level: 1, name: "Pagos" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Miga de pan" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Tesorería" }))
      .toHaveAttribute("href", "/tesoreria/resumen");
    expect(screen.getByRole("region", { name: "Contenido de Pagos" })).toBeInTheDocument();
  });
});
