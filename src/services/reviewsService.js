import { supabase, isSupabaseConfigured, sanitizeUuid } from './supabaseClient';

const STORAGE_KEY = 'ilusa_weekly_reviews';

const DEFAULT_WEEKLY_REVIEWS = [];

export const reviewsService = {
  async getWeeklyReviews() {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from('weekly_reviews').select('*').order('review_date', { ascending: false });
        if (error) throw error;
        return data;
      } catch (err) {
        console.error('Supabase weekly reviews query failed:', err);
        throw err;
      }
    }

    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : DEFAULT_WEEKLY_REVIEWS;
    }
    return DEFAULT_WEEKLY_REVIEWS;
  },

  async insertWeeklyReview(review) {
    if (isSupabaseConfigured && supabase) {
      try {
        const sanitizedFacilitatorId = await sanitizeUuid(review.facilitator_id, true);
        const { data, error } = await supabase.from('weekly_reviews').insert([{
          ...review,
          facilitator_id: sanitizedFacilitatorId
        }]).select();
        if (error) throw error;
        return data[0];
      } catch (err) {
        console.error('Supabase weekly_reviews insert failed:', err);
        throw err;
      }
    }

    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      const list = stored ? JSON.parse(stored) : [...DEFAULT_WEEKLY_REVIEWS];
      const newReview = {
        ...review,
        id: review.id || `wr-${Math.floor(1000 + Math.random() * 9000)}`,
        completed_at: new Date().toISOString()
      };
      list.unshift(newReview);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      return newReview;
    }
    return review;
  },

  async updateWeeklyReview(id, updates) {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from('weekly_reviews').update(updates).eq('id', id).select();
        if (error) throw error;
        return data[0];
      } catch (err) {
        console.error('Supabase update failed:', err);
        throw err;
      }
    }
    
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        let list = JSON.parse(stored);
        const idx = list.findIndex(r => r.id === id);
        if (idx !== -1) {
          list[idx] = { ...list[idx], ...updates };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
          return list[idx];
        }
      }
    }
    return null;
  },

  async deleteWeeklyReview(id) {
    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase.from('weekly_reviews').delete().eq('id', id);
        if (error) throw error;
        return true;
      } catch (err) {
        console.error('Supabase delete failed:', err);
        throw err;
      }
    }

    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        let list = JSON.parse(stored);
        list = list.filter(r => r.id !== id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
        return true;
      }
    }
    return false;
  }
};
