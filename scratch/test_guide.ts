import { supabase } from '../src/lib/supabase';

async function test() {
  const { data, error } = await supabase
    .from('guides')
    .select('*, guide_steps(*)')
    .eq('id', 1)
    .single();
    
  console.log(JSON.stringify(data, null, 2));
  console.log('Error:', error);
}

test();
