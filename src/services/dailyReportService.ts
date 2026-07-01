import { supabase } from '../lib/supabase';
import type { DailyReport } from '../types';

export const dailyReportService = {
  async getAll(): Promise<DailyReport[]> {
    const { data, error } = await supabase
      .from('daily_reports')
      .select('*')
      .is('deleted_at', null)
      .order('report_date', { ascending: false })
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async create(payload: Partial<DailyReport>): Promise<DailyReport> {
    const { data, error } = await supabase
      .from('daily_reports')
      .insert([payload])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, payload: Partial<DailyReport>): Promise<DailyReport> {
    const { data, error } = await supabase
      .from('daily_reports')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async softDelete(id: string): Promise<void> {
    const { error } = await supabase
      .from('daily_reports')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  },
};
