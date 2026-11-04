// POST /functions/v1/checkin
// Body: { source: 'healthkit', tz: string, session: { start, end, asleepMin, inBedMin, awakenings } }
// Upserts sleep_nights (latest wins), computes formula_version=1 score,
// locks board_entries (insert-only). Entries are immutable after first post.

import { createClient } from 'jsr:@supabase/supabase-js@2';

const FORMULA_VERSION = 1;
const DURATION_TARGET_MIN = 480; // 8h
const EFFICIENCY_FULL_MARKS = 0.95;

interface Session {
  start: string;
  end: string;
  asleepMin: number;
  inBedMin: number;
  awakenings: number;
}

function scoreSession(s: Session): number {
  const duration = Math.min(s.asleepMin / DURATION_TARGET_MIN, 1) * 60;
  const efficiency =
    s.inBedMin > 0
      ? Math.min(s.asleepMin / s.inBedMin / EFFICIENCY_FULL_MARKS, 1) * 25
      : 0;
  // DESIGN.md formula was max(0, 15 - 2*(awakenings-1)); capped at 15 so
  // zero awakenings can't exceed the component's max.
  const continuity = Math.min(15, Math.max(0, 15 - 2 * (s.awakenings - 1)));
  return Math.round(duration + efficiency + continuity);
}

function wakeDate(endIso: string, tz: string): string {
  return new Date(endIso).toLocaleDateString('en-CA', { timeZone: tz });
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
  const session = body.session as Session;
  const tz = (body.tz as string) || 'UTC';
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

  const { data: existing } = await supabase
    .from('board_entries')
    .select('score')
    .eq('user_id', user.id)
    .eq('wake_date', wake_date)
    .maybeSingle();

  if (existing) {
    return Response.json({
      wake_date,
      score: existing.score,
      already_posted: true,
    });
  }

  const score = scoreSession(session);
  const localHour = Number(
    new Date().toLocaleString('en-US', { timeZone: tz, hour: 'numeric', hour12: false }),
  );

  const { error: insertError } = await supabase.from('board_entries').insert({
    user_id: user.id,
    wake_date,
    score,
    formula_version: FORMULA_VERSION,
    late: localHour >= 13,
  });
  if (insertError) {
    return Response.json({ error: insertError.message }, { status: 500 });
  }

  return Response.json({ wake_date, score, already_posted: false });
});
