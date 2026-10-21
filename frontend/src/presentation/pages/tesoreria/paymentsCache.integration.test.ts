import { afterEach, beforeEach, expect, it } from "vitest";
import { AxiosError, type AxiosAdapter, type InternalAxiosRequestConfig } from "axios";
import { apiClient } from "@/core/D-config/api";
import { clearAccessToken, clearCsrfToken } from "@/core/D-config/axiosInterceptor";
import { clearPaymentsCache, getPaymentsResource, paymentsSelection, PaymentsLoadError } from "./paymentsCache";
import { resetDashboard } from "@/shared/treasury/dashboardEvents";

const originalAdapter = apiClient.defaults.adapter;
const bank = { id: 1, schoolYear: 2026, accountHolderName: "Curso de prueba", accountHolderRut: "1-9",
  bankName: "Banco de prueba", accountType: "Vista", accountNumber: "123", email: "curso@example.com" };
const mine = { schoolYear: 2026, annualAmount: 70000, totalAmount: 70000, allowedMode: "AMBAS", studentName: "Alumno",
  selectedMode: "ANUAL", paidAmount: 0, installments: [], bankAccount: bank };
let requests: InternalAxiosRequestConfig[];
let respond: (config: InternalAxiosRequestConfig) => unknown;
beforeEach(() => {
  clearPaymentsCache(); clearAccessToken(); clearCsrfToken(); requests = [];
  respond = config => config.url?.endsWith("/cuenta-bancaria") ? bank
    : config.url?.endsWith("/revision") ? [] : mine;
  const adapter: AxiosAdapter = async config => {
    requests.push(config);
    return { data: await respond(config), status: 200, statusText: "OK", headers: {}, config };
  };
  apiClient.defaults.adapter = adapter;
});
afterEach(() => { apiClient.defaults.adapter = originalAdapter; clearPaymentsCache(); });

it("comparte solicitudes pendientes y conserva cuenta y cuotas al volver", async () => {
  const resource = getPaymentsResource(1, false, 2026);
  const first = resource.load();
  expect(resource.load()).toBe(first);
  await first;
  await getPaymentsResource(1, false, 2026).load();
  expect(requests).toHaveLength(2);
  expect(resource.getSnapshot().data?.mine?.studentName).toBe("Alumno");
});

it("separa usuario, rol, año y filtro sin compartir datos de pago", async () => {
  const guardian = getPaymentsResource(1, false, 2026);
  const otherUser = getPaymentsResource(2, false, 2026);
  const otherYear = getPaymentsResource(1, false, 2025);
  const admin = getPaymentsResource(1, true, 2026);
  const filtered = getPaymentsResource(1, true, 2026, "PAID");
  expect(new Set([guardian, otherUser, otherYear, admin, filtered]).size).toBe(5);
  await Promise.all([guardian.load(), admin.load(), filtered.load()]);
  expect(otherUser.getSnapshot().data).toBeUndefined();
  expect(otherYear.getSnapshot().data).toBeUndefined();
  expect(admin.getSnapshot().data?.mine).toBeNull();
  expect(requests.some(request => request.url?.endsWith("/revision") && request.params.status === "PAID")).toBe(true);
});

it("conserva la cuenta cuando falla la carga de cuotas y permite reintentar", async () => {
  let failed = true;
  respond = config => {
    if (config.url?.endsWith("/mis-pagos") && failed) throw new AxiosError("Offline", "ERR_NETWORK", config);
    return config.url?.endsWith("/cuenta-bancaria") ? bank : mine;
  };
  const resource = getPaymentsResource(1, false, 2026);
  await resource.load();
  const failure = resource.getSnapshot().failure as PaymentsLoadError;
  expect(failure.partial.bank).toEqual(bank);
  expect(resource.getSnapshot().data).toBeUndefined();
  failed = false;
  await resource.load();
  expect(resource.getSnapshot().data?.mine?.annualAmount).toBe(70000);
  expect(requests.filter(request => request.url?.endsWith("/cuenta-bancaria"))).toHaveLength(2);
  // The application interceptor retries the first failed GET once before exposing the error.
  expect(requests.filter(request => request.url?.endsWith("/mis-pagos"))).toHaveLength(3);
});

it("no guarda como éxito un historial administrativo que no se pudo consultar", async () => {
  respond = config => {
    if (config.url?.endsWith("/revision")) throw new AxiosError("Offline", "ERR_NETWORK", config);
    return bank;
  };
  const resource = getPaymentsResource(1, true, 2026);
  await resource.load();
  expect(resource.getSnapshot().error).toBe(true);
  expect(resource.getSnapshot().data).toBeUndefined();
  expect((resource.getSnapshot().failure as PaymentsLoadError).partial.bank).toEqual(bank);
});

it("vuelve a consultar después de verificar el retorno de Mercado Pago", async () => {
  const resource = getPaymentsResource(1, false, 2026);
  await resource.load();
  respond = config => config.url?.endsWith("/cuenta-bancaria") ? bank : { ...mine, paidAmount: 70000 };
  await apiClient.post("/tesoreria/pagos/mercado-pago/retorno", { paymentId: "42" });
  await resource.load();
  expect(resource.getSnapshot().data?.mine?.paidAmount).toBe(70000);
  expect(requests.filter(request => request.url?.endsWith("/mis-pagos"))).toHaveLength(2);
});

it("limpia los pagos y sus filtros al cerrar o cambiar de sesión", async () => {
  const resource = getPaymentsResource(1, false, 2026);
  await resource.load();
  paymentsSelection(1, false).set(2026, "PAID");
  resetDashboard();
  expect(resource.getSnapshot().data).toBeUndefined();
  expect(paymentsSelection(1, false).get()).toBeUndefined();
  expect(getPaymentsResource(1, false, 2026)).not.toBe(resource);
});
