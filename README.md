# Sleeple

Daily sleep-score check-in app. HealthKit → score → friends leaderboard.
See `DESIGN.md` for the system design.

## Layout

- `mobile/` — Expo + React Native (iOS) app
- `supabase/` — Postgres schema (`migrations/`) + Edge Functions (`functions/`)

## Backend setup (one-time)

No Docker required — uses hosted Supabase free tier.

1. Create a project at https://supabase.com/dashboard
2. `supabase link --project-ref <ref>` then `supabase db push`
3. `supabase functions deploy checkin`
4. Copy `mobile/.env.example` to `mobile/.env.local` and fill in
   `EXPO_PUBLIC_SUPABASE_URL` + `EXPO_PUBLIC_SUPABASE_ANON_KEY`
   (project Settings → API).

## Run the app

```bash
cd mobile
npx expo run:ios   # first build: prebuilds ios/, installs pods, compiles
npx expo start     # subsequent dev sessions
```

HealthKit requires a dev build — Expo Go will NOT work.

## Check-in flow

App opens → local noon reminder scheduled → "Check in" reads the most
recent completed sleep session from HealthKit → POSTs to `checkin` →
server upserts `sleep_nights`, computes formula_version=1 score, locks a
`board_entries` row → board shows you + accepted friends for your local
wake date.
