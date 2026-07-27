import { useCallback, useEffect, useMemo, useState } from "react";
import type { AnnualFeeConfigPayload, FeeObligation, FamilyPlan, PaymentMode,
  TreasuryDashboard, TreasuryFilters } from "@/core/A-domain/entities/treasury/Treasury";
import type { FamiliaDetalle } from "@/core/A-domain/entities/familia/Familia";
import { TreasuryUseCases } from "@/core/B-application/use-cases/treasury/TreasuryUseCases";
import { TreasuryRepositoryImpl } from "@/core/C-infra/repositories/treasury/TreasuryRepositoryImpl";
import { FamiliaRepositoryImpl } from "@/core/C-infra/repositories/familia/FamiliaRepositoryImpl";

export const useAnnualFees = () => {
  const [year, setYear] = useState(new Date().getFullYear());
  const [families, setFamilies] = useState<FamiliaDetalle[]>([]);
  const [plans, setPlans] = useState<FamilyPlan[]>([]);
  const [obligations, setObligations] = useState<FeeObligation[]>([]);
  const [dashboard, setDashboard] = useState<TreasuryDashboard | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const useCases = useMemo(() => new TreasuryUseCases(new TreasuryRepositoryImpl()), []);
  const familyRepository = useMemo(() => new FamiliaRepositoryImpl(), []);

  const loadFamilies = useCallback(async () => {
    try {
      const familyPage = await familyRepository.getAll(0, 500);
      setFamilies(familyPage.content);
    } catch {
      setFamilies([]);
      setError("No fue posible cargar las familias.");
    }
  }, [familyRepository]);

  const refresh = useCallback(async (filters: TreasuryFilters = {}) => {
    setLoading(true);
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
      setLoading(false);
    }
  }, [useCases, year]);

  useEffect(() => { void loadFamilies(); }, [loadFamilies]);
  useEffect(() => { void refresh(); }, [refresh]);

  const execute = async (operation: () => Promise<unknown>, success: string) => {
    setLoading(true);
    setError("");
    try {
      await operation();
      setMessage(success);
      await refresh();
    } catch {
      setError("No fue posible completar la operación.");
    } finally {
      setLoading(false);
    }
  };

  return {
    year, setYear, families, plans, obligations, dashboard, loading, message, error,
    clearMessage: () => setMessage(""),
    refresh,
    saveConfig: (payload: AnnualFeeConfigPayload) =>
      execute(() => useCases.saveConfig(year, payload), "Configuración anual guardada."),
    assignMode: (familyId: number, mode: PaymentMode) =>
      execute(async () => {
        await useCases.assignMode(year, familyId, mode);
        await useCases.generate(year);
      }, "Modalidad actualizada y obligaciones regeneradas."),
    removeFamilyPlan: (familyId: number, reason: string) =>
      execute(() => useCases.removeFamilyPlan(year, familyId, reason),
        "La familia fue quitada de la cuota anual."),
    generate: () => execute(() => useCases.generate(year), "Obligaciones generadas."),
    pay: (id: number, amount: number, observations?: string) =>
      execute(() => useCases.pay(id, new Date().toISOString().slice(0, 10), amount, observations),
        "Pago registrado correctamente."),
    annul: (id: number, reason: string) =>
      execute(() => useCases.annul(id, reason), "Pago anulado; la cuota volvió a pendiente."),
  };
};
