import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEMO_STATE } from './demoState';
import { scoreSession } from './scoring';
import type { SleepSession, BoardRow, Profile, Friendship } from './types';

const DEMO_BOARD: BoardRow[] = [
  { user_id: 'me', handle: 'albin', wake_date: '', score: 87, status: 'scored', confidence: 'solid', formula_version: 1, posted_at: '', late: false },
  { user_id: 'f1', handle: 'ehsan', wake_date: '', score: 91, status: 'scored', confidence: 'solid', formula_version: 1, posted_at: '', late: false },
  { user_id: 'f2', handle: 'sarah', wake_date: '', score: 74, status: 'scored', confidence: 'building', formula_version: 1, posted_at: '', late: true },
  { user_id: 'f3', handle: 'marcus', wake_date: '', score: null, status: null, confidence: null, formula_version: 1, posted_at: '', late: false },
];

const DEMO_BOARD_LONG: BoardRow[] = [
  ...DEMO_BOARD,
  { user_id: 'f5', handle: 'noor', wake_date: '', score: 78, status: 'scored', confidence: 'solid', formula_version: 1, posted_at: '', late: false },
  { user_id: 'f6', handle: 'pia', wake_date: '', score: 45, status: 'scored', confidence: 'building', formula_version: 1, posted_at: '', late: false },
  { user_id: 'f7', handle: 'jon', wake_date: '', score: 68, status: 'scored', confidence: 'solid', formula_version: 1, posted_at: '', late: false },
  { user_id: 'f8', handle: 'mia', wake_date: '', score: 92, status: 'scored', confidence: 'solid', formula_version: 1, posted_at: '', late: false },
  { user_id: 'f9', handle: 'kofi', wake_date: '', score: 55, status: 'scored', confidence: 'building', formula_version: 1, posted_at: '', late: true },
  { user_id: 'f10', handle: 'lena', wake_date: '', score: 71, status: 'scored', confidence: 'solid', formula_version: 1, posted_at: '', late: false },
  { user_id: 'f11', handle: 'tariq', wake_date: '', score: null, status: 'missed', confidence: null, formula_version: 1, posted_at: '', late: false },
  { user_id: 'f12', handle: 'sam', wake_date: '', score: 84, status: 'scored', confidence: 'building', formula_version: 1, posted_at: '', late: false },
];

const FORMULA_VERSION = 1;

// Local-only board state. A check-in is a StoredEntry keyed by wake_date in
// one JSON map — entries are immutable once written, matching the retired
// checkin edge function's insert-first semantics (first post for a
// wake_date wins).
const CHECKINS_KEY = 'sleeple.checkins.v1';
const HANDLE_KEY = 'sleeple.handle.v1';

interface StoredEntry {
  wake_date: string;
  score: number | null;
  status: 'scored' | 'missed';
  confidence: 'solid' | 'building' | null;
  late: boolean;
  posted_at: string;
}

async function readCheckins(): Promise<Record<string, StoredEntry>> {
  try {
    const raw = await AsyncStorage.getItem(CHECKINS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, StoredEntry>) : {};
  } catch {
    return {};
  }
}

async function writeCheckins(checkins: Record<string, StoredEntry>): Promise<void> {
  await AsyncStorage.setItem(CHECKINS_KEY, JSON.stringify(checkins));
}

async function readHandle(): Promise<string | null> {
  return AsyncStorage.getItem(HANDLE_KEY);
}

// Minimal error shape consumers check (`error.message`). Local calls never
// fail, so it's always null.
type ApiError = { message: string } | null;

export function localDateString(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Hour in the user's tz — check-ins after 1pm local are 'late'.
function localHour(tz: string): number {
  return Number(
    new Date().toLocaleString('en-US', {
      timeZone: tz,
      hour: 'numeric',
      hour12: false,
    }),
  );
}

export async function checkIn(payload: SleepSession | 'missed'): Promise<{
  wake_date: string;
  score?: number | null;
  status?: 'scored' | 'missed';
  confidence?: 'solid' | 'building' | null;
  already_posted: boolean;
}> {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const checkins = await readCheckins();
  const now = new Date();
  const late = localHour(tz) >= 13;

  // Missed check-in: no session found on-device. Records an explicit miss
  // for today's local date rather than leaving the row ambiguously pending.
  if (payload === 'missed') {
    const wake_date = now.toLocaleDateString('en-CA', { timeZone: tz });
    const existing = checkins[wake_date];
    if (existing) {
      return {
        wake_date,
        score: existing.score,
        status: existing.status,
        already_posted: true,
      };
    }
    checkins[wake_date] = {
      wake_date,
      score: null,
      status: 'missed',
      confidence: null,
      late,
      posted_at: now.toISOString(),
    };
    await writeCheckins(checkins);
    return { wake_date, score: null, status: 'missed', already_posted: false };
  }

  const wake_date = new Date(payload.end).toLocaleDateString('en-CA', {
    timeZone: tz,
  });

  // Insert-first: an existing entry for this wake_date means the day is
  // already posted — the entry is locked, return it as-is.
  const existing = checkins[wake_date];
  if (existing) {
    return {
      wake_date,
      score: existing.score,
      status: existing.status,
      already_posted: true,
    };
  }

  const { score, confidence } = scoreSession(payload);
  checkins[wake_date] = {
    wake_date,
    score,
    status: 'scored',
    confidence,
    late,
    posted_at: now.toISOString(),
  };
  await writeCheckins(checkins);
  return {
    wake_date,
    score,
    status: 'scored',
    confidence,
    already_posted: false,
  };
}

export async function fetchBoard(wakeDate: string): Promise<BoardRow[]> {
  switch (DEMO_STATE) {
    case 'empty':
      return [];
    case 'missed':
      return DEMO_BOARD.map((r) =>
        r.user_id === 'me' || r.user_id === 'f3'
          ? { ...r, score: null, status: 'missed' as const, confidence: null }
          : r,
      );
    case 'long':
      return DEMO_BOARD_LONG;
    case 'loading':
      return new Promise<BoardRow[]>(() => {});
  }
  // 'default': just my stored entry for wakeDate (or pending). No backend,
  // so no friend rows — demo fixtures stay behind named DEMO_STATEs.
  const stored = (await readCheckins())[wakeDate];
  return [
    {
      user_id: 'me',
      handle: (await readHandle()) ?? 'me',
      wake_date: stored?.wake_date ?? '',
      score: stored?.score ?? null,
      status: stored?.status ?? null,
      confidence: stored?.confidence ?? null,
      formula_version: FORMULA_VERSION,
      posted_at: stored?.posted_at ?? '',
      late: stored?.late ?? false,
    },
  ];
}

export async function fetchMyProfile(): Promise<Profile | null> {
  if (DEMO_STATE === 'loading') return new Promise<Profile | null>(() => {});
  return {
    id: 'me',
    handle: DEMO_STATE === 'onboarding' ? null : await readHandle(),
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
    created_at: '',
  };
}

export async function fetchProfiles(ids: string[]): Promise<Profile[]> {
  return ids.map((id) => ({
    id,
    handle: id,
    tz: '',
    created_at: '',
  }));
}

export async function setHandle(handle: string): Promise<{ error: ApiError }> {
  await AsyncStorage.setItem(HANDLE_KEY, handle.toLowerCase().trim());
  return { error: null };
}

// No backend — nobody is discoverable by handle. Friends tab stays as
// honest-empty UI until a backend returns.
export async function searchHandle(handle: string): Promise<Profile | null> {
  return null;
}

export async function sendFriendRequest(
  addresseeId: string,
): Promise<{ error: ApiError }> {
  return { error: null };
}

export async function acceptFriendRequest(
  friendshipId: string,
): Promise<{ error: ApiError }> {
  return { error: null };
}

export async function fetchFriendships(): Promise<Friendship[]> {
  return [];
}
