import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workItemService } from '../services/workItemService';
import type { WorkItem, WorkItemStatus } from '../types';

export const WORK_ITEM_KEYS = {
  all: ['workItems'] as const,
  lists: (filters?: object) => [...WORK_ITEM_KEYS.all, 'list', filters ?? {}] as const,
};

export function useWorkItems(filters = {}) {
  return useQuery({
    queryKey: WORK_ITEM_KEYS.lists(filters),
    queryFn: () => workItemService.getAll(filters),
  });
}

export function useCreateWorkItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<WorkItem>) => workItemService.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: WORK_ITEM_KEYS.all }),
  });
}

export function useUpdateWorkItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<WorkItem> }) =>
      workItemService.update(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: WORK_ITEM_KEYS.all }),
  });
}

export function useUpdateWorkItemStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: WorkItemStatus }) =>
      workItemService.updateStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: WORK_ITEM_KEYS.all }),
  });
}

export function useDeleteWorkItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => workItemService.softDelete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: WORK_ITEM_KEYS.all }),
  });
}
