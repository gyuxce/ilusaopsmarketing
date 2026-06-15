import { supabase, isSupabaseConfigured } from './supabaseClient';

// Fallback Key
const STORAGE_KEY = 'ilusa_clients';

// Default initial data if localStorage is empty
const DEFAULT_CLIENTS = [];

export const clientsService = {
  async getClients(showSoftDeleted = false) {
    if (isSupabaseConfigured && supabase) {
      try {
        let query = supabase.from('clients').select('*');
        if (!showSoftDeleted) {
          query = query.is('deleted_at', null);
        }
        const { data, error } = await query;
        if (error) throw error;
        return data;
      } catch (err) {
        console.error('Supabase clients query failed:', err);
        throw err;
      }
    }

    // LocalStorage Fallback
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      const list = stored ? JSON.parse(stored) : DEFAULT_CLIENTS;
      if (!showSoftDeleted) {
        return list.filter(item => item.deleted_at === null);
      }
      return list;
    }
    return DEFAULT_CLIENTS;
  },

  async insertClient(client) {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from('clients').insert([client]).select();
        if (error) throw error;
        return data[0];
      } catch (err) {
        console.error('Supabase client insert failed:', err);
        throw err;
      }
    }

    // Local Storage fallback
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      const list = stored ? JSON.parse(stored) : [...DEFAULT_CLIENTS];
      const newClient = {
        ...client,
        id: client.id || `cli-${Math.floor(1000 + Math.random() * 9000)}`,
        created_at: new Date().toISOString(),
        deleted_at: null
      };
      list.push(newClient);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      return newClient;
    }
    return client;
  },

  async softDeleteClient(id) {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('clients')
          .update({ deleted_at: new Date().toISOString() })
          .eq('id', id)
          .select();
        if (error) throw error;
        return data[0];
      } catch (err) {
        console.error('Supabase client soft delete failed:', err);
        throw err;
      }
    }

    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      const list = stored ? JSON.parse(stored) : [...DEFAULT_CLIENTS];
      const updated = list.map(item => {
        if (item.id === id) {
          return { ...item, deleted_at: new Date().toISOString() };
        }
        return item;
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated.find(item => item.id === id);
    }
    return null;
  },

  async restoreClient(id) {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('clients')
          .update({ deleted_at: null })
          .eq('id', id)
          .select();
        if (error) throw error;
        return data[0];
      } catch (err) {
        console.error('Supabase client restore failed:', err);
        throw err;
      }
    }

    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      const list = stored ? JSON.parse(stored) : [...DEFAULT_CLIENTS];
      const updated = list.map(item => {
        if (item.id === id) {
          return { ...item, deleted_at: null };
        }
        return item;
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated.find(item => item.id === id);
    }
    return null;
  }
};
