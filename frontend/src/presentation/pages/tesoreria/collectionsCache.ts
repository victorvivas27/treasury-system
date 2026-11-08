import { CollectionUseCases } from '@/core/B-application/use-cases/treasury/CollectionUseCases';
import { CollectionRepositoryImpl } from '@/core/C-infra/repositories/treasury/CollectionRepositoryImpl';
import { createDashboardResource } from '../dashboard/dashboardCache';
import { apiClient } from '@/core/D-config/api';
import { DASHBOARD_RESET } from '@/shared/treasury/dashboardEvents';
export const collectionUseCases = new CollectionUseCases(new CollectionRepositoryImpl());
export const collectionFamilies = createDashboardResource(() => collectionUseCases.families());
const years = new Map<number, ReturnType<typeof createYear>>();
const createYear = (year: number) => createDashboardResource(() => collectionUseCases.list(year));
export const collectionResource = (year: number) => {
  if (!years.has(year)) years.set(year, createYear(year));
  return years.get(year)!;
};
window.addEventListener(DASHBOARD_RESET, () => {
  years.forEach(resource => resource.clear()); years.clear(); collectionFamilies.clear();
});
apiClient.interceptors.response.use(response => {
  if (['post', 'put', 'patch', 'delete'].includes(response.config.method?.toLowerCase() ?? '')
    && /\/(tesoreria|familias|alumnos|apoderados)(\/|$)/.test(response.config.url ?? '')) {
    years.forEach(resource => resource.invalidate()); collectionFamilies.invalidate();
  }
  return response;
});
