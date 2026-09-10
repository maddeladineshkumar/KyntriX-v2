import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://rpuqrrtdyxvvjxbeiyff.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJwdXFycnRkeXh2dmp4YmVpeWZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwMTk3NTksImV4cCI6MjEwNDU5NTc1OX0.vZGcW-SoyqdCbHuDz485b7aaU7AQqhn0U3o9V9iYlEs';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[KyntriX Supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY environment variables.');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
