import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { AxiosError } from "axios";
import { useAuth } from "@/presentation/context/AuthContext";
import { LoginPage } from "./LoginPage";

vi.mock("@/presentation/context/AuthContext", () => ({ useAuth: vi.fn() }));
vi.mock("lottie-react", () => ({ Lottie: () => <span data-testid="back-animation" /> }));

describe("LoginPage", () => {
  const challenge = { termsAcceptanceRequired: true, currentTermsVersion: "2026-11-16" };
  const fillCredentials = () => {
    fireEvent.change(screen.getByLabelText("Correo"), { target: { value: "user@mail.com" } });
    fireEvent.change(screen.getByLabelText("Contrase\u00f1a"), { target: { value: "Password1!" } });
  };
  const submit = () => fireEvent.click(screen.getByRole("button", { name: "Ingresar" }));

  it("oculta los documentos y permite ingresar directamente a quien ya acepto", async () => {
    const login = vi.fn().mockResolvedValue({});
    vi.mocked(useAuth).mockReturnValue({ login, loading: false } as unknown as ReturnType<typeof useAuth>);
    render(<MemoryRouter initialEntries={["/login"]}><Routes>
      <Route path="/login" element={<LoginPage />} /><Route path="/" element={<h1>Curso</h1>} />
    </Routes></MemoryRouter>);
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /condiciones/ })).not.toBeInTheDocument();
    fillCredentials(); submit();
    expect(await screen.findByRole("heading", { name: "Curso" })).toBeInTheDocument();
    expect(login).toHaveBeenLastCalledWith("user@mail.com", "Password1!", undefined);
  });

  it("solicita aceptacion solo tras confirmar que esta pendiente", async () => {
    const login = vi.fn().mockResolvedValueOnce(challenge).mockResolvedValueOnce({});
    vi.mocked(useAuth).mockReturnValue({ login, loading: false } as unknown as ReturnType<typeof useAuth>);
    render(<MemoryRouter><LoginPage /></MemoryRouter>);
    fillCredentials(); submit();
    const checkbox = await screen.findByRole("checkbox");
    expect(checkbox).not.toBeChecked(); expect(checkbox).toBeRequired();
    expect(login).toHaveBeenLastCalledWith("user@mail.com", "Password1!", undefined);
    submit();
    expect(login).toHaveBeenCalledTimes(1);
    expect(checkbox).toHaveFocus();
    expect(checkbox).toHaveAttribute("aria-invalid", "true");
    expect(checkbox.closest(".login-terms")).toHaveClass("login-terms--invalid");
    fireEvent.click(checkbox);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    submit();
    await waitFor(() => expect(login).toHaveBeenLastCalledWith("user@mail.com", "Password1!", undefined, "2026-11-16"));
  });

  it("no acepta una version cuyos documentos no estan cargados", async () => {
    const login = vi.fn().mockResolvedValue({ ...challenge, currentTermsVersion: "2027-01-01" });
    vi.mocked(useAuth).mockReturnValue({ login, loading: false } as unknown as ReturnType<typeof useAuth>);
    render(<MemoryRouter><LoginPage /></MemoryRouter>);
    fillCredentials(); submit();
    fireEvent.click(await screen.findByRole("checkbox")); submit();
    expect(screen.getByRole("alert")).toHaveTextContent("Los documentos se actualizaron");
    expect(login).toHaveBeenCalledTimes(1);
  });

  it.each([true, false])("borra la aceptacion al cambiar credenciales con autofill: %s", async (autofill) => {
    const login = vi.fn().mockResolvedValueOnce(challenge).mockResolvedValueOnce({ requiresOrganizationSelection: true });
    vi.mocked(useAuth).mockReturnValue({ login, loading: false } as unknown as ReturnType<typeof useAuth>);
    render(<MemoryRouter><LoginPage /></MemoryRouter>);
    fillCredentials(); submit();
    const checkbox = await screen.findByRole("checkbox");
    submit(); expect(screen.getByRole("alert")).toBeInTheDocument();
    fireEvent.click(checkbox);
    if (autofill) (screen.getByLabelText("Correo") as HTMLInputElement).value = "other@mail.com";
    else fireEvent.change(screen.getByLabelText("Correo"), { target: { value: "other@mail.com" } });
    submit();
    await waitFor(() => expect(login).toHaveBeenLastCalledWith("other@mail.com", "Password1!", undefined));
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("permite consultar documentos pendientes y restaura el foco", async () => {
    vi.mocked(useAuth).mockReturnValue({ login: vi.fn().mockResolvedValue(challenge), loading: false } as unknown as ReturnType<typeof useAuth>);
    render(<MemoryRouter><LoginPage /></MemoryRouter>);
    fillCredentials(); submit();
    await screen.findByRole("checkbox");
    const terms = screen.getByRole("link", { name: /condiciones/ }); terms.focus(); fireEvent.click(terms);
    expect(screen.getByRole("dialog")).toHaveAccessibleName(/condiciones de uso/);
    expect(screen.getByText(/8. Aceptaci/)).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" }); expect(terms).toHaveFocus();
    fireEvent.click(screen.getByRole("link", { name: /privacidad/ }));
    expect(screen.getByText(/Victor Javier Vivas/)).toBeInTheDocument();
    expect(screen.getByText(/victorjaviervivas@gmail.com/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cerrar documento" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  const fillWithoutEvents = (correo: string, password: string) => {
    (screen.getByLabelText("Correo") as HTMLInputElement).value = correo;
    (screen.getByLabelText("Contraseña") as HTMLInputElement).value = password;
  };

  it("identifica las credenciales con atributos estándar y estables", () => {
    vi.mocked(useAuth).mockReturnValue({ login: vi.fn(), loading: false } as unknown as ReturnType<typeof useAuth>);
    render(<MemoryRouter><LoginPage /></MemoryRouter>);
    const correo = screen.getByLabelText("Correo");
    const password = screen.getByLabelText("Contraseña");
    expect(correo).toHaveAttribute("type", "email");
    expect(correo).toHaveAttribute("autocomplete", "username");
    expect(correo).toHaveAttribute("name", "correo");
    expect(correo).toHaveAttribute("id", "login-correo");
    expect(password).toHaveAttribute("autocomplete", "current-password");
    expect(password).toHaveAttribute("name", "password");
    expect(password).toHaveAttribute("id", "login-password");
    expect(correo.closest("form")).toBe(password.closest("form"));
  });

  it("envía y sincroniza credenciales sin onChange y conserva la selección de curso", async () => {
    const login = vi.fn().mockResolvedValue({
      requiresOrganizationSelection: true,
      organizationOptions: [{ id: 4, name: "4A", slug: "4a" }, { id: 5, name: "5A", slug: "5a" }],
    });
    vi.mocked(useAuth).mockReturnValue({ login, loading: false } as unknown as ReturnType<typeof useAuth>);
    render(<MemoryRouter><LoginPage /></MemoryRouter>);
    fillWithoutEvents("user@mail.com", " Password1! ");
    fireEvent.click(screen.getByRole("button", { name: "Ingresar" }));
    const select = await screen.findByLabelText("Selecciona el curso");
    expect(login).toHaveBeenLastCalledWith("user@mail.com", " Password1! ", undefined);
    expect(screen.getByLabelText("Correo")).toHaveValue("user@mail.com");
    expect(screen.getByLabelText("Contraseña")).toHaveValue(" Password1! ");
    fireEvent.click(screen.getByRole("button", { name: "Mostrar contraseña" }));
    expect(screen.getByLabelText("Contraseña")).toHaveValue(" Password1! ");
    fireEvent.change(select, { target: { value: "5" } });
    fireEvent.click(screen.getByRole("button", { name: "Ingresar" }));
    await waitFor(() => expect(login).toHaveBeenLastCalledWith("user@mail.com", " Password1! ", 5));
    await waitFor(() => expect(screen.getByRole("button", { name: "Ingresar" })).toBeEnabled());
    fillWithoutEvents("another@mail.com", "OtherPassword2!");
    fireEvent.click(screen.getByRole("button", { name: "Ingresar" }));
    await waitFor(() => expect(login).toHaveBeenLastCalledWith("another@mail.com", "OtherPassword2!", undefined));
    await waitFor(() => expect(screen.getByRole("button", { name: "Ingresar" })).toBeEnabled());
  });

  it("valida los valores reales autocompletados aunque el estado anterior sea válido", () => {
    const login = vi.fn();
    vi.mocked(useAuth).mockReturnValue({ login, loading: false } as unknown as ReturnType<typeof useAuth>);
    render(<MemoryRouter><LoginPage /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText("Correo"), { target: { value: "user@mail.com" } });
    fireEvent.change(screen.getByLabelText("Contraseña"), { target: { value: "Password1!" } });
    fillWithoutEvents("invalid", "1234");
    fireEvent.click(screen.getByRole("button", { name: "Ingresar" }));
    expect(screen.getByText("Ingrese un correo válido")).toBeInTheDocument();
    expect(screen.getByText(/Use 8 caracteres/)).toBeInTheDocument();
    expect(screen.getByLabelText("Correo")).toHaveValue("invalid");
    expect(screen.getByLabelText("Contraseña")).toHaveValue("1234");
    expect(login).not.toHaveBeenCalled();
  });

  it("informa el alta por invitación sin ofrecer autoinscripción", () => {
    vi.mocked(useAuth).mockReturnValue({ login: vi.fn(), loading: false } as unknown as ReturnType<typeof useAuth>);
    render(<MemoryRouter><LoginPage /></MemoryRouter>);
    expect(screen.queryByRole("button", { name: "Registrarme" })).not.toBeInTheDocument();
    expect(screen.getByText("El acceso se habilita mediante una invitación enviada por la administración."))
      .toBeInTheDocument();
  });

  it("[LoginPage #02] muestra y oculta la contraseña", () => {
    vi.mocked(useAuth).mockReturnValue({
      login: vi.fn(),
      loading: false,
    } as unknown as ReturnType<typeof useAuth>);

    render(<MemoryRouter><LoginPage /></MemoryRouter>);
    const password = screen.getByLabelText("Contraseña");

    expect(password).toHaveAttribute("type", "password");
    fireEvent.click(screen.getByRole("button", { name: "Mostrar contraseña" }));
    expect(password).toHaveAttribute("type", "text");
    fireEvent.click(screen.getByRole("button", { name: "Ocultar contraseña" }));
    expect(password).toHaveAttribute("type", "password");
  });

  it("[LoginPage #03] muestra errores debajo de campos inválidos y no inicia sesión", () => {
    const login = vi.fn();
    vi.mocked(useAuth).mockReturnValue({
      login,
      loading: false,
    } as unknown as ReturnType<typeof useAuth>);

    render(<MemoryRouter><LoginPage /></MemoryRouter>);
    const correo = screen.getByLabelText("Correo");
    const password = screen.getByLabelText("Contraseña");
    fireEvent.change(correo, { target: { value: "correo-invalido" } });
    fireEvent.change(password, { target: { value: "1234" } });
    fireEvent.click(screen.getByRole("button", { name: "Ingresar" }));

    expect(screen.getByText("Ingrese un correo válido")).toBeInTheDocument();
    expect(screen.getByText(/Use 8 caracteres/)).toBeInTheDocument();
    expect(correo).toHaveAttribute("aria-invalid", "true");
    expect(password).toHaveAttribute("aria-invalid", "true");
    expect(login).not.toHaveBeenCalled();
  });

  it("[LoginPage #04] muestra ejemplos y permite volver al inicio", () => {
    vi.mocked(useAuth).mockReturnValue({
      login: vi.fn(),
      loading: false,
    } as unknown as ReturnType<typeof useAuth>);

    render(
      <MemoryRouter initialEntries={["/", "/login"]} initialIndex={1}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<h1>Página de inicio</h1>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByLabelText("Correo")).toHaveAttribute(
      "placeholder", "Ej.: nombre@correo.cl");
    expect(screen.getByLabelText("Contraseña")).toHaveAttribute(
      "placeholder", "Ej.: ClaveSegura1!");
    fireEvent.click(screen.getByRole("button", { name: "Volver" }));
    expect(screen.getByRole("heading", { name: "Página de inicio" })).toBeInTheDocument();
  });

  it("[LoginPage #05] informa el bloqueo temporal devuelto por el backend", async () => {
    const login = vi.fn().mockRejectedValue(new AxiosError(
      "Too Many Requests",
      "429",
      undefined,
      undefined,
      {
        status: 429,
        statusText: "Too Many Requests",
        headers: {},
        config: { headers: {} },
        data: {
          errors: {
            correo: "Demasiados intentos fallidos. Intente nuevamente en 1 minuto",
          },
        },
      },
    ));
    vi.mocked(useAuth).mockReturnValue({
      login,
      loading: false,
    } as unknown as ReturnType<typeof useAuth>);

    render(<MemoryRouter><LoginPage /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText("Correo"), {
      target: { value: "user@mail.com" },
    });
    fireEvent.change(screen.getByLabelText("Contraseña"), {
      target: { value: "Password1!" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Ingresar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Demasiados intentos fallidos. Intente nuevamente en 1 minuto",
    );
  });

  it("[LoginPage #06] distingue un timeout de credenciales inválidas", async () => {
    const login = vi.fn().mockRejectedValue(new AxiosError(
      "timeout of 30000ms exceeded",
      "ECONNABORTED",
    ));
    vi.mocked(useAuth).mockReturnValue({
      login,
      loading: false,
    } as unknown as ReturnType<typeof useAuth>);

    render(<MemoryRouter><LoginPage /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText("Correo"), {
      target: { value: "user@mail.com" },
    });
    fireEvent.change(screen.getByLabelText("Contraseña"), {
      target: { value: "Password1!" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Ingresar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "El servidor tardó demasiado en responder",
    );
  });

  it.each(["token-guardado", null])("[LoginPage #07] muestra el formulario sin permitir ingreso mientras restaura la sesión (token: %s)", (token) => {
    vi.mocked(useAuth).mockReturnValue({
      login: vi.fn(),
      token,
      loading: true,
      isAuthenticated: false,
    } as unknown as ReturnType<typeof useAuth>);

    render(<MemoryRouter><LoginPage /></MemoryRouter>);

    expect(screen.getByRole("heading", { name: "Iniciar sesión" })).toBeInTheDocument();
    expect(screen.getByLabelText("Correo")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ingresar" })).toBeDisabled();
  });

  it("[LoginPage #08] muestra la selección de curso después de la contraseña", async () => {
    const login = vi.fn().mockResolvedValue({
      token: null,
      tokenType: "Bearer",
      expiresIn: 0,
      user: null,
      requiresOrganizationSelection: true,
      organizationOptions: [
        { id: 4, name: "4A", slug: "4a" },
        { id: 5, name: "5A", slug: "5a" },
      ],
    });
    vi.mocked(useAuth).mockReturnValue({
      login,
      loading: false,
    } as unknown as ReturnType<typeof useAuth>);

    render(<MemoryRouter><LoginPage /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText("Correo"), {
      target: { value: "user@mail.com" },
    });
    fireEvent.change(screen.getByLabelText("Contraseña"), {
      target: { value: "Password1!" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Ingresar" }));

    const password = screen.getByLabelText("Contraseña");
    const courseSelect = await screen.findByLabelText("Selecciona el curso");
    expect(courseSelect.compareDocumentPosition(password)).toBe(Node.DOCUMENT_POSITION_PRECEDING);
    expect(courseSelect).toHaveValue("4");
    fireEvent.change(courseSelect, { target: { value: "5" } });
    fireEvent.click(screen.getByRole("button", { name: "Ingresar" }));
    await waitFor(() => expect(login).toHaveBeenLastCalledWith("user@mail.com", "Password1!", 5));
    await waitFor(() => expect(screen.getByRole("button", { name: "Ingresar" })).toBeEnabled());
    fireEvent.change(screen.getByLabelText("Correo"), { target: { value: "otra@mail.com" } });
    expect(screen.queryByLabelText("Selecciona el curso")).not.toBeInTheDocument();
  });

  it.each(["/dashboard", "/login"])("conserva el destino solicitado al ingresar desde %s", async (from) => {
    vi.mocked(useAuth).mockReturnValue({
      login: vi.fn().mockResolvedValue({ requiresOrganizationSelection: false }),
      loading: false,
    } as unknown as ReturnType<typeof useAuth>);
    render(<MemoryRouter initialEntries={[{ pathname: "/login", state: { from } }]}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<h1>Panel privado</h1>} />
        <Route path="/" element={<h1>Inicio del curso</h1>} />
      </Routes>
    </MemoryRouter>);
    fireEvent.change(screen.getByLabelText("Correo"), { target: { value: "user@mail.com" } });
    fireEvent.change(screen.getByLabelText("Contraseña"), { target: { value: "Password1!" } });
    fireEvent.click(screen.getByRole("button", { name: "Ingresar" }));
    expect(await screen.findByRole("heading", {
      name: from === "/login" ? "Inicio del curso" : "Panel privado",
    })).toBeInTheDocument();
  });
});

it("shows password requirements and updates checks while keeping validation", () => {
  const login = vi.fn();
  vi.mocked(useAuth).mockReturnValue({ login, loading: false } as unknown as ReturnType<typeof useAuth>);
  render(<MemoryRouter><LoginPage /></MemoryRouter>);
  expect(screen.getByText(/Fortaleza orientativa/)).toBeInTheDocument();
  const requirements = screen.getByRole("list", { name: "Condiciones de la contraseña" });
  expect(requirements.querySelectorAll(".is-met")).toHaveLength(0);
  fireEvent.click(screen.getByRole("button", { name: "Ingresar" }));
  expect(screen.getByLabelText("Correo")).toHaveFocus();
  expect(screen.getByLabelText("Contraseña")).toHaveAccessibleDescription(expect.stringContaining("Use 8 caracteres, mayúscula, minúscula, número y especial"));
  expect(login).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText("Contraseña"), { target: { value: "Password1!" } });
  expect(requirements.querySelectorAll(".is-met")).toHaveLength(5);
  expect(screen.getByText("Fuerte")).toBeInTheDocument();
});
