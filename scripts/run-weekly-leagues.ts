import { createClient as createAdminClient } from '@supabase/supabase-js';
import { executeWeeklyLeagueRollover } from '../src/lib/leagues';
import { getIstWeekDetails } from '../src/lib/quests';

async function main() {
  const args = process.argv.slice(2);
  let closingWeekKey = args[0];
  let newWeekKey = args[1];

  if (!closingWeekKey) {
    const currentDetails = getIstWeekDetails();
    newWeekKey = newWeekKey || currentDetails.periodKey;

    const prevDate = new Date();
    prevDate.setDate(prevDate.getDate() - 7);
    closingWeekKey = getIstWeekDetails(prevDate).periodKey;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Error: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing in environment.');
    process.exit(1);
  }

  const adminClient = createAdminClient(supabaseUrl, serviceRoleKey);

  console.log(`Starting Weekly League Rollover: Closing ${closingWeekKey} -> New ${newWeekKey}...`);
  const result = await executeWeeklyLeagueRollover(closingWeekKey, newWeekKey, adminClient);
  console.log('Rollover successfully completed:');
  console.log(`- Groups Processed: ${result.groupsProcessed}`);
  console.log(`- Promoted Students: ${result.promotedCount}`);
  console.log(`- Relegated Students: ${result.relegatedCount}`);
  console.log(`- Retained Students: ${result.retainedCount}`);
}

main().catch((err) => {
  console.error('Fatal error during weekly league rollover:', err);
  process.exit(1);
});
