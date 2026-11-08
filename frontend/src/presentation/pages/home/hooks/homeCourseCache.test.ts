import { beforeEach, expect, it, vi } from 'vitest';
import { resetHomeCommunity } from '@/shared/community/homeCommunityEvents';
import { homeCourseCache } from './homeCourseCache';

const api = vi.hoisted(() => ({ settings: vi.fn() }));
vi.mock('@/core/C-infra/repositories/treasury/TreasuryRepositoryImpl', () => ({
  TreasuryRepositoryImpl: class { getManagedCourseSettings = api.settings; },
}));

beforeEach(() => { vi.clearAllMocks(); homeCourseCache.clear(); api.settings.mockResolvedValue({ course: '4° A' }); });

it('reutiliza el curso al volver al inicio sin repetir la consulta', async () => {
  await homeCourseCache.load();
  expect(homeCourseCache.peek()).toBe('4° A');
  await homeCourseCache.load();
  expect(api.settings).toHaveBeenCalledOnce();
});

it('conserva el curso visible mientras actualiza la caché vencida', async () => {
  await homeCourseCache.load();
  const clock = vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 60_001);
  let resolve!: (settings: { course: string }) => void;
  api.settings.mockReturnValue(new Promise(done => { resolve = done; }));
  const refresh = homeCourseCache.load();
  expect(homeCourseCache.peek()).toBe('4° A');
  resolve({ course: '5° A' });
  await refresh;
  expect(homeCourseCache.peek()).toBe('5° A');
  clock.mockRestore();
});

it('limpia el curso al cambiar de sesión e ignora las respuestas anteriores', async () => {
  let resolve!: (settings: { course: string }) => void;
  api.settings.mockReturnValue(new Promise(done => { resolve = done; }));
  const previous = homeCourseCache.load();
  resetHomeCommunity();
  resolve({ course: 'Curso anterior' });
  await previous;
  expect(homeCourseCache.peek()).toBeUndefined();
});

it('aplica los cambios del curso sin esperar otra consulta', async () => {
  await homeCourseCache.load();
  window.dispatchEvent(new CustomEvent('managed-course-changed', { detail: { course: '6° B' } }));
  expect(homeCourseCache.peek()).toBe('6° B');
  expect(await homeCourseCache.load()).toBe('6° B');
  expect(api.settings).toHaveBeenCalledOnce();
});
