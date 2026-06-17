import { supabase } from '../lib/supabase';
import type { Client } from '../types';

export const clientService = {
  async getAll(): Promise<Client[]> {
    const { data, error } = await supabase
      .from('clients')
      .select('*, owner:users!clients_owner_id_fkey(name)')
      .is('deleted_at', null)
      .order('company_name');
    if (error) throw error;
    return (data ?? []).map((item) => ({
      ...item,
      ownerName: item.owner?.name ?? 'Unassigned',
    }));
  },

  async getAllIncludingDeleted(): Promise<Client[]> {
    const { data, error } = await supabase
      .from('clients')
      .select('*, owner:users!clients_owner_id_fkey(name)')
      .order('company_name');
    if (error) throw error;
    return (data ?? []).map((item) => ({
      ...item,
      ownerName: item.owner?.name ?? 'Unassigned',
    }));
  },

  async create(payload: Partial<Client>): Promise<Client> {
    const { data, error } = await supabase
      .from('clients')
      .insert([payload])
      .select('*, owner:users!clients_owner_id_fkey(name)')
      .single();
    if (error) throw error;
    return { ...data, ownerName: data.owner?.name ?? 'Unassigned' };
  },

  async update(id: string, payload: Partial<Client>): Promise<Client> {
    const { data, error } = await supabase
      .from('clients')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*, owner:users!clients_owner_id_fkey(name)')
      .single();
    if (error) throw error;
    return { ...data, ownerName: data.owner?.name ?? 'Unassigned' };
  },

  async softDelete(id: string): Promise<void> {
    const { error } = await supabase
      .from('clients')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  },

  async restore(id: string): Promise<void> {
    const { error } = await supabase
      .from('clients')
      .update({ deleted_at: null })
      .eq('id', id);
    if (error) throw error;
  },
};
