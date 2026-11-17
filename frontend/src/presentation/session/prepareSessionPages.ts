import type { User } from '@/core/A-domain/entities/user/User';
import { getAccessToken } from '@/core/D-config/axiosInterceptor';
import { TreasuryRepositoryImpl } from '@/core/C-infra/repositories/treasury/TreasuryRepositoryImpl';
import { AlumnoRepositoryImpl } from '@/core/C-infra/repositories/alumno/AlumnoRepositoryImpl';
import { ApoderadoRepositoryImpl } from '@/core/C-infra/repositories/apoderado/ApoderadoRepositoryImpl';
import { FamiliaRepositoryImpl } from '@/core/C-infra/repositories/familia/FamiliaRepositoryImpl';
import { UserRepositoryImpl } from '@/core/C-infra/repositories/user/UserRepositoryImpl';
import { OrganizationRepositoryImpl } from '@/core/C-infra/repositories/organization/OrganizationRepositoryImpl';
import { ScheduleRepositoryImpl } from '@/core/C-infra/repositories/academic/ScheduleRepositoryImpl';
import { AboutSectionRepositoryImpl } from '@/core/C-infra/repositories/community/AboutSectionRepositoryImpl';
import { courseBoard } from '@/core/C-infra/repositories/community/CourseBoardRepository';
import { coursePhotos } from '@/core/C-infra/repositories/community/CoursePhotoRepository';
import { QualityReportRepositoryImpl } from '@/core/C-infra/repositories/quality/QualityReportRepositoryImpl';
import { ImprovementSuggestionRepositoryImpl } from '@/core/C-infra/repositories/improvement/ImprovementSuggestionRepositoryImpl';
import { ArchitectureRepositoryImpl } from '@/core/C-infra/repositories/architecture/ArchitectureRepositoryImpl';
import { homeCommunityCache } from '@/presentation/pages/home/hooks/homeCommunityCache';
import { homeCourseCache } from '@/presentation/pages/home/hooks/homeCourseCache';
import { birthdayResource, boardMessageResource, dashboardYear, getDashboardResources } from '@/presentation/pages/dashboard/dashboardCache';
import { getPaymentsResource } from '@/presentation/pages/tesoreria/paymentsCache';
import { expensesSelection, getExpensesResource } from '@/presentation/pages/tesoreria/expensesCache';
import { incomesSelection, getIncomesResources } from '@/presentation/pages/tesoreria/incomesCache';
import { collectionFamilies, collectionResource } from '@/presentation/pages/tesoreria/collectionsCache';
import { standCache } from '@/presentation/pages/stand/standCache';
import { getProfileResource } from '@/presentation/pages/user/profileCache';
import { coursePhotoImageCache } from '@/presentation/pages/community/coursePhotoImageCache';
import { preloadPublishedSchedule } from '@/presentation/hooks/academic/usePublishedSchedule';
import { readPageRequest } from '@/presentation/hooks/pageRequestCache';
import { pageDataRevision, pageDataSession, storePageData } from '@/presentation/hooks/useCachedPageState';

type Task = () => Promise<unknown>;

// Bounded reads only: never submit forms, generate obligations or register payments.
export async function prepareSessionPages(user: User) {
  const token = getAccessToken();
  if (!token) return;
  const session = pageDataSession();
  const revision = pageDataRevision();
  let active = true;
  const current = () => active && token === getAccessToken()
    && session === pageDataSession() && revision === pageDataRevision();
  const save = (key: string, value: unknown) => { if (current()) storePageData(key, value, session); };
  const treasury = new TreasuryRepositoryImpl();
  const year = new Date().getFullYear();
  const admin = user.rol === 'ADMIN';
  const tasks: Task[] = [() => homeCommunityCache.load(), () => preloadPublishedSchedule(user.id)];

  if (user.rol !== 'SUPER_ADMIN') {
    const dashboard = getDashboardResources(dashboardYear.get());
    const expenses = expensesSelection(user.id, admin);
    const incomes = incomesSelection(user.id, admin);
    const incomeResources = getIncomesResources(user.id, admin, incomes.year, incomes.filters);
    tasks.push(
      () => homeCourseCache.load(),
      () => dashboard.summary.load(), () => dashboard.profits.load(),
      () => birthdayResource.load(), () => boardMessageResource.load(),
      () => getPaymentsResource(user.id, admin, year).load(),
      () => getExpensesResource(user.id, admin, expenses.year, expenses.filters).load(),
      () => incomeResources.incomes.load(), () => incomeResources.course.load(),
      () => getProfileResource(user.correo, year).load(),
      () => collectionResource(year).load(),
      async () => {
        const cache = standCache(user.id, !admin);
        const resource = cache.events(cache.selection.year);
        await resource.load();
        const event = resource.getSnapshot().data?.[0];
        if (event && current()) await cache.list(event.id).load();
      },
    );
  }

  if (admin) {
    const students = new AlumnoRepositoryImpl();
    const guardians = new ApoderadoRepositoryImpl();
    const families = new FamiliaRepositoryImpl();
    const users = new UserRepositoryImpl();
    const list = <T,>(scope: string, request: () => Promise<{ content: T[]; totalPages: number; totalElements: number; page: number }>) => async () => {
      const page = await readPageRequest(JSON.stringify([scope, 0, '']), request);
      save(`${scope}:items`, page.content); save(`${scope}:totalPages`, page.totalPages);
      save(`${scope}:totalElements`, page.totalElements); save(`${scope}:page`, page.page);
    };
    tasks.push(
      async () => {
        const course = await readPageRequest('managed-course-settings', () => treasury.getManagedCourseSettings());
        save('configuration:savedCourse', course.course); save('configuration:savedSchoolYear', course.schoolYear);
        save('configuration:courseHistory', course.history); save('events:managedCourse', course.course);
      },
      list('alumnos:3:0', () => students.getAll(0, 3)),
      list('apoderados:3:0', () => guardians.getAll(0, 3)),
      list('familias:5:0', () => families.getAll(0, 5)),
      async () => {
        const page = await readPageRequest(JSON.stringify(['users', 0, 5, '']), () => users.getAll(0, 5));
        save('users:users', page.content); save('users:totalPages', page.totalPages);
      },
      async () => save(`events:${year}:items`, await treasury.listEvents(year)),
      async () => save(`annual:${year}:data`, await treasury.annualFeesPage(year)),
      async () => save(`annual:${year}:configs`, await treasury.listConfigs()),
      async () => {
        const scope = `contributions:${JSON.stringify([year, '', '', '', ''])}`;
        const [items, summary] = await Promise.all([treasury.listContributions(year), treasury.contributionSummary(year)]);
        save(`${scope}:items`, items); save(`${scope}:summary`, summary);
      },
      () => collectionFamilies.load(),
      async () => save('about:items', await new AboutSectionRepositoryImpl().adminList()),
      async () => {
        const [members, parents] = await Promise.all([courseBoard.list(year), guardians.getAll(0, 500)]);
        save(`board:${year}:members`, members); save(`board:${year}:parents`, parents.content);
      },
      async () => {
        const photos = await coursePhotos.list();
        save('gallery:photos', photos);
        for (const photo of photos) {
          if (!current()) return;
          await coursePhotoImageCache.load(photo);
        }
      },
      async () => {
        const repository = new ScheduleRepositoryImpl();
        const periods = await repository.periods();
        const selected = periods.find(period => period.editable)?.schoolYear ?? periods[0]?.schoolYear;
        save(`schedule:${user.id}:true:periods`, periods); save(`schedule:${user.id}:true:year`, selected);
        if (selected !== undefined && current()) save(`schedule:${user.id}:true:${selected}:data`, await repository.read(selected, true));
      },
    );
  }

  if (user.rol !== 'USER') tasks.push(
    async () => save('quality:catalog', await new QualityReportRepositoryImpl().catalog()),
    async () => {
      const repository = new ImprovementSuggestionRepositoryImpl();
      const filters = { page: 0, size: 10, sortBy: 'createdAt', direction: 'desc' } as const;
      const [summary, page] = await Promise.all([repository.adminSummary(), repository.adminList(filters)]);
      save('improvements:summary', summary);
      save(`improvements:${JSON.stringify(filters)}:rows`, page.content);
      save(`improvements:${JSON.stringify(filters)}:totalPages`, page.totalPages);
    },
  );

  if (user.rol === 'SUPER_ADMIN') tasks.push(async () => {
    const repository = new OrganizationRepositoryImpl();
    const organizations = await repository.getAll();
    save('organizations:items', organizations);
    const admins: Record<number, Awaited<ReturnType<typeof repository.getAdmins>>> = {};
    for (const organization of organizations) {
      if (!current()) return;
      admins[organization.id] = await repository.getAdmins(organization.id);
    }
    save('organizations:admins', admins);
  }, async () => {
    const repository = new ArchitectureRepositoryImpl();
    if (!await repository.canAccess() || !current()) return;
    const catalog = await repository.catalog();
    save('architecture:catalog', catalog);
  });

  // A failing secondary page remains retryable in its own content. It cannot
  // hold the only startup cover forever, nor populate a different session.
  let index = 0;
  const worker = async () => {
    while (current() && index < tasks.length) {
      const task = tasks[index++];
      try { await task(); } catch { /* The page handles its own read error. */ }
    }
  };
  let timeout: ReturnType<typeof setTimeout> | undefined;
  await Promise.race([
    Promise.all(Array.from({ length: 4 }, worker)),
    new Promise<void>(resolve => { timeout = setTimeout(() => { active = false; resolve(); }, 12_000); }),
  ]);
  clearTimeout(timeout);
  active = false;
}
