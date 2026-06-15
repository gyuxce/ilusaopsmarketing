import { supabase, isSupabaseConfigured, sanitizeUuid } from './supabaseClient';

const STORAGE_ACTIVITIES_KEY = 'ilusa_marketing_activities';
const STORAGE_PERFORMANCE_KEY = 'ilusa_performance_entries';

const INITIAL_ACTIVITIES = [
  { 
    id: 'act-001', 
    client_id: 'cli-001', 
    project_id: 'prj-001', 
    activity_type: 'campaign', 
    title: 'Traveloka June Flight Promo', 
    owner_id: 'usr-003', 
    status: 'Active', 
    start_date: '2026-06-01', 
    end_date: '2026-06-30', 
    channel: 'Meta Ads', 
    budget: 45000000, 
    created_at: '2026-05-28', 
    deleted_at: null 
  },
  { 
    id: 'act-002', 
    client_id: 'cli-002', 
    project_id: 'prj-002', 
    activity_type: 'creative_test', 
    title: 'TikTok UGC Spark Testing', 
    owner_id: 'usr-003', 
    status: 'Active', 
    start_date: '2026-06-01', 
    end_date: '2026-06-30', 
    channel: 'TikTok Ads', 
    budget: 30000000, 
    created_at: '2026-05-29', 
    deleted_at: null 
  },
  { 
    id: 'act-003', 
    client_id: 'cli-003', 
    project_id: 'prj-003', 
    activity_type: 'content', 
    title: 'Instagram Reels & Coffee Hacks', 
    owner_id: 'usr-002', 
    status: 'Active', 
    start_date: '2026-06-01', 
    end_date: '2026-06-30', 
    channel: 'Instagram', 
    budget: 15000000, 
    created_at: '2026-03-25', 
    deleted_at: null 
  },
];

const INITIAL_PERFORMANCE_ENTRIES = [
  // For act-001 (Traveloka June Flight Promo)
  { id: 'perf-001', activity_id: 'act-001', metric_date: '2026-06-01', spend: 1500000, reach: 25000, impressions: 32000, clicks: 960, results: 48, revenue: 5200000, notes: 'Initial meta catalog run.' },
  { id: 'perf-002', activity_id: 'act-001', metric_date: '2026-06-02', spend: 1800000, reach: 29000, impressions: 38000, clicks: 1140, results: 54, revenue: 6400000, notes: 'Optimized bidding cap.' },
  { id: 'perf-003', activity_id: 'act-001', metric_date: '2026-06-03', spend: 2000000, reach: 35000, impressions: 45000, clicks: 1420, results: 68, revenue: 8900000, notes: 'Good spikes.' },
  { id: 'perf-004', activity_id: 'act-001', metric_date: '2026-06-04', spend: 2200000, reach: 38000, impressions: 49000, clicks: 1510, results: 72, revenue: 10400000, notes: 'Stable CTR.' },
  { id: 'perf-005', activity_id: 'act-001', metric_date: '2026-06-05', spend: 2500000, reach: 42000, impressions: 55000, clicks: 1780, results: 85, revenue: 13500000, notes: 'Weekend boost prep.' },
  
  // For act-002 (TikTok UGC Spark Testing)
  { id: 'perf-006', activity_id: 'act-002', metric_date: '2026-06-01', spend: 1000000, reach: 40000, impressions: 65000, clicks: 1950, results: 120, revenue: 3200000, notes: 'Launch creator variant A.' },
  { id: 'perf-007', activity_id: 'act-002', metric_date: '2026-06-02', spend: 1100000, reach: 45000, impressions: 72000, clicks: 2160, results: 135, revenue: 3800000, notes: 'Creator variant B.' },
  { id: 'perf-008', activity_id: 'act-002', metric_date: '2026-06-03', spend: 1300000, reach: 52000, impressions: 84000, clicks: 2680, results: 162, revenue: 4700000, notes: 'Scaling spark post.' },

  // For act-003 (Instagram Reels)
  { id: 'perf-009', activity_id: 'act-003', metric_date: '2026-06-01', spend: 500000, reach: 12000, impressions: 22000, clicks: 810, results: 45, revenue: 1500000, notes: 'Reel engagement setup.' },
  { id: 'perf-010', activity_id: 'act-003', metric_date: '2026-06-02', spend: 500000, reach: 13000, impressions: 24000, clicks: 890, results: 50, revenue: 1800000, notes: 'Steady organic traffic push.' }
];

export const marketingService = {
  // --------- ACTIVITIES ---------
  async getCampaigns() {
    return this.getActivities('campaign');
  },

  /**
   * getActivities(type) — filter by activity_type: 'campaign', 'creative_test', 'content'
   */
  async getActivities(type = null) {
    if (isSupabaseConfigured && supabase) {
      try {
        let query = supabase
          .from('marketing_activities')
          .select('*')
          .is('deleted_at', null);
          
        if (type) {
          query = query.eq('activity_type', type);
        }
        
        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
      } catch (err) {
        console.error('Supabase query activities error:', err);
      }
    }

    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_ACTIVITIES_KEY);
      let list = stored ? JSON.parse(stored) : INITIAL_ACTIVITIES;
      
      // Seed default on first run
      if (!stored) {
        localStorage.setItem(STORAGE_ACTIVITIES_KEY, JSON.stringify(INITIAL_ACTIVITIES));
      }

      list = list.filter(item => item.deleted_at === null);
      if (type) {
        list = list.filter(item => item.activity_type === type);
      }
      return list;
    }

    return type ? INITIAL_ACTIVITIES.filter(a => a.activity_type === type) : INITIAL_ACTIVITIES;
  },

  /**
   * createActivity(data)
   */
  async createActivity(data) {
    if (isSupabaseConfigured && supabase) {
      try {
        const sanitizedOwnerId = await sanitizeUuid(data.owner_id);
        const { data: inserted, error } = await supabase
          .from('marketing_activities')
          .insert([{
            ...data,
            owner_id: sanitizedOwnerId,
            created_at: new Date().toISOString(),
            deleted_at: null
          }])
          .select();
        if (error) throw error;
        return inserted[0];
      } catch (err) {
        console.error('Supabase createActivity error:', err);
        throw err;
      }
    }

    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_ACTIVITIES_KEY);
      const list = stored ? JSON.parse(stored) : [...INITIAL_ACTIVITIES];
      const newActivity = {
        ...data,
        id: `act-${Math.floor(1000 + Math.random() * 9000)}`,
        created_at: new Date().toISOString(),
        deleted_at: null
      };
      list.push(newActivity);
      localStorage.setItem(STORAGE_ACTIVITIES_KEY, JSON.stringify(list));
      return newActivity;
    }

    return { 
      id: `act-${Math.floor(1000 + Math.random() * 9000)}`, 
      ...data, 
      created_at: new Date().toISOString(), 
      deleted_at: null 
    };
  },

  /**
   * updateActivity(id, data)
   */
  async updateActivity(id, data) {
    if (isSupabaseConfigured && supabase) {
      try {
        const payload = { ...data };
        if (payload.owner_id !== undefined) {
          payload.owner_id = await sanitizeUuid(payload.owner_id);
        }
        const { data: updated, error } = await supabase
          .from('marketing_activities')
          .update(payload)
          .eq('id', id)
          .select();
        if (error) throw error;
        return updated[0];
      } catch (err) {
        console.error('Supabase updateActivity error:', err);
        throw err;
      }
    }

    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_ACTIVITIES_KEY);
      const list = stored ? JSON.parse(stored) : [...INITIAL_ACTIVITIES];
      let updatedObj = null;
      const updatedList = list.map(item => {
        if (item.id === id) {
          updatedObj = { ...item, ...data };
          return updatedObj;
        }
        return item;
      });
      localStorage.setItem(STORAGE_ACTIVITIES_KEY, JSON.stringify(updatedList));
      return updatedObj || { id, ...data };
    }

    return { id, ...data };
  },

  /**
   * softDeleteActivity(id)
   */
  async softDeleteActivity(id) {
    const deletedAt = new Date().toISOString();
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: deleted, error } = await supabase
          .from('marketing_activities')
          .update({ deleted_at: deletedAt })
          .eq('id', id)
          .select();
        if (error) throw error;
        return deleted[0];
      } catch (err) {
        console.error('Supabase softDeleteActivity error:', err);
        throw err;
      }
    }

    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_ACTIVITIES_KEY);
      const list = stored ? JSON.parse(stored) : [...INITIAL_ACTIVITIES];
      let deletedObj = null;
      const updatedList = list.map(item => {
        if (item.id === id) {
          deletedObj = { ...item, deleted_at: deletedAt };
          return deletedObj;
        }
        return item;
      });
      localStorage.setItem(STORAGE_ACTIVITIES_KEY, JSON.stringify(updatedList));
      return deletedObj || { id, deleted_at: deletedAt };
    }

    return { id, deleted_at: deletedAt };
  },

  // --------- PERFORMANCE ENTRIES ---------
  /**
   * getPerformanceEntries(activityId)
   */
  async getPerformanceEntries(activityId = null) {
    if (isSupabaseConfigured && supabase) {
      try {
        let query = supabase.from('performance_entries').select('*');
        if (activityId) {
          query = query.eq('activity_id', activityId);
        }
        const { data, error } = await query.order('metric_date', { ascending: false });
        if (error) throw error;
        return data || [];
      } catch (err) {
        console.error('Supabase query performance entries error:', err);
      }
    }

    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_PERFORMANCE_KEY);
      const list = stored ? JSON.parse(stored) : INITIAL_PERFORMANCE_ENTRIES;
      
      if (!stored) {
        localStorage.setItem(STORAGE_PERFORMANCE_KEY, JSON.stringify(INITIAL_PERFORMANCE_ENTRIES));
      }

      if (activityId) {
        return list.filter(item => item.activity_id === activityId);
      }
      return list;
    }

    return activityId 
      ? INITIAL_PERFORMANCE_ENTRIES.filter(item => item.activity_id === activityId)
      : INITIAL_PERFORMANCE_ENTRIES;
  },

  /**
   * createPerformanceEntry(data)
   */
  async createPerformanceEntry(data) {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: inserted, error } = await supabase
          .from('performance_entries')
          .insert([data])
          .select();
        if (error) throw error;
        return inserted[0];
      } catch (err) {
        console.error('Supabase createPerformanceEntry error:', err);
        throw err;
      }
    }

    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_PERFORMANCE_KEY);
      const list = stored ? JSON.parse(stored) : [...INITIAL_PERFORMANCE_ENTRIES];
      const newEntry = {
        ...data,
        id: `perf-${Math.floor(1000 + Math.random() * 9000)}`,
        spend: Number(data.spend || 0),
        reach: Number(data.reach || 0),
        impressions: Number(data.impressions || 0),
        clicks: Number(data.clicks || 0),
        results: Number(data.results || 0),
        revenue: Number(data.revenue || 0)
      };
      list.push(newEntry);
      localStorage.setItem(STORAGE_PERFORMANCE_KEY, JSON.stringify(list));
      return newEntry;
    }

    return { 
      id: `perf-${Math.floor(1000 + Math.random() * 9000)}`, 
      ...data,
      spend: Number(data.spend || 0),
      reach: Number(data.reach || 0),
      impressions: Number(data.impressions || 0),
      clicks: Number(data.clicks || 0),
      results: Number(data.results || 0),
      revenue: Number(data.revenue || 0)
    };
  },

  /**
   * updatePerformanceEntry(id, data)
   */
  async updatePerformanceEntry(id, data) {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: updated, error } = await supabase
          .from('performance_entries')
          .update(data)
          .eq('id', id)
          .select();
        if (error) throw error;
        return updated[0];
      } catch (err) {
        console.error('Supabase updatePerformanceEntry error:', err);
        throw err;
      }
    }

    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_PERFORMANCE_KEY);
      const list = stored ? JSON.parse(stored) : [...INITIAL_PERFORMANCE_ENTRIES];
      let updatedObj = null;
      const updatedList = list.map(item => {
        if (item.id === id) {
          updatedObj = { 
            ...item, 
            ...data,
            spend: Number(data.spend !== undefined ? data.spend : item.spend),
            reach: Number(data.reach !== undefined ? data.reach : item.reach),
            impressions: Number(data.impressions !== undefined ? data.impressions : item.impressions),
            clicks: Number(data.clicks !== undefined ? data.clicks : item.clicks),
            results: Number(data.results !== undefined ? data.results : item.results),
            revenue: Number(data.revenue !== undefined ? data.revenue : item.revenue)
          };
          return updatedObj;
        }
        return item;
      });
      localStorage.setItem(STORAGE_PERFORMANCE_KEY, JSON.stringify(updatedList));
      return updatedObj || { id, ...data };
    }

    return { id, ...data };
  },

  /**
   * deletePerformanceEntry(id)
   */
  async deletePerformanceEntry(id) {
    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase
          .from('performance_entries')
          .delete()
          .eq('id', id);
        if (error) throw error;
        return true;
      } catch (err) {
        console.error('Supabase deletePerformanceEntry error:', err);
        throw err;
      }
    }

    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_PERFORMANCE_KEY);
      const list = stored ? JSON.parse(stored) : [...INITIAL_PERFORMANCE_ENTRIES];
      const filtered = list.filter(item => item.id !== id);
      localStorage.setItem(STORAGE_PERFORMANCE_KEY, JSON.stringify(filtered));
      return true;
    }
    return true;
  }
};
