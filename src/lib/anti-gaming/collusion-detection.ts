import { runAnswerSharingDetection, AnswerSharingOptions, AnswerSharingDetectionResult } from './answer-sharing';
import { runWinTradingDetection, WinTradingOptions, WinTradingDetectionResult } from './win-trading';

export interface CollusionDetectionOptions {
  windowStart?: string;
  windowEnd?: string;
  windowDays?: number;
  studentId?: string;
  secondStudentId?: string;
  answerSharing?: AnswerSharingOptions;
  winTrading?: WinTradingOptions;
}

export interface CollusionDetectionResult {
  timestamp: string;
  totalFlaggedCount: number;
  answerSharing: AnswerSharingDetectionResult;
  winTrading: WinTradingDetectionResult;
}

export async function runCollusionDetection(
  options?: CollusionDetectionOptions
): Promise<CollusionDetectionResult> {
  const answerSharingOpts: AnswerSharingOptions = {
    windowStart: options?.windowStart || options?.answerSharing?.windowStart,
    windowEnd: options?.windowEnd || options?.answerSharing?.windowEnd,
    studentId: options?.studentId || options?.answerSharing?.studentId,
    secondStudentId: options?.secondStudentId || options?.answerSharing?.secondStudentId,
    minCommon: options?.answerSharing?.minCommon,
    wrongThreshold: options?.answerSharing?.wrongThreshold,
    maxTimeDeltaSeconds: options?.answerSharing?.maxTimeDeltaSeconds,
  };

  const winTradingOpts: WinTradingOptions = {
    windowStart: options?.windowStart || options?.winTrading?.windowStart,
    windowEnd: options?.windowEnd || options?.winTrading?.windowEnd,
    windowDays: options?.windowDays || options?.winTrading?.windowDays,
    studentId: options?.studentId || options?.winTrading?.studentId,
    secondStudentId: options?.secondStudentId || options?.winTrading?.secondStudentId,
    maxDuelsThreshold: options?.winTrading?.maxDuelsThreshold,
    oneSidedThreshold: options?.winTrading?.oneSidedThreshold,
  };

  const [answerSharingRes, winTradingRes] = await Promise.all([
    runAnswerSharingDetection(answerSharingOpts),
    runWinTradingDetection(winTradingOpts),
  ]);

  return {
    timestamp: new Date().toISOString(),
    totalFlaggedCount: answerSharingRes.flaggedCount + winTradingRes.flaggedCount,
    answerSharing: answerSharingRes,
    winTrading: winTradingRes,
  };
}
