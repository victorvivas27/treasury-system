import { useEffect, useState } from "react";
import type { UserRole } from "@/core/A-domain/entities/user/User";
import { ArchitectureUseCases } from "@/core/B-application/use-cases/architecture/ArchitectureUseCases";
import { ArchitectureRepositoryImpl } from "@/core/C-infra/repositories/architecture/ArchitectureRepositoryImpl";

export const architectureUseCases = new ArchitectureUseCases(new ArchitectureRepositoryImpl());

export const useArchitectureAccess = (userId?: number, role?: UserRole) => {
  const [result, setResult] = useState({ userId, allowed: false, loading: true, error: false });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!userId || role !== "SUPER_ADMIN") return;
    const controller = new AbortController();
    setResult({ userId, allowed: false, loading: true, error: false });
    architectureUseCases.canAccess(controller.signal).then(
      allowed => {
        if (!controller.signal.aborted) setResult({ userId, allowed, loading: false, error: false });
      },
      () => {
        if (!controller.signal.aborted) setResult({ userId, allowed: false, loading: false, error: true });
      },
    );
    return () => controller.abort();
  }, [userId, role, attempt]);

  const eligible = Boolean(userId) && role === "SUPER_ADMIN";
  return {
    allowed: eligible && result.userId === userId && result.allowed,
    loading: eligible && (result.userId !== userId || result.loading),
    error: eligible && result.userId === userId && result.error,
    retry: () => setAttempt(value => value + 1),
  };
};
