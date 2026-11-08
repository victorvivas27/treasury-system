import { hasPageData, useCachedPageState, readPageData, storePageData, forgetPageData, pageDataSession } from '@/presentation/hooks/useCachedPageState';
import { useCallback, useEffect, useMemo, useState } from "react";
import type { AnnualFeeConfig, AnnualFeeConfigPayload, AnnualFeeFamilyOption, AssignModePayload, FeeObligation,
  FamilyPlan,
  TreasuryDashboard, TreasuryFilters } from "@/core/A-domain/entities/treasury/Treasury";
import { TreasuryUseCases } from "@/core/B-application/use-cases/treasury/TreasuryUseCases";
import { TreasuryRepositoryImpl } from "@/core/C-infra/repositories/treasury/TreasuryRepositoryImpl";

const operationErrorMessage = (error: unknown) => {
  if (typeof error !== "object" || error === null || !("response" in error)) {
    return "No fue posible completar la operación.";
  }
  const data = (error as {
    response?: { data?: { errors?: Record<string, string>; message?: string } };
  }).response?.data;
  const messages = data?.errors ? Object.values(data.errors).filter(Boolean) : [];
  return messages.length > 0
    ? messages.join(" ")
    : data?.message || "No fue posible completar la operación.";
};

export const useAnnualFees = () => {
  const [year, setYear] = useCachedPageState('annual:year', new Date().getFullYear());
  const [appliedFilters, setAppliedFilters] = useCachedPageState<TreasuryFilters>(`annual:${year}:filters`, {});
  const cached = readPageData<{ families: AnnualFeeFamilyOption[]; plans: FamilyPlan[];
    obligations: FeeObligation[]; dashboard: TreasuryDashboard }>(`annual:${year}:data`);
  const [families, setFamilies] = useState<AnnualFeeFamilyOption[]>(() => cached?.families ?? []);
  const [plans, setPlans] = useState<FamilyPlan[]>(() => cached?.plans ?? []);
  const [obligations, setObligations] = useState<FeeObligation[]>(() => cached?.obligations ?? []);
  const [dashboard, setDashboard] = useState<TreasuryDashboard | null>(() => cached?.dashboard ?? null);
  const [configs, setConfigs] = useCachedPageState<AnnualFeeConfig[]>(`annual:${year}:configs`, []);
  const [configsReady, setConfigsReady] = useState(() => hasPageData(`annual:${year}:configs`));
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(() => !hasPageData(`annual:${year}:data`));
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const useCases = useMemo(() => new TreasuryUseCases(new TreasuryRepositoryImpl()), []);

  const loadConfigs = useCallback(async () => {
    try {
      setConfigs(await useCases.listConfigs());
    } catch {
      setConfigs([]);
    } finally {
      setConfigsReady(true);
    }
  }, [useCases]);

  const refresh = useCallback(async (filters: TreasuryFilters = {}, showLoading = false) => {
    const requestSession = pageDataSession();
    setLoading(true);
    if (showLoading && !hasPageData(`annual:${year}:data`)) setDataLoading(true);
    setError("");
    try {
      const page = await useCases.annualFeesPage(year, filters);
      storePageData(`annual:${year}:data`, page, requestSession);
      setPlans(page.plans);
      setObligations(page.obligations);
      setDashboard(page.dashboard);
      setFamilies(page.families);
      setAppliedFilters(filters);
    } catch {
      forgetPageData(`annual:${year}:data`, requestSession);
      setFamilies([]);
      setPlans([]);
      setObligations([]);
      setDashboard(null);
      setError("Configura la cuota anual para comenzar.");
    } finally {
      setDataLoading(false);
      setLoading(false);
    }
  }, [useCases, year]);

  useEffect(() => { void refresh(appliedFilters, true); }, [refresh]);
  useEffect(() => {
    if (dataLoading) return;
    void loadConfigs();
  }, [dataLoading, loadConfigs]);

  const execute = async (operation: () => Promise<unknown>, success: string) => {
    setLoading(true);
    setError("");
    setActionError("");
    try {
      await operation();
      setMessage(success);
      await refresh();
      return true;
    } catch (operationError) {
      setActionError(operationErrorMessage(operationError));
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    year, setYear, families, plans, obligations, dashboard, configs, configsReady, loading, dataLoading, appliedFilters,
    message, error, actionError,
    clearMessage: () => setMessage(""),
    clearActionError: () => setActionError(""),
    refresh,
    saveConfig: async (payload: AnnualFeeConfigPayload) => {
      const success = await execute(() => useCases.saveConfig(year, payload),
        "Configuración anual guardada.");
      if (success) await loadConfigs();
      return success;
    },
    assignMode: (familyId: number, payload: AssignModePayload) =>
      execute(async () => {
        await useCases.assignMode(year, familyId, payload);
        if (payload.mode !== "PERSONALIZADA") await useCases.generate(year);
      }, payload.mode === "PERSONALIZADA"
        ? "Cuota personalizada creada."
        : "Modalidad actualizada y obligaciones regeneradas."),
    removeFamilyPlan: (familyId: number, reason: string) =>
      execute(() => useCases.removeFamilyPlan(year, familyId, reason),
        "La familia fue quitada de la cuota anual."),
    generate: () => execute(() => useCases.generate(year), "Obligaciones generadas."),
    pay: (id: number, paymentDate: string, amount: number, observations?: string) =>
      execute(() => useCases.pay(id, paymentDate, amount, observations),
        "Pago registrado correctamente."),
    annul: (id: number, reason: string) =>
      execute(() => useCases.annul(id, reason), "Pago anulado; la cuota volvió a pendiente."),
  };
};
