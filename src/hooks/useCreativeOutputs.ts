import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { creativeOutputService } from '../services/creativeOutputService';
import type { CreativeOutput } from '../types';

export const CREATIVE_OUTPUT_KEYS = {
  all: ['creativeOutputs'] as const,
  lists: () => [...CREATIVE_OUTPUT_KEYS.all, 'list'] as const,
};

export function useCreativeOutputs() {
  return useQuery({
    queryKey: CREATIVE_OUTPUT_KEYS.lists(),
    queryFn: creativeOutputService.getAll,
  });
}

export function useCreateCreativeOutput() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<CreativeOutput>) => creativeOutputService.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: CREATIVE_OUTPUT_KEYS.all }),
  });
}

export function useUpdateCreativeOutput() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<CreativeOutput> }) =>
      creativeOutputService.update(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: CREATIVE_OUTPUT_KEYS.all }),
  });
}

export function useDeleteCreativeOutput() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => creativeOutputService.softDelete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: CREATIVE_OUTPUT_KEYS.all }),
  });
}
