import { TreasuryRepositoryImpl } from '@/core/C-infra/repositories/treasury/TreasuryRepositoryImpl';
import { HOME_COMMUNITY_RESET } from '@/shared/community/homeCommunityEvents';

const repository = new TreasuryRepositoryImpl();
let course: string | undefined;
let updatedAt = 0;
let generation = 0;
let pending: Promise<string> | undefined;

export const homeCourseCache = {
  peek: () => course,
  clear() {
    generation += 1;
    course = undefined;
    updatedAt = 0;
    pending = undefined;
  },
  load(): Promise<string> {
    if (pending) return pending;
    if (updatedAt && Date.now() - updatedAt < 60_000) return Promise.resolve(course ?? '');
    const requestGeneration = generation;
    pending = repository.getManagedCourseSettings().then(settings => {
      if (generation !== requestGeneration) return '';
      course = settings.course;
      updatedAt = Date.now();
      return course;
    }).catch(() => {
      if (generation === requestGeneration) course ??= '';
      return course ?? '';
    }).finally(() => { if (generation === requestGeneration) pending = undefined; });
    return pending;
  },
};

window.addEventListener(HOME_COMMUNITY_RESET, homeCourseCache.clear);
window.addEventListener('managed-course-changed', event => {
  const value = (event as CustomEvent<string | { course: string }>).detail;
  if (!value) return;
  generation += 1;
  pending = undefined;
  course = typeof value === 'string' ? value : value.course;
  updatedAt = Date.now();
});
