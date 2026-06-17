import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reviewService } from '../services/reviewService';
import type { WeeklyReview } from '../types';

export const REVIEW_KEYS = {
  all: ['reviews'] as const,
  lists: () => [...REVIEW_KEYS.all, 'list'] as const,
};

export function useReviews() {
  return useQuery({
    queryKey: REVIEW_KEYS.lists(),
    queryFn: reviewService.getAll,
  });
}

export function useCreateReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<WeeklyReview>) => reviewService.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: REVIEW_KEYS.all }),
  });
}

export function useUpdateReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<WeeklyReview> }) =>
      reviewService.update(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: REVIEW_KEYS.all }),
  });
}

export function useDeleteReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => reviewService.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: REVIEW_KEYS.all }),
  });
}
