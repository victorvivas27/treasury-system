import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { ScheduleDayPanel } from "./ScheduleDayPanel";

it("pliega días independientemente y conserva los campos al desplegarlos", () => {
  render(<><ScheduleDayPanel index={0}><input aria-label="Materia lunes" defaultValue="Matemática" /></ScheduleDayPanel>
    <ScheduleDayPanel index={1}><input aria-label="Materia martes" /></ScheduleDayPanel></>);
  expect(screen.getByRole("button", { name: "Desplegar Lunes" })).toHaveAttribute("aria-expanded", "false");
  expect(screen.getByRole("button", { name: "Desplegar Martes" })).toHaveAttribute("aria-expanded", "false");
  fireEvent.click(screen.getByRole("button", { name: "Desplegar Lunes" }));
  fireEvent.change(screen.getByLabelText("Materia lunes"), { target: { value: "Lenguaje" } });
  fireEvent.click(screen.getByRole("button", { name: "Plegar Lunes" }));
  expect(screen.getByRole("button", { name: "Desplegar Lunes" })).toHaveAttribute("aria-expanded", "false");
  expect(document.getElementById("schedule-day-content-1")).toHaveAttribute("inert");
  expect(screen.getByRole("button", { name: "Desplegar Martes" })).toHaveAttribute("aria-expanded", "false");
  fireEvent.click(screen.getByRole("button", { name: "Desplegar Lunes" }));
  expect(screen.getByLabelText("Materia lunes")).toHaveValue("Lenguaje");
  expect(document.getElementById("schedule-day-content-1")).not.toHaveAttribute("inert");
});
