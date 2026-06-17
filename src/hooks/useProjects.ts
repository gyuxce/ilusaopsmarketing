import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectService } from '../services/projectService';
import type { Project } from '../types';

export const PROJECT_KEYS = {
  all: ['projects'] as const,
  lists: () => [...PROJECT_KEYS.all, 'list'] as const,
  byClient: (clientId: string) => [...PROJECT_KEYS.all, 'client', clientId] as const,
};

export function useProjects() {
  return useQuery({
    queryKey: PROJECT_KEYS.lists(),
    queryFn: projectService.getAll,
  });
}

export function useProjectsByClient(clientId: string) {
  return useQuery({
    queryKey: PROJECT_KEYS.byClient(clientId),
    queryFn: () => projectService.getByClient(clientId),
    enabled: !!clientId,
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<Project>) => projectService.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: PROJECT_KEYS.all }),
  });
}

export function useUpdateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<Project> }) =>
      projectService.update(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: PROJECT_KEYS.all }),
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => projectService.softDelete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: PROJECT_KEYS.all }),
  });
}
