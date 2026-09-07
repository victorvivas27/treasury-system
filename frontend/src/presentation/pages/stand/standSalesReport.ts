import type { Stand, StandSale } from "@/core/A-domain/entities/stand/Stand";
import { chileDate, chileTime } from "@/shared/date/chileDateTime";

const escapeHtml = (value: unknown) => String(value ?? "").replace(/[&<>"']/g,
  character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
const money = (value: number) => new Intl.NumberFormat("es-CL", {
  style: "currency", currency: "CLP", maximumFractionDigits: 0,
}).format(value);
const methods = { CASH: "Efectivo", DEBIT: "Débito", CREDIT: "Crédito", TRANSFER: "Transferencia", OTHER: "Otro" };

export const buildStandSalesReport = (stand: Stand, sales: StandSale[], issuedAt = new Date()) => {
  const ordered = [...sales].sort((a, b) => b.soldAt.localeCompare(a.soldAt) || b.id - a.id);
  const active = sales.filter(sale => sale.status !== "CANCELLED");
  const total = active.reduce((sum, sale) => sum + sale.total, 0);
  const rows = ordered.map(sale => {
    const date = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(sale.soldAt)
      ? chileDate(new Date(sale.soldAt)) : sale.soldAt.slice(0, 10);
    const notes = [sale.observation,
      sale.status === "CANCELLED" ? `Anulada: ${sale.cancellationReason ?? "Sin motivo registrado"}` : null,
      sale.modifiedAt ? `Modificada: ${sale.modificationReason ?? "Sin motivo registrado"}` : null]
      .filter(Boolean).map(note => `<small>${escapeHtml(note)}</small>`).join("");
    return `<tr><td>#${sale.id}<small>${escapeHtml(date)}<br>${escapeHtml(chileTime(sale.soldAt))}</small></td>
      <td>${sale.items.map(item => `<div>${escapeHtml(item.quantity)} × ${escapeHtml(item.productName)}
        ${item.variant ? `(${escapeHtml(item.variant)})` : ""}
        <small>${money(item.unitPrice)} c/u · ${money(item.subtotal)}</small></div>`).join("")}${notes}</td>
      <td>${methods[sale.paymentMethod]}<small>${escapeHtml(sale.registeredBy)}</small></td>
      <td class="amount">${money(sale.total)}</td>
      <td class="${sale.status === "CANCELLED" ? "cancelled" : ""}">${sale.status === "CANCELLED" ? "Anulada" : "Activa"}</td></tr>`;
  }).join("");
  return `<!doctype html><html lang="es"><head><meta charset="utf-8">
    <title>Historial de ventas - ${escapeHtml(stand.name)} - ${escapeHtml(stand.date)}</title>
    <style>
    @page{size:A4 portrait;margin:14mm}
    *{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#172a38;margin:0;font-size:10px;line-height:1.45}
    main{max-width:900px;margin:auto;padding:24px}header{border-bottom:3px solid #187b77;padding-bottom:14px;margin-bottom:16px}
    h1{font-size:24px;margin:4px 0}h2{font-size:15px;margin:4px 0}p{margin:5px 0}.eyebrow{color:#187b77;font-weight:bold;letter-spacing:1px;text-transform:uppercase}
    .totals{display:flex;gap:24px;background:#eef6f5;padding:12px;margin:16px 0}.totals strong{display:block;font-size:17px}
    table{width:100%;border-collapse:collapse;table-layout:fixed}thead{display:table-header-group}th{background:#eef6f5;text-align:left;font-size:9px;text-transform:uppercase}
    th,td{padding:9px 6px;border-bottom:1px solid #d6e2e2;vertical-align:top;overflow-wrap:anywhere}tr{break-inside:avoid}td>div+div{margin-top:5px}
    small{display:block;color:#53636e;font-size:9px;margin-top:3px}.amount{text-align:right;white-space:nowrap}.cancelled{color:#a02b38;font-weight:bold}
    footer{margin-top:16px;color:#53636e;font-size:9px}.toolbar{padding:12px;background:#eef6f5;text-align:center;font-size:13px}.toolbar button{background:#187b77;color:white;border:0;padding:10px 18px;border-radius:6px;cursor:pointer}
    @media print{.toolbar{display:none}main{padding:0;max-width:none}body{print-color-adjust:exact;-webkit-print-color-adjust:exact}}
    </style></head><body><div class="toolbar"><button id="save-pdf" type="button">Guardar como PDF / Imprimir</button>
    <p>Selecciona “Guardar como PDF” como destino en la ventana de impresión.</p></div>
    <main><header><span class="eyebrow">${escapeHtml(stand.eventName)}</span><h1>Historial de ventas</h1>
    <h2>${escapeHtml(stand.name)}</h2><p>Fecha del stand: ${escapeHtml(stand.date)} · Responsable: ${escapeHtml(stand.responsible)}</p>
    <small>Emitido el ${escapeHtml(chileDate(issuedAt))} a las ${escapeHtml(chileTime(issuedAt.toISOString()))} (Chile)</small></header>
    <div class="totals"><div>Ventas registradas<strong>${sales.length}</strong></div><div>Anuladas<strong>${sales.length - active.length}</strong></div>
    <div>Total de ventas activas<strong>${money(total)}</strong></div></div>
    <p>Más recientes primero. Las ventas anuladas están incluidas en el historial y excluidas del total.</p>
    <table><colgroup><col style="width:16%"><col style="width:40%"><col style="width:17%"><col style="width:15%"><col style="width:12%"></colgroup>
    <thead><tr><th>Venta / fecha</th><th>Productos y observaciones</th><th>Pago / registro</th><th class="amount">Monto</th><th>Estado</th></tr></thead>
    <tbody>${rows || '<tr><td colspan="5">No hay ventas registradas.</td></tr>'}</tbody></table>
    <footer>Historial completo del stand · ${sales.length} registros · Los importes se expresan en pesos chilenos.</footer></main></body></html>`;
};

export const printStandSalesReport = (stand: Stand, sales: StandSale[]) => {
  const report = window.open("", "_blank");
  if (!report) throw new Error("Permite las ventanas emergentes para guardar el historial en PDF.");
  report.opener = null;
  report.document.open();
  report.document.write(buildStandSalesReport(stand, sales));
  report.document.close();
  report.document.getElementById("save-pdf")?.addEventListener("click", () => report.print());
  report.focus();
  report.print();
};
