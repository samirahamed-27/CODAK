import { runSpikeDetection } from '../src/lib/anti-gaming/spike-detection';

try {
  process.loadEnvFile?.('.env.local');
} catch {}

async function main() {
  const args = process.argv.slice(2);
  let targetDate: string | undefined;

  const dateIdx = args.indexOf('--date');
  if (dateIdx !== -1 && args[dateIdx + 1]) {
    targetDate = args[dateIdx + 1];
  }

  console.log(`Running XP Spike Detection for date: ${targetDate || 'Today (Asia/Kolkata)'}...`);
  const result = await runSpikeDetection({ targetDate });
  console.log('Spike Detection Completed:');
  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error('Spike detection CLI failed:', err);
  process.exit(1);
});
