import { useCallback, useMemo, useState } from "react";
import type { User, UserPayload, UserRole } from "@/core/A-domain/entities/user/User";
import {
  ChangeUserRoleUseCase,
  CreateUserUseCase,
  DeleteUserUseCase,
  ListUsersUseCase,
  UpdateUserUseCase,
} from "@/core/B-application/use-cases/user/UserUseCases";
import { UserRepositoryImpl } from "@/core/C-infra/repositories/user/UserRepositoryImpl";

export const useUsers = () => {
  const pageSize = 5;
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(0);

  const useCases = useMemo(() => {
    const repository = new UserRepositoryImpl();
    return {
      list: new ListUsersUseCase(repository),
      create: new CreateUserUseCase(repository),
      update: new UpdateUserUseCase(repository),
      role: new ChangeUserRoleUseCase(repository),
      delete: new DeleteUserUseCase(repository),
    };
  }, []);

  const load = useCallback(async (page = 0) => {
    setLoading(true);
    setError(null);
    try {
      const response = await useCases.list.execute(page, pageSize);
      setUsers(response.content);
      setTotalPages(response.totalPages);
    } catch {
      setError("No se pudieron cargar los usuarios");
    } finally {
      setHasLoaded(true);
      setLoading(false);
    }
  }, [useCases]);

  const create = async (payload: UserPayload, page = 0) => {
    setLoading(true);
    try {
      await useCases.create.execute(payload);
      await load(page);
    } finally {
      setLoading(false);
    }
  };

  const changeRole = async (id: number, role: UserRole) => {
    await useCases.role.execute(id, role);
    await load();
  };

  const update = async (id: number, payload: UserPayload, page = 0) => {
    setLoading(true);
    try {
      await useCases.update.execute(id, payload);
      await load(page);
    } finally {
      setLoading(false);
    }
  };

  const remove = async (id: number, page = 0) => {
    await useCases.delete.execute(id);
    await load(page);
  };

  return { users, loading: loading && !hasLoaded, refreshing: loading && hasLoaded,
    error, totalPages, pageSize, load, create, update,
    changeRole, remove };
};
