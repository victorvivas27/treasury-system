import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UserAvatar } from "./UserAvatar";
import { loadCachedProfileImage } from "./profileImageCache";

vi.mock("./profileImageCache", () => ({ loadCachedProfileImage: vi.fn() }));

describe("UserAvatar", () => {
  beforeEach(() => { vi.mocked(loadCachedProfileImage).mockReset(); });

  it("mantiene el skeleton durante la descarga y hasta que la imagen se muestra", async () => {
    let resolve!: (url: string) => void;
    vi.mocked(loadCachedProfileImage).mockReturnValue(new Promise(done => { resolve = done; }));
    const { container } = render(<UserAvatar customImageUserId={30} user={{
      nombre: "Ana Pérez", profileImageType: "CUSTOM_IMAGE", profileImageUrl: "version-1",
    }} />);
    const avatar = screen.getByLabelText("Avatar de Ana Pérez");
    expect(avatar).toHaveAttribute("aria-busy", "true");
    expect(container.querySelector(".user-avatar__skeleton")).toBeInTheDocument();
    expect(screen.queryByText("AP")).not.toBeInTheDocument();
    await act(async () => resolve("blob:avatar"));
    expect(avatar).toHaveAttribute("aria-busy", "true");
    fireEvent.load(container.querySelector("img")!);
    expect(container.querySelector("img")).toHaveClass("is-loaded");
    expect(avatar).not.toHaveAttribute("aria-busy");
    expect(loadCachedProfileImage).toHaveBeenCalledWith(expect.objectContaining({
      profileImageType: "CUSTOM_IMAGE",
    }), 30);
  });

  it("muestra iniciales si falla la descarga sin dejar un loader permanente", async () => {
    vi.mocked(loadCachedProfileImage).mockRejectedValue(new Error("imagen no disponible"));
    render(<UserAvatar customImageUserId={30} user={{
      nombre: "Ana Pérez", profileImageType: "CUSTOM_IMAGE", profileImageUrl: "version-1",
    }} />);
    expect(await screen.findByText("AP")).toBeInTheDocument();
    expect(screen.getByLabelText("Avatar de Ana Pérez")).not.toHaveAttribute("aria-busy");
  });

  it("no oculta un avatar ya cargado al volver a renderizarlo", () => {
    const user = { nombre: "Ana Pérez", profileImageType: "PREDEFINED_AVATAR" as const,
      profileImageUrl: "/avatars/ana.png" };
    const { container, rerender } = render(<UserAvatar user={user} />);
    fireEvent.load(container.querySelector("img")!);
    rerender(<UserAvatar user={{ ...user }} />);
    expect(container.querySelector("img")).toHaveClass("is-loaded");
    expect(container.querySelector(".user-avatar__skeleton")).not.toBeInTheDocument();
  });

  it("ignora una descarga anterior cuando cambia la persona", async () => {
    let resolveOld!: (url: string) => void;
    vi.mocked(loadCachedProfileImage).mockReturnValue(new Promise(done => { resolveOld = done; }));
    const { container, rerender } = render(<UserAvatar customImageUserId={30} user={{
      nombre: "Ana Pérez", profileImageType: "CUSTOM_IMAGE", profileImageUrl: "version-1",
    }} />);
    rerender(<UserAvatar user={{ nombre: "Juan Soto", profileImageType: "PREDEFINED_AVATAR",
      profileImageUrl: "/avatars/juan.png" }} />);
    await act(async () => resolveOld("blob:ana"));
    await waitFor(() => expect(container.querySelector("img")).toHaveAttribute("src", "/avatars/juan.png"));
    fireEvent.error(container.querySelector("img")!);
    expect(screen.getByText("JS")).toBeInTheDocument();
  });
});
