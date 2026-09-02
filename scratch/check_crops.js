import { createClient } from '@supabase/supabase-js';
const supabaseUrl = 'https://ifbtitocbwmlqvpowmuu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmYnRpdG9jYndtbHF2cG93bXV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgwODY1NTMsImV4cCI6MjEwMzY2MjU1M30.fikMyYdJS_1ppYJvJb6X_Vso_f0czolPhTlXmue7OXQ';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCrops() {
  const { data, error } = await supabase.from('crops').select('*');
  console.log('Error:', error);
  console.log('Crops Count:', data?.length);
  console.log('Data:', data);
}

checkCrops();
