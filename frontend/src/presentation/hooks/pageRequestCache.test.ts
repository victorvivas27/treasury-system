import { beforeEach, expect, it, vi } from 'vitest';
import { clearPageRequests, PAGE_DATA_FRESH_MS, readPageRequest } from './pageRequestCache';
import { resetHomeCommunity } from '@/shared/community/homeCommunityEvents';
import { apiClient } from '@/core/D-config/api';

beforeEach(() => { clearPageRequests(); vi.restoreAllMocks(); });

it('reuses empty results and shares concurrent requests across visits', async () => {
  const fetch = vi.fn().mockResolvedValue([]);
  const first = readPageRequest('guardians:0', fetch);
  const second = readPageRequest('guardians:0', fetch);
  expect(first).toBe(second);
  await first;
  expect(await readPageRequest('guardians:0', fetch)).toEqual([]);
  expect(fetch).toHaveBeenCalledTimes(1);
});

it('separates pages and searches and refreshes expired or explicitly requested data', async () => {
  const clock = vi.spyOn(Date, 'now').mockReturnValue(1000);
  const fetch = vi.fn().mockResolvedValue([1]);
  await readPageRequest('students:0:ana', fetch);
  await readPageRequest('students:1:ana', fetch);
  await readPageRequest('students:0:juan', fetch);
  expect(fetch).toHaveBeenCalledTimes(3);
  clock.mockReturnValue(1000 + PAGE_DATA_FRESH_MS);
  await readPageRequest('students:0:ana', fetch);
  await readPageRequest('students:0:ana', fetch, true);
  expect(fetch).toHaveBeenCalledTimes(5);
});

it('retries failures instead of caching them', async () => {
  const fetch = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue([2]);
  await expect(readPageRequest('users', fetch)).rejects.toThrow('offline');
  expect(await readPageRequest('users', fetch)).toEqual([2]);
});

it('invalidates on saved changes and prevents late reads from restoring an old session', async () => {
  let resolve!: (value: number[]) => void;
  const old = readPageRequest('families', () => new Promise<number[]>(done => { resolve = done; }));
  await Promise.resolve();
  resetHomeCommunity();
  resolve([1]);
  await old;
  const fetch = vi.fn().mockResolvedValue([2]);
  expect(await readPageRequest('families', fetch)).toEqual([2]);
  await apiClient.put('/familias/1', {}, {
    adapter: async config => ({ config, data: {}, status: 200, statusText: 'OK', headers: {} }),
  });
  await readPageRequest('families', fetch);
  expect(fetch).toHaveBeenCalledTimes(2);
});
