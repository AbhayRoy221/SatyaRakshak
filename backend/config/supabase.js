import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

let supabase = null;
let isConnected = false;

if (supabaseUrl && supabaseKey && supabaseUrl !== 'https://your-project.supabase.co') {
  supabase = createClient(supabaseUrl, supabaseKey);
  isConnected = true;
  console.log('✅ Supabase connected');
} else {
  console.warn('⚠️  Supabase not configured — running in local fallback mode');
}

/**
 * Initialize Supabase tables if they don't exist.
 * Run this once after creating your Supabase project.
 * The SQL schema is in backend/data/supabase-schema.sql
 */
export async function testConnection() {
  if (!supabase) return false;
  try {
    const { data, error } = await supabase.from('source_reputation').select('count', { count: 'exact', head: true });
    if (error && error.code === '42P01') {
      console.warn('⚠️  Tables not found — run supabase-schema.sql first');
      return false;
    }
    return true;
  } catch (err) {
    console.error('❌ Supabase connection test failed:', err.message);
    return false;
  }
}

export { supabase, isConnected };
