import { createClient } from '@supabase/supabase-js';

// Retrieve Supabase URL and key from environment variables (supporting both Vite VITE_ and Next.js NEXT_PUBLIC_ prefixes)
const supabaseUrl = typeof process !== 'undefined' && process.env 
  ? (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || '')
  : (import.meta.env?.VITE_SUPABASE_URL || import.meta.env?.NEXT_PUBLIC_SUPABASE_URL || '');

const supabaseAnonKey = typeof process !== 'undefined' && process.env
  ? (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '')
  : (import.meta.env?.VITE_SUPABASE_ANON_KEY || import.meta.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY || '');

// Check helper
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey && supabaseUrl !== 'YOUR_SUPABASE_URL');

// Create the Supabase client safely
export const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

/**
 * Helper to get active Supabase client or a fallback mock to keep the operations console resilient
 */
export function getSupabaseClient() {
  if (!isSupabaseConfigured) {
    console.warn('Supabase is not fully configured. Using local state fallback.');
  }
  return supabase;
}

/**
 * Validates and sanitizes a UUID string. 
 * Converts mock values (like 'usr-002') to NULL or the currently logged-in user's UUID.
 */
export async function sanitizeUuid(id, fallbackToAuth = false) {
  if (id && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id)) {
    return id;
  }
  if (fallbackToAuth && isSupabaseConfigured && supabase) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id) return user.id;
    } catch (e) {
      console.error('Failed to resolve authenticated user uuid:', e);
    }
  }
  return null;
}

