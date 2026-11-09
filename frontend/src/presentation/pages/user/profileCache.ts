import type { TreasuryProfile } from "@/core/A-domain/entities/treasury/Treasury";
import { TreasuryRepositoryImpl } from "@/core/C-infra/repositories/treasury/TreasuryRepositoryImpl";
import { DASHBOARD_RESET } from "@/shared/treasury/dashboardEvents";
import { createDashboardResource } from "@/presentation/pages/dashboard/dashboardCache";
import { apiClient } from "@/core/D-config/api";

const repository = new TreasuryRepositoryImpl();
const resources = new Map<string, ReturnType<typeof createDashboardResource<TreasuryProfile>>>();

export const getProfileResource = (account: string, year: number) => {
  const key = `${account}:${year}`;
  if (!resources.has(key)) {
    resources.set(key, createDashboardResource(() => repository.profile(year)));
  }
  return resources.get(key)!;
};

export const clearProfileCache = () => {
  resources.forEach(resource => resource.clear());
  resources.clear();
};

window.addEventListener(DASHBOARD_RESET, clearProfileCache);
apiClient.interceptors.response.use(response => {
  if (['post', 'put', 'patch', 'delete'].includes(response.config.method?.toLowerCase() ?? '')
    && /\/tesoreria\/recaudaciones(\/|$)/.test(response.config.url ?? '')) {
    resources.forEach(resource => resource.invalidate());
  }
  return response;
});
