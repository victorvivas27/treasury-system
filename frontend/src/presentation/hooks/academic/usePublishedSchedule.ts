import { useState } from "react";
import { useOptionalAuth } from "@/presentation/context/AuthContext";
import { ScheduleUseCases } from "@/core/B-application/use-cases/academic/ScheduleUseCases";
import { ScheduleRepositoryImpl } from "@/core/C-infra/repositories/academic/ScheduleRepositoryImpl";
import { createDashboardResource, useDashboardResource } from "@/presentation/pages/dashboard/dashboardCache";
import { apiClient } from "@/core/D-config/api";
import { DASHBOARD_RESET } from "@/shared/treasury/dashboardEvents";
import type { Schedule } from "@/core/A-domain/entities/academic/Schedule";

const useCases = new ScheduleUseCases(new ScheduleRepositoryImpl());
const createAccountCache = () => {
  const years = new Map<number, ReturnType<typeof createDashboardResource<Schedule>>>();
  return {
    periods: createDashboardResource(() => useCases.periods()),
    years,
    selectedYear: undefined as number | undefined,
    schedule(year: number) {
      if (!years.has(year)) years.set(year, createDashboardResource(() => useCases.read(year, false)));
      return years.get(year)!;
    },
  };
};
const accounts = new Map<number | undefined, ReturnType<typeof createAccountCache>>();
const accountCache = (accountId?: number) => {
  if (!accounts.has(accountId)) accounts.set(accountId, createAccountCache());
  return accounts.get(accountId)!;
};
export const clearPublishedScheduleCache = () => {
  accounts.forEach(account => {
    account.periods.clear();
    account.years.forEach(resource => resource.clear());
  });
  accounts.clear();
};
window.addEventListener(DASHBOARD_RESET, clearPublishedScheduleCache);

apiClient.interceptors.response.use(response => {
  const { method, url = "", params } = response.config;
  const publishedYear = url.match(/\/academic\/schedules\/(\d+)(?:\?|$)/)?.[1];
  if (publishedYear && (method === "delete" || (method === "put" && (params?.publish === true || params?.publish === "true")))) {
    accounts.forEach(account => account.years.get(Number(publishedYear))?.invalidate());
  }
  return response;
});

export function usePublishedSchedule() {
  const accountId = useOptionalAuth()?.user?.id;
  const account = accountCache(accountId);
  const periods = useDashboardResource(account.periods);
  const [choice, setChoice] = useState<{ accountId?: number; year?: number }>({ accountId });
  const availablePeriods = periods.data ?? [];
  const preferredYear = availablePeriods.find(period => period.editable)?.schoolYear ?? availablePeriods[0]?.schoolYear;
  const selectedYear = choice.accountId === accountId ? choice.year ?? account.selectedYear : account.selectedYear;
  const year = availablePeriods.some(period => period.schoolYear === selectedYear) ? selectedYear : preferredYear;
  const resource = account.schedule(year ?? 0);
  const schedule = useDashboardResource(resource, year !== undefined);
  const error = periods.error ? "No fue posible cargar los años escolares."
    : year !== undefined && schedule.error ? "No fue posible actualizar el horario publicado." : "";
  const ready = Boolean(periods.data) && (year === undefined || Boolean(schedule.data));
  return {
    periods: availablePeriods, year, schedule: schedule.data ?? { days: [] }, ready,
    loading: periods.loading || (year !== undefined && schedule.loading), error,
    setYear(value: number) {
      account.selectedYear = value;
      setChoice({ accountId, year: value });
    },
    retry: () => { void (periods.error || year === undefined ? account.periods.load(true) : resource.load(true)); },
  };
}
