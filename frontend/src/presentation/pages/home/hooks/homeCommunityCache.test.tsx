import { useEffect, useSyncExternalStore } from "react";
import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { homeCommunityCache } from "./homeCommunityCache";
import { notifyHomeCommunityChanged, resetHomeCommunity } from "@/shared/community/homeCommunityEvents";

const api = vi.hoisted(() => ({ sections: vi.fn(), board: vi.fn(), photos: vi.fn(), image: vi.fn() }));
vi.mock("@/core/C-infra/repositories/community/AboutSectionRepositoryImpl", () => ({
  AboutSectionRepositoryImpl: class { publicList = api.sections; },
}));
vi.mock("@/core/C-infra/repositories/community/CoursePhotoRepository", () => ({
  coursePhotos: { list: api.photos, loadImageUrl: api.image },
}));
vi.mock("@/core/C-infra/repositories/community/CourseBoardRepository", () => ({
  courseBoard: { list: api.board },
}));
const section = { id: 1, title: "Nuestro curso" };
const photo = { id: 1, caption: "Paseo", imageUrl: "/gallery/1/image", displayOrder: 0 };

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-21T12:00:00Z"));
  vi.clearAllMocks();
  api.sections.mockResolvedValue([section]);
  api.board.mockResolvedValue([{ id: 1, nombre: "Directiva" }]);
  api.photos.mockResolvedValue([photo]);
  api.image.mockResolvedValue("blob:photo");
  vi.stubGlobal("Image", class {
    naturalWidth = 1600;
    naturalHeight = 1000;
    onload?: () => void;
    set src(_url: string) { this.onload?.(); }
  });
  vi.stubGlobal("URL", class extends URL { static revokeObjectURL = vi.fn(); });
  homeCommunityCache.clear();
});
afterEach(() => { act(() => homeCommunityCache.clear()); vi.unstubAllGlobals(); vi.useRealTimers(); });

function HomeProbe() {
  const state = useSyncExternalStore(homeCommunityCache.subscribe, homeCommunityCache.getSnapshot);
  useEffect(() => { void homeCommunityCache.load(); }, []);
  return <div>{!state.ready ? "Preparando inicio" : state.sections.map(item => item.title).join()}
    {state.photos.map(item => <img key={item.id} src={item.url} alt={item.caption ?? "Foto"} />)}</div>;
}

it("conserva textos, directiva e imágenes al salir y volver sin repetir peticiones ni skeleton", async () => {
  const first = render(<HomeProbe />);
  await act(async () => { await homeCommunityCache.load(); });
  first.unmount();
  render(<HomeProbe />);
  expect(screen.queryByText("Preparando inicio")).not.toBeInTheDocument();
  expect(screen.getByText("Nuestro curso")).toBeInTheDocument();
  expect(screen.getByAltText("Paseo")).toHaveAttribute("src", "blob:photo");
  expect(homeCommunityCache.getSnapshot().board[0].nombre).toBe("Directiva");
  for (const request of Object.values(api)) expect(request).toHaveBeenCalledTimes(1);
  expect(URL.revokeObjectURL).not.toHaveBeenCalled();
});

it("comparte la carga pendiente entre montajes simultáneos", async () => {
  const first = homeCommunityCache.load();
  expect(homeCommunityCache.load()).toBe(first);
  await first;
  expect(api.sections).toHaveBeenCalledTimes(1);
  expect(api.image).toHaveBeenCalledTimes(1);
});

it("actualiza datos vencidos en segundo plano y reutiliza las fotos que no cambiaron", async () => {
  await homeCommunityCache.load();
  vi.advanceTimersByTime(60_001);
  api.sections.mockResolvedValue([{ ...section, title: "Curso actualizado" }]);
  const request = homeCommunityCache.load();
  expect(homeCommunityCache.getSnapshot().ready).toBe(true);
  expect(homeCommunityCache.getSnapshot().sections[0].title).toBe("Nuestro curso");
  await request;
  expect(homeCommunityCache.getSnapshot().sections[0].title).toBe("Curso actualizado");
  expect(api.sections).toHaveBeenCalledTimes(2);
  expect(api.image).toHaveBeenCalledTimes(1);
});

it("comprueba los cambios administrativos al regresar aunque la caché siga vigente", async () => {
  await homeCommunityCache.load();
  notifyHomeCommunityChanged();
  api.photos.mockResolvedValue([{ ...photo, caption: "Nueva descripción" }]);
  await homeCommunityCache.load();
  expect(homeCommunityCache.getSnapshot().photos[0].caption).toBe("Nueva descripción");
  expect(api.sections).toHaveBeenCalledTimes(2);
  expect(api.image).toHaveBeenCalledTimes(1);
});

it("preserva el contenido ante errores y permite reintentar sin guardar el fallo como datos frescos", async () => {
  await homeCommunityCache.load();
  notifyHomeCommunityChanged();
  api.sections.mockRejectedValueOnce(new Error("Offline"));
  api.photos.mockRejectedValueOnce(new Error("Offline"));
  await homeCommunityCache.load();
  expect(homeCommunityCache.getSnapshot().sections[0].title).toBe("Nuestro curso");
  expect(homeCommunityCache.getSnapshot().photos[0].url).toBe("blob:photo");
  await homeCommunityCache.load();
  expect(api.sections).toHaveBeenCalledTimes(3);
});

it("libera las fotos al cerrar sesión y descarta respuestas de la sesión anterior", async () => {
  await homeCommunityCache.load();
  notifyHomeCommunityChanged();
  let resolveSections!: (value: typeof section[]) => void;
  api.sections.mockImplementationOnce(() => new Promise(resolve => { resolveSections = resolve; }));
  const pending = homeCommunityCache.load();
  resetHomeCommunity();
  expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:photo");
  resolveSections([{ ...section, title: "Sesión anterior" }]);
  await pending;
  expect(homeCommunityCache.getSnapshot().sections).toEqual([]);
  expect(homeCommunityCache.getSnapshot().photos).toEqual([]);
  await homeCommunityCache.load();
  expect(api.image).toHaveBeenCalledTimes(2);
});

it("libera las fotos eliminadas después de actualizar la galería", async () => {
  await homeCommunityCache.load();
  notifyHomeCommunityChanged();
  api.photos.mockResolvedValue([]);
  await homeCommunityCache.load();
  expect(homeCommunityCache.getSnapshot().photos).toEqual([]);
  expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:photo");
});

it("prepara el Home con la primera foto sin esperar las demás", async () => {
  const second = { ...photo, id: 2, imageUrl: "/gallery/2/image" };
  api.photos.mockResolvedValue([photo, second]);
  let resolveFirst!: (url: string) => void;
  let resolveSecond!: (url: string) => void;
  api.image.mockImplementation((item: typeof photo) => new Promise(resolve => {
    if (item.id === 1) resolveFirst = resolve; else resolveSecond = resolve;
  }));
  const request = homeCommunityCache.load();
  await vi.waitFor(() => expect(api.image).toHaveBeenCalledTimes(1));
  expect(homeCommunityCache.getSnapshot().ready).toBe(false);
  resolveFirst("blob:first");
  await vi.waitFor(() => expect(homeCommunityCache.getSnapshot().ready).toBe(true));
  expect(homeCommunityCache.getSnapshot().sections[0].title).toBe("Nuestro curso");
  expect(homeCommunityCache.getSnapshot().photos.map(item => item.url)).toEqual(["blob:first"]);
  resolveSecond("blob:second");
  await request;
  expect(homeCommunityCache.getSnapshot().photos).toHaveLength(2);
});

it("ofrece reintento si los datos iniciales fallan, sin presentar un Home vacío", async () => {
  api.board.mockRejectedValueOnce(new Error("Offline"));
  await homeCommunityCache.load();
  expect(homeCommunityCache.getSnapshot().ready).toBe(false);
  expect(homeCommunityCache.getSnapshot().error).not.toBe("");
  await homeCommunityCache.load();
  expect(homeCommunityCache.getSnapshot().ready).toBe(true);
  expect(homeCommunityCache.getSnapshot().error).toBe("");
});

it("permite reintentar la primera imagen si falla y no bloquea por una galería vacía", async () => {
  api.image.mockRejectedValueOnce(new Error("Photo unavailable"));
  await homeCommunityCache.load();
  expect(homeCommunityCache.getSnapshot().ready).toBe(false);
  expect(homeCommunityCache.getSnapshot().error).not.toBe("");
  api.photos.mockResolvedValue([]);
  await homeCommunityCache.load();
  expect(homeCommunityCache.getSnapshot().ready).toBe(true);
  expect(homeCommunityCache.getSnapshot().photos).toEqual([]);
});
