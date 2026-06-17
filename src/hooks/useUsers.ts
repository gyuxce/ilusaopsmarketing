import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userService } from '../services/userService';
import type { User } from '../types';

export const USER_KEYS = {
  all: ['users'] as const,
  lists: () => [...USER_KEYS.all, 'list'] as const,
};

export function useUsers() {
  return useQuery({
    queryKey: USER_KEYS.lists(),
    queryFn: userService.getAll,
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<User>) => userService.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: USER_KEYS.all }),
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<User> }) =>
      userService.update(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: USER_KEYS.all }),
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => userService.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: USER_KEYS.all }),
  });
}
