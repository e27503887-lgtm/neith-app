import { createClient } from '@supabase/supabase-js';

// .env.local dosyasındaki şifrelerimizi alıyoruz
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Bağlantıyı dışa aktarıyoruz
export const supabase = createClient(supabaseUrl, supabaseAnonKey);