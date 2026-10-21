import { useEffect, useState } from "react";
import { useOptionalAuth } from "@/presentation/context/AuthContext";
import { useDashboardResource } from "../dashboard/dashboardCache";
import { notificationCache } from "./notificationCache";

export const useNotificationRecipients = (enabled: boolean) => {
  const auth = useOptionalAuth();
  const [currentPage, setCurrentPage] = useState(0);
  const [search, setSearchValue] = useState("");
  const [query, setQuery] = useState("");
  useEffect(() => {
    const timer = window.setTimeout(() => { setQuery(search.trim()); setCurrentPage(0); }, 250);
    return () => window.clearTimeout(timer);
  }, [search]);
  const resource = notificationCache(auth?.user?.id ?? 0).recipients(currentPage, query);
  const state = useDashboardResource(resource, enabled);
  const totalPages = state.data?.totalPages ?? 0;
  return {
    apoderados: state.data?.content ?? [], loading: enabled && !state.data && !state.error,
    error: state.error ? "No fue posible cargar los destinatarios." : "",
    currentPage, search, setSearch: setSearchValue,
    hasPrevPage: currentPage > 0, isLastPage: currentPage + 1 >= totalPages,
    nextPage: () => setCurrentPage(page => Math.min(Math.max(0, totalPages - 1), page + 1)),
    prevPage: () => setCurrentPage(page => Math.max(0, page - 1)),
    retry: () => resource.load(true),
  };
};
