import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { AxiosAdapter } from 'axios';
import type { User } from '@/core/A-domain/entities/user/User';
import { apiClient } from '@/core/D-config/api';
import { setAccessToken } from '@/core/D-config/axiosInterceptor';
import { resetHomeCommunity } from '@/shared/community/homeCommunityEvents';
import { resetDashboard } from '@/shared/treasury/dashboardEvents';
import { hasPageData, readPageData } from '@/presentation/hooks/useCachedPageState';
import { useAlumnos } from '@/presentation/hooks/alumno/useAlumnos';
import { prepareSessionPages } from './prepareSessionPages';

const original = apiClient.defaults.adapter;
const requests: string[] = [];
const user = { id: 17, rol: 'ADMIN', correo: 'test@example.test' } as User;
let respond: (url: string) => unknown | Promise<unknown>;
beforeEach(() => {
  resetHomeCommunity(); resetDashboard(); requests.length = 0;
  setAccessToken('session-a');
  respond = url => {
    if (url === '/tesoreria/configuracion-general/curso') return { course: '4B', schoolYear: 2026, history: [] };
    if (url === '/academic/schedules/periods') return [{ schoolYear: 2026, editable: true }];
    if (url === '/alumnos' || url === '/apoderados' || url === '/familias' || url === '/users') {
      return { content: [], page: 0, size: 3, totalPages: 0, totalElements: 0 };
    }
    if (/\/academic\/schedules\/\d+/.test(url)) return { days: [] };
    if (url.endsWith('/mis-pagos')) return { schoolYear: 2026, annualAmount: 10000, installments: [] };
    return [];
  };
  const adapter: AxiosAdapter = async config => {
    requests.push(config.url!);
    return { data: await respond(config.url!), status: 200, statusText: 'OK', headers: {}, config };
  };
  apiClient.defaults.adapter = adapter;
});
afterEach(() => {
  apiClient.defaults.adapter = original;
  resetHomeCommunity(); resetDashboard(); setAccessToken(null);
  vi.useRealTimers();
});

it('prepares settings and empty lists before entry and reuses the same request cache on first visit', async () => {
  await prepareSessionPages(user);
  expect(readPageData('configuration:savedCourse')).toBe('4B');
  expect(hasPageData('alumnos:3:0:items', 'alumnos:3:0:totalPages')).toBe(true);
  expect(requests.filter(url => url === '/alumnos')).toHaveLength(1);
  const hook = renderHook(() => useAlumnos());
  expect(hook.result.current.loading).toBe(false);
  await waitFor(() => expect(hook.result.current.refreshing).toBe(false));
  expect(requests.filter(url => url === '/alumnos')).toHaveLength(1);
});
it('does not preload administrator reads for a member', async () => {
  await prepareSessionPages({ ...user, rol: 'USER' });
  expect(requests).toContain('/tesoreria/pagos-transferencia/mis-pagos');
  expect(requests).not.toContain('/users');
  expect(requests).not.toContain('/alumnos');
  expect(requests).not.toContain('/familias');
  expect(requests).not.toContain('/tesoreria/cuotas/page');
});
it('keeps SUPER_ADMIN preparation separate from course financial data', async () => {
  await prepareSessionPages({ ...user, rol: 'SUPER_ADMIN' });
  expect(requests).toContain('/organizations');
  expect(requests.some(url => url.startsWith('/tesoreria/'))).toBe(false);
});
it('ignores delayed data after logout or changing sessions', async () => {
  const previous = respond;
  let release!: () => void;
  respond = url => url === '/alumnos' ? new Promise(resolve => { release = () => resolve({ content: ['old'], page: 0, totalPages: 1, totalElements: 1 }); }) : previous(url);
  const preparing = prepareSessionPages(user);
  await waitFor(() => expect(release).toBeDefined());
  resetHomeCommunity(); resetDashboard(); setAccessToken('session-b');
  release(); await preparing;
  expect(hasPageData('alumnos:3:0:items', 'configuration:savedCourse')).toBe(false);
});
it('discards a prefetch invalidated by a successful edit', async () => {
  const previous = respond;
  let release!: () => void;
  respond = url => url === '/alumnos' ? new Promise(resolve => { release = () => resolve({ content: ['stale'], page: 0, totalPages: 1, totalElements: 1 }); }) : previous(url);
  const preparing = prepareSessionPages(user);
  await waitFor(() => expect(release).toBeDefined());
  await apiClient.patch('/alumnos/AL-TEST/estado', { activo: false });
  release(); await preparing;
  expect(hasPageData('alumnos:3:0:items')).toBe(false);
});
it('bounds preparation time when a secondary page never responds', async () => {
  vi.useFakeTimers(); respond = () => new Promise(() => {});
  const preparing = prepareSessionPages(user);
  await act(async () => { await vi.advanceTimersByTimeAsync(12001); });
  await expect(preparing).resolves.toBeUndefined();
  expect(hasPageData('configuration:savedCourse')).toBe(false);
});
