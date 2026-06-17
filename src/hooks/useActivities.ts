import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { activityService } from '../services/activityService';
import { performanceService } from '../services/performanceService';
import type { MarketingActivity, PerformanceEntry, ActivityType } from '../types';

export const ACTIVITY_KEYS = {
  all: ['activities'] as const,
  lists: (type?: ActivityType) => [...ACTIVITY_KEYS.all, 'list', type ?? 'all'] as const,
  performance: (activityId: string) => [...ACTIVITY_KEYS.all, 'performance', activityId] as const,
};

export function useActivities(type?: ActivityType) {
  return useQuery({
    queryKey: ACTIVITY_KEYS.lists(type),
    queryFn: () => activityService.getAll(type),
  });
}

export function usePerformanceEntries(activityId: string) {
  return useQuery({
    queryKey: ACTIVITY_KEYS.performance(activityId),
    queryFn: () => performanceService.getByActivity(activityId),
    enabled: !!activityId,
  });
}

export function useCreateActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<MarketingActivity>) => activityService.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ACTIVITY_KEYS.all }),
  });
}

export function useUpdateActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<MarketingActivity> }) =>
      activityService.update(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ACTIVITY_KEYS.all }),
  });
}

export function useDeleteActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => activityService.softDelete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ACTIVITY_KEYS.all }),
  });
}

export function useCreatePerformanceEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<PerformanceEntry>) => performanceService.create(payload),
    onSuccess: (_data, variables) =>
      qc.invalidateQueries({ queryKey: ACTIVITY_KEYS.performance(variables.activity_id!) }),
  });
}

export function useUpdatePerformanceEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<PerformanceEntry> }) =>
      performanceService.update(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ACTIVITY_KEYS.all }),
  });
}

export function useDeletePerformanceEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => performanceService.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ACTIVITY_KEYS.all }),
  });
}
