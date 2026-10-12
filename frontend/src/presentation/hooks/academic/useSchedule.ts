import { useCallback, useEffect, useState } from "react";
import type { Schedule, SchoolPeriod } from "@/core/A-domain/entities/academic/Schedule";
import { ScheduleUseCases } from "@/core/B-application/use-cases/academic/ScheduleUseCases";
import { ScheduleRepositoryImpl } from "@/core/C-infra/repositories/academic/ScheduleRepositoryImpl";
import { useOptionalAuth } from "@/presentation/context/AuthContext";
const useCases = new ScheduleUseCases(new ScheduleRepositoryImpl());
const errorMessage = (error: unknown): string => {
  const response = (error as { response?: { data?: { errors?: Record<string, string> } } })?.response?.data;
  return response?.errors ? Object.values(response.errors).join(" ") : error instanceof Error ? error.message : "No fue posible cargar el horario.";
};
export function useSchedule(draft: boolean) {
  const accountId = useOptionalAuth()?.user?.id;
  const [periods, setPeriods] = useState<SchoolPeriod[]>([]);
  const [year, setYear] = useState<number>();
  const [schedule, setSchedule] = useState<Schedule>({ days: [] });
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [reload, setReload] = useState(0);
  const [metadataReload, setMetadataReload] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setLoadFailed(false); setError(""); setYear(undefined); setPeriods([]); setSchedule({ days: [] });
    useCases.periods(controller.signal).then(values => {
      if (controller.signal.aborted) return;
      setPeriods(values);
      setYear(values.find(value => value.editable)?.schoolYear ?? values[0]?.schoolYear);
      if (!values.length) setLoading(false);
    }).catch(reason => { if (!controller.signal.aborted) { setError(errorMessage(reason)); setLoadFailed(true); setLoading(false); } });
    return () => controller.abort();
  }, [metadataReload, accountId]);
  useEffect(() => {
    if (year === undefined) return;
    const controller = new AbortController();
    setLoading(true); setLoadFailed(false); setError(""); setMessage(""); setSchedule({ days: [] });
    useCases.read(year, draft, controller.signal).then(value => {
      if (!controller.signal.aborted) setSchedule(value);
    }).catch(reason => { if (!controller.signal.aborted) { setError(errorMessage(reason)); setLoadFailed(true); } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [year, draft, reload, accountId]);
  const save = useCallback(async (value: Schedule, publish: boolean) => {
    if (year === undefined || saving) return false;
    setSaving(true); setError(""); setMessage("");
    try {
      setSchedule(await useCases.save(year, value, publish));
      setMessage(publish ? "Horario publicado." : "Borrador guardado. La consulta conserva la última publicación.");
      return true;
    } catch (reason) { setError(errorMessage(reason)); return false; }
    finally { setSaving(false); }
  }, [year, saving]);
  const remove = async () => {
    if (year === undefined) return;
    setSaving(true); setError("");
    try { await useCases.delete(year); setSchedule({ days: [] }); setMessage("Horario eliminado."); }
    catch (reason) { setError(errorMessage(reason)); }
    finally { setSaving(false); }
  };
  return { periods, year, setYear, schedule, loading, loadFailed, saving, error, message, save, remove,
    retry: () => year === undefined ? setMetadataReload(value => value + 1) : setReload(value => value + 1),
    editable: periods.find(value => value.schoolYear === year)?.editable === true };
}
