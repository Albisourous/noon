export interface Profile {
  id: string;
  handle: string | null;
  tz: string;
  created_at: string;
}

export interface Friendship {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: 'pending' | 'accepted';
  created_at: string;
  // The friend's latest known score. Populated by a backend once one
  // exists; locally it only resolves when the friend is this device's
  // own handle (e.g. seeded 'albin' on albin's phone).
  score?: number | null;
  score_status?: 'scored' | 'missed' | null;
}

export interface SleepNight {
  user_id: string;
  wake_date: string;
  source: string;
  asleep_min: number;
  inbed_min: number;
  awakenings: number;
  tz: string;
  raw_json: unknown;
  updated_at: string;
}

export interface BoardEntry {
  user_id: string;
  wake_date: string;
  score: number | null;
  formula_version: number;
  posted_at: string;
  late: boolean;
  // null when the member has no entry yet (pending)
  status: 'scored' | 'missed' | null;
  confidence: 'solid' | 'building' | null;
}

export interface BoardRow extends BoardEntry {
  handle: string | null;
}

// A normalized sleep session produced from HealthKit samples.
export interface SleepSession {
  start: string; // ISO
  end: string; // ISO
  asleepMin: number;
  inBedMin: number;
  awakenings: number;
  // Minutes marked awake inside the session — interruptions scoring needs
  // duration, not just count. 0 for unstaged nights.
  awakeMin: number;
  // false when the source wrote no real stage data (inBed +
  // asleepUnspecified only) — scored with redistributed weights,
  // flagged 'building' confidence on the board
  staged: boolean;
}

// What a check-in can score right now (see getSleepState).
export type SleepState =
  | { kind: 'session'; session: SleepSession }
  | { kind: 'still_asleep' }
  | { kind: 'none' }
  | { kind: 'unavailable' };
