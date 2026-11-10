import { supabase, isConfigured } from './supabase';
import type { SleepSession, BoardRow, Profile, Friendship } from './types';

const DEMO_BOARD: BoardRow[] = [
  { user_id: 'me', handle: 'you', wake_date: '', score: 87, status: 'scored', confidence: 'solid', formula_version: 1, posted_at: '', late: false },
  { user_id: 'f1', handle: 'ehsan', wake_date: '', score: 91, status: 'scored', confidence: 'solid', formula_version: 1, posted_at: '', late: false },
  { user_id: 'f2', handle: 'sarah', wake_date: '', score: 74, status: 'scored', confidence: 'building', formula_version: 1, posted_at: '', late: true },
  { user_id: 'f3', handle: 'marcus', wake_date: '', score: null, status: null, confidence: null, formula_version: 1, posted_at: '', late: false },
];

export function localDateString(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export async function checkIn(payload: SleepSession | 'missed') {
  if (!isConfigured) {
    const today = localDateString();
    return payload === 'missed'
      ? { wake_date: today, score: null, status: 'missed' as const, already_posted: false }
      : { wake_date: today, score: 87, status: 'scored' as const, already_posted: false };
  }
  const { data, error } = await supabase.functions.invoke('checkin', {
    body:
      payload === 'missed'
        ? { missed: true, tz: Intl.DateTimeFormat().resolvedOptions().timeZone }
        : {
            source: 'healthkit',
            tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
            session: payload,
          },
  });
  if (error) throw error;
  return data as {
    wake_date: string;
    score: number | null;
    status?: 'scored' | 'missed';
    already_posted: boolean;
  };
}

export async function fetchBoard(wakeDate: string): Promise<BoardRow[]> {
  if (!isConfigured) return DEMO_BOARD;
  const { data, error } = await supabase.rpc('friend_board', {
    p_wake_date: wakeDate,
  });
  if (error) throw error;
  return data as BoardRow[];
}

export async function fetchMyProfile(): Promise<Profile | null> {
  if (!isConfigured) {
    return { id: 'me', handle: 'you', tz: 'America/New_York', created_at: '' };
  }
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .single();
  if (error) return null;
  return data;
}

export async function fetchProfiles(ids: string[]): Promise<Profile[]> {
  if (!isConfigured) {
    const demoHandles: Record<string, string> = { f1: 'ehsan', f4: 'dana' };
    return ids.map((id) => ({
      id,
      handle: demoHandles[id] ?? id,
      tz: '',
      created_at: '',
    }));
  }
  const { data } = await supabase
    .from('profiles')
    .select('id, handle')
    .in('id', ids);
  return (data as Profile[]) ?? [];
}

export async function setHandle(handle: string) {
  const { error } = await supabase
    .from('profiles')
    .update({ handle: handle.toLowerCase().trim() })
    .eq('id', (await supabase.auth.getUser()).data.user?.id ?? '');
  return { error };
}

export async function searchHandle(handle: string): Promise<Profile | null> {
  const { data } = await supabase
    .from('profiles')
    .select('id, handle')
    .eq('handle', handle.toLowerCase().trim())
    .maybeSingle();
  return data as Profile | null;
}

export async function sendFriendRequest(addresseeId: string) {
  const uid = (await supabase.auth.getUser()).data.user?.id;
  return supabase
    .from('friendships')
    .insert({ requester_id: uid, addressee_id: addresseeId });
}

export async function acceptFriendRequest(friendshipId: string) {
  if (!isConfigured) return { error: null };
  return supabase
    .from('friendships')
    .update({ status: 'accepted' })
    .eq('id', friendshipId);
}

export async function fetchFriendships(): Promise<Friendship[]> {
  if (!isConfigured) {
    return [
      { id: 'x1', requester_id: 'me', addressee_id: 'f1', status: 'accepted', created_at: '' },
      { id: 'x2', requester_id: 'f4', addressee_id: 'me', status: 'pending', created_at: '' },
    ];
  }
  const { data, error } = await supabase.from('friendships').select('*');
  if (error) throw error;
  return data as Friendship[];
}
