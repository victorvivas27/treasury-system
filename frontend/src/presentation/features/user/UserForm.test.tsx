import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { UserForm } from "./UserForm";

describe("UserForm", () => {
  it("[UserForm #01] debe renderizar todos los campos", () => {
    render(<UserForm onSubmit={vi.fn()} />);
    expect(screen.getByLabelText("Nombre")).toBeInTheDocument();
    expect(screen.getByLabelText("Correo")).toBeInTheDocument();
    expect(screen.getByLabelText("Contraseña")).toBeInTheDocument();
    expect(screen.getByLabelText("Rol")).toBeInTheDocument();
  });

  it("[UserForm #02] debe mostrar validaciones y no enviar datos inválidos", () => {
    const onSubmit = vi.fn();
    render(<UserForm onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole("button", { name: "Guardar usuario" }));
    expect(screen.getByText(/entre 3 y 100/i)).toBeInTheDocument();
    expect(screen.getByText(/correo válido/i)).toBeInTheDocument();
    expect(screen.getByText(/mayúscula/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("[UserForm #03] debe enviar un usuario válido", async () => {
    const onSubmit = vi.fn();
    render(<UserForm onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "Victor Vivas" } });
    fireEvent.change(screen.getByLabelText("Correo"), { target: { value: "user@mail.com" } });
    fireEvent.change(screen.getByLabelText("Contraseña"), { target: { value: "Password1!" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar usuario" }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      nombre: "Victor Vivas",
      correo: "user@mail.com",
      password: "Password1!",
      rol: "USER",
    })));
  });
  it("[UserForm #04] oculta rol y estados en el registro público", () => {
    render(
      <UserForm
        onSubmit={vi.fn()}
        showRole={false}
        showAccountStatus={false}
      />,
    );

    expect(screen.queryByLabelText("Rol")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Usuario habilitado")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Cuenta desbloqueada")).not.toBeInTheDocument();
  });

  it("[UserForm #05] muestra y oculta la contraseña", () => {
    render(<UserForm onSubmit={vi.fn()} />);
    const password = screen.getByLabelText("Contraseña");

    expect(password).toHaveAttribute("type", "password");
    fireEvent.click(screen.getByRole("button", { name: "Mostrar contraseña" }));
    expect(password).toHaveAttribute("type", "text");
    fireEvent.click(screen.getByRole("button", { name: "Ocultar contraseña" }));
    expect(password).toHaveAttribute("type", "password");
  });
  it("[UserForm #06] oculta y omite la contraseña al modificar un usuario", async () => {
    const onSubmit = vi.fn();
    render(
      <UserForm
        initialData={{ nombre: "Victor Vivas", correo: "user@mail.com" }}
        submitLabel="Actualizar usuario"
        onSubmit={onSubmit}
      />,
    );

    expect(screen.queryByLabelText("Contraseña")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Actualizar usuario" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.not.objectContaining({
      password: expect.anything(),
    })));
  });
});
