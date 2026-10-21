import { NotificationRepositoryImpl } from "@/core/C-infra/repositories/notification/NotificationRepositoryImpl";
import { ApoderadoRepositoryImpl } from "@/core/C-infra/repositories/apoderado/ApoderadoRepositoryImpl";
import { GetApoderadosUseCase } from "@/core/B-application/use-cases/apoderado/list/GetApoderadosUseCase";
import { apiClient } from "@/core/D-config/api";
import { DASHBOARD_RESET } from "@/shared/treasury/dashboardEvents";
import { createDashboardResource } from "../dashboard/dashboardCache";

const repository = new NotificationRepositoryImpl();
const guardians = new GetApoderadosUseCase(new ApoderadoRepositoryImpl());
const createAccount = () => ({
  selection: { contactId: undefined as number | undefined },
  sent: createDashboardResource(() => repository.listSent()),
  contact: createDashboardResource(() => repository.treasuryContact()),
  threads: new Map<number, ReturnType<typeof createThread>>(),
  recipients: new Map<string, ReturnType<typeof createRecipients>>(),
});
const createThread = (id: number) => createDashboardResource(() => repository.listReplies(id));
const createRecipients = (page: number, search: string) => createDashboardResource(() => guardians.execute(page, 20, search));
const accounts = new Map<number, ReturnType<typeof createAccount>>();
export const notificationCache = (id: number) => {
  if (!accounts.has(id)) accounts.set(id, createAccount());
  const account = accounts.get(id)!;
  return {
    sent: account.sent, contact: account.contact, selection: account.selection,
    thread(deliveryId: number) {
      if (!account.threads.has(deliveryId)) account.threads.set(deliveryId, createThread(deliveryId));
      return account.threads.get(deliveryId)!;
    },
    recipients(page: number, search: string) {
      const key = JSON.stringify([page, search]);
      if (!account.recipients.has(key)) account.recipients.set(key, createRecipients(page, search));
      return account.recipients.get(key)!;
    },
  };
};
export const clearNotificationCache = () => {
  accounts.forEach(account => [account.sent, account.contact, ...account.threads.values(), ...account.recipients.values()]
    .forEach(resource => resource.clear()));
  accounts.clear();
};
window.addEventListener(DASHBOARD_RESET, clearNotificationCache);
window.addEventListener("notification-realtime-received", () => {
  accounts.forEach(account => {
    account.sent.invalidate();
    account.threads.forEach(resource => resource.invalidate());
  });
});
apiClient.interceptors.response.use(response => {
  const { method, url = "" } = response.config;
  if (["post", "put", "patch", "delete"].includes(method?.toLowerCase() ?? "")) {
    if (/\/notifications(\/|$)/.test(url) && !url.includes("/push/")) accounts.forEach(account => {
      account.sent.invalidate();
      account.threads.forEach(resource => resource.invalidate());
    });
    if (/\/apoderados(\/|$)/.test(url)) accounts.forEach(account => account.recipients.forEach(resource => resource.invalidate()));
  }
  return response;
});
