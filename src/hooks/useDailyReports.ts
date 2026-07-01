import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { dailyReportService } from '../services/dailyReportService';
import type { DailyReport } from '../types';

export const DAILY_REPORT_KEYS = {
  all: ['dailyReports'] as const,
  lists: () => [...DAILY_REPORT_KEYS.all, 'list'] as const,
};

export function useDailyReports() {
  return useQuery({
    queryKey: DAILY_REPORT_KEYS.lists(),
    queryFn: dailyReportService.getAll,
  });
}

export function useCreateDailyReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<DailyReport>) => dailyReportService.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: DAILY_REPORT_KEYS.all }),
  });
}

export function useUpdateDailyReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<DailyReport> }) =>
      dailyReportService.update(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: DAILY_REPORT_KEYS.all }),
  });
}

export function useDeleteDailyReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => dailyReportService.softDelete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: DAILY_REPORT_KEYS.all }),
  });
}
