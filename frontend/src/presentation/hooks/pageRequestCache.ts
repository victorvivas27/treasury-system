import { HOME_COMMUNITY_RESET } from '@/shared/community/homeCommunityEvents';
import { apiClient } from '@/core/D-config/api';

export const PAGE_DATA_FRESH_MS = 60_000;
const requests = new Map<string, { value?: unknown; updatedAt?: number; pending?: Promise<unknown> }>();
export const clearPageRequests = () => requests.clear();
window.addEventListener(HOME_COMMUNITY_RESET, clearPageRequests);
apiClient.interceptors.response.use(response => {
  if (['post', 'put', 'patch', 'delete'].includes(response.config.method?.toLowerCase() ?? '')
    && !/\/auth\//.test(response.config.url ?? '')) clearPageRequests();
  return response;
});

// Share pending reads and reuse recent results, including empty lists.
export function readPageRequest<T>(key: string, fetchData: () => Promise<T>, force = false): Promise<T> {
  const existing = requests.get(key);
  if (existing?.pending) return existing.pending as Promise<T>;
  if (!force && existing?.updatedAt !== undefined && Date.now() - existing.updatedAt < PAGE_DATA_FRESH_MS) {
    return Promise.resolve(existing.value as T);
  }
  const entry: { value?: unknown; updatedAt?: number; pending?: Promise<unknown> } = {};
  requests.set(key, entry);
  entry.pending = Promise.resolve().then(fetchData).then(value => {
    if (requests.get(key) === entry) {
      entry.value = value;
      entry.updatedAt = Date.now();
    }
    return value;
  }).finally(() => {
    if (entry.updatedAt === undefined && requests.get(key) === entry) requests.delete(key);
    entry.pending = undefined;
  });
  if (requests.size > 128) requests.delete(requests.keys().next().value!);
  return entry.pending as Promise<T>;
}
