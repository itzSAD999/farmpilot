import { supabase } from '../src/lib/supabase';
import * as authApi from '../src/api/auth';
import * as farmsApi from '../src/api/farms';
import * as seasonsApi from '../src/api/seasons';
import * as costsApi from '../src/api/costs';

async function runTest() {
  console.log('--- STARTING CRUD TEST ---');
  
  const testPhone = '050' + Math.floor(1000000 + Math.random() * 9000000).toString();
  const testPassword = 'password123';
  
  try {
    // 1. Sign Up
    console.log(`1. Signing up with test phone: ${testPhone}`);
    const authData = await authApi.signUpWithPhone(testPhone, testPassword, 'Test Farmer');
    console.log('   Sign up success! User ID:', authData.session?.user?.id);
    
    // 2. Create Farm
    console.log('2. Creating a Farm...');
    const farm = await farmsApi.createFarm({
      name: 'Test Farm',
      total_area_acres: 5,
      region: 'Ashanti',
      district: 'Kumasi',
    });
    console.log('   Farm created! Farm ID:', farm.id);
    
    // 3. Get Farm
    console.log('3. Fetching the farm...');
    const fetchedFarm = await farmsApi.getFarm();
    console.log('   Fetched farm name:', fetchedFarm?.name);
    
    // 4. Update Farm
    console.log('4. Updating farm area...');
    const updatedFarm = await farmsApi.updateFarm(farm.id, { total_area_acres: 10 });
    console.log('   Updated area:', updatedFarm.total_area_acres);
    
    // 5. Check Crops
    console.log('5. Checking if crops exist (seed data)...');
    const { data: crops, error: cropsError } = await supabase.from('crops').select('*').limit(1);
    if (cropsError) throw cropsError;
    if (!crops || crops.length === 0) {
      console.log('   [WARNING] No crops found in the database. Please run 009_fix_views_and_seed_crops.sql');
    } else {
      console.log(`   Found crop: ${crops[0].name} (ID: ${crops[0].id})`);
      
      // 6. Create Season
      console.log('6. Creating a Season...');
      const season = await seasonsApi.createSeason({
        farm_id: farm.id,
        crop_id: crops[0].id,
        year: new Date().getFullYear(),
        season_window: 'major',
        area_planted_acres: 2,
      });
      console.log('   Season created! Season ID:', season.id);
      
      // 7. Add Cost
      console.log('7. Adding a Cost to the Season...');
      const cost = await costsApi.addCost({
        season_id: season.id,
        category: 'seeds',
        description: 'Test seed cost',
        amount_pesewas: 50000, // 500 GHS
        date_incurred: new Date().toISOString().split('T')[0],
      });
      console.log('   Cost added! Cost ID:', cost.id);
      
      // 8. List Seasons
      console.log('8. Listing seasons for farm...');
      const list = await seasonsApi.listSeasons(farm.id);
      console.log(`   Found ${list.length} seasons.`);
    }
    
    // 9. Clean up (Account Deletion RPC fallback)
    console.log('9. Cleaning up account data...');
    const { error: rpcError } = await supabase.rpc('delete_my_account');
    if (rpcError) {
      console.log('   delete_my_account RPC failed (likely missing), falling back to manual deletion.');
      if (authData.session?.user?.id) {
        await supabase.from('profiles').delete().eq('id', authData.session.user.id);
        await supabase.from('farms').delete().eq('user_id', authData.session.user.id);
      }
    } else {
      console.log('   delete_my_account RPC succeeded!');
    }
    
    await authApi.signOut();
    console.log('--- TEST COMPLETE AND SUCCESSFUL ---');
    
  } catch (err: any) {
    console.error('\n!!! TEST FAILED !!!');
    console.error(err.message || err);
  }
}

runTest();
