import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { CompactSelect } from "./CompactSelect";

afterEach(cleanup);
const options = [{ value: "1", label: "Enero" }, { value: "2", label: "Febrero" }];
it("renders a portal and selects an option without an empty value for required filters", () => {
  const change = vi.fn();
  const { container } = render(<CompactSelect value="1" options={options} placeholder="" ariaLabel="Mes"
    allowEmpty={false} portal onChange={change} />);
  fireEvent.click(screen.getByRole("combobox", { name: "Mes" }));
  expect(container).not.toContainElement(screen.getByRole("listbox"));
  expect(screen.getAllByRole("option")).toHaveLength(2);
  fireEvent.click(screen.getByRole("option", { name: "Febrero" }));
  expect(change).toHaveBeenCalledWith("2");
  expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  expect(screen.getByRole("combobox")).toHaveFocus();
});
it("supports keyboard selection and closes Escape without closing the parent filter", () => {
  const change = vi.fn();
  const escape = vi.fn();
  render(<div onKeyDown={escape}><CompactSelect value="1" options={options} placeholder="Todos" onChange={change} /></div>);
  const trigger = screen.getByRole("combobox");
  fireEvent.keyDown(trigger, { key: "ArrowDown" });
  fireEvent.keyDown(trigger, { key: "End" });
  fireEvent.keyDown(trigger, { key: "Enter" });
  expect(change).toHaveBeenCalledWith("2");
  fireEvent.click(trigger);
  escape.mockClear();
  fireEvent.keyDown(trigger, { key: "Escape" });
  expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  expect(escape).not.toHaveBeenCalled();
});
it("offers the reset option and dismisses on an outside pointer press", () => {
  const change = vi.fn();
  render(<CompactSelect value="1" options={options} placeholder="Todos" onChange={change} />);
  fireEvent.click(screen.getByRole("combobox"));
  fireEvent.click(screen.getByRole("option", { name: "Todos" }));
  expect(change).toHaveBeenCalledWith("");
  fireEvent.click(screen.getByRole("combobox"));
  fireEvent.pointerDown(document.body);
  expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
});
