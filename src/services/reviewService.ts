import { supabase } from '../lib/supabase';
import type { WeeklyReview } from '../types';

export const reviewService = {
  async getAll(): Promise<WeeklyReview[]> {
    const { data, error } = await supabase
      .from('weekly_reviews')
      .select('*')
      .order('review_date', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async create(payload: Partial<WeeklyReview>): Promise<WeeklyReview> {
    const { data, error } = await supabase
      .from('weekly_reviews')
      .insert([payload])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, payload: Partial<WeeklyReview>): Promise<WeeklyReview> {
    const { data, error } = await supabase
      .from('weekly_reviews')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase
      .from('weekly_reviews')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },
};
