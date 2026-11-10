import type { SleepSession } from './types';

// Scoring formula v1 — ported from supabase/functions/checkin (scoreSession).
// Duration 60 + efficiency 25. An unstaged night can't earn the 15-point
// continuity component, so its base is rescaled to 100 instead of faking
// awakenings (DESIGN.md "no stage data" rule).
const DURATION_TARGET_MIN = 480; // 8h
const EFFICIENCY_FULL_MARKS = 0.95;
const STAGED_BASE_MAX = 85;

export interface ScoreResult {
  score: number;
  // Matches BoardEntry.confidence minus null — 'building' for unstaged
  // sessions, 'solid' for staged.
  confidence: 'solid' | 'building';
}

export function scoreSession(session: SleepSession): ScoreResult {
  const duration = Math.min(session.asleepMin / DURATION_TARGET_MIN, 1) * 60;
  const efficiency =
    session.inBedMin > 0
      ? Math.min(session.asleepMin / session.inBedMin / EFFICIENCY_FULL_MARKS, 1) * 25
      : 0;
  if (!session.staged) {
    return {
      score: Math.round(((duration + efficiency) / STAGED_BASE_MAX) * 100),
      confidence: 'building',
    };
  }
  // DESIGN.md formula was max(0, 15 - 2*(awakenings-1)); capped at 15 so
  // zero awakenings can't exceed the component's max.
  const continuity = Math.min(15, Math.max(0, 15 - 2 * (session.awakenings - 1)));
  return { score: Math.round(duration + efficiency + continuity), confidence: 'solid' };
}
