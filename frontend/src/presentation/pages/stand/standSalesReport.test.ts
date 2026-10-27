import { describe, expect, it, vi } from "vitest";
import type { Stand, StandSale } from "@/core/A-domain/entities/stand/Stand";
import { buildStandSalesReport, printStandSalesReport } from "./standSalesReport";

describe("stand sales report", () => {
  it("imprime un documento independiente sin acceso al opener", () => {
    const doc = document.implementation.createHTMLDocument();
    const print = vi.fn();
    const popup = { document: doc, opener: window, print, focus: vi.fn() };
    const open = vi.spyOn(window, "open").mockReturnValue(popup as unknown as Window);
    try {
      printStandSalesReport({ name: "Stand", eventName: "Evento", date: "2026-10-27", responsible: "Directiva" } as Stand, []);
      expect(popup.opener).toBeNull();
      expect(doc.querySelector("style")).not.toBeNull();
      expect(doc.querySelector("script")).toBeNull();
      doc.getElementById("save-pdf")!.click();
      expect(print).toHaveBeenCalledTimes(2);
    } finally { open.mockRestore(); }
  });
  it("escapa atributos, etiquetas y texto en los campos editables sin crear elementos ejecutables", () => {
    const attack = '"><img src=x onerror=alert(1)><script>alert(2)</script>&';
    const stand = { name: attack, eventName: attack, date: "2026-10-27", responsible: attack } as Stand;
    const sales = [{ id: 1, soldAt: "2026-10-27T10:00:00Z", total: 1000, status: "CANCELLED",
      paymentMethod: "CASH", registeredBy: attack, observation: attack, cancellationReason: attack,
      items: [{ quantity: 1, productName: attack, variant: attack, unitPrice: 1000, subtotal: 1000 }],
    }] as StandSale[];
    const html = new DOMParser().parseFromString(buildStandSalesReport(stand, sales), "text/html");
    expect(html.querySelectorAll("script, img, [onerror]")).toHaveLength(0);
    expect(html.body.textContent).toContain(attack);
  });
  it("exporta todo el historial, ordena ventas y excluye anuladas del total", () => {
    const stand = { name: "La Risa Pizza", eventName: "Fiesta de la Familia",
      date: "2026-09-07", responsible: "Directiva" } as Stand;
    const sales = Array.from({ length: 15 }, (_, index) => ({
      id: index + 1, soldAt: `2026-09-07T10:${String(index).padStart(2, "0")}:00`,
      total: 1000, status: index === 0 ? "CANCELLED" : "ACTIVE", paymentMethod: "CASH",
      registeredBy: "Tesorería", cancellationReason: "Duplicada",
      items: [{ quantity: 1, productName: "Pizza <script>alert(1)</script>",
        unitPrice: 1000, subtotal: 1000 }],
    })) as StandSale[];
    const html = buildStandSalesReport(stand, sales, new Date("2026-09-07T15:00:00Z"));
    const document = new DOMParser().parseFromString(html, "text/html");
    expect(document.querySelectorAll("tbody tr")).toHaveLength(15);
    expect(document.querySelector("tbody tr")?.textContent).toContain("#15");
    expect(document.querySelector(".totals")?.textContent).toContain("$14.000");
    expect(document.body.textContent).toContain("Anulada: Duplicada");
    expect(document.querySelector("script")).toBeNull();
    expect(document.body.textContent).toContain("Pizza <script>alert(1)</script>");
    expect(document.body.textContent).toContain("Fiesta de la Familia");
    expect(document.body.textContent).toContain("Historial completo del stand · 15 registros");
  });
});
