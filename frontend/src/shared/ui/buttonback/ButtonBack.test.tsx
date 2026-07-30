import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { ButtonBack } from "./ButtonBack";

describe("ButtonBack", () => {
  it("renderiza el boton volver", () => {
    render(
      <MemoryRouter>
        <ButtonBack />
      </MemoryRouter>,
    );

    expect(screen.getByText("Volver")).toBeInTheDocument();
  });
});
