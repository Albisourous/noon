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
  score: number;
  formula_version: number;
  posted_at: string;
  late: boolean;
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
}
