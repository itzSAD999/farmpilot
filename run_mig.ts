import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config({ path: '.env.local' });
dotenv.config();

const url = process.env.VITE_SUPABASE_URL || '';
const key = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(url, key);

async function run() {
  const sql = fs.readFileSync('supabase/migrations/002_seed_benchmarks.sql', 'utf8');
  const { data, error } = await supabase.rpc('exec_sql', { query: sql });
  if (error) console.error('RPC Error:', error);
  else console.log('Success:', data);
}
run();
