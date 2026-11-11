import type { SleepSession } from './types';

// Scoring formula v2 — aligned with Apple's Sleep Score (watchOS 26 /
// Health app): duration 50 + bedtime consistency 30 + interruptions 20.
// Apple doesn't publish the sub-curves, so the curves below are
// documented approximations of their described behavior.
// An unstaged night can't produce interruptions data, so its base is
// rescaled to 100 instead of faking awakenings (DESIGN.md "no stage
// data" rule).
const DURATION_TARGET_MIN = 480; // 8h
const UNSTAGED_BASE_MAX = 80;

// Bedtime consistency: full marks within ±30 min of your recent median
// bedtime, decaying to 0 at ±3h. Apple compares against the last 13
// nights; we take the same window of prior check-in bedtimes.
const BEDTIME_GRACE_MIN = 30;
const BEDTIME_ZERO_MIN = 180;
const BEDTIME_HISTORY_NIGHTS = 13;

// Interruptions: -2 per awakening, -0.1 per minute awake. A typical
// night (2 awakenings, ~30 min awake) lands ~13/20.
const AWAKENING_PENALTY = 2;
const AWAKE_MIN_PENALTY = 0.1;

export interface ScoreResult {
  score: number;
  // Matches BoardEntry.confidence minus null — 'building' for unstaged
  // sessions, 'solid' for staged.
  confidence: 'solid' | 'building';
}

// Minutes past noon, wrapped to a 24h clock. Night bedtimes (evening →
// early morning) land in a contiguous 0–720 range, so a plain median
// works without circular-mean math for anyone who sleeps at night.
function bedtimeMinutes(iso: string): number {
  const d = new Date(iso);
  const mins = d.getHours() * 60 + d.getMinutes();
  return (mins - 720 + 1440) % 1440;
}

function bedtimePoints(startIso: string, priorBedtimes: string[]): number {
  if (priorBedtimes.length === 0) return 30; // no history to deviate from
  const ref = priorBedtimes
    .slice(0, BEDTIME_HISTORY_NIGHTS)
    .map(bedtimeMinutes)
    .sort((a, b) => a - b);
  const median = ref[Math.floor(ref.length / 2)];
  const dev = Math.abs(bedtimeMinutes(startIso) - median);
  if (dev <= BEDTIME_GRACE_MIN) return 30;
  return Math.max(
    0,
    30 * (1 - (dev - BEDTIME_GRACE_MIN) / (BEDTIME_ZERO_MIN - BEDTIME_GRACE_MIN)),
  );
}

export function scoreSession(
  session: SleepSession,
  priorBedtimes: string[] = [],
): ScoreResult {
  const duration = Math.min(session.asleepMin / DURATION_TARGET_MIN, 1) * 50;
  const bedtime = bedtimePoints(session.start, priorBedtimes);
  if (!session.staged) {
    return {
      score: Math.round(((duration + bedtime) / UNSTAGED_BASE_MAX) * 100),
      confidence: 'building',
    };
  }
  const interruptions = Math.max(
    0,
    20 - session.awakenings * AWAKENING_PENALTY - session.awakeMin * AWAKE_MIN_PENALTY,
  );
  return {
    score: Math.round(duration + bedtime + interruptions),
    confidence: 'solid',
  };
}
