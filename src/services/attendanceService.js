import { supabase, isSupabaseConfigured } from './supabaseClient';
import { getLocalDateString } from '../utils/formatters';

const STORAGE_ATTENDANCE_KEY = 'ilusa_attendance_logs';

export const attendanceService = {
  async clockIn(userId, userProfile = null) {
    const today = getLocalDateString();

    if (isSupabaseConfigured && supabase) {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          throw new Error('Your session has expired. Please sign in again.');
        }
        if (user.id !== userId) {
          throw new Error('Clock-in can only be recorded for the signed-in account.');
        }

        const { data, error } = await supabase
          .from('attendance_logs')
          .insert([
            { user_id: userId, clock_date: today }
          ])
          .select()
          .single();
          
        if (error) {
          // If already clocked in, error code 23505 (unique violation)
          if (error.code === '23505') {
            throw new Error('You have already clocked in today.');
          }
          throw error;
        }
        return data;
      } catch (err) {
        console.error('Supabase clock-in error:', err);
        throw err;
      }
    }

    // Fallback for local storage
    if (typeof window !== 'undefined') {
      const logs = JSON.parse(localStorage.getItem(STORAGE_ATTENDANCE_KEY) || '[]');
      const alreadyClockedIn = logs.find(l => l.user_id === userId && l.clock_date === today);
      
      if (alreadyClockedIn) {
        throw new Error('You have already clocked in today.');
      }

      const newLog = {
        id: `att-${Date.now()}`,
        user_id: userId,
        clock_date: today,
        clock_in_time: new Date().toISOString(),
        users: userProfile ? {
          name: userProfile.name || 'Sandbox User',
          email: userProfile.email || '',
          role: userProfile.role || 'Staff',
          department: userProfile.department || 'Ops'
        } : undefined
      };

      logs.push(newLog);
      localStorage.setItem(STORAGE_ATTENDANCE_KEY, JSON.stringify(logs));
      return newLog;
    }

    throw new Error('Cannot clock in - environment not supported');
  },

  async checkClockInStatus(userId) {
    const today = getLocalDateString();

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('attendance_logs')
          .select('*')
          .eq('user_id', userId)
          .eq('clock_date', today)
          .maybeSingle();
          
        if (error) throw error;
        return data; // Returns the log if clocked in, or null if not
      } catch (err) {
        console.error('Supabase check status error:', err);
        throw err;
      }
    }

    if (typeof window !== 'undefined') {
      const logs = JSON.parse(localStorage.getItem(STORAGE_ATTENDANCE_KEY) || '[]');
      const log = logs.find(l => l.user_id === userId && l.clock_date === today);
      return log || null;
    }
    
    return null;
  },

  async getLogs(startDate, endDate) {
    if (isSupabaseConfigured && supabase) {
      try {
        let query = supabase
          .from('attendance_logs')
          .select('*')
          .order('clock_in_time', { ascending: false });

        if (startDate) query = query.gte('clock_date', startDate);
        if (endDate) query = query.lte('clock_date', endDate);

        const { data: logsData, error: logsError } = await query;
        if (logsError) throw logsError;
        
        if (!logsData || logsData.length === 0) return [];

        const userIds = [...new Set(logsData.map(l => l.user_id).filter(Boolean))];
        let usersDict = {};
        
        if (userIds.length > 0) {
          const { data: usersData, error: usersError } = await supabase
            .from('users')
            .select('id, name, email, role, department')
            .in('id', userIds);
            
          if (!usersError && usersData) {
            usersData.forEach(u => {
              usersDict[u.id] = u;
            });
          }
        }

        const enrichedLogs = logsData.map(log => ({
          ...log,
          users: usersDict[log.user_id] || { name: 'New Member', email: 'No Email', role: 'Staff', department: 'Ops' }
        }));

        return enrichedLogs;
      } catch (err) {
        console.error('Supabase get logs error:', err);
        throw err;
      }
    }

    if (typeof window !== 'undefined') {
      const logs = JSON.parse(localStorage.getItem(STORAGE_ATTENDANCE_KEY) || '[]');
      return logs
        .filter(log => (!startDate || log.clock_date >= startDate) && (!endDate || log.clock_date <= endDate))
        .sort((a, b) => new Date(b.clock_in_time) - new Date(a.clock_in_time));
    }

    return [];
  }
};
