import { createClient } from '@supabase/supabase-js';

// TODO: Replace with real Supabase URL and Anon Key when the project is created in the Supabase Dashboard
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder-url.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseKey);
