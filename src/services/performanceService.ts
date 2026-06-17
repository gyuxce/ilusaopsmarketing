import { supabase } from '../lib/supabase';
import type { PerformanceEntry } from '../types';

export const performanceService = {
  async getByActivity(activityId: string): Promise<PerformanceEntry[]> {
    const { data, error } = await supabase
      .from('performance_entries')
      .select('*')
      .eq('activity_id', activityId)
      .order('metric_date', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async getAll(): Promise<PerformanceEntry[]> {
    const { data, error } = await supabase
      .from('performance_entries')
      .select('*')
      .order('metric_date', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async create(payload: Partial<PerformanceEntry>): Promise<PerformanceEntry> {
    const { data, error } = await supabase
      .from('performance_entries')
      .insert([payload])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, payload: Partial<PerformanceEntry>): Promise<PerformanceEntry> {
    const { data, error } = await supabase
      .from('performance_entries')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase
      .from('performance_entries')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  async upsertMany(payloads: Partial<PerformanceEntry>[]): Promise<PerformanceEntry[]> {
    const { data, error } = await supabase
      .from('performance_entries')
      .upsert(payloads, { onConflict: 'activity_id,metric_date' })
      .select();
    if (error) throw error;
    return data ?? [];
  },
};
