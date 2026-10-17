import { runCollusionDetection } from '../src/lib/anti-gaming/collusion-detection';

async function main() {
  console.log('--- Anti-Gaming: Collusion Detection (Answer Sharing & Win Trading) ---');
  console.log(`Starting scan at: ${new Date().toISOString()}`);

  try {
    const result = await runCollusionDetection();

    console.log('\n--- Answer Sharing Results ---');
    console.log(`Evaluated Pairs: ${result.answerSharing.evaluatedPairs}`);
    console.log(`Flagged Pairs:   ${result.answerSharing.flaggedCount}`);
    if (result.answerSharing.flags.length > 0) {
      console.table(
        result.answerSharing.flags.map((f) => ({
          flagId: f.id,
          studentA: f.studentA.slice(0, 8),
          studentB: f.studentB.slice(0, 8),
          commonQ: f.commonQuestionsCount,
          sharedWrong: f.sharedWrongCount,
          sharedRight: f.sharedRightCount,
          wrongRatio: `${(f.wrongMatchRatio * 100).toFixed(0)}%`,
          severity: f.severity,
        }))
      );
    }

    console.log('\n--- Win Trading Results ---');
    console.log(`Evaluated Pairs: ${result.winTrading.evaluatedPairs}`);
    console.log(`Flagged Pairs:   ${result.winTrading.flaggedCount}`);
    if (result.winTrading.flags.length > 0) {
      console.table(
        result.winTrading.flags.map((f) => ({
          flagId: f.id,
          studentA: f.studentA.slice(0, 8),
          studentB: f.studentB.slice(0, 8),
          totalDuels: f.totalDuels,
          winsA: f.studentAWins,
          winsB: f.studentBWins,
          draws: f.draws,
          oneSidedRatio: `${(f.oneSidedRatio * 100).toFixed(0)}%`,
          severity: f.severity,
        }))
      );
    }

    console.log(`\nScan completed. Total flags created: ${result.totalFlaggedCount}\n`);
    process.exit(0);
  } catch (error: any) {
    console.error('Collusion detection failed with error:', error);
    process.exit(1);
  }
}

main();
