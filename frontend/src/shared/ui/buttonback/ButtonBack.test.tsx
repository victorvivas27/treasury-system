import { render, screen } from "@testing-library/react";
import { ButtonBack } from "./ButtonBack";
import { describe, expect } from "vitest";

describe("renderiza el botón volver", () => {
  render(<ButtonBack />);
  expect(screen.getByText("Volver")).toBeInTheDocument();
});
