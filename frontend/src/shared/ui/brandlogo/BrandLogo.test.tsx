import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BrandLogo } from "./BrandLogo";

describe("BrandLogo", () => {
  it("usa el recurso liviano sin una fase visual intermedia", () => {
    const { container } = render(<BrandLogo className="test-logo" />);
    const logo = screen.getByRole("img", { name: "Logo de Tesorería Escolar" });

    expect(logo).toHaveAttribute("src", "/icono-tesoreria-loader.png");
    expect(logo).toHaveAttribute("decoding", "sync");
    expect(container.querySelector(".brand-logo-skeleton")).not.toBeInTheDocument();
  });
});
