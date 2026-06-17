import { supabase } from '../lib/supabase';
import type { WorkItem, WorkItemStatus } from '../types';

interface WorkItemFilters {
  status?: WorkItemStatus | 'All';
  priority?: string;
  assignee_id?: string;
  client_id?: string;
  project_id?: string;
}

export const workItemService = {
  async getAll(filters: WorkItemFilters = {}): Promise<WorkItem[]> {
    let query = supabase
      .from('work_items')
      .select('*')
      .is('deleted_at', null);

    if (filters.status && filters.status !== 'All') {
      query = query.eq('status', filters.status);
    }
    if (filters.priority && filters.priority !== 'All') {
      query = query.eq('priority', filters.priority);
    }
    if (filters.assignee_id && filters.assignee_id !== 'All') {
      query = query.eq('assignee_id', filters.assignee_id);
    }
    if (filters.client_id && filters.client_id !== 'All') {
      query = query.eq('client_id', filters.client_id);
    }
    if (filters.project_id && filters.project_id !== 'All') {
      query = query.eq('project_id', filters.project_id);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async create(payload: Partial<WorkItem>): Promise<WorkItem> {
    const { data, error } = await supabase
      .from('work_items')
      .insert([{ ...payload, deleted_at: null }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, payload: Partial<WorkItem>): Promise<WorkItem> {
    const { data, error } = await supabase
      .from('work_items')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateStatus(id: string, status: WorkItemStatus): Promise<WorkItem> {
    const completedAt = status === 'Done' ? new Date().toISOString() : null;
    return this.update(id, { status, completed_at: completedAt });
  },

  async softDelete(id: string): Promise<void> {
    const { error } = await supabase
      .from('work_items')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  },
};
