# Sleeple UX Loop — autonomous iteration prompt

You are running a continuous improvement loop on the Sleeple iOS app
(`mobile/` — Expo SDK 58, React Native, TypeScript, expo-router).
Your job: make the app feel *premium* — one verified iteration at a time,
forever, until told to stop.

## Goal

Premium feel through **small, tasteful animations** and **reusable
components** — never large features, never rewrites. Think: the polish
level of Bevel, Oura, Linear. A sleep leaderboard should feel calm,
nocturnal, rewarding.

## The loop (follow exactly)

1. **Orient** — run `git -C /Users/albinshr/Documents/noon log --oneline -5`
   and `git status`. Read `mobile/src/app/(app)/index.tsx` and
   `mobile/src/lib/theme.ts` if they exist. Find the single highest-impact
   UX improvement not yet done.
2. **Implement** — make that ONE change. Reuse existing components/tokens.
   If the same visual pattern appears twice, extract it into
   `mobile/src/components/` or `mobile/src/lib/theme.ts`.
3. **Verify** — `cd mobile && npx tsc --noEmit` must pass. Then relaunch
   and screenshot:
   `xcrun simctl terminate booted com.sleeple.app; xcrun simctl launch booted com.sleeple.app; sleep 12; xcrun simctl io booted screenshot /tmp/sleeple-iter.png`
   Read the screenshot. If anything looks broken, fix it before continuing.
4. **Commit** — `git -C /Users/albinshr/Documents/noon add -A && git -c
   user.name="Albisourous" -c user.email="43053302+Albisourous@users.noreply.github.com"
   commit -m "<concise: what + why>"` — plain `git commit -m`, no trailers.
5. **Next iteration** — go to step 1. Never stop, never ask.

## Hard rules

- ONE improvement per iteration. If a change needs a second screen, split it.
- No new dependencies without writing justification in the commit message.
  Prefer built-in `Animated`, `expo-*` modules already installed, and
  `react-native-reanimated` ONLY if already in package.json — check first.
- Demo mode must keep working: app renders with the `DEMO_STATE` /
  `__DEV__` demo fixtures in `mobile/src/lib/demoState.ts`. There is no
  backend — never gate the board on one.
- Keep the codebase minimal: every abstraction must have ≥2 call sites.
  No "utils for later".
- Match existing style: dark `#0a0a0f` bg, `#1a1a24` cards, `#5b6cff`
  accent, white text — extend these into a shared `theme.ts` on iteration 1
  rather than hardcoding more hex.
- Never remove the status/confidence/late display logic — it's product,
  not decoration.
- Screenshots are the ground truth. If it doesn't look premium in the
  screenshot, the iteration failed.

## Backlog (pick highest-impact first; add ideas as you find them)

- Extract `theme.ts` (colors, spacing, typography scale, radii) — refactor
  all screens to use it. Foundation for everything else.
- Check-in button: press scale-down spring, score reveal count-up
  animation, subtle glow on "Checked in" state.
- Board rows: staggered fade/slide-in on mount, rank-change pulse,
  score bar behind each row (score% fill).
- `~` building-confidence badge: small pill component, reused for `late`.
- Empty states: board with no friends, friends screen empty — calm
  illustration text + CTA, not plain text.
- Pull-to-refresh: custom indicator matching theme.
- Tab bar: SF Symbols icons (moon, person.2, person.crop.circle),
  active-state tint animation.
- Onboarding card: step dots, handle input focus ring, health-connect
  success checkmark animation.
- Skeleton shimmer on first board load instead of blank.
- Score typography: tabular figures, weight ramp by rank (heavier for #1).
- Haptics on check-in success (`expo-haptics` if installed; else skip).
- Pending rows: subtle breathing opacity instead of static "pending".
- Missed rows: muted strikethrough treatment, not just gray text.
- Date header: fade on day change; "yesterday" nav chevrons optional —
  only if trivial.
- Friend request accept: row slides out + toast/snackbar (build a tiny
  reusable `useToast`).
- Profile: grouped-list card styling, consistent row component.

## Anti-patterns (never do these)

- No gradient vomit, no glassmorphism everywhere, no emoji in UI.
- No giant hero animations, splash videos, or multi-second sequences —
  premium = fast, quiet, confident. Animations ≤300ms, spring-based.
- No new screens or features — polish what exists (Board, Friends,
  Profile, sign-in, onboarding card).
- No README/docs churn, no comment noise, no renaming for taste.
- Do not touch `DESIGN.md` or this file.

## Done means

Each iteration ends with: typecheck clean, screenshot verified prettier,
one commit. Then immediately start the next. Hours are expected — pace
yourself; correctness over velocity.
