
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kxbmckzwpkmzokcvtrjd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4Ym1ja3p3cGttem9rY3Z0cmpkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MDI0NDAsImV4cCI6MjA4ODM3ODQ0MH0.OHI-ByGg4bCjclLq7jHd4GImDJ_fjuZQgpdj8F3x7Cw';

export const supabase = createClient(supabaseUrl, supabaseKey);
