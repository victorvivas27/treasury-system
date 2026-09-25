import { toPng } from "html-to-image";
import { afterEach, describe, expect, it, vi } from "vitest";
import { captureElementAsPng, buildDashboardCaptureFileName } from "./captureElement";

vi.mock("html-to-image", () => ({
  toPng: vi.fn(),
}));

const toPngMock = vi.mocked(toPng);

const defineSize = (element: HTMLElement, sizes: {
  clientHeight?: number;
  clientWidth?: number;
  scrollHeight?: number;
  scrollWidth?: number;
}) => {
  Object.entries(sizes).forEach(([key, value]) => {
    Object.defineProperty(element, key, { configurable: true, value });
  });
};

describe("captureElementAsPng", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = "";
  });

  it("oculta acciones excluidas, expande scroll interno en el clon y limpia marcas temporales", async () => {
    const root = document.createElement("section");
    const actions = document.createElement("button");
    const scrollable = document.createElement("div");
    actions.setAttribute("data-dashboard-capture-exclude", "true");
    scrollable.style.overflowY = "auto";
    scrollable.textContent = "Contenido con scroll";
    root.append(actions, scrollable);
    document.body.append(root);

    defineSize(root, { clientHeight: 300, clientWidth: 400, scrollHeight: 900, scrollWidth: 400 });
    defineSize(scrollable, { clientHeight: 80, clientWidth: 200, scrollHeight: 240, scrollWidth: 200 });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);

    let capturedClone: HTMLElement | null = null;
    toPngMock.mockImplementation(async element => {
      capturedClone = element as HTMLElement;
      expect(document.body.contains(capturedClone)).toBe(true);
      return "data:image/png;base64,capture";
    });

    await captureElementAsPng(root, "dashboard-test.png");

    expect(toPngMock).toHaveBeenCalledWith(capturedClone, expect.objectContaining({
      cacheBust: true,
      height: 900,
      width: 400,
    }));
    expect(capturedClone?.querySelector("[data-dashboard-capture-exclude]")).toBeNull();
    expect(capturedClone?.querySelector<HTMLElement>("[data-dashboard-capture-expand]")?.style.overflowY)
      .toBe("visible");
    expect(root.querySelector("[data-dashboard-capture-expand]")).toBeNull();
    expect(capturedClone && document.body.contains(capturedClone)).toBe(false);
  });

  it("fuerza visible el mensaje final del dashboard dentro de la captura", async () => {
    const root = document.createElement("section");
    const message = document.createElement("section");
    const content = document.createElement("div");
    const paragraph = document.createElement("p");
    message.className = "dashboard-board-message dashboard-board-message--whole";
    content.className = "dashboard-board-message__content";
    paragraph.textContent = "Frase final";
    content.style.opacity = "0";
    paragraph.style.opacity = "0";
    content.append(paragraph);
    message.append(content);
    root.append(message);
    document.body.append(root);
    defineSize(root, { clientHeight: 200, clientWidth: 400, scrollHeight: 200, scrollWidth: 400 });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);

    let capturedClone: HTMLElement | null = null;
    toPngMock.mockImplementation(async element => {
      capturedClone = element as HTMLElement;
      return "data:image/png;base64,capture";
    });

    await captureElementAsPng(root, "dashboard-test.png");

    const clonedMessage = capturedClone?.querySelector<HTMLElement>(".dashboard-board-message--whole");
    expect(clonedMessage?.classList.contains("is-visible")).toBe(true);
    expect(clonedMessage?.querySelector<HTMLElement>(".dashboard-board-message__content")?.style.opacity)
      .toBe("1");
    expect(clonedMessage?.querySelector<HTMLElement>("p")?.style.opacity).toBe("1");
  });

  it("genera nombres de archivo con fecha local", () => {
    expect(buildDashboardCaptureFileName(new Date(2026, 8, 23))).toBe("dashboard-2026-09-23.png");
  });
});
