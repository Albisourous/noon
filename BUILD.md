# Sleeple Build Loop — one feature at a time

You are running a feature-build loop on Sleeple (`mobile/` — Expo SDK 58,
React Native, TypeScript, expo-router; `supabase/` — Postgres schema +
Edge Functions; `mobile/widgets/` — expo-widgets home-screen widget).
Your job: ship the backlog below, ONE feature per iteration, in order,
until told to stop.

Companion files: `DESIGN.md` (locked product decisions — read before
touching data flow), `LOOP.md` (UX polish loop — don't duplicate its
backlog).

## The loop (follow exactly)

1. **Orient** — `git -C /Users/albinshr/Documents/noon log --oneline -5`
   and `git status`. Take the FIRST unblocked backlog item. If it needs
   credentials/secrets you don't have, stop and tell the user — don't
   skip ahead silently.
2. **Implement** — build the smallest working version of that ONE item.
   Match existing patterns (`src/lib/api.ts` for data calls, theme
   tokens for UI, RPCs + RLS for backend reads/writes).
3. **Verify** — `cd mobile && npx tsc --noEmit` must pass and
   `npx expo lint` must not add NEW problems (52 pre-existing
   react-hooks errors are known — don't fix them here, don't add more).
   Then verify the feature itself: run the relevant real thing
   (sim build + screenshot, `supabase db push`, edge function deploy,
   a deeplink open) — whatever proves THIS item works.
4. **Commit** — `git -C /Users/albinshr/Documents/noon add -A && git
   commit -m "<concise: what + why; deps justified here>"` — plain
   `git commit -m`, no trailers.
5. **Next iteration** — go to step 1.

## Backlog (in order — pick the first unblocked item)

1. **Backend live** — `supabase link --project-ref <ref>`, `supabase db
   push`, `supabase functions deploy checkin`, fill `mobile/.env.local`
   from `.env.example`. Verify: real sign-in + check-in posts a real
   board entry. (Needs the user's Supabase project ref — ask if absent.)
2. **Invite E2E** — bootstrap invite per README step 5, redeem on a
   second test account, verify mutual friendship + both boards show both
   users. (Blocked on #1.)
3. **Widget verification** — add SleepBoard from the widget gallery on
   sim/device, confirm snapshot matches the board and tap opens the app.
4. **Universal invite links** — `sleeple://invite/<code>` only works when
   the app is already installed. Add a universal-link/https landing
   (associated domains) so invites reach non-installed users.
5. **EAS build + TestFlight** — production-ish build with the widget
   target + App Group entitlement; distribute to the bathtub cohort.
6. **APNs push** — replace the local noon reminder with server push
   (deferred item in DESIGN.md).
7. **Streaks** — consume `board_entries.late`; roadmap hook.
8. **Groups** — `group_members` + board member-source swap; roadmap hook.
9. **Formula v2** — personalized targets + consistency component;
   `formula_version=2` + backfill; roadmap hook.
10. **Android** — Terra/ROOK aggregator behind the existing sleep-night
    contract; roadmap hook.

## Hard rules

- ONE backlog item per iteration. If it spans two surfaces (e.g. app +
  edge function), still one item — but split into two iterations when
  it's really two features.
- Smallest working version wins. No speculative options, no "while I'm
  here" fixes. Flag unrelated issues in the commit body, don't fix them.
- No new dependencies without justification in the commit message.
  Prefer `npx expo install` for SDK-compatible versions.
- Demo mode must keep working: app renders with `!isConfigured` fallbacks
  and `DEMO_STATE` fixtures — never gate anything on a live backend in
  code paths the demo uses.
- Keep the codebase minimal: every abstraction needs ≥2 call sites.
- Match existing style — theme tokens, PressableScale, Badge,
  flashStatus. No new visual patterns.
- Never remove status/confidence/late/pending display logic — product,
  not decoration.
- Never edit `DESIGN.md`, `LOOP.md`, or this file from inside the loop.
- Native changes need `npx expo run:ios` + screenshot proof; backend
  changes need the real call exercised (curl the function, query the
  table, or drive the app path).

## Done means

Each iteration ends with: typecheck clean, no new lint problems, the
feature proven working by the check you ran, one commit. Then
immediately start the next item.
