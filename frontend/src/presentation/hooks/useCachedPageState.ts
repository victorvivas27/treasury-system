import { useCallback, useState, type Dispatch, type SetStateAction } from 'react';
import { HOME_COMMUNITY_RESET } from '@/shared/community/homeCommunityEvents';
import { apiClient } from '@/core/D-config/api';

// Keep server results with their list filters: never passwords, form drafts, dialogs or pending actions.
const snapshots = new Map<string, unknown>();
let session = 0;
export const hasPageData = (...keys: string[]) => keys.every(key => snapshots.has(key));
export const readPageData = <T,>(key: string) => snapshots.get(key) as T | undefined;
export const pageDataSession = () => session;
export const storePageData = <T,>(key: string, value: T, expectedSession = session) => {
  if (session === expectedSession) snapshots.set(key, value);
};
export const forgetPageData = (key: string, expectedSession = session) => {
  if (session === expectedSession) snapshots.delete(key);
};
export const clearPageData = () => { snapshots.clear(); session += 1; };
window.addEventListener(HOME_COMMUNITY_RESET, clearPageData);
apiClient.interceptors.response.use(response => {
  if (['post', 'put', 'patch', 'delete'].includes(response.config.method?.toLowerCase() ?? '')
    && !/\/auth\//.test(response.config.url ?? '')) snapshots.clear();
  return response;
});

export function useCachedPageState<T>(key: string, initial: T | (() => T)): [T, Dispatch<SetStateAction<T>>] {
  const [entry, setEntry] = useState(() => ({ key, session, value: snapshots.has(key)
    ? snapshots.get(key) as T : typeof initial === 'function' ? (initial as () => T)() : initial }));
  const active = entry.key === key && entry.session === session;
  if (!active) setEntry({ key, session, value: snapshots.has(key) ? snapshots.get(key) as T
    : typeof initial === 'function' ? (initial as () => T)() : initial });
  const setValue = useCallback<Dispatch<SetStateAction<T>>>(next => {
    const requestSession = entry.session;
    if (requestSession !== session) return;
    setEntry(current => {
      if (current.key !== key || current.session !== requestSession) return current;
      const value = typeof next === 'function' ? (next as (value: T) => T)(current.value) : next;
      snapshots.set(key, value);
      // Bound memory during long sessions with many filters and route parameters.
      if (snapshots.size > 512) snapshots.delete(snapshots.keys().next().value!);
      return { ...current, value };
    });
  }, [key, entry.session]);
  return [entry.value, setValue];
}
