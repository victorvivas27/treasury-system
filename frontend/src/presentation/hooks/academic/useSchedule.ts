import { hasPageData, useCachedPageState } from '@/presentation/hooks/useCachedPageState';
import { useCallback, useEffect, useState } from "react";
import type { Schedule, SchoolPeriod } from "@/core/A-domain/entities/academic/Schedule";
import { ScheduleUseCases } from "@/core/B-application/use-cases/academic/ScheduleUseCases";
import { ScheduleRepositoryImpl } from "@/core/C-infra/repositories/academic/ScheduleRepositoryImpl";
import { useOptionalAuth } from "@/presentation/context/AuthContext";
const useCases = new ScheduleUseCases(new ScheduleRepositoryImpl());
const errorMessage = (error: unknown): string => {
  const failure = error as { code?: string; response?: { status?: number; data?: { errors?: Record<string, string>; message?: string; detail?: string } } };
  const response = failure?.response?.data;
  const details = response?.errors && Object.values(response.errors).filter(Boolean).join(" ");
  if (details) return details;
  if (response?.message || response?.detail) return response.message || response.detail!;
  if (failure?.response?.status === 401) return "La sesión expiró. Inicia sesión nuevamente.";
  if (failure?.response?.status === 403) return "No tienes permiso para modificar este horario.";
  if (failure?.response?.status === 409) return "El horario cambió o el año es de solo lectura. Recarga antes de volver a intentarlo.";
  if (failure?.code === "ECONNABORTED" || failure?.code === "ETIMEDOUT") return "El servidor tardó demasiado en responder. Inténtalo de nuevo.";
  if (failure?.code === "ERR_NETWORK") return "No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.";
  return error instanceof Error ? error.message : "No fue posible completar la operación del horario.";
};
export function useSchedule(draft: boolean) {
  const accountId = useOptionalAuth()?.user?.id;
  const [periods, setPeriods] = useCachedPageState<SchoolPeriod[]>(`schedule:${accountId}:${draft}:periods`, []);
  const [year, setYear] = useCachedPageState<number | undefined>(`schedule:${accountId}:${draft}:year`, undefined);
  const [schedule, setSchedule] = useCachedPageState<Schedule>(`schedule:${accountId}:${draft}:${year}:data`, { days: [] });
  const [fetching, setLoading] = useState(true);
  const loading = fetching && (!hasPageData(`schedule:${accountId}:${draft}:periods`)
    || (year !== undefined && !hasPageData(`schedule:${accountId}:${draft}:${year}:data`)));
  const [loadFailed, setLoadFailed] = useState(false);
  const [pendingAction, setPendingAction] = useState<"save" | "publish" | "delete" | null>(null);
  const saving = pendingAction !== null;
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [reload, setReload] = useState(0);
  const [metadataReload, setMetadataReload] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setLoadFailed(false); setError("");
    useCases.periods(controller.signal).then(values => {
      if (controller.signal.aborted) return;
      setPeriods(values);
      setYear(current => values.some(value => value.schoolYear === current) ? current
        : values.find(value => value.editable)?.schoolYear ?? values[0]?.schoolYear);
      if (!values.length) setLoading(false);
    }).catch(reason => { if (!controller.signal.aborted) { setError(errorMessage(reason)); setLoadFailed(true); setLoading(false); } });
    return () => controller.abort();
  }, [metadataReload, accountId]);
  useEffect(() => {
    if (year === undefined) return;
    const controller = new AbortController();
    setLoading(true); setLoadFailed(false); setError(""); setMessage("");
    useCases.read(year, draft, controller.signal).then(value => {
      if (!controller.signal.aborted) setSchedule(value);
    }).catch(reason => { if (!controller.signal.aborted) { setError(errorMessage(reason)); setLoadFailed(true); } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [year, draft, reload, accountId]);
  const save = useCallback(async (value: Schedule, publish: boolean) => {
    if (year === undefined || saving) return false;
    setPendingAction(publish ? "publish" : "save"); setError(""); setMessage("");
    try {
      setSchedule(await useCases.save(year, value, publish));
      setMessage(publish ? "Horario publicado." : "Borrador guardado. La consulta conserva la última publicación.");
      return true;
    } catch (reason) { setError(errorMessage(reason)); return false; }
    finally { setPendingAction(null); }
  }, [year, saving]);
  const remove = async () => {
    if (year === undefined || saving) return;
    setPendingAction("delete"); setError(""); setMessage("");
    try { await useCases.delete(year); setSchedule({ days: [] }); setMessage("Horario eliminado."); }
    catch (reason) { setError(errorMessage(reason)); }
    finally { setPendingAction(null); }
  };
  return { periods, year, setYear, schedule, loading, loadFailed, saving, pendingAction, error, message, save, remove,
    retry: () => year === undefined ? setMetadataReload(value => value + 1) : setReload(value => value + 1),
    editable: periods.find(value => value.schoolYear === year)?.editable === true };
}
