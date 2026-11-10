// POST /functions/v1/checkin
// Scored body:  { source: 'healthkit', tz: string,
//                 session: { start, end, asleepMin, inBedMin, awakenings, staged } }
// Missed body:  { missed: true, tz: string }
// Upserts sleep_nights (latest wins), computes formula_version=1 score,
// locks board_entries (insert-only). Entries are immutable after first post.

import { createClient } from 'jsr:@supabase/supabase-js@2';

const FORMULA_VERSION = 1;
const DURATION_TARGET_MIN = 480; // 8h
const EFFICIENCY_FULL_MARKS = 0.95;
// Duration 60 + efficiency 25. An unstaged night can't earn the 15-point
// continuity component, so its base is rescaled to 100 instead of faking
// awakenings (DESIGN.md "no stage data" rule).
const STAGED_BASE_MAX = 85;

interface Session {
  start: string;
  end: string;
  asleepMin: number;
  inBedMin: number;
  awakenings: number;
  staged: boolean;
}

function scoreSession(s: Session): { score: number; confidence: string } {
  const duration = Math.min(s.asleepMin / DURATION_TARGET_MIN, 1) * 60;
  const efficiency =
    s.inBedMin > 0
      ? Math.min(s.asleepMin / s.inBedMin / EFFICIENCY_FULL_MARKS, 1) * 25
      : 0;
  if (!s.staged) {
    return {
      score: Math.round(((duration + efficiency) / STAGED_BASE_MAX) * 100),
      confidence: 'building',
    };
  }
  // DESIGN.md formula was max(0, 15 - 2*(awakenings-1)); capped at 15 so
  // zero awakenings can't exceed the component's max.
  const continuity = Math.min(15, Math.max(0, 15 - 2 * (s.awakenings - 1)));
  return { score: Math.round(duration + efficiency + continuity), confidence: 'solid' };
}

function wakeDate(endIso: string, tz: string): string {
  return new Date(endIso).toLocaleDateString('en-CA', { timeZone: tz });
}

function isValidTz(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en-CA', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

function localHour(tz: string): number {
  return Number(
    new Date().toLocaleString('en-US', { timeZone: tz, hour: 'numeric', hour12: false }),
  );
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('method not allowed', { status: 405 });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: req.headers.get('Authorization')! } } },
  );

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const tz = (body.tz as string) || 'UTC';
  if (!isValidTz(tz)) {
    return Response.json({ error: 'invalid tz' }, { status: 400 });
  }

  // Missed check-in: no session found on-device. Records an explicit miss
  // for today's local date rather than leaving the row ambiguously pending.
  if (body.missed === true) {
    const wake_date = wakeDate(new Date().toISOString(), tz);
    const { error: missError } = await supabase.from('board_entries').insert({
      user_id: user.id,
      wake_date,
      score: null,
      status: 'missed',
      confidence: null,
      formula_version: FORMULA_VERSION,
      late: localHour(tz) >= 13,
    });
    if (missError) {
      if (missError.code === '23505') {
        return Response.json({ wake_date, already_posted: true });
      }
      return Response.json({ error: missError.message }, { status: 500 });
    }
    return Response.json({ wake_date, score: null, status: 'missed', already_posted: false });
  }

  const session = body.session as Session;
  if (!session?.start || !session?.end) {
    return Response.json({ error: 'session.start/end required' }, { status: 400 });
  }

  const wake_date = wakeDate(session.end, tz);

  const { error: upsertError } = await supabase.from('sleep_nights').upsert({
    user_id: user.id,
    wake_date,
    source: body.source ?? 'healthkit',
    start_time: session.start,
    end_time: session.end,
    asleep_min: session.asleepMin,
    inbed_min: session.inBedMin,
    awakenings: session.awakenings,
    tz,
    raw_json: session,
    updated_at: new Date().toISOString(),
  });
  if (upsertError) {
    return Response.json({ error: upsertError.message }, { status: 500 });
  }

  const { score, confidence } = scoreSession(session);

  // Insert-first: the (user_id, wake_date) PK is the lock. A 23505 conflict
  // means an entry is already posted — no select-then-insert race window.
  const { error: insertError } = await supabase.from('board_entries').insert({
    user_id: user.id,
    wake_date,
    score,
    status: 'scored',
    confidence,
    formula_version: FORMULA_VERSION,
    late: localHour(tz) >= 13,
  });
  if (insertError) {
    if (insertError.code === '23505') {
      const { data: existing } = await supabase
        .from('board_entries')
        .select('score, status')
        .eq('user_id', user.id)
        .eq('wake_date', wake_date)
        .maybeSingle();
      return Response.json({
        wake_date,
        score: existing?.score ?? null,
        status: existing?.status ?? 'scored',
        already_posted: true,
      });
    }
    return Response.json({ error: insertError.message }, { status: 500 });
  }

  return Response.json({ wake_date, score, status: 'scored', confidence, already_posted: false });
});
