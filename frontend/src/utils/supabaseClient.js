import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bjtjjbonsliclcvdqhgy.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqdGpqYm9uc2xpY2xjdmRxaGd5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgzMDIzNzMsImV4cCI6MjA2Mzg3ODM3M30.XuQMa4CrHHVl8K1Ho6fMihNZYSDR01_hoJDcNkASv6E';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL veya Anon Key eksik. Lütfen .env dosyasını kontrol edin.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
