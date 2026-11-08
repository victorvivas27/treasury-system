import { act, renderHook } from '@testing-library/react';
import { beforeEach, expect, it } from 'vitest';
import { clearPageData, hasPageData, useCachedPageState } from './useCachedPageState';
import { resetHomeCommunity } from '@/shared/community/homeCommunityEvents';
import { apiClient } from '@/core/D-config/api';

beforeEach(clearPageData);

it('restaura resultados y listas vacías sin confundirlas con una carga pendiente', () => {
  const first = renderHook(() => useCachedPageState<number[]>('items', []));
  expect(hasPageData('items')).toBe(false);
  act(() => first.result.current[1]([]));
  first.unmount();
  const second = renderHook(() => useCachedPageState<number[]>('items', [9]));
  expect(hasPageData('items')).toBe(true);
  expect(second.result.current[0]).toEqual([]);
});

it('mantiene separados los resultados de cada año o filtro', () => {
  const hook = renderHook(({ key }) => useCachedPageState<number[]>(key, []), { initialProps: { key: '2026' } });
  act(() => hook.result.current[1]([1]));
  const previousSetter = hook.result.current[1];
  hook.rerender({ key: '2027' });
  expect(hook.result.current[0]).toEqual([]);
  act(() => previousSetter([99]));
  expect(hook.result.current[0]).toEqual([]);
  hook.rerender({ key: '2026' });
  expect(hook.result.current[0]).toEqual([1]);
});

it('limpia los datos privados e ignora respuestas pendientes de la sesión anterior', () => {
  const first = renderHook(() => useCachedPageState<string[]>('private', []));
  act(() => first.result.current[1](['Anterior']));
  const previousSetter = first.result.current[1];
  first.unmount();
  resetHomeCommunity();
  act(() => previousSetter(['Respuesta tardía']));
  const next = renderHook(() => useCachedPageState<string[]>('private', []));
  expect(next.result.current[0]).toEqual([]);
  expect(hasPageData('private')).toBe(false);
});

it('invalida los resultados después de una edición confirmada por el servidor', async () => {
  const hook = renderHook(() => useCachedPageState<number[]>('items', []));
  act(() => hook.result.current[1]([1]));
  expect(hasPageData('items')).toBe(true);
  await apiClient.put('/alumnos/AL-12345678', { nombre: 'Actualizado' }, {
    adapter: async config => ({ config, data: '{}', status: 200, statusText: 'OK', headers: {} }),
  });
  expect(hasPageData('items')).toBe(false);
  // The mounted view keeps its data until its normal refresh completes.
  expect(hook.result.current[0]).toEqual([1]);
});
