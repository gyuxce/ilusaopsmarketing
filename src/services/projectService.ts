import { supabase } from '../lib/supabase';
import type { Project } from '../types';

export const projectService = {
  async getAll(): Promise<Project[]> {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async getByClient(clientId: string): Promise<Project[]> {
    const { data, error } = await supabase
      .from('projects')
      .select('*, owner:users!projects_owner_id_fkey(name), assignee:users!projects_assignee_id_fkey(name)')
      .eq('client_id', clientId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async create(payload: Partial<Project>): Promise<Project> {
    const { data, error } = await supabase
      .from('projects')
      .insert([payload])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, payload: Partial<Project>): Promise<Project> {
    const { data, error } = await supabase
      .from('projects')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async softDelete(id: string): Promise<void> {
    const { error } = await supabase
      .from('projects')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  },
};
