import { supabase } from './supabase';
import type { SleepSession, BoardRow, Profile, Friendship } from './types';

export function localDateString(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export async function checkIn(session: SleepSession) {
  const { data, error } = await supabase.functions.invoke('checkin', {
    body: {
      source: 'healthkit',
      tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
      session,
    },
  });
  if (error) throw error;
  return data as {
    wake_date: string;
    score: number;
    already_posted: boolean;
  };
}

export async function fetchBoard(wakeDate: string): Promise<BoardRow[]> {
  const { data, error } = await supabase.rpc('friend_board', {
    p_wake_date: wakeDate,
  });
  if (error) throw error;
  return data as BoardRow[];
}

export async function fetchMyProfile(): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .single();
  if (error) return null;
  return data;
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
  return supabase
    .from('friendships')
    .update({ status: 'accepted' })
    .eq('id', friendshipId);
}

export async function fetchFriendships(): Promise<Friendship[]> {
  const { data, error } = await supabase.from('friendships').select('*');
  if (error) throw error;
  return data as Friendship[];
}
