import { supabase } from '../lib/supabase';
import type { MarketingActivity, ActivityType } from '../types';

export const activityService = {
  async getAll(type?: ActivityType): Promise<MarketingActivity[]> {
    let query = supabase
      .from('marketing_activities')
      .select('*')
      .is('deleted_at', null);

    if (type) query = query.eq('activity_type', type);

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async create(payload: Partial<MarketingActivity>): Promise<MarketingActivity> {
    const { data, error } = await supabase
      .from('marketing_activities')
      .insert([{ ...payload, deleted_at: null }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, payload: Partial<MarketingActivity>): Promise<MarketingActivity> {
    const { data, error } = await supabase
      .from('marketing_activities')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async softDelete(id: string): Promise<void> {
    const { error } = await supabase
      .from('marketing_activities')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  },
};
