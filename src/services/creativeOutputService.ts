import { supabase } from '../lib/supabase';
import type { CreativeOutput } from '../types';

export const creativeOutputService = {
  async getAll(): Promise<CreativeOutput[]> {
    const { data, error } = await supabase
      .from('creative_outputs')
      .select('*')
      .is('deleted_at', null)
      .order('output_date', { ascending: false })
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async create(payload: Partial<CreativeOutput>): Promise<CreativeOutput> {
    const { data, error } = await supabase
      .from('creative_outputs')
      .insert([payload])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, payload: Partial<CreativeOutput>): Promise<CreativeOutput> {
    const { data, error } = await supabase
      .from('creative_outputs')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async softDelete(id: string): Promise<void> {
    const { error } = await supabase
      .from('creative_outputs')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  },
};
