import { useCallback, useEffect, useMemo, useState } from "react";
import type { AnnualFeeConfig, AnnualFeeConfigPayload, AssignModePayload, FeeObligation,
  FamilyPlan,
  TreasuryDashboard, TreasuryFilters } from "@/core/A-domain/entities/treasury/Treasury";
import type { FamiliaDetalle } from "@/core/A-domain/entities/familia/Familia";
import { TreasuryUseCases } from "@/core/B-application/use-cases/treasury/TreasuryUseCases";
import { TreasuryRepositoryImpl } from "@/core/C-infra/repositories/treasury/TreasuryRepositoryImpl";
import { FamiliaRepositoryImpl } from "@/core/C-infra/repositories/familia/FamiliaRepositoryImpl";

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
  const [year, setYear] = useState(new Date().getFullYear());
  const [families, setFamilies] = useState<FamiliaDetalle[]>([]);
  const [plans, setPlans] = useState<FamilyPlan[]>([]);
  const [obligations, setObligations] = useState<FeeObligation[]>([]);
  const [dashboard, setDashboard] = useState<TreasuryDashboard | null>(null);
  const [configs, setConfigs] = useState<AnnualFeeConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [familiesLoading, setFamiliesLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const useCases = useMemo(() => new TreasuryUseCases(new TreasuryRepositoryImpl()), []);
  const familyRepository = useMemo(() => new FamiliaRepositoryImpl(), []);

  const loadConfigs = useCallback(async () => {
    try {
      setConfigs(await useCases.listConfigs());
    } catch {
      setConfigs([]);
    }
  }, [useCases]);

  const loadFamilies = useCallback(async () => {
    try {
      const familyPage = await familyRepository.getAll(0, 500);
      setFamilies(familyPage.content);
    } catch {
      setFamilies([]);
      setError("No fue posible cargar las familias.");
    } finally {
      setFamiliesLoading(false);
    }
  }, [familyRepository]);

  const refresh = useCallback(async (filters: TreasuryFilters = {}, showSkeleton = false) => {
    setLoading(true);
    if (showSkeleton) setDataLoading(true);
    setError("");
    try {
      const [currentPlans, currentObligations, currentDashboard] =
        await Promise.all([
          useCases.listPlans(year),
          useCases.listObligations(year, filters),
          useCases.dashboard(year),
        ]);
      setPlans(currentPlans);
      setObligations(currentObligations);
      setDashboard(currentDashboard);
    } catch {
      setPlans([]);
      setObligations([]);
      setDashboard(null);
      setError("Configura la cuota anual para comenzar.");
    } finally {
      setDataLoading(false);
      setLoading(false);
    }
  }, [useCases, year]);

  useEffect(() => { void loadFamilies(); }, [loadFamilies]);
  useEffect(() => { void loadConfigs(); }, [loadConfigs]);
  useEffect(() => { void refresh({}, true); }, [refresh]);

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
    year, setYear, families, plans, obligations, dashboard, configs, loading, dataLoading,
    familiesLoading, message, error, actionError,
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
