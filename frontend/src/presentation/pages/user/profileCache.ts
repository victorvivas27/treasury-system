import type { TreasuryProfile } from "@/core/A-domain/entities/treasury/Treasury";
import { TreasuryRepositoryImpl } from "@/core/C-infra/repositories/treasury/TreasuryRepositoryImpl";
import { DASHBOARD_RESET } from "@/shared/treasury/dashboardEvents";
import { createDashboardResource } from "@/presentation/pages/dashboard/dashboardCache";

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
