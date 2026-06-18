import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clientService } from '../services/clientService';
import { useAuth } from './useAuth';
import type { Client } from '../types';

// Query key constants
export const CLIENT_KEYS = {
  all: ['clients'] as const,
  lists: () => [...CLIENT_KEYS.all, 'list'] as const,
  detail: (id: string) => [...CLIENT_KEYS.all, 'detail', id] as const,
};

export function useClients() {
  const { session } = useAuth();
  return useQuery({
    queryKey: CLIENT_KEYS.lists(),
    queryFn: clientService.getAll,
    enabled: !!session,
  });
}

export function useCreateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<Client>) => clientService.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: CLIENT_KEYS.all }),
  });
}

export function useUpdateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<Client> }) =>
      clientService.update(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: CLIENT_KEYS.all }),
  });
}

export function useDeleteClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => clientService.softDelete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: CLIENT_KEYS.all }),
  });
}

export function useRestoreClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => clientService.restore(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: CLIENT_KEYS.all }),
  });
}
