import Healthkit, {
  CategoryValueSleepAnalysis,
} from '@kingstinct/react-native-healthkit';
import type { SleepSession } from './types';

const SLEEP_TYPE = 'HKCategoryTypeIdentifierSleepAnalysis' as const;

// Gap between samples that starts a new session.
const SESSION_GAP_MS = 60 * 60 * 1000;

const ASLEEP_VALUES = new Set<number>([
  CategoryValueSleepAnalysis.asleepCore,
  CategoryValueSleepAnalysis.asleepDeep,
  CategoryValueSleepAnalysis.asleepREM,
  CategoryValueSleepAnalysis.asleepUnspecified,
]);

export async function ensureSleepPermission(): Promise<boolean> {
  if (!Healthkit.isHealthDataAvailable()) return false;
  return Healthkit.requestAuthorization({ toRead: [SLEEP_TYPE] });
}

/**
 * Cluster sleep samples into sessions, return the most recently completed
 * primary session, or null. "Primary" = the cluster with the most asleep
 * time in the lookback window.
 */
export async function getLatestSleepSession(
  lookbackHours = 36,
): Promise<SleepSession | null> {
  const granted = await ensureSleepPermission();
  if (!granted) return null;

  const now = new Date();
  const from = new Date(now.getTime() - lookbackHours * 3600 * 1000);

  const samples = (
    await Healthkit.queryCategorySamples(SLEEP_TYPE, {
      limit: -1,
      ascending: true,
      filter: { date: { startDate: from, endDate: now } },
    })
  ).filter((s) => s.value !== CategoryValueSleepAnalysis.inBed);
  if (samples.length === 0) return null;

  // Cluster into sessions by time gap.
  const sessions: (typeof samples)[] = [[samples[0]]];
  for (let i = 1; i < samples.length; i++) {
    const prevEnd = samples[i - 1].endDate.getTime();
    if (samples[i].startDate.getTime() - prevEnd > SESSION_GAP_MS) {
      sessions.push([]);
    }
    sessions[sessions.length - 1].push(samples[i]);
  }

  // Only completed sessions (ended in the past).
  const completed = sessions.filter(
    (s) => s[s.length - 1].endDate.getTime() < now.getTime(),
  );
  if (completed.length === 0) return null;

  const scored = completed.map((s) => {
    let asleepMin = 0;
    let awakenings = 0;
    for (const sample of s) {
      const dur = (sample.endDate.getTime() - sample.startDate.getTime()) / 60000;
      if (ASLEEP_VALUES.has(sample.value)) asleepMin += dur;
      if (sample.value === CategoryValueSleepAnalysis.awake) awakenings += 1;
    }
    const start = s[0].startDate;
    const end = s[s.length - 1].endDate;
    return {
      start: start.toISOString(),
      end: end.toISOString(),
      asleepMin: Math.round(asleepMin),
      inBedMin: Math.round((end.getTime() - start.getTime()) / 60000),
      awakenings,
    };
  });

  scored.sort((a, b) => b.asleepMin - a.asleepMin);
  return scored[0];
}
