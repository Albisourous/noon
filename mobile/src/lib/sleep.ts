import Healthkit, {
  CategoryValueSleepAnalysis,
} from '@kingstinct/react-native-healthkit';
import type { SleepState } from './types';

const SLEEP_TYPE = 'HKCategoryTypeIdentifierSleepAnalysis' as const;

// Gap between samples that starts a new session.
const SESSION_GAP_MS = 60 * 60 * 1000;

// A cluster whose last non-awake sample ended this recently may still be
// in progress. HealthKit writes no trailing "awake" sample at wake, so
// "just woke" and "still asleep" look identical for a short window —
// refuse to score rather than lock a partial night onto the board.
const RECENT_END_MS = 30 * 60 * 1000;

const ASLEEP_VALUES = new Set<number>([
  CategoryValueSleepAnalysis.asleepCore,
  CategoryValueSleepAnalysis.asleepDeep,
  CategoryValueSleepAnalysis.asleepREM,
  CategoryValueSleepAnalysis.asleepUnspecified,
]);

const INBED_VALUES = new Set<number>([CategoryValueSleepAnalysis.inBed]);

// Any of these mean the source wrote real stage data; a session made only
// of inBed + asleepUnspecified is unstaged (e.g. some Garmin→Health writes).
const STAGED_VALUES = new Set<number>([
  CategoryValueSleepAnalysis.asleepCore,
  CategoryValueSleepAnalysis.asleepDeep,
  CategoryValueSleepAnalysis.asleepREM,
  CategoryValueSleepAnalysis.awake,
]);

export async function ensureSleepPermission(): Promise<boolean> {
  if (!Healthkit.isHealthDataAvailable()) return false;
  return Healthkit.requestAuthorization({ toRead: [SLEEP_TYPE] });
}

// Union of overlapping intervals. Two sources (e.g. Apple Watch and a
// Garmin writing via Apple Health) report the same night as overlapping
// samples; summing raw durations double-counts it.
function mergedMinutes(
  samples: readonly { startDate: Date; endDate: Date; value: number }[],
  values: Set<number>,
): number {
  const spans = samples
    .filter((s) => values.has(s.value))
    .map((s) => [s.startDate.getTime(), s.endDate.getTime()])
    .sort((a, b) => a[0] - b[0]);
  let total = 0;
  let curStart = -1;
  let curEnd = -1;
  for (const [start, end] of spans) {
    if (start > curEnd) {
      total += Math.max(0, curEnd - curStart);
      curStart = start;
      curEnd = end;
    } else {
      curEnd = Math.max(curEnd, end);
    }
  }
  total += Math.max(0, curEnd - curStart);
  return total / 60000;
}

function mergedCount(
  samples: readonly { startDate: Date; endDate: Date; value: number }[],
  values: Set<number>,
): number {
  const spans = samples
    .filter((s) => values.has(s.value))
    .map((s) => [s.startDate.getTime(), s.endDate.getTime()])
    .sort((a, b) => a[0] - b[0]);
  let count = 0;
  let curEnd = -1;
  for (const [start, end] of spans) {
    if (start > curEnd) count += 1;
    curEnd = Math.max(curEnd, end);
  }
  return count;
}

/**
 * Resolve what a check-in can score right now:
 * - 'session': the primary (most asleep) completed session in the lookback.
 * - 'still_asleep': the newest cluster may still be running — don't score it.
 * - 'none': no session found — a miss can be recorded.
 * - 'unavailable': HealthKit missing or permission denied — nothing known.
 */
export async function getSleepState(lookbackHours = 36): Promise<SleepState> {
  const granted = await ensureSleepPermission();
  if (!granted) return { kind: 'unavailable' };

  const now = new Date();
  const from = new Date(now.getTime() - lookbackHours * 3600 * 1000);

  const samples = await Healthkit.queryCategorySamples(SLEEP_TYPE, {
    limit: -1,
    ascending: true,
    filter: { date: { startDate: from, endDate: now } },
  });
  if (samples.length === 0) return { kind: 'none' };

  // Cluster into sessions by time gap. inBed samples stay in: they define
  // the true in-bed window, which is the efficiency denominator.
  type Sample = (typeof samples)[number];
  const sessions: Sample[][] = [[samples[0]]];
  for (let i = 1; i < samples.length; i++) {
    const prevEnd = samples[i - 1].endDate.getTime();
    if (samples[i].startDate.getTime() - prevEnd > SESSION_GAP_MS) {
      sessions.push([]);
    }
    sessions[sessions.length - 1].push(samples[i]);
  }

  const newest = sessions[sessions.length - 1];
  const lastSample = newest[newest.length - 1];
  const stillAsleep =
    now.getTime() - lastSample.endDate.getTime() < RECENT_END_MS &&
    lastSample.value !== CategoryValueSleepAnalysis.awake;
  if (stillAsleep) return { kind: 'still_asleep' };

  const scored = sessions.map((s) => ({
    start: s[0].startDate.toISOString(),
    end: s[s.length - 1].endDate.toISOString(),
    // Sources that write only inBed (some Garmin→Health paths) count zero
    // asleep minutes and would vanish as 'none'. Fall back to merged
    // inBed time instead — scored unstaged at 'building' confidence.
    asleepMin: Math.round(
      mergedMinutes(s, ASLEEP_VALUES) || mergedMinutes(s, INBED_VALUES),
    ),
    inBedMin: Math.round(
      (s[s.length - 1].endDate.getTime() - s[0].startDate.getTime()) / 60000,
    ),
    awakenings: mergedCount(
      s,
      new Set([CategoryValueSleepAnalysis.awake]),
    ),
    staged: s.some((sample) => STAGED_VALUES.has(sample.value)),
  }));

  // Primary session = most asleep time, completed sessions only (the
  // still-asleep check above already handled an in-progress cluster).
  scored.sort((a, b) => b.asleepMin - a.asleepMin);
  const primary = scored[0];
  if (primary.asleepMin <= 0) return { kind: 'none' };
  return { kind: 'session', session: primary };
}
