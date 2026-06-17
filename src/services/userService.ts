import { supabase } from '../lib/supabase';
import type { User } from '../types';

export const userService = {
  async getAll(): Promise<User[]> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('name');
    if (error) throw error;
    return data ?? [];
  },

  async getById(id: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async create(payload: Partial<User>): Promise<User> {
    const { data, error } = await supabase
      .from('users')
      .insert([payload])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, payload: Partial<User>): Promise<User> {
    const { data, error } = await supabase
      .from('users')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('users').delete().eq('id', id);
    if (error) throw error;
  },
};
