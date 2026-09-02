import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });
const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function test() {
  const { data, error } = await supabase
    .from('crop_input_norms')
    .select(`
      crop_id,
      category,
      cost_benchmarks ( input_name )
    `);
  console.log(data, error);
}
test();
