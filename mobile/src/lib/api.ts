import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isConfigured } from './supabase';
import { DEMO_STATE } from './demoState';
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
  if (!isConfigured) {
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
      default:
        return DEMO_BOARD;
    }
  }
  const { data, error } = await supabase.rpc('friend_board', {
    p_wake_date: wakeDate,
  });
  if (error) throw error;
  return data as BoardRow[];
}

export async function fetchMyProfile(): Promise<Profile | null> {
  if (!isConfigured) {
    if (DEMO_STATE === 'loading') return new Promise<Profile | null>(() => {});
    return {
      id: 'me',
      handle: DEMO_STATE === 'onboarding' ? null : 'albin',
      tz: 'America/New_York',
      invited: true,
      created_at: '',
    };
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
      invited: true,
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
  if (!isConfigured) return { error: null };
  const { error } = await supabase
    .from('profiles')
    .update({ handle: handle.toLowerCase().trim() })
    .eq('id', (await supabase.auth.getUser()).data.user?.id ?? '');
  return { error };
}

export async function searchHandle(handle: string): Promise<Profile | null> {
  if (!isConfigured) {
    const h = handle.toLowerCase().trim();
    return h ? { id: 'demo-new', handle: h, tz: '', invited: true, created_at: '' } : null;
  }
  const { data } = await supabase
    .from('profiles')
    .select('id, handle')
    .eq('handle', handle.toLowerCase().trim())
    .maybeSingle();
  return data as Profile | null;
}

export async function sendFriendRequest(addresseeId: string) {
  if (!isConfigured) return { error: null };
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
    if (DEMO_STATE === 'empty-friends') return [];
    return [
      { id: 'x1', requester_id: 'me', addressee_id: 'f1', status: 'accepted', created_at: '' },
      { id: 'x2', requester_id: 'f4', addressee_id: 'me', status: 'pending', created_at: '' },
    ];
  }
  const { data, error } = await supabase.from('friendships').select('*');
  if (error) throw error;
  return data as Friendship[];
}

const PENDING_INVITE_KEY = 'sleeple.pending_invite';

// Invite codes arrive via the sleeple://invite/<code> deeplink route. They
// are stored (not redeemed) so a not-yet-signed-in user can finish OTP
// auth first; the board consumes the code on next load.
export async function savePendingInvite(code: string): Promise<void> {
  await AsyncStorage.setItem(PENDING_INVITE_KEY, code.toLowerCase().trim());
}

export async function consumePendingInvite(): Promise<string | null> {
  const code = await AsyncStorage.getItem(PENDING_INVITE_KEY);
  if (code) await AsyncStorage.removeItem(PENDING_INVITE_KEY);
  return code;
}

export async function redeemInvite(
  code: string,
): Promise<{ error: { message: string } | null }> {
  if (!isConfigured) return { error: null };
  const { error } = await supabase.rpc('redeem_invite', {
    p_code: code.toLowerCase().trim(),
  });
  return { error };
}

export async function createInvite(): Promise<string | null> {
  if (!isConfigured) return 'demo-invite';
  const { data, error } = await supabase.rpc('create_invite');
  if (error) return null;
  return data as string;
}
