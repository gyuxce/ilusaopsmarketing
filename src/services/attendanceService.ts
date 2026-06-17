import { supabase } from '../lib/supabase';
import type { AttendanceLog } from '../types';
import { getLocalDateString } from '../utils/formatters';

export const attendanceService = {
  async clockIn(userId: string): Promise<AttendanceLog> {
    // Verify the authenticated user matches
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error('Session expired. Please sign in again.');
    if (user.id !== userId) throw new Error('Clock-in can only be recorded for your own account.');

    const today = getLocalDateString();
    const { data, error } = await supabase
      .from('attendance_logs')
      .insert([{ user_id: userId, clock_date: today }])
      .select()
      .single();

    if (error) {
      if (error.code === '23505') throw new Error('You have already clocked in today.');
      throw error;
    }
    return data;
  },

  async checkTodayStatus(userId: string): Promise<AttendanceLog | null> {
    const today = getLocalDateString();
    const { data, error } = await supabase
      .from('attendance_logs')
      .select('*')
      .eq('user_id', userId)
      .eq('clock_date', today)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async getLogs(startDate?: string, endDate?: string): Promise<AttendanceLog[]> {
    let query = supabase
      .from('attendance_logs')
      .select('*, users(name, email, role, department)')
      .order('clock_in_time', { ascending: false });

    if (startDate) query = query.gte('clock_date', startDate);
    if (endDate) query = query.lte('clock_date', endDate);

    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  },
};
