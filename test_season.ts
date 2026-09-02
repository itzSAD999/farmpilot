import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });
const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function test() {
  // Try to list seasons
  const { data: list, error: listErr } = await supabase.from('seasons').select('id').limit(1);
  if (listErr) {
    console.error('List error:', listErr);
    return;
  }
  console.log('Listed seasons:', list);
  
  if (list && list.length > 0) {
    const id = list[0].id;
    console.log('Fetching season', id);
    const { data, error } = await supabase.from('seasons').select('*, crops(name)').eq('id', id).single();
    if (error) {
      console.error('Get error:', error);
    } else {
      console.log('Get success:', data);
    }
  } else {
    console.log('No seasons found in DB');
  }
}
test();
